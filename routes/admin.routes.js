// routes/admin.routes.js
// Rutas exclusivas del Panel de Administración de Kernel SAC

import { Router } from "express";
import { db } from "../db/database.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Helper para auditoría de consultas en chatbot
export function registrarLogChatbot(sesionId, mensaje, respuesta) {
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

// GET /api/admin/pedidos : Listado completo de órdenes para despacho
router.get("/pedidos", requireAdmin, (req, res) => {
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

// PUT /api/admin/pedidos/:id/estado
router.put("/pedidos/:id/estado", requireAdmin, (req, res) => {
  const { estado } = req.body;
  const validos = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"];
  if (!validos.includes(estado)) return res.status(400).json({ error: "Estado inválido." });
  db.prepare("UPDATE pedidos SET estado = ? WHERE id = ?").run(estado, req.params.id);
  res.json({ ok: true });
});

// DELETE /api/admin/pedidos/:id
router.delete("/pedidos/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM pedido_items WHERE pedido_id = ?").run(req.params.id);
  db.prepare("DELETE FROM pedidos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// PATCH /api/admin/productos/:id/stock-precio : Edición rápida en vivo desde la tabla
router.patch("/productos/:id/stock-precio", requireAdmin, (req, res) => {
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

// POST /api/admin/productos/:id/duplicar : Duplicar producto existente con 1 clic
router.post("/productos/:id/duplicar", requireAdmin, (req, res) => {
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

// GET & DELETE /api/admin/chatbot/logs
router.get("/chatbot/logs", requireAdmin, (req, res) => {
  try {
    const logs = db.prepare("SELECT * FROM chatbot_logs ORDER BY id DESC LIMIT 100").all();
    res.json(logs);
  } catch {
    res.json([]);
  }
});

router.delete("/chatbot/logs", requireAdmin, (req, res) => {
  try {
    db.prepare("DELETE FROM chatbot_logs").run();
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// GET /api/admin/usuarios
router.get("/usuarios", requireAdmin, (req, res) => {
  const usuarios = db.prepare("SELECT id, nombre, email, rol, creado_en FROM usuarios ORDER BY id DESC").all();
  res.json(usuarios);
});

// GET /api/admin/analitica/inventario-estancado
router.get("/analitica/inventario-estancado", requireAdmin, (req, res) => {
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

// ============================================================
// ================= MEJORAS DE GESTIÓN AVANZADA ==============
// ============================================================

// 1. VENTAS: Reportes periódicos (diario, semanal, mensual, anual, todos)
router.get("/reportes/ventas", requireAdmin, (req, res) => {
  try {
    const { periodo } = req.query; // 'hoy', 'semana', 'mes', 'anual', 'todos'
    
    let dateFilter = "1 = 1";
    if (periodo === "hoy") {
      dateFilter = "date(p.creado_en) = date('now', 'localtime')";
    } else if (periodo === "semana") {
      dateFilter = "p.creado_en >= datetime('now', '-7 days', 'localtime')";
    } else if (periodo === "mes") {
      dateFilter = "p.creado_en >= datetime('now', '-30 days', 'localtime')";
    } else if (periodo === "anual") {
      dateFilter = "p.creado_en >= datetime('now', '-365 days', 'localtime')";
    }

    const pedidos = db.prepare(`SELECT * FROM pedidos p WHERE ${dateFilter} ORDER BY p.id DESC`).all();
    const itemsStmt = db.prepare(`
      SELECT pi.*, p.nombre AS producto_nombre, COALESCE(p.precio_costo, ROUND(p.precio * 0.75, 2)) AS producto_costo
      FROM pedido_items pi
      JOIN productos p ON p.id = pi.producto_id WHERE pi.pedido_id = ?
    `);

    let totalVentas = 0;
    let totalCosto = 0;

    const pedidosProcesados = pedidos.map(p => {
      const items = itemsStmt.all(p.id);
      const costo = items.reduce((acc, it) => acc + (Number(it.producto_costo) * Number(it.cantidad)), 0);
      const ganancia = Math.max(0, Number(p.total) - costo);
      totalVentas += Number(p.total);
      totalCosto += costo;
      return { ...p, items, costo, ganancia };
    });

    const totalPedidos = pedidosProcesados.length;
    const gananciaNeta = Math.max(0, totalVentas - totalCosto);
    const ticketPromedio = totalPedidos > 0 ? Math.round((totalVentas / totalPedidos) * 100) / 100 : 0;
    const margenGlobal = totalVentas > 0 ? Math.round((gananciaNeta / totalVentas) * 1000) / 10 : 0;

    // Desglose cronológico
    const desgloseMap = {};
    pedidosProcesados.forEach(p => {
      const fecha = (p.creado_en || "").substring(0, 10);
      if (!desgloseMap[fecha]) desgloseMap[fecha] = { fecha, total: 0, pedidos: 0, ganancia: 0 };
      desgloseMap[fecha].total += Number(p.total);
      desgloseMap[fecha].pedidos += 1;
      desgloseMap[fecha].ganancia += p.ganancia;
    });
    const desglose = Object.values(desgloseMap).sort((a, b) => a.fecha.localeCompare(b.fecha));

    res.json({
      periodo: periodo || "todos",
      totalVentas,
      totalCosto,
      gananciaNeta,
      ticketPromedio,
      margenGlobal,
      totalPedidos,
      desglose,
      pedidos: pedidosProcesados
    });
  } catch (err) {
    res.status(500).json({ error: "Error generando reporte de ventas: " + err.message });
  }
});

// 2. INVENTARIO: Alertas automáticas de stock mínimo
router.get("/inventario/alertas", requireAdmin, (req, res) => {
  try {
    const agotados = db.prepare(`
      SELECT p.id, p.nombre, p.stock, p.precio, p.imagen_url, c.nombre AS categoria
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.stock = 0
      ORDER BY p.nombre ASC
    `).all();

    const criticos = db.prepare(`
      SELECT p.id, p.nombre, p.stock, p.precio, p.imagen_url, c.nombre AS categoria
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.stock > 0 AND p.stock <= 5
      ORDER BY p.stock ASC, p.nombre ASC
    `).all();

    res.json({
      totalAgotados: agotados.length,
      totalCriticos: criticos.length,
      totalAlertas: agotados.length + criticos.length,
      agotados,
      criticos
    });
  } catch (err) {
    res.status(500).json({ error: "Error consultando alertas de stock: " + err.message });
  }
});

// 3. PRODUCTOS: Importación masiva mediante Excel o CSV
router.post("/productos/importar-masivo", requireAdmin, (req, res) => {
  try {
    const { productos } = req.body;
    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron productos para importar." });
    }

    const cats = db.prepare("SELECT id, nombre, slug FROM categorias").all();
    const catMap = new Map();
    cats.forEach(c => {
      catMap.set(c.nombre.toLowerCase().trim(), c.id);
      catMap.set(c.slug.toLowerCase().trim(), c.id);
    });

    const insertCatStmt = db.prepare("INSERT INTO categorias (nombre, slug, icono) VALUES (?, ?, 'chip')");
    const insertProdStmt = db.prepare(`
      INSERT INTO productos (nombre, categoria_id, precio, precio_costo, stock, descripcion, caracteristicas, destacado, icono, imagen_url, etiqueta_promo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'chip', ?, ?)
    `);

    let importados = 0;
    const errores = [];

    const importarLote = db.transaction((lista) => {
      for (let i = 0; i < lista.length; i++) {
        const p = lista[i];
        const nombre = String(p.nombre || "").trim();
        if (!nombre) {
          errores.push(`Fila ${i + 1}: Nombre vacío`);
          continue;
        }

        const catNombre = String(p.categoria || "Componentes").trim();
        let catId = catMap.get(catNombre.toLowerCase());
        if (!catId) {
          const slug = catNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `cat-${Date.now()}`;
          const catInfo = insertCatStmt.run(catNombre, slug);
          catId = catInfo.lastInsertRowid;
          catMap.set(catNombre.toLowerCase(), catId);
        }

        const precio = Math.max(0, parseFloat(p.precio) || 0);
        const costo = p.precio_costo != null && !isNaN(parseFloat(p.precio_costo))
          ? Math.max(0, parseFloat(p.precio_costo))
          : Math.round(precio * 0.75);
        const stock = Math.max(0, parseInt(p.stock, 10) || 0);
        const descripcion = String(p.descripcion || "").trim();
        const caracteristicas = String(p.caracteristicas || "").trim();
        const destacado = p.destacado === true || p.destacado === 1 || String(p.destacado).toLowerCase() === "si" ? 1 : 0;
        const etiquetaPromo = String(p.etiqueta_promo || "").trim();
        const imagenUrl = String(p.imagen_url || "").trim() || "/assets/honor-magic8.jpg";

        insertProdStmt.run(nombre, catId, precio, costo, stock, descripcion, caracteristicas, destacado, imagenUrl, etiquetaPromo);
        importados++;
      }
    });

    importarLote(productos);
    res.json({ ok: true, importados, total: productos.length, errores });
  } catch (err) {
    res.status(500).json({ error: "Error durante la importación masiva: " + err.message });
  }
});

// 4. CLIENTES: Directorio con LTV e Historial de compras y consultas
router.get("/clientes", requireAdmin, (req, res) => {
  try {
    const clientes = db.prepare(`
      SELECT 
        cliente_telefono,
        MAX(cliente_nombre) AS nombre,
        MAX(cliente_direccion) AS direccion,
        COUNT(id) AS total_pedidos,
        ROUND(SUM(total), 2) AS total_gastado,
        MAX(creado_en) AS ultima_compra,
        MAX(tipo_cliente) AS tipo_cliente
      FROM pedidos
      WHERE cliente_telefono IS NOT NULL AND cliente_telefono != ''
      GROUP BY cliente_telefono
      ORDER BY total_gastado DESC
    `).all();

    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: "Error consultando clientes: " + err.message });
  }
});

router.get("/clientes/:telefono/historial", requireAdmin, (req, res) => {
  try {
    const telefono = req.params.telefono;
    const pedidos = db.prepare("SELECT * FROM pedidos WHERE cliente_telefono = ? ORDER BY id DESC").all(telefono);
    const itemsStmt = db.prepare(`
      SELECT pi.*, p.nombre AS producto_nombre, p.imagen_url
      FROM pedido_items pi
      JOIN productos p ON p.id = pi.producto_id
      WHERE pi.pedido_id = ?
    `);

    const pedidosConItems = pedidos.map(p => ({
      ...p,
      items: itemsStmt.all(p.id)
    }));

    const consultas = db.prepare(`
      SELECT * FROM chatbot_logs
      WHERE mensaje_usuario LIKE ? OR sesion_id LIKE ?
      ORDER BY id DESC LIMIT 20
    `).all(`%${telefono}%`, `%${telefono}%`);

    res.json({
      telefono,
      pedidos: pedidosConItems,
      consultas
    });
  } catch (err) {
    res.status(500).json({ error: "Error consultando historial del cliente: " + err.message });
  }
});

// 6. ESTADÍSTICAS: Ranking de productos más vendidos y por categoría
router.get("/estadisticas/top-productos", requireAdmin, (req, res) => {
  try {
    const limite = Math.max(1, Math.min(50, parseInt(req.query.limite, 10) || 10));
    const top = db.prepare(`
      SELECT 
        p.id, p.nombre, p.precio, p.stock, p.imagen_url,
        c.nombre AS categoria,
        COALESCE(SUM(pi.cantidad), 0) AS unidades_vendidas,
        ROUND(COALESCE(SUM(pi.cantidad * pi.precio_unitario), 0), 2) AS total_recaudado
      FROM pedido_items pi
      JOIN productos p ON p.id = pi.producto_id
      JOIN categorias c ON c.id = p.categoria_id
      GROUP BY p.id
      ORDER BY unidades_vendidas DESC, total_recaudado DESC
      LIMIT ?
    `).all(limite);

    const porCategoria = db.prepare(`
      SELECT 
        c.id, c.nombre AS categoria,
        COUNT(DISTINCT pi.pedido_id) AS total_ordenes,
        COALESCE(SUM(pi.cantidad), 0) AS unidades,
        ROUND(COALESCE(SUM(pi.cantidad * pi.precio_unitario), 0), 2) AS ingresos
      FROM pedido_items pi
      JOIN productos p ON p.id = pi.producto_id
      JOIN categorias c ON c.id = p.categoria_id
      GROUP BY c.id
      ORDER BY ingresos DESC
    `).all();

    res.json({ top, porCategoria });
  } catch (err) {
    res.status(500).json({ error: "Error consultando estadísticas: " + err.message });
  }
});

export default router;
