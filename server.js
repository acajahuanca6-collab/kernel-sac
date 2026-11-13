// server.js
// API + servidor de archivos estáticos para Kernel SAC.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db, CARPETA_IMAGENES } from "./db/database.js";
import { procesarMensajeChatbot } from "./chatbot_engine.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
// Límite más alto de lo normal porque las imágenes de producto viajan
// como base64 dentro del JSON (aprox. 33% más grandes que el archivo real).
app.use(express.json({ limit: "12mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "kernel-sac-dev-secret-cambiar-en-produccion",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    },
  })
);
app.use(express.static("public"));

// ---------- MIDDLEWARES DE AUTENTICACIÓN ----------

function requireAuth(req, res, next) {
  if (!req.session.usuario) return res.status(401).json({ error: "Debes iniciar sesión." });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.usuario || req.session.usuario.rol !== "admin") {
    return res.status(403).json({ error: "Acceso solo para administradores." });
  }
  next();
}

function sinPassword(usuario) {
  const { password_hash, ...resto } = usuario;
  return resto;
}

// ---------- IMÁGENES DE PRODUCTO ----------
// Las imágenes llegan como data URL en base64 (ej: "data:image/png;base64,....").
// Las guardamos como archivo real en public/uploads/productos y solo
// almacenamos la ruta pública ("/uploads/productos/xxxx.png") en la BD.

const MIME_A_EXTENSION = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const TAMANO_MAX_IMAGEN = 8 * 1024 * 1024; // 8MB

function guardarImagenProducto(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || "");
  if (!match) {
    throw new Error("Formato de imagen inválido. Sube un PNG, JPG, WEBP o GIF.");
  }
  const [, mime, base64] = match;
  const extension = MIME_A_EXTENSION[mime.toLowerCase()];
  if (!extension) {
    throw new Error("Tipo de imagen no permitido. Usa PNG, JPG, WEBP o GIF.");
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > TAMANO_MAX_IMAGEN) {
    throw new Error("La imagen es demasiado pesada (máximo 8MB).");
  }

  const nombreArchivo = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${extension}`;
  fs.writeFileSync(path.join(CARPETA_IMAGENES, nombreArchivo), buffer);
  return `/uploads/productos/${nombreArchivo}`;
}

// Valida una URL de imagen pegada a mano por el admin (imagen ya alojada en la web).
// A diferencia de guardarImagenProducto, aquí NO se descarga ni se copia el
// archivo: se guarda la URL tal cual y el navegador la carga directo desde ahí.
function validarImagenUrl(url) {
  const limpia = String(url || "").trim();
  if (!limpia) return null;
  if (!/^https?:\/\/.+/i.test(limpia)) {
    throw new Error("La URL de la imagen debe empezar con http:// o https://");
  }
  if (limpia.length > 2000) {
    throw new Error("La URL de la imagen es demasiado larga.");
  }
  return limpia;
}

function borrarImagenProducto(imagen_url) {
  if (!imagen_url || !imagen_url.startsWith("/uploads/productos/")) return;
  const nombreArchivo = path.basename(imagen_url);
  const rutaCompleta = path.join(CARPETA_IMAGENES, nombreArchivo);
  fs.unlink(rutaCompleta, (err) => {
    if (err && err.code !== "ENOENT") console.error("No se pudo borrar la imagen:", err.message);
  });
}

// ---------- AUTENTICACIÓN ----------

app.post("/api/auth/registro", (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "Nombre, email y contraseña son requeridos." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const existente = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(email.toLowerCase().trim());
  if (existente) return res.status(409).json({ error: "Ya existe una cuenta con ese email." });

  const password_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, 'cliente')")
    .run(nombre.trim(), email.toLowerCase().trim(), password_hash);

  const usuario = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(info.lastInsertRowid);
  req.session.usuario = sinPassword(usuario);
  res.status(201).json({ usuario: req.session.usuario });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email y contraseña son requeridos." });

  const usuario = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email.toLowerCase().trim());
  if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }

  req.session.usuario = sinPassword(usuario);
  res.json({ usuario: req.session.usuario });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/auth/me", (req, res) => {
  res.json({ usuario: req.session.usuario || null });
});

// ---------- CATEGORÍAS ----------

app.get("/api/categorias", (req, res) => {
  const categorias = db
    .prepare(
      `SELECT c.id, c.nombre, c.slug, c.icono, COUNT(p.id) AS total_productos
       FROM categorias c
       LEFT JOIN productos p ON p.categoria_id = c.id
       GROUP BY c.id
       ORDER BY c.id`
    )
    .all();
  res.json(categorias);
});

app.post("/api/categorias", requireAdmin, (req, res) => {
  const { nombre, slug, icono } = req.body;
  if (!nombre || !slug) return res.status(400).json({ error: "Nombre y slug son requeridos." });
  try {
    const info = db
      .prepare("INSERT INTO categorias (nombre, slug, icono) VALUES (?, ?, ?)")
      .run(nombre.trim(), slug.trim().toLowerCase(), icono || "chip");
    res.status(201).json(db.prepare("SELECT * FROM categorias WHERE id = ?").get(info.lastInsertRowid));
  } catch (err) {
    res.status(400).json({ error: "Ya existe una categoría con ese nombre o slug." });
  }
});

app.delete("/api/categorias/:id", requireAdmin, (req, res) => {
  const enUso = db.prepare("SELECT COUNT(*) AS n FROM productos WHERE categoria_id = ?").get(req.params.id);
  if (enUso.n > 0) return res.status(400).json({ error: "No se puede eliminar: hay productos en esta categoría." });
  db.prepare("DELETE FROM categorias WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- PRODUCTOS & ESTADÍSTICAS ESCALABLES (70k+ productos) ----------

// GET /api/stats : Métricas ultrarrápidas de catálogo, ventas y rentabilidad (Opción 5)
app.get("/api/stats", (req, res) => {
  try {
    const prodStats = db.prepare(`
      SELECT 
        COUNT(*) AS total_productos,
        COALESCE(SUM(stock), 0) AS total_stock,
        SUM(CASE WHEN stock <= 5 AND stock > 0 THEN 1 ELSE 0 END) AS stock_critico,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS agotados,
        COALESCE(SUM(COALESCE(precio_costo, precio * 0.75) * stock), 0) AS valor_inventario_costo,
        COALESCE(SUM(precio * stock), 0) AS valor_inventario_venta
      FROM productos
    `).get();

    const catCount = db.prepare("SELECT COUNT(*) AS total_categorias FROM categorias").get().total_categorias;

    const pedStats = db.prepare(`
      SELECT 
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(CASE WHEN estado != 'cancelado' THEN total ELSE 0 END), 0) AS total_ventas
      FROM pedidos
    `).get();

    // Costo total de ventas de pedidos reales no cancelados
    const costoVentasRow = db.prepare(`
      SELECT COALESCE(SUM(COALESCE(p.precio_costo, p.precio * 0.75) * pi.cantidad), 0) AS costo_ventas
      FROM pedido_items pi
      JOIN pedidos ped ON ped.id = pi.pedido_id
      JOIN productos p ON p.id = pi.producto_id
      WHERE ped.estado != 'cancelado'
    `).get();

    const totalVentas = pedStats.total_ventas || 0;
    const costoVentas = costoVentasRow ? costoVentasRow.costo_ventas : 0;
    const utilidadNeta = Math.max(0, totalVentas - costoVentas);
    const margenPct = totalVentas > 0 ? Math.round((utilidadNeta / totalVentas) * 1000) / 10 : 0;

    const valorInvCosto = prodStats.valor_inventario_costo || 0;
    const valorInvVenta = prodStats.valor_inventario_venta || 0;
    const gananciaPotencialInv = Math.max(0, valorInvVenta - valorInvCosto);

    res.json({
      totalProductos: prodStats.total_productos || 0,
      totalCategorias: catCount || 0,
      totalStock: prodStats.total_stock || 0,
      stockCritico: prodStats.stock_critico || 0,
      agotados: prodStats.agotados || 0,
      totalPedidos: pedStats.total_pedidos || 0,
      totalVentas: totalVentas,
      costoVentas: costoVentas,
      utilidadNeta: utilidadNeta,
      margenPct: margenPct,
      valorInventarioCosto: valorInvCosto,
      valorInventarioVenta: valorInvVenta,
      gananciaPotencialInventario: gananciaPotencialInv,
    });
  } catch (err) {
    res.status(500).json({ error: "Error al calcular estadísticas: " + err.message });
  }
});

// GET /api/admin/analitica/inventario-estancado : Productos con stock disponible sin ventas recientes
app.get("/api/admin/analitica/inventario-estancado", requireAdmin, (req, res) => {
  try {
    const estancados = db.prepare(`
      SELECT p.id, p.nombre, p.precio, COALESCE(p.precio_costo, ROUND(p.precio * 0.75, 2)) AS precio_costo,
             p.stock, p.imagen_url, c.nombre AS categoria,
             COALESCE(SUM(pi.cantidad), 0) AS total_vendido
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN pedido_items pi ON pi.producto_id = p.id
      WHERE p.stock >= 3
      GROUP BY p.id
      HAVING total_vendido = 0
      ORDER BY (p.stock * p.precio) DESC
      LIMIT 8
    `).all();

    res.json(estancados);
  } catch (err) {
    res.status(500).json({ error: "Error al consultar inventario estancado: " + err.message });
  }
});

// GET /api/productos : Consulta de catálogo con soporte de paginación de alto rendimiento
// Parámetros soportados:
//   - paginado=1 o page=1 : Activa modo paginado devolviendo { productos, total, pagina, porPagina, totalPaginas }
//   - limit : Cantidad por página (default 24 en tienda, configurable)
//   - categoria : slug de categoría
//   - buscar : texto a buscar en nombre, descripción o características
//   - min_precio, max_precio : filtros numéricos
//   - stock_filtro : 'en_stock', 'critico', 'agotado'
//   - orden : 'precio_asc', 'precio_desc', 'nombre_asc', 'recientes'
app.get("/api/productos", (req, res) => {
  const { categoria, destacado, buscar, carrusel, min_precio, max_precio, stock_filtro, orden, page, limit, paginado } = req.query;

  let whereClauses = ["1 = 1"];
  const params = {};

  if (categoria) {
    whereClauses.push("c.slug = @categoria");
    params.categoria = categoria;
  }
  if (destacado) {
    whereClauses.push("p.destacado = 1");
  }
  if (carrusel) {
    whereClauses.push("p.en_carrusel = 1");
  }
  if (buscar) {
    whereClauses.push("(p.nombre LIKE @buscar OR p.descripcion LIKE @buscar OR p.caracteristicas LIKE @buscar)");
    params.buscar = `%${buscar}%`;
  }
  if (min_precio != null && !isNaN(parseFloat(min_precio))) {
    whereClauses.push("p.precio >= @min_precio");
    params.min_precio = parseFloat(min_precio);
  }
  if (max_precio != null && !isNaN(parseFloat(max_precio))) {
    whereClauses.push("p.precio <= @max_precio");
    params.max_precio = parseFloat(max_precio);
  }
  if (stock_filtro === "en_stock") {
    whereClauses.push("p.stock > 5");
  } else if (stock_filtro === "critico") {
    whereClauses.push("p.stock > 0 AND p.stock <= 5");
  } else if (stock_filtro === "agotado") {
    whereClauses.push("p.stock = 0");
  }

  const whereSQL = whereClauses.join(" AND ");

  // Ordenamiento
  let orderSQL = "ORDER BY p.id DESC";
  if (orden === "precio_asc") orderSQL = "ORDER BY p.precio ASC, p.id DESC";
  else if (orden === "precio_desc") orderSQL = "ORDER BY p.precio DESC, p.id DESC";
  else if (orden === "nombre_asc") orderSQL = "ORDER BY p.nombre ASC";
  else if (orden === "stock_desc") orderSQL = "ORDER BY p.stock DESC, p.id DESC";

  // ¿Modo paginado activado?
  const esPaginado = paginado === "1" || page != null;
  const esAdmin = Boolean(req.session.usuario && req.session.usuario.rol === "admin");
  const campoCosto = esAdmin ? ", COALESCE(p.precio_costo, ROUND(p.precio * 0.75, 2)) AS precio_costo" : "";

  if (esPaginado) {
    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const numLimit = Math.max(1, Math.min(200, parseInt(limit, 10) || 24));
    const offset = (numPage - 1) * numLimit;

    // Conteo total rápido usando índices
    const countRow = db.prepare(`
      SELECT COUNT(*) AS total
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE ${whereSQL}
    `).get(params);
    const total = countRow ? countRow.total : 0;

    // Consulta de los productos de la página actual
    const sql = `
      SELECT p.id, p.nombre, p.precio, p.stock, p.descripcion, p.caracteristicas, p.destacado, p.icono, p.imagen_url,
             p.en_carrusel, p.precio_anterior, p.etiqueta_promo, p.regalo_nombre ${campoCosto},
             c.nombre AS categoria, c.slug AS categoria_slug
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE ${whereSQL}
      ${orderSQL}
      LIMIT @limit OFFSET @offset
    `;
    const productos = db.prepare(sql).all({ ...params, limit: numLimit, offset });

    return res.json({
      productos,
      total,
      pagina: numPage,
      porPagina: numLimit,
      totalPaginas: Math.max(1, Math.ceil(total / numLimit)),
    });
  }

  // Modo directo (retrocompatibilidad o llamadas con límite fijo como destacados)
  let sql = `
    SELECT p.id, p.nombre, p.precio, p.stock, p.descripcion, p.caracteristicas, p.destacado, p.icono, p.imagen_url,
           p.en_carrusel, p.precio_anterior, p.etiqueta_promo, p.regalo_nombre ${campoCosto},
           c.nombre AS categoria, c.slug AS categoria_slug
    FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    WHERE ${whereSQL}
    ${orderSQL}
  `;
  if (limit != null && !isNaN(parseInt(limit, 10))) {
    sql += " LIMIT @limit";
    params.limit = parseInt(limit, 10);
  }

  const productos = db.prepare(sql).all(params);
  res.json(productos);
});

app.get("/api/productos/:id", (req, res) => {
  const producto = db
    .prepare(
      `SELECT p.*, c.nombre AS categoria, c.slug AS categoria_slug
       FROM productos p JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = ?`
    )
    .get(req.params.id);

  if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
  res.json(producto);
});

app.post("/api/productos", requireAdmin, (req, res) => {
  const { nombre, categoria_id, precio, precio_costo, stock, descripcion, caracteristicas, destacado, icono, imagen_base64, imagen_url: imagenUrlExterna, en_carrusel, precio_anterior, etiqueta_promo, regalo_nombre } = req.body;
  if (!nombre || !categoria_id || precio == null) {
    return res.status(400).json({ error: "Nombre, categoría y precio son requeridos." });
  }

  const costoFinal = precio_costo != null && !isNaN(parseFloat(precio_costo)) ? parseFloat(precio_costo) : Math.round(Number(precio) * 0.75 * 100) / 100;

  let imagen_url = null;
  if (imagen_base64) {
    try {
      imagen_url = guardarImagenProducto(imagen_base64);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  } else if (imagenUrlExterna) {
    try {
      imagen_url = validarImagenUrl(imagenUrlExterna);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  const info = db
    .prepare(
      `INSERT INTO productos (nombre, categoria_id, precio, precio_costo, stock, descripcion, caracteristicas, destacado, icono, imagen_url, en_carrusel, precio_anterior, etiqueta_promo, regalo_nombre)
       VALUES (@nombre, @categoria_id, @precio, @precio_costo, @stock, @descripcion, @caracteristicas, @destacado, @icono, @imagen_url, @en_carrusel, @precio_anterior, @etiqueta_promo, @regalo_nombre)`
    )
    .run({
      nombre: nombre.trim(),
      categoria_id,
      precio,
      precio_costo: costoFinal,
      stock: stock || 0,
      descripcion: descripcion || "",
      caracteristicas: caracteristicas || "",
      destacado: destacado ? 1 : 0,
      icono: icono || "chip",
      imagen_url,
      en_carrusel: en_carrusel ? 1 : 0,
      precio_anterior: precio_anterior ? Number(precio_anterior) : null,
      etiqueta_promo: etiqueta_promo ? String(etiqueta_promo).trim() : "",
      regalo_nombre: regalo_nombre ? String(regalo_nombre).trim() : "",
    });
  res.status(201).json(db.prepare("SELECT * FROM productos WHERE id = ?").get(info.lastInsertRowid));
});

app.put("/api/productos/:id", requireAdmin, (req, res) => {
  const existente = db.prepare("SELECT * FROM productos WHERE id = ?").get(req.params.id);
  if (!existente) return res.status(404).json({ error: "Producto no encontrado" });

  const { nombre, categoria_id, precio, precio_costo, stock, descripcion, caracteristicas, destacado, icono, imagen_base64, eliminar_imagen, imagen_url: imagenUrlExterna, en_carrusel, precio_anterior, etiqueta_promo, regalo_nombre } = req.body;

  // Resolvemos qué pasa con la imagen: se sube un archivo nuevo, se pega una
  // URL de internet, se elimina la actual, o se deja tal cual estaba.
  let imagen_url = existente.imagen_url;
  if (imagen_base64) {
    try {
      const nuevaUrl = guardarImagenProducto(imagen_base64);
      borrarImagenProducto(existente.imagen_url); // limpia la imagen anterior, si había
      imagen_url = nuevaUrl;
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  } else if (imagenUrlExterna) {
    try {
      const nuevaUrl = validarImagenUrl(imagenUrlExterna);
      borrarImagenProducto(existente.imagen_url); // si la anterior era un archivo local, se borra; si era otra URL externa, no hace nada
      imagen_url = nuevaUrl;
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  } else if (eliminar_imagen) {
    borrarImagenProducto(existente.imagen_url);
    imagen_url = null;
  }

  db.prepare(
    `UPDATE productos SET nombre=@nombre, categoria_id=@categoria_id, precio=@precio, precio_costo=@precio_costo, stock=@stock,
     descripcion=@descripcion, caracteristicas=@caracteristicas, destacado=@destacado, icono=@icono,
     imagen_url=@imagen_url, en_carrusel=@en_carrusel, precio_anterior=@precio_anterior,
     etiqueta_promo=@etiqueta_promo, regalo_nombre=@regalo_nombre WHERE id=@id`
  ).run({
    id: req.params.id,
    nombre: nombre ?? existente.nombre,
    categoria_id: categoria_id ?? existente.categoria_id,
    precio: precio ?? existente.precio,
    precio_costo: precio_costo !== undefined ? (precio_costo != null ? parseFloat(precio_costo) : null) : (existente.precio_costo || Math.round(Number(existente.precio) * 0.75 * 100) / 100),
    stock: stock ?? existente.stock,
    descripcion: descripcion ?? existente.descripcion,
    caracteristicas: caracteristicas ?? existente.caracteristicas,
    destacado: destacado != null ? (destacado ? 1 : 0) : existente.destacado,
    icono: icono ?? existente.icono,
    imagen_url,
    en_carrusel: en_carrusel != null ? (en_carrusel ? 1 : 0) : existente.en_carrusel,
    precio_anterior: precio_anterior !== undefined ? (precio_anterior ? Number(precio_anterior) : null) : existente.precio_anterior,
    etiqueta_promo: etiqueta_promo !== undefined ? String(etiqueta_promo).trim() : (existente.etiqueta_promo || ""),
    regalo_nombre: regalo_nombre !== undefined ? String(regalo_nombre).trim() : (existente.regalo_nombre || ""),
  });
  res.json(db.prepare("SELECT * FROM productos WHERE id = ?").get(req.params.id));
});

// ---------- CARRUSEL HERO CYBER + EXHIBICIÓN AESTHETIC ----------

app.get("/api/carrusel", (req, res) => {
  let config = {
    modo: "auto",
    campana_titulo: "CYBER WOW",
    campana_tag: "OFERTAS EXCLUSIVAS ⚡",
    campana_descuento: "HASTA 50% DSCTO",
    cupon_codigo: "CYBERKERNEL",
    cupon_texto: "Usa cupón: BCP200",
    auto_rotacion: true,
    segundos_rotacion: 5,
  };

  try {
    const row = db.prepare("SELECT valor FROM configuraciones WHERE clave = 'carrusel'").get();
    if (row && row.valor) {
      config = { ...config, ...JSON.parse(row.valor) };
    }
  } catch (err) {
    console.error("Error leyendo configuración de carrusel:", err);
  }

  let productos = [];
  if (config.modo === "manual") {
    productos = db.prepare(`
      SELECT p.*, c.nombre AS categoria, c.slug AS categoria_slug
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.en_carrusel = 1
      ORDER BY p.id DESC
    `).all();

    if (productos.length === 0) {
      productos = db.prepare(`
        SELECT p.*, c.nombre AS categoria, c.slug AS categoria_slug
        FROM productos p
        JOIN categorias c ON c.id = p.categoria_id
        WHERE p.destacado = 1 OR p.imagen_url IS NOT NULL
        ORDER BY p.destacado DESC, p.id DESC
        LIMIT 6
      `).all();
    }
  } else {
    // Modo automático: destacados y con foto primero
    productos = db.prepare(`
      SELECT p.*, c.nombre AS categoria, c.slug AS categoria_slug
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.en_carrusel = 1 OR p.destacado = 1 OR p.imagen_url IS NOT NULL
      ORDER BY p.en_carrusel DESC, p.destacado DESC, p.id DESC
      LIMIT 10
    `).all();
  }

  // Si no hay productos (o son muy pocos), tomar cualquier producto con stock
  if (productos.length === 0) {
    productos = db.prepare(`
      SELECT p.*, c.nombre AS categoria, c.slug AS categoria_slug
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      ORDER BY p.id DESC LIMIT 6
    `).all();
  }

  const procesados = productos.map((p) => {
    let anterior = p.precio_anterior;
    if (!anterior || anterior <= p.precio) {
      anterior = Math.round(p.precio * 1.25);
    }
    return {
      ...p,
      precio_anterior: anterior,
      etiqueta_promo: p.etiqueta_promo || (p.destacado ? "DESTACADO" : "OFERTA"),
      regalo_nombre: p.regalo_nombre || "",
    };
  });

  res.json({
    config,
    productos: procesados,
  });
});

app.put("/api/carrusel/config", requireAdmin, (req, res) => {
  const { modo, campana_titulo, campana_tag, campana_descuento, cupon_codigo, cupon_texto, auto_rotacion, segundos_rotacion } = req.body;

  let actual = {};
  try {
    const row = db.prepare("SELECT valor FROM configuraciones WHERE clave = 'carrusel'").get();
    if (row && row.valor) actual = JSON.parse(row.valor);
  } catch {}

  const actualizado = {
    ...actual,
    modo: modo === "manual" ? "manual" : "auto",
    campana_titulo: campana_titulo != null ? String(campana_titulo).trim() : (actual.campana_titulo || "CYBER WOW"),
    campana_tag: campana_tag != null ? String(campana_tag).trim() : (actual.campana_tag || "OFERTAS EXCLUSIVAS ⚡"),
    campana_descuento: campana_descuento != null ? String(campana_descuento).trim() : (actual.campana_descuento || "HASTA 50% DSCTO"),
    cupon_codigo: cupon_codigo != null ? String(cupon_codigo).trim() : (actual.cupon_codigo || "CYBERKERNEL"),
    cupon_texto: cupon_texto != null ? String(cupon_texto).trim() : (actual.cupon_texto || "Usa cupón: BCP200"),
    auto_rotacion: auto_rotacion !== false,
    segundos_rotacion: Number(segundos_rotacion) || 5,
  };

  db.prepare(`
    INSERT INTO configuraciones (clave, valor)
    VALUES ('carrusel', ?)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
  `).run(JSON.stringify(actualizado));

  res.json({ ok: true, config: actualizado });
});

// ---------- CONFIGURACIÓN GENERAL (WhatsApp Ventas & Soporte) ----------
function obtenerConfigGeneral() {
  try {
    const row = db.prepare("SELECT valor FROM configuraciones WHERE clave = 'general'").get();
    if (row && row.valor) return JSON.parse(row.valor);
  } catch {}
  return {
    whatsapp_ventas: "51967006922",
    whatsapp_soporte: "51939059976",
    nombre_tienda: "Kernel SAC",
  };
}

app.get("/api/configuraciones/general", (req, res) => {
  res.json(obtenerConfigGeneral());
});

app.put("/api/configuraciones/general", requireAdmin, (req, res) => {
  const { whatsapp_ventas, whatsapp_soporte, nombre_tienda } = req.body;
  const actual = obtenerConfigGeneral();
  const actualizado = {
    ...actual,
    whatsapp_ventas: whatsapp_ventas ? String(whatsapp_ventas).replace(/\D/g, "") : actual.whatsapp_ventas,
    whatsapp_soporte: whatsapp_soporte ? String(whatsapp_soporte).replace(/\D/g, "") : actual.whatsapp_soporte,
    nombre_tienda: nombre_tienda ? String(nombre_tienda).trim() : (actual.nombre_tienda || "Kernel SAC"),
  };
  db.prepare(`
    INSERT INTO configuraciones (clave, valor)
    VALUES ('general', ?)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
  `).run(JSON.stringify(actualizado));
  res.json({ ok: true, config: actualizado });
});

app.put("/api/carrusel/toggle/:id", requireAdmin, (req, res) => {
  const prod = db.prepare("SELECT id, en_carrusel FROM productos WHERE id = ?").get(req.params.id);
  if (!prod) return res.status(404).json({ error: "Producto no encontrado." });
  const nuevo = prod.en_carrusel ? 0 : 1;
  db.prepare("UPDATE productos SET en_carrusel = ? WHERE id = ?").run(nuevo, prod.id);
  res.json({ ok: true, id: prod.id, en_carrusel: nuevo });
});

app.delete("/api/productos/:id", requireAdmin, (req, res) => {
  const existente = db.prepare("SELECT * FROM productos WHERE id = ?").get(req.params.id);
  if (!existente) return res.status(404).json({ error: "Producto no encontrado" });
  borrarImagenProducto(existente.imagen_url);
  db.prepare("DELETE FROM productos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- PEDIDOS (checkout: funciona para invitado y cliente registrado) ----------

app.post("/api/pedidos", (req, res) => {
  const { cliente_nombre, cliente_telefono, cliente_direccion, items } = req.body;

  if (!cliente_nombre || !cliente_telefono || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Datos incompletos: nombre, teléfono e items son requeridos." });
  }

  const usuario = req.session.usuario || null;
  const tipo_cliente = usuario ? "registrado" : "invitado";

  const getProducto = db.prepare("SELECT id, precio, stock FROM productos WHERE id = ?");
  const bajarStock = db.prepare("UPDATE productos SET stock = stock - ? WHERE id = ?");
  const crearPedido = db.prepare(
    `INSERT INTO pedidos (usuario_id, tipo_cliente, cliente_nombre, cliente_telefono, cliente_direccion, total)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const crearItem = db.prepare(
    `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
     VALUES (?, ?, ?, ?)`
  );

  const transaccion = db.transaction(() => {
    let total = 0;
    const detalles = [];

    for (const item of items) {
      const producto = getProducto.get(item.id);
      if (!producto) throw new Error(`Producto ${item.id} no existe`);
      if (producto.stock < item.cantidad) throw new Error(`Sin stock suficiente de "${item.id}"`);
      total += producto.precio * item.cantidad;
      detalles.push({ ...item, precio: producto.precio });
    }

    const info = crearPedido.run(
      usuario ? usuario.id : null,
      tipo_cliente,
      cliente_nombre,
      cliente_telefono,
      cliente_direccion || null,
      total
    );
    const pedidoId = info.lastInsertRowid;

    for (const d of detalles) {
      crearItem.run(pedidoId, d.id, d.cantidad, d.precio);
      bajarStock.run(d.cantidad, d.id);
    }

    return { pedidoId, total };
  });

  try {
    const resultado = transaccion();
    res.status(201).json({ ok: true, pedido_id: resultado.pedidoId, total: resultado.total });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Pedidos del cliente autenticado
app.get("/api/mis-pedidos", requireAuth, (req, res) => {
  const pedidos = db
    .prepare("SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY id DESC")
    .all(req.session.usuario.id);
  res.json(pedidos);
});

// ---------- ADMIN: PEDIDOS Y USUARIOS ----------

app.get("/api/admin/pedidos", requireAdmin, (req, res) => {
  const pedidos = db.prepare("SELECT * FROM pedidos ORDER BY id DESC").all();
  const itemsStmt = db.prepare(
    `SELECT pi.*, p.nombre AS producto_nombre, COALESCE(p.precio_costo, ROUND(p.precio * 0.75, 2)) AS producto_costo
     FROM pedido_items pi
     JOIN productos p ON p.id = pi.producto_id WHERE pi.pedido_id = ?`
  );
  const conItems = pedidos.map((p) => {
    const items = itemsStmt.all(p.id);
    const costoTotal = items.reduce((acc, it) => acc + (Number(it.producto_costo) * Number(it.cantidad)), 0);
    const ganancia = Math.max(0, Number(p.total) - costoTotal);
    const margenPct = Number(p.total) > 0 ? Math.round((ganancia / Number(p.total)) * 1000) / 10 : 0;
    return { ...p, items, costo_total: costoTotal, ganancia_neta: ganancia, margen_pct: margenPct };
  });
  res.json(conItems);
});

app.put("/api/admin/pedidos/:id/estado", requireAdmin, (req, res) => {
  const { estado } = req.body;
  const validos = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"];
  if (!validos.includes(estado)) return res.status(400).json({ error: "Estado inválido." });
  db.prepare("UPDATE pedidos SET estado = ? WHERE id = ?").run(estado, req.params.id);
  res.json({ ok: true });
});

// Eliminar pedido
app.delete("/api/admin/pedidos/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM pedido_items WHERE pedido_id = ?").run(req.params.id);
  db.prepare("DELETE FROM pedidos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Edición rápida de stock o precio desde la tabla
app.patch("/api/admin/productos/:id/stock-precio", requireAdmin, (req, res) => {
  const { stock, precio, precio_costo, stock_delta } = req.body;
  const prod = db.prepare("SELECT id, nombre, stock, precio, precio_costo FROM productos WHERE id = ?").get(req.params.id);
  if (!prod) return res.status(404).json({ error: "Producto no encontrado." });

  let nuevoStock = prod.stock;
  let nuevoPrecio = prod.precio;
  let nuevoCosto = prod.precio_costo;

  if (stock_delta !== undefined) {
    nuevoStock = Math.max(0, Number(prod.stock) + (parseInt(stock_delta, 10) || 0));
  } else if (stock !== undefined) {
    nuevoStock = Math.max(0, parseInt(stock, 10) || 0);
  }
  if (precio !== undefined) nuevoPrecio = Math.max(0, parseFloat(precio) || 0);
  if (precio_costo !== undefined) nuevoCosto = Math.max(0, parseFloat(precio_costo) || 0);

  db.prepare("UPDATE productos SET stock = ?, precio = ?, precio_costo = ? WHERE id = ?").run(nuevoStock, nuevoPrecio, nuevoCosto, req.params.id);
  res.json({ ok: true, id: req.params.id, producto: { id: req.params.id, nombre: prod.nombre, stock: nuevoStock, precio: nuevoPrecio, precio_costo: nuevoCosto } });
});

// Duplicar producto existente con 1 clic
app.post("/api/admin/productos/:id/duplicar", requireAdmin, (req, res) => {
  const prod = db.prepare("SELECT * FROM productos WHERE id = ?").get(req.params.id);
  if (!prod) return res.status(404).json({ error: "Producto no encontrado." });

  const nuevoNombre = `${prod.nombre} (Copia)`;
  const info = db.prepare(`
    INSERT INTO productos (nombre, categoria_id, precio, stock, descripcion, caracteristicas, destacado, icono, imagen_url, en_carrusel, precio_anterior, etiqueta_promo, regalo_nombre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nuevoNombre,
    prod.categoria_id,
    prod.precio,
    prod.stock,
    prod.descripcion,
    prod.caracteristicas,
    prod.destacado,
    prod.icono,
    prod.imagen_url,
    0,
    prod.precio_anterior,
    prod.etiqueta_promo,
    prod.regalo_nombre
  );

  const creado = db.prepare("SELECT * FROM productos WHERE id = ?").get(info.lastInsertRowid);
  res.json(creado);
});

// Logs e historial de consultas del Chatbot para el panel admin
app.get("/api/admin/chatbot/logs", requireAdmin, (req, res) => {
  try {
    const logs = db.prepare("SELECT * FROM chatbot_logs ORDER BY id DESC LIMIT 100").all();
    res.json(logs);
  } catch {
    res.json([]);
  }
});

app.delete("/api/admin/chatbot/logs", requireAdmin, (req, res) => {
  try {
    db.prepare("DELETE FROM chatbot_logs").run();
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

function registrarLogChatbot(sesionId, mensaje, respuesta) {
  try {
    db.prepare("INSERT INTO chatbot_logs (sesion_id, mensaje_usuario, respuesta_bot) VALUES (?, ?, ?)").run(
      sesionId || "anonimo",
      String(mensaje || "").slice(0, 500),
      String(respuesta || "").slice(0, 1000)
    );
  } catch {
    // silencioso
  }
}

app.get("/api/admin/usuarios", requireAdmin, (req, res) => {
  const usuarios = db.prepare("SELECT id, nombre, email, rol, creado_en FROM usuarios ORDER BY id DESC").all();
  res.json(usuarios);
});

// ---------- CHATBOT INTELIGENTE (Motor Experto + Sincronización n8n opcional) ----------
app.post("/api/chatbot", async (req, res) => {
  try {
    const { mensaje, sessionId } = req.body;
    if (!mensaje || !String(mensaje).trim()) {
      return res.status(400).json({ error: "El mensaje no puede estar vacío." });
    }
    const textoMensaje = String(mensaje).trim();
    const config = obtenerConfigGeneral();
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    // Si no hay webhook configurado, usamos directamente el motor inteligente
    if (!webhookUrl) {
      const resp = procesarMensajeChatbot(textoMensaje, sessionId, config);
      registrarLogChatbot(sessionId, textoMensaje, resp.texto);
      return res.json({
        respuesta: resp.texto,
        whatsapp: resp.whatsapp || null,
        whatsappTexto: resp.whatsappTexto || null,
        producto: resp.producto || null,
        productos: resp.productos || [],
      });
    }

    // Si hay webhook de n8n, intentamos consultarlo con timeout seguro
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const respuestaN8n = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: textoMensaje,
          sessionId: sessionId || "anonimo",
          usuario: req.session?.usuario || null,
          origen: "kernel-sac-web",
          fecha: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      if (!respuestaN8n.ok) throw new Error(`n8n respondió con estado ${respuestaN8n.status}`);

      const data = await respuestaN8n.json().catch(() => ({}));
      let texto = data.respuesta || data.output || data.mensaje || data.text || data.reply;
      let whatsapp = data.whatsapp || null;
      let whatsappTexto = data.whatsappTexto || null;
      let producto = data.producto || null;
      let productos = data.productos || [];

      if (!texto) {
        const local = procesarMensajeChatbot(textoMensaje, sessionId, config);
        texto = local.texto;
        whatsapp = local.whatsapp;
        whatsappTexto = local.whatsappTexto;
        producto = local.producto;
        productos = local.productos;
      }

      return res.json({ respuesta: texto, whatsapp, whatsappTexto, producto, productos });
    } catch (errN8n) {
      console.warn("Falla de n8n o timeout, respondiendo con motor inteligente local:", errN8n.message);
      const local = procesarMensajeChatbot(textoMensaje, sessionId, config);
      return res.json({
        respuesta: local.texto,
        whatsapp: local.whatsapp || null,
        whatsappTexto: local.whatsappTexto || null,
        producto: local.producto || null,
        productos: local.productos || [],
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (errGeneral) {
    console.error("Error al procesar consulta en /api/chatbot:", errGeneral);
    try {
      const config = obtenerConfigGeneral();
      const local = procesarMensajeChatbot(String(req.body?.mensaje || ""), req.body?.sessionId, config);
      return res.json({
        respuesta: local.texto,
        whatsapp: local.whatsapp || null,
        whatsappTexto: local.whatsappTexto || null,
        producto: local.producto || null,
        productos: local.productos || [],
      });
    } catch {
      return res.status(500).json({ error: "Error interno al procesar el mensaje." });
    }
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/admin", (req, res) => {
  res.redirect("/#admin");
});

app.listen(PORT, () => {
  console.log(`Kernel SAC corriendo en http://localhost:${PORT}`);
});
