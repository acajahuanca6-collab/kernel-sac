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

export default router;
