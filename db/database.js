// db/database.js
// Abre (o crea si no existe) el archivo de base de datos SQLite.

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "kernelsac.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("cache_size = -64000"); // 64MB memoria cache de páginas SQLite
db.pragma("temp_store = MEMORY");
db.pragma("mmap_size = 268435456"); // 256MB memory-mapped I/O para búsquedas instantáneas

// Crea las tablas e índices si todavía no existen (seguro de ejecutar en cada arranque)
db.exec(`
  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icono TEXT NOT NULL DEFAULT 'chip'
  );

  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria_id INTEGER NOT NULL,
    precio REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    descripcion TEXT,
    caracteristicas TEXT DEFAULT '',
    destacado INTEGER NOT NULL DEFAULT 0,
    icono TEXT NOT NULL DEFAULT 'chip',
    imagen_url TEXT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  );

  -- Índices B-Tree de alto rendimiento para catálogos masivos (70k+ productos)
  CREATE INDEX IF NOT EXISTS idx_prod_cat ON productos(categoria_id);
  CREATE INDEX IF NOT EXISTS idx_prod_precio ON productos(precio);
  CREATE INDEX IF NOT EXISTS idx_prod_destacado ON productos(destacado);
  CREATE INDEX IF NOT EXISTS idx_prod_stock ON productos(stock);
  CREATE INDEX IF NOT EXISTS idx_prod_nombre ON productos(nombre);

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin','cliente')),
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    tipo_cliente TEXT NOT NULL DEFAULT 'invitado' CHECK (tipo_cliente IN ('registrado','invitado')),
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT NOT NULL,
    cliente_direccion TEXT,
    total REAL NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS pedido_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
  );

  CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
  CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(creado_en);
  CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);
`);

// Migración segura: si la base de datos es de una versión anterior y no
// tiene la columna "caracteristicas" en productos, la agregamos sin borrar
// nada de lo que ya existe.
const columnasProductos = db.prepare("PRAGMA table_info(productos)").all();
const tieneCaracteristicas = columnasProductos.some((c) => c.name === "caracteristicas");
if (!tieneCaracteristicas) {
  db.exec("ALTER TABLE productos ADD COLUMN caracteristicas TEXT DEFAULT ''");
}

// Migración segura: agrega la columna "imagen_url" si la base de datos es
// de una versión anterior a la función de imágenes de producto.
const tieneImagenUrl = columnasProductos.some((c) => c.name === "imagen_url");
if (!tieneImagenUrl) {
  db.exec("ALTER TABLE productos ADD COLUMN imagen_url TEXT");
}

// Migración segura: columnas para el carrusel aesthetic y promociones estilo Cyber Curacao
const tieneEnCarrusel = columnasProductos.some((c) => c.name === "en_carrusel");
if (!tieneEnCarrusel) {
  db.exec("ALTER TABLE productos ADD COLUMN en_carrusel INTEGER NOT NULL DEFAULT 0");
}
db.exec("CREATE INDEX IF NOT EXISTS idx_prod_carrusel ON productos(en_carrusel);");
const tienePrecioAnterior = columnasProductos.some((c) => c.name === "precio_anterior");
if (!tienePrecioAnterior) {
  db.exec("ALTER TABLE productos ADD COLUMN precio_anterior REAL DEFAULT NULL");
}
const tieneEtiquetaPromo = columnasProductos.some((c) => c.name === "etiqueta_promo");
if (!tieneEtiquetaPromo) {
  db.exec("ALTER TABLE productos ADD COLUMN etiqueta_promo TEXT DEFAULT ''");
}
const tieneRegaloNombre = columnasProductos.some((c) => c.name === "regalo_nombre");
if (!tieneRegaloNombre) {
  db.exec("ALTER TABLE productos ADD COLUMN regalo_nombre TEXT DEFAULT ''");
}

// Migración Opción 5: Costo de compra de productos para control de rentabilidad y margen
const tienePrecioCosto = columnasProductos.some((c) => c.name === "precio_costo");
if (!tienePrecioCosto) {
  db.exec("ALTER TABLE productos ADD COLUMN precio_costo REAL DEFAULT NULL");
}
db.exec("CREATE INDEX IF NOT EXISTS idx_prod_costo ON productos(precio_costo);");
// Inicializar costo referencial (75% del precio de venta, 25% de margen estimado) si no tiene asignado
db.exec("UPDATE productos SET precio_costo = ROUND(precio * 0.75, 2) WHERE precio_costo IS NULL OR precio_costo = 0;");

// Tabla de configuraciones del sitio y carrusel
db.exec(`
  CREATE TABLE IF NOT EXISTS configuraciones (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chatbot_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sesion_id TEXT,
    mensaje_usuario TEXT NOT NULL,
    respuesta_bot TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

// Configuración por defecto del carrusel
const configCarrusel = db.prepare("SELECT valor FROM configuraciones WHERE clave = 'carrusel'").get();
if (!configCarrusel) {
  db.prepare("INSERT INTO configuraciones (clave, valor) VALUES (?, ?)").run(
    "carrusel",
    JSON.stringify({
      modo: "auto", // "auto" o "manual"
      campana_titulo: "CYBER WOW",
      campana_tag: "OFERTAS EXCLUSIVAS ⚡",
      campana_descuento: "HASTA 50% DSCTO",
      cupon_codigo: "CYBERKERNEL",
      cupon_texto: "Usa cupón: BCP200",
      auto_rotacion: true,
      segundos_rotacion: 5,
    })
  );
}

// Configuración general por defecto (WhatsApp Ventas y Soporte Técnico)
const configGeneral = db.prepare("SELECT valor FROM configuraciones WHERE clave = 'general'").get();
if (!configGeneral) {
  db.prepare("INSERT INTO configuraciones (clave, valor) VALUES (?, ?)").run(
    "general",
    JSON.stringify({
      whatsapp_ventas: "51967006922",
      whatsapp_soporte: "51939059976",
      nombre_tienda: "Kernel SAC",
    })
  );
}

// Producto Honor Magic 8 Lite (ejemplo de la imagen 2 del usuario)
const existeHonor = db.prepare("SELECT id FROM productos WHERE nombre LIKE '%HONOR Magic 8 Lite%'").get();
if (!existeHonor) {
  db.prepare(`
    INSERT INTO productos (nombre, categoria_id, precio, stock, descripcion, caracteristicas, destacado, icono, imagen_url, en_carrusel, precio_anterior, etiqueta_promo, regalo_nombre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "HONOR Magic 8 Lite Midnight Black",
    4,
    1349.0,
    15,
    "HONOR Magic 8 Lite con pantalla curva AMOLED ultra resistente, batería de 5800mAh y cámara de alta resolución. Incluye audífonos inalámbricos de regalo.",
    "512GB Almacenamiento\n8GB RAM + 8GB Turbo\nPantalla 6.7\" AMOLED 120Hz\nBatería 5800 mAh Ultra Duradera\nCámara Matrix 108MP",
    1,
    "phone",
    "/assets/honor-magic8.jpg",
    1,
    1899.0,
    "REGALO",
    "Audífonos Inalámbricos"
  );
}

// Valores iniciales para productos destacados en carrusel
db.exec(`
  UPDATE productos SET en_carrusel = 1, precio_anterior = 6699.0, etiqueta_promo = 'NUEVO', regalo_nombre = 'Cargador 67W'
  WHERE id = 67 AND (precio_anterior IS NULL OR precio_anterior = 0);

  UPDATE productos SET en_carrusel = 1, precio_anterior = 6299.0, etiqueta_promo = 'EXCLUSIVO', regalo_nombre = 'Smartband Galaxy Fit'
  WHERE id = 68 AND (precio_anterior IS NULL OR precio_anterior = 0);

  UPDATE productos SET en_carrusel = 1, precio_anterior = 8999.0, etiqueta_promo = 'GAMING PRO', regalo_nombre = 'Mouse Gamer RGB'
  WHERE id = 69 AND (precio_anterior IS NULL OR precio_anterior = 0);

  UPDATE productos SET en_carrusel = 1, precio_anterior = 2199.0, etiqueta_promo = 'PRE-VENTA', regalo_nombre = 'Estuche OLED'
  WHERE id = 70 AND (precio_anterior IS NULL OR precio_anterior = 0);
`);

// Carpeta donde se guardan las imágenes subidas por el admin (dentro de
// public/ para que Express las sirva directo como archivos estáticos).
export const CARPETA_IMAGENES = path.join(__dirname, "..", "public", "uploads", "productos");
fs.mkdirSync(CARPETA_IMAGENES, { recursive: true });
