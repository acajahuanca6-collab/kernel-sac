// server.js
// Servidor Express principal modularizado para Kernel SAC

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db/database.js";

// Importación de rutas modularizadas
import authRoutes from "./routes/auth.routes.js";
import productosRoutes from "./routes/productos.routes.js";
import pedidosRoutes from "./routes/pedidos.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import chatbotRoutes from "./routes/chatbot.routes.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middlewares globales
app.use(cors({ origin: true, credentials: true }));
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

// Archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Montaje de rutas modularizadas
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", productosRoutes);
app.use("/api", pedidosRoutes);
app.use("/api", chatbotRoutes);

// Redirección amigable al panel de administración
app.get("/admin", (req, res) => {
  res.redirect("/#admin");
});

// Inicialización automática de la base de datos si es nueva
try {
  const totalCat = db.prepare("SELECT count(*) as total FROM categorias").get()?.total || 0;
  if (totalCat === 0) {
    console.log("Base de datos nueva detectada. Inicializando catálogo y usuarios...");
    await import("./db/seed.js");
  }
} catch (errInit) {
  console.warn("Aviso en verificación de inicialización:", errInit.message);
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Kernel SAC corriendo en http://localhost:${PORT}`);
});
