// routes/chatbot.routes.js
// Rutas de asistencia virtual con chatbot experto y salud de la API

import { Router } from "express";
import { procesarMensajeChatbot } from "../chatbot_engine.js";
import { obtenerConfigGeneral } from "./pedidos.routes.js";
import { registrarLogChatbot } from "./admin.routes.js";

const router = Router();

router.post("/chatbot", async (req, res) => {
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

router.get("/health", (req, res) => res.json({ status: "ok" }));

export default router;
