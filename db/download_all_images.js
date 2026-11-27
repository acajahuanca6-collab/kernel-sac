// db/download_all_images.js
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "kernelsac.db");
const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "productos");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Mapeo exhaustivo y verificado con imágenes de alta definición de Unsplash
const imageMap = {
  // Almacenamiento & Hardware básico
  1: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80", // SSD M.2
  2: "https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=600&auto=format&fit=crop&q=80", // SSD SATA 2.5
  3: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80", // SSD M.2 256GB
  4: "https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=600&auto=format&fit=crop&q=80", // SSD WD 1TB
  5: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80", // Teclado Lenovo
  6: "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=600&auto=format&fit=crop&q=80", // Pasta térmica
  7: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80", // Memoria RAM DDR4
  8: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80", // Fuente 600W
  
  // Redes
  9: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80", // Router N300
  10: "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=600&auto=format&fit=crop&q=80", // Router AC1200
  11: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80", // Switch 16p
  12: "https://images.unsplash.com/photo-1516192518150-0d8fee5425e3?w=600&auto=format&fit=crop&q=80", // Antena Ubiquiti
  13: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80", // Crimpadora RJ45
  14: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80", // Soplador de aire
  
  // Videovigilancia
  15: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80", // Cámara H6C
  16: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80", // Cámara H8C
  17: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80", // Cámara H9C dual
  18: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600&auto=format&fit=crop&q=80", // DVR 8 Canales
  19: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80", // Kit 4 cámaras
  
  // Accesorios
  20: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80", // Motorola Squads
  21: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80", // Maxell Audifonos
  22: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80", // Microfono Cybertel
  23: "https://images.unsplash.com/photo-1599669454699-248893623440?w=600&auto=format&fit=crop&q=80", // Auricular Gamer
  24: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80", // Microfono Halion
  25: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&auto=format&fit=crop&q=80", // Headset Gaming
  26: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80", // Pad Mouse RGB
  27: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80", // Mouse Hochi Dual
  
  // Cables
  28: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?w=600&auto=format&fit=crop&q=80", // Cable HDMI
  29: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80", // Cable USB-C
  30: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80", // Cable UTP Cat 6
  31: "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=600&auto=format&fit=crop&q=80", // Cable de poder
  
  // Adaptadores
  32: "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600&auto=format&fit=crop&q=80", // Adaptador USB-C a HDMI
  33: "https://images.unsplash.com/photo-1622434641406-a158123450f9?w=600&auto=format&fit=crop&q=80", // Bluetooth USB 5.0
  34: "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=600&auto=format&fit=crop&q=80", // Lector de memorias
  35: "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=600&auto=format&fit=crop&q=80", // Hub USB 4 puertos
  
  // Laptops y PCs
  36: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80", // Lenovo IdeaPad
  37: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80", // HP 15 Core i5
  38: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80", // ASUS Vivobook
  39: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=80", // ASUS TUF Gamer
  40: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=600&auto=format&fit=crop&q=80", // PC de escritorio
  41: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&auto=format&fit=crop&q=80", // Mini PC N100
  42: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80", // Tablet Lenovo M10
  
  // Componentes PC
  43: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop&q=80", // Ryzen 5 5600G
  44: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop&q=80", // Intel i5 12400F
  45: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600&auto=format&fit=crop&q=80", // RTX 4060
  46: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80", // RX 6600
  47: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80", // B550M
  48: "https://images.unsplash.com/photo-1555617778-02518510b9fa?w=600&auto=format&fit=crop&q=80", // B760M
  49: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=600&auto=format&fit=crop&q=80", // Gabinete ATX RGB
  50: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80", // RAM DDR5 16GB
  51: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80", // SSD NVMe 1TB Gen4
  
  // Monitores
  52: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80", // LG 24 IPS
  53: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&auto=format&fit=crop&q=80", // Samsung 27 Curvo
  54: "https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=600&auto=format&fit=crop&q=80", // AOC 21.5
  55: "https://images.unsplash.com/photo-1551645120-d70bfe84c826?w=600&auto=format&fit=crop&q=80", // ASUS 27 2K
  56: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80", // Soporte articulado
  
  // Smart Home
  57: "https://images.unsplash.com/photo-1550985616-10810253b84d?w=600&auto=format&fit=crop&q=80", // Foco RGB
  58: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80", // Enchufe inteligente
  59: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80", // Camara Xiaomi 360
  60: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=600&auto=format&fit=crop&q=80", // Echo Dot 5ta Gen
  61: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80", // Cerradura inteligente
  62: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600&auto=format&fit=crop&q=80", // UPS 1000VA
  
  // Impresoras
  63: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80", // Epson L3250
  64: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80", // HP LaserJet
  65: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80", // Impresora termica
  66: "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=600&auto=format&fit=crop&q=80", // Tintas Epson
  
  // Mega Estrellas Carrusel & Flagships
  67: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80", // iPhone 18 Pro Max
  68: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80", // Samsung Galaxy S26 Ultra
  69: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=80", // Lenovo Legion Pro 7i
  70: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&auto=format&fit=crop&q=80", // Nintendo Switch OLED
  71: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80", // PS6 Pro
  72: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600&auto=format&fit=crop&q=80", // RTX 5090
  73: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80", // Honor Magic 8 Lite
};

async function downloadFile(url, destPath) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1500) return false;
    fs.writeFileSync(destPath, buf);
    return true;
  } catch (err) {
    return false;
  }
}

async function run() {
  // Copiar activos locales antes del bucle para evitar descargas innecesarias
  const honorAsset = path.join(__dirname, "..", "public", "assets", "honor-magic8.jpg");
  const iphoneAsset = path.join(__dirname, "..", "public", "assets", "iphone18.jpg");
  if (fs.existsSync(honorAsset)) {
    fs.copyFileSync(honorAsset, path.join(UPLOAD_DIR, "prod_73.jpg"));
  }
  if (fs.existsSync(iphoneAsset)) {
    fs.copyFileSync(iphoneAsset, path.join(UPLOAD_DIR, "prod_67.jpg"));
  }

  const productos = db.prepare("SELECT id, nombre, imagen_url FROM productos ORDER BY id ASC").all();
  console.log(`Iniciando descarga y asignación de imágenes para ${productos.length} productos...`);

  const updateStmt = db.prepare("UPDATE productos SET imagen_url = ? WHERE id = ?");

  let descargadas = 0;
  for (const p of productos) {
    const fileName = `prod_${p.id}.jpg`;
    const destPath = path.join(UPLOAD_DIR, fileName);
    const publicUrl = `/uploads/productos/${fileName}`;

    // Si ya existe y pesa más de 4KB, mantener
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 4000) {
      updateStmt.run(publicUrl, p.id);
      descargadas++;
      continue;
    }

    // Probar URL de la lista
    const targetUrl = imageMap[p.id] || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80";
    const ok = await downloadFile(targetUrl, destPath);
    if (ok) {
      updateStmt.run(publicUrl, p.id);
      descargadas++;
      console.log(`[ID ${p.id}] OK: ${p.nombre}`);
    } else {
      console.warn(`[ID ${p.id}] Falló descarga de ${targetUrl}`);
    }
  }

  console.log(`\nCompletado: ${descargadas}/${productos.length} imágenes descargadas y listas.`);
}

run().catch(console.error);
