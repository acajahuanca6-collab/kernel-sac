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

// Helper para consultar DNI (8 dígitos) o RUC (11 dígitos) vía Scraper LION API
async function consultarDocumentoLion(numeroRaw) {
  const numero = String(numeroRaw || "").replace(/\D/g, "");
  if (numero.length !== 8 && numero.length !== 11) {
    return { status: 400, body: { error: "Ingresa un DNI válido de 8 dígitos o RUC de 11 dígitos." } };
  }

  const apiKey = (process.env.LION_API_KEY || "").trim();
  const baseUrl = (process.env.LION_API_URL || "https://lionapi.pe/api-scraper").replace(/\/+$/, "");
  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: "Consulta automática pendiente de API Key en .env.",
        faltante_api_key: true,
      },
    };
  }

  const esDni = numero.length === 8;
  const endpoint = esDni ? `${baseUrl}/dni/consulta` : `${baseUrl}/sunat/consulta-ruc/empresa`;
  const payload = esDni ? { dni: numero } : { ruc: numero };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await resp.json().catch(() => null);
    if (resp.status === 401 || resp.status === 403) {
      return {
        status: resp.status,
        body: { error: data?.message || "API Key de LION API inválida o sin permisos." },
      };
    }
    if (!resp.ok || !data || !data.success || !data.result) {
      return {
        status: resp.status >= 400 ? resp.status : 404,
        body: { error: data?.message || `No se encontraron datos para el ${esDni ? "DNI" : "RUC"} ${numero}.` },
      };
    }

    if (esDni) {
      const r = data.result;
      const nombreCompleto = [r.nombres, r.apellido_paterno, r.apellido_materno]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      return {
        status: 200,
        body: {
          ok: true,
          tipo: "DNI",
          numero: r.dni || numero,
          nombre_completo: nombreCompleto,
          nombres: r.nombres || "",
          apellido_paterno: r.apellido_paterno || "",
          apellido_materno: r.apellido_materno || "",
          direccion: "",
        },
      };
    }

    const r = data.result;
    return {
      status: 200,
      body: {
        ok: true,
        tipo: "RUC",
        numero: r.ruc || numero,
        nombre_completo: (r.razon_social || r.nombre_comercial || "").trim(),
        direccion: (r.direccion || "").trim(),
        estado: r.estado || "",
        condicion: r.condicion || "",
      },
    };
  } catch (err) {
    const esTimeout = err?.name === "AbortError";
    return {
      status: 504,
      body: {
        error: esTimeout
          ? "La consulta a LION API tardó demasiado. Puedes ingresar el nombre manualmente."
          : "No se pudo conectar con LION API. Puedes ingresar el nombre manualmente.",
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

router.get("/consulta-documento/:numero", async (req, res) => {
  const resultado = await consultarDocumentoLion(req.params.numero);
  res.status(resultado.status).json(resultado.body);
});

router.post("/consulta-documento", async (req, res) => {
  const resultado = await consultarDocumentoLion(req.body?.numero || req.body?.dni || req.body?.ruc);
  res.status(resultado.status).json(resultado.body);
});

// POST /api/pedidos : Checkout para clientes registrados o invitados
router.post("/pedidos", (req, res) => {
  const { cliente_dni, cliente_nombre, cliente_telefono, cliente_direccion, items } = req.body;

  if (!cliente_nombre || !cliente_telefono || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Datos incompletos: nombre, teléfono e items son requeridos." });
  }

  const dniLimpio = String(cliente_dni || "").replace(/\D/g, "");
  if (dniLimpio && dniLimpio.length !== 8 && dniLimpio.length !== 11) {
    return res.status(400).json({ error: "El DNI debe tener 8 dígitos o el RUC 11 dígitos." });
  }

  const usuario = req.session.usuario || null;
  const tipo_cliente = usuario ? "registrado" : "invitado";

  const getProducto = db.prepare("SELECT id, precio, stock FROM productos WHERE id = ?");
  const bajarStock = db.prepare("UPDATE productos SET stock = stock - ? WHERE id = ?");
  const crearPedido = db.prepare(
    `INSERT INTO pedidos (usuario_id, tipo_cliente, cliente_dni, cliente_nombre, cliente_telefono, cliente_direccion, total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
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
      dniLimpio,
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
  const normalizarTel = (val) => {
    const d = String(val || "").replace(/\D/g, "");
    if (!d) return "";
    return /^9\d{8}$/.test(d) ? `51${d}` : d;
  };
  const actual = obtenerConfigGeneral();
  const ventasNorm = normalizarTel(whatsapp_ventas);
  const soporteNorm = normalizarTel(whatsapp_soporte);
  const actualizado = {
    ...actual,
    whatsapp_ventas: ventasNorm || actual.whatsapp_ventas,
    whatsapp_soporte: soporteNorm || actual.whatsapp_soporte,
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
