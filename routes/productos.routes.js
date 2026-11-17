// routes/productos.routes.js
// Rutas de catálogo, categorías, productos, carrusel y estadísticas

import { Router } from "express";
import { db } from "../db/database.js";
import { requireAdmin } from "../middleware/auth.js";
import { guardarImagenProducto, validarImagenUrl, borrarImagenProducto } from "../middleware/imageHandler.js";

const router = Router();

// ---------- CATEGORÍAS ----------

router.get("/categorias", (req, res) => {
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

router.post("/categorias", requireAdmin, (req, res) => {
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

router.delete("/categorias/:id", requireAdmin, (req, res) => {
  const enUso = db.prepare("SELECT COUNT(*) AS n FROM productos WHERE categoria_id = ?").get(req.params.id);
  if (enUso.n > 0) return res.status(400).json({ error: "No se puede eliminar: hay productos en esta categoría." });
  db.prepare("DELETE FROM categorias WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- ESTADÍSTICAS ESCALABLES ----------

router.get("/stats", (req, res) => {
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

// ---------- PRODUCTOS ----------

router.get("/productos", (req, res) => {
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

    const countRow = db.prepare(`
      SELECT COUNT(*) AS total
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE ${whereSQL}
    `).get(params);
    const total = countRow ? countRow.total : 0;

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

router.get("/productos/:id", (req, res) => {
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

router.post("/productos", requireAdmin, (req, res) => {
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

router.put("/productos/:id", requireAdmin, (req, res) => {
  const existente = db.prepare("SELECT * FROM productos WHERE id = ?").get(req.params.id);
  if (!existente) return res.status(404).json({ error: "Producto no encontrado" });

  const { nombre, categoria_id, precio, precio_costo, stock, descripcion, caracteristicas, destacado, icono, imagen_base64, eliminar_imagen, imagen_url: imagenUrlExterna, en_carrusel, precio_anterior, etiqueta_promo, regalo_nombre } = req.body;

  let imagen_url = existente.imagen_url;
  if (imagen_base64) {
    try {
      const nuevaUrl = guardarImagenProducto(imagen_base64);
      borrarImagenProducto(existente.imagen_url);
      imagen_url = nuevaUrl;
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  } else if (imagenUrlExterna) {
    try {
      const nuevaUrl = validarImagenUrl(imagenUrlExterna);
      borrarImagenProducto(existente.imagen_url);
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

router.delete("/productos/:id", requireAdmin, (req, res) => {
  const existente = db.prepare("SELECT * FROM productos WHERE id = ?").get(req.params.id);
  if (!existente) return res.status(404).json({ error: "Producto no encontrado" });
  borrarImagenProducto(existente.imagen_url);
  db.prepare("DELETE FROM productos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- CARRUSEL HERO CYBER ----------

router.get("/carrusel", (req, res) => {
  let config = {
    modo: "auto",
    campana_titulo_1: "CYBER",
    campana_titulo_2: "WOW",
    campana_titulo: "CYBER WOW",
    campana_tag: "OFERTAS EXCLUSIVAS ⚡",
    campana_subtitulo: "OFERTAS EXCLUSIVAS DE TEMPORADA",
    campana_descuento: "HASTA 50% DSCTO",
    cupon_codigo: "BCP200",
    cupon_texto: "Usa cupón: BCP200",
    mostrar_cupon: true,
    boton_texto: "Comprar Ahora",
    boton_accion: "#catalogo",
    tema_color: "magenta",
    auto_rotacion: true,
    segundos_rotacion: 5,
    mostrar_stats: true,
  };

  try {
    const row = db.prepare("SELECT valor FROM configuraciones WHERE clave = 'carrusel'").get();
    if (row && row.valor) {
      config = { ...config, ...JSON.parse(row.valor) };
    }
  } catch (err) {
    console.error("Error leyendo configuración de carrusel:", err);
  }

  // Compatibilidad con campana_titulo existente si no tiene titulo_1 y titulo_2
  if (!config.campana_titulo_1 && config.campana_titulo) {
    const partes = config.campana_titulo.trim().split(" ");
    config.campana_titulo_1 = partes[0] || "CYBER";
    config.campana_titulo_2 = partes.slice(1).join(" ") || "WOW";
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
    productos = db.prepare(`
      SELECT p.*, c.nombre AS categoria, c.slug AS categoria_slug
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.en_carrusel = 1 OR p.destacado = 1 OR p.imagen_url IS NOT NULL
      ORDER BY p.en_carrusel DESC, p.destacado DESC, p.id DESC
      LIMIT 10
    `).all();
  }

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

// Endpoint para el panel admin: listar TODOS los productos con su estado en carrusel
router.get("/carrusel/todos-productos", requireAdmin, (req, res) => {
  try {
    const productos = db.prepare(`
      SELECT p.id, p.nombre, p.precio, p.precio_anterior, p.stock, p.destacado, 
             p.en_carrusel, p.etiqueta_promo, p.regalo_nombre, p.imagen_url, p.icono,
             c.nombre AS categoria, c.slug AS categoria_slug
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      ORDER BY p.en_carrusel DESC, p.destacado DESC, p.id DESC
    `).all();

    res.json({ productos });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener productos para carrusel: " + err.message });
  }
});

router.put("/carrusel/config", requireAdmin, (req, res) => {
  const {
    modo,
    campana_titulo_1,
    campana_titulo_2,
    campana_titulo,
    campana_tag,
    campana_subtitulo,
    campana_descuento,
    cupon_codigo,
    cupon_texto,
    mostrar_cupon,
    boton_texto,
    boton_accion,
    tema_color,
    auto_rotacion,
    segundos_rotacion,
    mostrar_stats,
  } = req.body;

  let actual = {};
  try {
    const row = db.prepare("SELECT valor FROM configuraciones WHERE clave = 'carrusel'").get();
    if (row && row.valor) actual = JSON.parse(row.valor);
  } catch {}

  const tit1 = campana_titulo_1 != null ? String(campana_titulo_1).trim() : (actual.campana_titulo_1 || "CYBER");
  const tit2 = campana_titulo_2 != null ? String(campana_titulo_2).trim() : (actual.campana_titulo_2 || "WOW");
  const fullTit = `${tit1} ${tit2}`.trim();

  const actualizado = {
    ...actual,
    modo: modo === "manual" ? "manual" : "auto",
    campana_titulo_1: tit1,
    campana_titulo_2: tit2,
    campana_titulo: campana_titulo != null ? String(campana_titulo).trim() : fullTit,
    campana_tag: campana_tag != null ? String(campana_tag).trim() : (actual.campana_tag || "OFERTAS EXCLUSIVAS ⚡"),
    campana_subtitulo: campana_subtitulo != null ? String(campana_subtitulo).trim() : (actual.campana_subtitulo || "OFERTAS EXCLUSIVAS DE TEMPORADA"),
    campana_descuento: campana_descuento != null ? String(campana_descuento).trim() : (actual.campana_descuento || "HASTA 50% DSCTO"),
    cupon_codigo: cupon_codigo != null ? String(cupon_codigo).trim() : (actual.cupon_codigo || "BCP200"),
    cupon_texto: cupon_texto != null ? String(cupon_texto).trim() : (actual.cupon_texto || "Usa cupón: BCP200"),
    mostrar_cupon: mostrar_cupon != null ? Boolean(mostrar_cupon) : (actual.mostrar_cupon !== false),
    boton_texto: boton_texto != null ? String(boton_texto).trim() : (actual.boton_texto || "Comprar Ahora"),
    boton_accion: boton_accion != null ? String(boton_accion).trim() : (actual.boton_accion || "#catalogo"),
    tema_color: tema_color != null ? String(tema_color).trim() : (actual.tema_color || "magenta"),
    auto_rotacion: auto_rotacion !== false,
    segundos_rotacion: Number(segundos_rotacion) || 5,
    mostrar_stats: mostrar_stats != null ? Boolean(mostrar_stats) : (actual.mostrar_stats !== false),
  };

  db.prepare(`
    INSERT INTO configuraciones (clave, valor)
    VALUES ('carrusel', ?)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
  `).run(JSON.stringify(actualizado));

  res.json({ ok: true, config: actualizado });
});

router.put("/carrusel/toggle/:id", requireAdmin, (req, res) => {
  const prod = db.prepare("SELECT id, en_carrusel FROM productos WHERE id = ?").get(req.params.id);
  if (!prod) return res.status(404).json({ error: "Producto no encontrado." });
  const nuevo = prod.en_carrusel ? 0 : 1;
  db.prepare("UPDATE productos SET en_carrusel = ? WHERE id = ?").run(nuevo, prod.id);
  res.json({ ok: true, id: prod.id, en_carrusel: nuevo });
});

// Endpoint rápido para editar parámetros promocionales del producto en carrusel
router.put("/carrusel/producto/:id", requireAdmin, (req, res) => {
  const { en_carrusel, etiqueta_promo, precio_anterior, regalo_nombre } = req.body;
  const prod = db.prepare("SELECT id FROM productos WHERE id = ?").get(req.params.id);
  if (!prod) return res.status(404).json({ error: "Producto no encontrado." });

  const sets = [];
  const params = [prod.id];

  if (en_carrusel != null) {
    sets.unshift("en_carrusel = ?");
    params.unshift(en_carrusel ? 1 : 0);
  }
  if (etiqueta_promo != null) {
    sets.unshift("etiqueta_promo = ?");
    params.unshift(String(etiqueta_promo).trim());
  }
  if (precio_anterior != null) {
    const num = parseFloat(precio_anterior);
    sets.unshift("precio_anterior = ?");
    params.unshift(isNaN(num) || num <= 0 ? null : num);
  }
  if (regalo_nombre != null) {
    sets.unshift("regalo_nombre = ?");
    params.unshift(String(regalo_nombre).trim());
  }

  if (sets.length > 0) {
    db.prepare(`UPDATE productos SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }

  const actualizado = db.prepare("SELECT * FROM productos WHERE id = ?").get(prod.id);
  res.json({ ok: true, producto: actualizado });
});

export default router;
