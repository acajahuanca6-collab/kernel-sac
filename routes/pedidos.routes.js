// routes/pedidos.routes.js
// Rutas de pedidos, checkout del cliente y configuraciones generales de la tienda

import { Router } from "express";
import { db } from "../db/database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Helper exportable para obtener configuración de WhatsApp y tienda
export function obtenerConfigGeneral() {
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

// POST /api/pedidos : Checkout para clientes registrados o invitados
router.post("/pedidos", (req, res) => {
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

// GET /api/mis-pedidos : Historial de compras del cliente autenticado
router.get("/mis-pedidos", requireAuth, (req, res) => {
  const pedidos = db
    .prepare("SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY id DESC")
    .all(req.session.usuario.id);
  res.json(pedidos);
});

// Helper para obtener la configuración de redes sociales
export function obtenerConfigRedes() {
  try {
    const row = db.prepare("SELECT valor FROM configuraciones WHERE clave = 'redes_sociales'").get();
    if (row && row.valor) {
      return JSON.parse(row.valor);
    }
  } catch (err) {
    console.error("Error al obtener configuraciones de redes sociales:", err);
  }
  return {
    titulo_seccion: "Síguenos en nuestras redes",
    subtitulo: "Conéctate con nosotros en todas nuestras plataformas oficiales",
    redes: [
      {
        id: "instagram",
        nombre: "Instagram",
        url: "https://instagram.com",
        descripcion: "Fotos de setups increíbles, unboxings y detrás de cámaras.",
        color: "#E1306C",
        activo: true
      },
      {
        id: "tiktok",
        nombre: "TikTok",
        url: "https://tiktok.com",
        descripcion: "Videos rápidos, tips de tecnología y memes de ensamble.",
        color: "#00f2fe",
        activo: true
      },
      {
        id: "youtube",
        nombre: "YouTube",
        url: "https://youtube.com",
        descripcion: "Reviews a fondo, tutoriales y guías de armado paso a paso.",
        color: "#FF0000",
        activo: true
      },
      {
        id: "facebook",
        nombre: "Facebook",
        url: "https://facebook.com",
        descripcion: "Únete a nuestra comunidad, mira transmisiones en vivo y sorteos.",
        color: "#1877F2",
        activo: true
      },
      {
        id: "whatsapp",
        nombre: "Canal de WhatsApp",
        url: "https://wa.me/51967006922",
        descripcion: "Ofertas relámpago, alertas de stock y lanzamientos exclusivos.",
        color: "#25D366",
        activo: false
      },
      {
        id: "x",
        nombre: "X (Twitter)",
        url: "https://x.com",
        descripcion: "Noticias de tecnología y lanzamientos de hardware en tiempo real.",
        color: "#ffffff",
        activo: false
      }
    ]
  };
}

// GET /api/configuraciones/general
router.get("/configuraciones/general", (req, res) => {
  res.json(obtenerConfigGeneral());
});

// PUT /api/configuraciones/general
router.put("/configuraciones/general", requireAdmin, (req, res) => {
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

// Helper para obtener la configuración de barras de anuncios (cinta superior y barra promocional)
export function obtenerConfigAnuncios() {
  try {
    const row = db.prepare("SELECT valor FROM configuraciones WHERE clave = 'barras_anuncios'").get();
    if (row && row.valor) {
      return JSON.parse(row.valor);
    }
  } catch (err) {
    console.error("Error al obtener configuraciones de barras de anuncios:", err);
  }
  return {
    cinta_superior: {
      activo: true,
      color_fondo: "#e11d48",
      color_texto: "#ffffff",
      item1: "ENVÍOS A TODO EL PERÚ",
      item2: "SOPORTE TÉCNICO ESPECIALIZADO",
      item3: "PRODUCTOS CON GARANTÍA",
      item4: "MÁS DE 25 000 PRODUCTOS"
    },
    barra_promocional: {
      activo: true,
      color_fondo_inicio: "#be123c",
      color_fondo_medio: "#e11d48",
      color_fondo_fin: "#be123c",
      color_texto: "#ffffff",
      badge_texto: "🔥 CYBER BOOM",
      badge_color_fondo: "#ffde00",
      badge_color_texto: "#0b0608",
      titulo: "¡OFERTAS EXPLOSIVAS KERNEL SAC!",
      descuento_texto: "50% DSCTO",
      descuento_color: "#ffde00",
      subtitulo: "+ Regalos Gratis 🎁",
      timer_label: "⏰ Termina en:",
      boton_texto: "Ver Ofertas ⚡",
      boton_link: "#destacados",
      boton_color_fondo: "#ffffff",
      boton_color_texto: "#e11d48"
    }
  };
}

// GET /api/configuraciones/redes
router.get("/configuraciones/redes", (req, res) => {
  res.json(obtenerConfigRedes());
});

// PUT /api/configuraciones/redes
router.put("/configuraciones/redes", requireAdmin, (req, res) => {
  const { titulo_seccion, subtitulo, redes } = req.body;
  const actual = obtenerConfigRedes();
  const actualizado = {
    titulo_seccion: titulo_seccion ? String(titulo_seccion).trim() : actual.titulo_seccion,
    subtitulo: subtitulo !== undefined ? String(subtitulo).trim() : (actual.subtitulo || ""),
    redes: Array.isArray(redes) ? redes : actual.redes,
  };
  db.prepare(`
    INSERT INTO configuraciones (clave, valor)
    VALUES ('redes_sociales', ?)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
  `).run(JSON.stringify(actualizado));
  res.json({ ok: true, config: actualizado });
});

// GET /api/configuraciones/anuncios
router.get("/configuraciones/anuncios", (req, res) => {
  res.json(obtenerConfigAnuncios());
});

// PUT /api/configuraciones/anuncios
router.put("/configuraciones/anuncios", requireAdmin, (req, res) => {
  const actual = obtenerConfigAnuncios();
  const nuevo = req.body || {};
  const actualizado = {
    cinta_superior: {
      ...actual.cinta_superior,
      ...(nuevo.cinta_superior || {})
    },
    barra_promocional: {
      ...actual.barra_promocional,
      ...(nuevo.barra_promocional || {})
    }
  };
  db.prepare(`
    INSERT INTO configuraciones (clave, valor)
    VALUES ('barras_anuncios', ?)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
  `).run(JSON.stringify(actualizado));
  res.json({ ok: true, config: actualizado });
});

export default router;
