// db/apply_product_images.js
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

const imageMap = {
  1: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&q=80", // SSD BIWIN M100 M.2
  // 2 and 3 already exist: Lenovo SSD 240GB and Lenovo M.2
  4: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Samsung_870_QVO_8TB_SATA_2%2C5_Zoll_Internes_Solid_State_Drive_%28SSD%29_%28MZ-77Q8T0BW%29_20211008_SSD023_corr.png/600px-Samsung_870_QVO_8TB_SATA_2%2C5_Zoll_Internes_Solid_State_Drive_%28SSD%29_%28MZ-77Q8T0BW%29_20211008_SSD023_corr.png", // SSD SATA Western Digital 1TB
  5: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/HP_compaq_6910p_keyboard.jpg/600px-HP_compaq_6910p_keyboard.jpg", // Teclado Interno Lenovo 15.6"
  // 6 already exists: Arctic MX-6
  7: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Ram-may-tinh-corsair-hoanghapc.jpg/600px-Ram-may-tinh-corsair-hoanghapc.jpg", // Memoria RAM DDR4 16GB 3200MHz
  8: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&q=80", // Fuente de Poder 600W 80+ Bronze
  9: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80", // Router N300 Wireless WR3N
  10: "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=600&q=80", // Router D-Link Smart AC1200 R12
  11: "https://images.unsplash.com/photo-1551703599-6b3e8379aa8b?w=600&q=80", // Switch TP-Link 16 Puertos
  12: "https://images.unsplash.com/photo-1516192518150-0d8fee5425e3?w=600&q=80", // Antena Ubiquiti LiteBeam M5
  13: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80", // Crimpadora Modular RJ45
  14: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80", // Soplador y Aspirador 800W
  15: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/CCTV_dome_camera.jpg/600px-CCTV_dome_camera.jpg", // EZVIZ Cámara H6C PRO 2K 3MP
  16: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=80", // EZVIZ Cámara H8C PRO 2K 4MP
  17: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80", // EZVIZ Cámara H9C 3K Dual 5MP
  18: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600&q=80", // DVR 8 Canales Full HD
  19: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80", // Kit 4 Cámaras + DVR
  20: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80", // Motorola Squads 200 PK Kids Headphones
  21: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80", // Maxell Audífonos Stylez BIG-660
  22: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&q=80", // Cybertel Micrófono CYB P800
  23: "https://images.unsplash.com/photo-1599669454699-248893623440?w=600&q=80", // Cybertel Auricular Gamer CYB HG502 RGB
  24: "https://images.unsplash.com/photo-1583773121544-77e774026045?w=600&q=80", // Halion Micrófono TM300
  25: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80", // Halion Headset Gaming HA-Z25
  26: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&q=80", // Halion Pad Mouse RGB MP-14
  27: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&q=80", // Hochi Mouse Inalámbrico Dual WL12
  28: "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?w=600&q=80", // Cable HDMI 2.0 4K
  29: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&q=80", // Cable USB-C a USB-C 1m
  30: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80", // Cable UTP Cat 6
  31: "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=600&q=80", // Cable de Poder Universal
  32: "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600&q=80", // Adaptador USB-C a HDMI 4K
  33: "https://images.unsplash.com/photo-1622434641406-a158123450f9?w=600&q=80", // Adaptador Bluetooth USB 5.0
  34: "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=600&q=80", // Lector de Memorias USB 3.0
  35: "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=600&q=80", // Hub USB 3.0 4 Puertos
  36: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80", // Laptop Lenovo IdeaPad 3
  37: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80", // Laptop HP 15
  38: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80", // Laptop ASUS Vivobook
  39: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80", // Laptop Gamer ASUS TUF
  40: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=600&q=80", // PC de Escritorio Core i5
  41: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&q=80", // Mini PC Intel N100
  42: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80", // Tablet Lenovo Tab M10
  43: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&q=80", // Procesador AMD Ryzen 5 5600G
  44: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Intel_i9-14900KF_CPU.jpg/600px-Intel_i9-14900KF_CPU.jpg", // Procesador Intel Core i5-12400F
  45: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600&q=80", // Tarjeta Gráfica RTX 4060 8GB
  46: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Sapphire_AMD_Radeon_RX_7900_XTX.jpg/600px-Sapphire_AMD_Radeon_RX_7900_XTX.jpg", // Tarjeta Gráfica RX 6600 8GB
  47: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80", // Placa Madre B550M DDR4
  48: "https://images.unsplash.com/photo-1555617778-02518510b9fa?w=600&q=80", // Placa Madre B760M DDR4
  49: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Gabinete99.jpg/600px-Gabinete99.jpg", // Gabinete Gamer ATX con 4 Fans RGB
  50: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80", // Memoria RAM DDR5 16GB 5600MHz
  51: "https://upload.wikimedia.org/wikipedia/commons/e/ed/1TB_2280_NVME_SSD.jpg", // SSD NVMe M.2 1TB Gen4
  52: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80", // Monitor LG 24" Full HD
  53: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&q=80", // Monitor Gamer Samsung 27" Curvo
  54: "https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=600&q=80", // Monitor AOC 21.5" Full HD
  55: "https://images.unsplash.com/photo-1551645120-d70bfe84c826?w=600&q=80", // Monitor ASUS 27" 2K QHD
  56: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80", // Soporte de Mesa para Monitor Articulado
  57: "https://images.unsplash.com/photo-1550985616-10810253b84d?w=600&q=80", // TP-Link Tapo Foco Inteligente RGB
  58: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80", // Enchufe Inteligente WiFi Tapo P100
  59: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=80", // Cámara Smart Home Xiaomi 360° 2K
  60: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=600&q=80", // Parlante Inteligente Echo Dot 5ta Gen
  61: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80", // Cerradura Inteligente WiFi con Huella
  62: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600&q=80", // Regulador de Voltaje / UPS 1000VA
  63: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/C11CB57201_Inyecci%C3%B3n%2Bde%2Btinta_Epson%2BEcoTank%2BL800_ES.png/600px-C11CB57201_Inyecci%C3%B3n%2Bde%2Btinta_Epson%2BEcoTank%2BL800_ES.png", // Impresora Epson EcoTank L3250
  64: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIRI3Iipa-9IkKuOBJfvmiWwB56Pzd744oi4RQhPkNf4NUB2KmRfpLTSM&s=10", // Impresora HP Laserjet M111w
  65: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSCmKMLMQ4l0aszZE5OAoEACr2Cq4dZyH00DldY5H9HjI3TcJmJ1kcdJ-4&s=10", // Impresora Etiquetas Térmica
  66: "https://media.falabella.com/falabellaPE/141506522_02/w=1500,h=1500,fit=cover" // Cartucho Tinta EPSON T664
};

async function downloadFile(url, destPath) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "KernelSACApp/1.0 (info@kernelsac.com)"
      }
    });
    if (!res.ok) {
      console.warn(`  HTTP error ${res.status} downloading ${url}`);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) return false;
    fs.writeFileSync(destPath, buf);
    return true;
  } catch (err) {
    console.error(`  Error downloading ${url}:`, err.message);
    return false;
  }
}

async function main() {
  const productos = db.prepare("SELECT id, nombre FROM productos ORDER BY id ASC").all();
  console.log(`Verificando y aplicando imágenes para ${productos.length} productos...`);

  const updateStmt = db.prepare("UPDATE productos SET imagen_url = ? WHERE id = ?");

  for (const p of productos) {
    const fileName = `prod_${p.id}.jpg`;
    const destPath = path.join(UPLOAD_DIR, fileName);
    const publicUrl = `/uploads/productos/${fileName}`;

    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
      updateStmt.run(publicUrl, p.id);
      console.log(`[ID ${p.id}] OK (ya existente): ${p.nombre} -> ${publicUrl} (${fs.statSync(destPath).size} bytes)`);
      continue;
    }

    const url = imageMap[p.id];
    if (!url) {
      console.warn(`[ID ${p.id}] Sin URL configurada para: ${p.nombre}`);
      continue;
    }

    console.log(`[ID ${p.id}] Descargando imagen para: ${p.nombre}...`);
    const ok = await downloadFile(url, destPath);
    if (ok) {
      updateStmt.run(publicUrl, p.id);
      console.log(`  ✅ Guardado como ${fileName} (${fs.statSync(destPath).size} bytes)`);
    } else {
      console.error(`  ❌ Falló descarga para [ID ${p.id}] ${p.nombre}`);
    }

    // Pequeña pausa
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log("\nProceso finalizado con éxito.");
  const allProds = db.prepare("SELECT id, nombre, imagen_url FROM productos ORDER BY id ASC").all();
  const sinImagen = allProds.filter(p => !p.imagen_url || !p.imagen_url.startsWith("/uploads/productos/"));
  console.log(`Total productos: ${allProds.length}`);
  console.log(`Productos con imagen local asignada: ${allProds.length - sinImagen.length}`);
  if (sinImagen.length > 0) {
    console.log("Pendientes:", sinImagen);
  }
}

main().catch(console.error);
