// middleware/imageHandler.js
// Procesamiento y almacenamiento seguro de imágenes de productos

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { CARPETA_IMAGENES } from "../db/database.js";

const MIME_A_EXTENSION = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const TAMANO_MAX_IMAGEN = 8 * 1024 * 1024; // 8MB

export function guardarImagenProducto(dataUrl) {
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

export function validarImagenUrl(url) {
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

export function borrarImagenProducto(imagen_url) {
  if (!imagen_url || !imagen_url.startsWith("/uploads/productos/")) return;
  const nombreArchivo = path.basename(imagen_url);
  const rutaCompleta = path.join(CARPETA_IMAGENES, nombreArchivo);
  fs.unlink(rutaCompleta, (err) => {
    if (err && err.code !== "ENOENT") console.error("No se pudo borrar la imagen:", err.message);
  });
}
