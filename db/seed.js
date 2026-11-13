// db/seed.js
// Ejecuta "npm run seed" para llenar la base de datos con datos de ejemplo.

import bcrypt from "bcryptjs";
import { db } from "./database.js";

const categorias = [
  { nombre: "Hardware", slug: "hardware", icono: "cpu" },
  { nombre: "Redes", slug: "redes", icono: "router" },
  { nombre: "Videovigilancia", slug: "videovigilancia", icono: "camera" },
  { nombre: "Accesorios", slug: "accesorios", icono: "headset" },
  { nombre: "Cables", slug: "cables", icono: "cable" },
  { nombre: "Adaptadores", slug: "adaptadores", icono: "usb" },
  { nombre: "Laptops y PCs", slug: "laptops-pcs", icono: "laptop" },
  { nombre: "Componentes PC", slug: "componentes-pc", icono: "gpu" },
  { nombre: "Monitores", slug: "monitores", icono: "monitor" },
  { nombre: "Smart Home", slug: "smart-home", icono: "bulb" },
  { nombre: "Impresoras", slug: "impresoras", icono: "printer" },
];

const productos = [
  // ---------- Hardware ----------
  { nombre: "SSD BIWIN 512GB M100", categoria: "hardware", precio: 260, stock: 16, icono: "ssd", destacado: 1,
    descripcion: "Unidad de estado sólido M.2 de alto rendimiento, ideal para acelerar laptops y PCs de escritorio.",
    caracteristicas: "Capacidad 512GB\nInterfaz M.2 NVMe PCIe\nVelocidad de lectura hasta 2400MB/s\nGarantía 3 años" },
  { nombre: "Disco Sólido SSD 240GB Lenovo", categoria: "hardware", precio: 230, stock: 20, icono: "ssd", destacado: 0,
    descripcion: "Reemplazo directo para discos mecánicos, mejora notable en tiempos de arranque." },
  { nombre: "Disco Sólido M.2 256GB Lenovo", categoria: "hardware", precio: 200, stock: 18, icono: "ssd", destacado: 0,
    descripcion: "SSD M.2 compacto, compatible con la mayoría de laptops modernas." },
  { nombre: "SSD SATA Western Digital 1TB", categoria: "hardware", precio: 320, stock: 10, icono: "hdd", destacado: 1,
    descripcion: "Gran capacidad de almacenamiento con la confiabilidad de la marca Western Digital.",
    caracteristicas: "Capacidad 1TB\nInterfaz SATA III 6Gb/s\nFactor de forma 2.5\"\nMarca Western Digital" },
  { nombre: "Teclado Interno Lenovo 15.6\" 330-15 IKB", categoria: "hardware", precio: 150, stock: 12, icono: "keyboard", destacado: 0,
    descripcion: "Teclado de repuesto original con botón de encendido, para laptops Lenovo de 15.6 pulgadas." },
  { nombre: "Pasta Térmica Arctic MX-6 4g", categoria: "hardware", precio: 75, stock: 25, icono: "chip", destacado: 0,
    descripcion: "Compuesto térmico de alto rendimiento para procesadores y tarjetas gráficas." },
  { nombre: "Memoria RAM DDR4 16GB 3200MHz", categoria: "hardware", precio: 180, stock: 22, icono: "ram", destacado: 0,
    descripcion: "Módulo de memoria para escritorio, compatible con la mayoría de placas actuales." },
  { nombre: "Fuente de Poder 600W 80+ Bronze", categoria: "hardware", precio: 210, stock: 14, icono: "psu", destacado: 0,
    descripcion: "Fuente certificada con protección contra sobrecarga, ideal para PCs gamer de gama media." },

  // ---------- Redes ----------
  { nombre: "Router N300 Wireless WR3N", categoria: "redes", precio: 140, stock: 15, icono: "router", destacado: 0,
    descripcion: "Router inalámbrico de entrada, fácil de instalar para hogares y oficinas pequeñas." },
  { nombre: "Router D-Link Smart AC1200 R12", categoria: "redes", precio: 250, stock: 13, icono: "router", destacado: 1,
    descripcion: "Doble banda AC1200 con 4 puertos LAN 10/100/1000Mbps, ideal para varios dispositivos.",
    caracteristicas: "Doble banda 2.4GHz + 5GHz\nVelocidad total hasta 1200Mbps\n4 puertos LAN Gigabit\nControl parental por app" },
  { nombre: "Switch TP-Link 16 Puertos TL-SF1016D", categoria: "redes", precio: 160, stock: 9, icono: "switch", destacado: 0,
    descripcion: "Switch no administrable de escritorio para expandir tu red cableada." },
  { nombre: "Antena Ubiquiti M5 LBE-M5-23 Lite Beam", categoria: "redes", precio: 380, stock: 6, icono: "antenna", destacado: 0,
    descripcion: "Enlace inalámbrico de largo alcance para conectar dos puntos sin cables." },
  { nombre: "Crimpadora Modular AW250NXT02", categoria: "redes", precio: 65, stock: 20, icono: "tool", destacado: 0,
    descripcion: "Herramienta para armar conectores RJ45, incluye pelacables." },
  { nombre: "Soplador y Aspirador de Aire 800W", categoria: "redes", precio: 95, stock: 11, icono: "blower", destacado: 0,
    descripcion: "Herramienta 2 en 1 para limpieza profunda de PCs, laptops e impresoras." },

  // ---------- Videovigilancia ----------
  { nombre: "EZVIZ Cámara H6C PRO 2K 3MP", categoria: "videovigilancia", precio: 210, stock: 17, icono: "camera", destacado: 1,
    descripcion: "Visión nocturna a color, resistente a la intemperie, monitoreo desde el celular.",
    caracteristicas: "Resolución 2K (3MP)\nVisión nocturna a color\nResistencia IP65 (exteriores)\nAudio bidireccional\nAlmacenamiento en tarjeta microSD o nube" },
  { nombre: "EZVIZ Cámara Smart Home H8C PRO 2K 4MP", categoria: "videovigilancia", precio: 240, stock: 12, icono: "camera", destacado: 0,
    descripcion: "Cámara inteligente con seguimiento de movimiento y notificaciones en tiempo real." },
  { nombre: "EZVIZ Cámara Smart Home H9C 3K Dual 5MP", categoria: "videovigilancia", precio: 320, stock: 7, icono: "camera", destacado: 1,
    descripcion: "Dos lentes con seguimiento automático de movimiento y zoom digital.",
    caracteristicas: "Resolución 3K (5MP)\nDoble lente con panorámica 360°\nSeguimiento automático de movimiento\nVisión nocturna a color" },
  { nombre: "DVR 8 Canales Full HD", categoria: "videovigilancia", precio: 350, stock: 8, icono: "dvr", destacado: 0,
    descripcion: "Grabador de video digital compatible con cámaras análogas HD, salida HDMI." },
  { nombre: "Kit 4 Cámaras + DVR", categoria: "videovigilancia", precio: 890, stock: 5, icono: "kit", destacado: 1,
    descripcion: "Sistema completo de videovigilancia listo para instalar, incluye cables y fuente.",
    caracteristicas: "4 cámaras Full HD incluidas\nDVR de 4 canales\nCables y fuente de poder incluidos\nAcceso remoto desde el celular" },

  // ---------- Accesorios ----------
  { nombre: "Motorola Squads 200 PK Kids Wired Headphones", categoria: "accesorios", precio: 60, stock: 18, icono: "headset", destacado: 0,
    descripcion: "Audífonos con cable pensados para el público infantil, volumen limitado y diseño resistente." },
  { nombre: "Maxell Audífonos Stylez BIG-660", categoria: "accesorios", precio: 85, stock: 20, icono: "headset", destacado: 0,
    descripcion: "Audífonos over-ear con sonido balanceado para uso diario." },
  { nombre: "Cybertel Micrófono CYB P800", categoria: "accesorios", precio: 140, stock: 10, icono: "mic", destacado: 0,
    descripcion: "Ideal para streaming y videollamadas, incluye soporte antivibración." },
  { nombre: "Cybertel Auricular Gamer CYB HG502 RGB", categoria: "accesorios", precio: 120, stock: 16, icono: "headset", destacado: 1,
    descripcion: "Sonido envolvente, diadema acolchada e iluminación RGB para sesiones largas de juego.",
    caracteristicas: "Sonido envolvente 7.1 virtual\nIluminación RGB\nMicrófono con cancelación de ruido\nConexión USB / 3.5mm" },
  { nombre: "Halion Micrófono TM300", categoria: "accesorios", precio: 130, stock: 9, icono: "mic", destacado: 0,
    descripcion: "Micrófono de pedestal para PC, ideal para podcasts y clases virtuales." },
  { nombre: "Halion Headset Gaming HA-Z25", categoria: "accesorios", precio: 135, stock: 14, icono: "headset", destacado: 0,
    descripcion: "Auriculares gamer con micrófono retráctil y almohadillas de espuma viscoelástica." },
  { nombre: "Halion Pad Mouse RGB MP-14", categoria: "accesorios", precio: 60, stock: 24, icono: "padmouse", destacado: 0,
    descripcion: "Superficie extendida con bordes iluminados, base antideslizante." },
  { nombre: "Hochi Mouse Inalámbrico Dual WL12", categoria: "accesorios", precio: 75, stock: 26, icono: "mouse", destacado: 0,
    descripcion: "Conexión dual Bluetooth y USB, sensor óptico de alta precisión." },

  // ---------- Cables ----------
  { nombre: "Cable HDMI 2.0 4K (3m)", categoria: "cables", precio: 45, stock: 30, icono: "cable", destacado: 0,
    descripcion: "Cable HDMI de alta velocidad, soporta resolución 4K a 60Hz." },
  { nombre: "Cable USB-C a USB-C (1m)", categoria: "cables", precio: 35, stock: 35, icono: "cable", destacado: 0,
    descripcion: "Cable de carga y datos, compatible con laptops y celulares USB-C." },
  { nombre: "Cable UTP Cat 6 (Rollo 100m)", categoria: "cables", precio: 190, stock: 8, icono: "cable", destacado: 0,
    descripcion: "Cable de red categoría 6 para instalaciones estructuradas de alta velocidad." },
  { nombre: "Cable de Poder Universal", categoria: "cables", precio: 25, stock: 40, icono: "cable", destacado: 0,
    descripcion: "Cable de alimentación estándar para PCs, monitores e impresoras." },

  // ---------- Adaptadores ----------
  { nombre: "Adaptador USB-C a HDMI 4K", categoria: "adaptadores", precio: 70, stock: 19, icono: "usb", destacado: 0,
    descripcion: "Conecta tu laptop USB-C a un monitor o TV con salida HDMI en resolución 4K." },
  { nombre: "Adaptador Bluetooth USB 5.0", categoria: "adaptadores", precio: 45, stock: 22, icono: "usb", destacado: 0,
    descripcion: "Añade conectividad Bluetooth a cualquier PC de escritorio." },
  { nombre: "Lector de Memorias USB 3.0 Multi-tarjeta", categoria: "adaptadores", precio: 40, stock: 24, icono: "usb", destacado: 0,
    descripcion: "Compatible con tarjetas SD, microSD y más, transferencia de alta velocidad." },
  { nombre: "Hub USB 3.0 de 4 Puertos", categoria: "adaptadores", precio: 55, stock: 20, icono: "usb", destacado: 0,
    descripcion: "Expande tus puertos USB disponibles, ideal para laptops con pocos puertos." },

  // ---------- Laptops y PCs ----------
  { nombre: "Laptop Lenovo IdeaPad 3 Ryzen 5 8GB 512GB SSD", categoria: "laptops-pcs", precio: 2199, stock: 6, icono: "laptop", destacado: 1,
    descripcion: "Pantalla 15.6\" Full HD, ideal para trabajo, estudio y multitarea diaria.",
    caracteristicas: "Procesador AMD Ryzen 5\nMemoria RAM 8GB\nAlmacenamiento SSD 512GB\nPantalla 15.6\" Full HD\nSistema operativo Windows 11" },
  { nombre: "Laptop HP 15 Intel Core i5 8GB 256GB SSD", categoria: "laptops-pcs", precio: 2450, stock: 7, icono: "laptop", destacado: 1,
    descripcion: "Rendimiento equilibrado para oficina, con lector de huella y batería de larga duración.",
    caracteristicas: "Procesador Intel Core i5\nMemoria RAM 8GB\nAlmacenamiento SSD 256GB\nLector de huella digital\nBatería de larga duración" },
  { nombre: "Laptop ASUS Vivobook Core i3 8GB 256GB SSD", categoria: "laptops-pcs", precio: 1750, stock: 9, icono: "laptop", destacado: 0,
    descripcion: "Compacta y liviana, perfecta para trámites, navegación y videollamadas." },
  { nombre: "Laptop Gamer ASUS TUF Ryzen 7 RTX 3050 16GB", categoria: "laptops-pcs", precio: 4590, stock: 4, icono: "laptop", destacado: 1,
    descripcion: "Pantalla 144Hz, tarjeta gráfica dedicada y sistema de refrigeración reforzado para gaming.",
    caracteristicas: "Procesador AMD Ryzen 7\nTarjeta gráfica RTX 3050\nMemoria RAM 16GB\nPantalla 144Hz\nTeclado retroiluminado RGB" },
  { nombre: "PC de Escritorio Core i5 12va Gen 16GB 480GB SSD", categoria: "laptops-pcs", precio: 2350, stock: 5, icono: "cpu", destacado: 0,
    descripcion: "Equipo armado y probado, listo para oficina, diseño básico y multitarea." },
  { nombre: "Mini PC Intel N100 8GB 256GB SSD", categoria: "laptops-pcs", precio: 890, stock: 10, icono: "cpu", destacado: 0,
    descripcion: "Compacta, silenciosa y de bajo consumo, ideal para punto de venta u oficina." },
  { nombre: "Tablet Lenovo Tab M10 4GB 64GB", categoria: "laptops-pcs", precio: 650, stock: 12, icono: "tablet", destacado: 0,
    descripcion: "Pantalla de 10.1\", perfecta para entretenimiento, lectura y videollamadas." },

  // ---------- Componentes PC ----------
  { nombre: "Procesador AMD Ryzen 5 5600G", categoria: "componentes-pc", precio: 590, stock: 8, icono: "chip", destacado: 1,
    descripcion: "6 núcleos con gráficos integrados Radeon, ideal para armar un equipo balanceado.",
    caracteristicas: "6 núcleos / 12 hilos\nGráficos integrados Radeon\nSocket AM4\nFrecuencia base 3.9GHz" },
  { nombre: "Procesador Intel Core i5-12400F", categoria: "componentes-pc", precio: 680, stock: 7, icono: "chip", destacado: 0,
    descripcion: "Excelente relación precio-rendimiento para gaming y productividad." },
  { nombre: "Tarjeta Gráfica RTX 4060 8GB", categoria: "componentes-pc", precio: 1690, stock: 5, icono: "gpu", destacado: 1,
    descripcion: "Ray tracing y DLSS para gaming en 1080p/1440p con gran eficiencia energética.",
    caracteristicas: "Memoria 8GB GDDR6\nRay tracing y DLSS 3\nSalidas HDMI y DisplayPort\nRecomendado para 1080p/1440p" },
  { nombre: "Tarjeta Gráfica RX 6600 8GB", categoria: "componentes-pc", precio: 1190, stock: 6, icono: "gpu", destacado: 0,
    descripcion: "Gran rendimiento en juegos actuales a una relación precio-valor muy competitiva." },
  { nombre: "Placa Madre B550M DDR4", categoria: "componentes-pc", precio: 480, stock: 9, icono: "mobo", destacado: 0,
    descripcion: "Compatible con procesadores AMD Ryzen serie 5000, soporta M.2 NVMe." },
  { nombre: "Placa Madre B760M DDR4", categoria: "componentes-pc", precio: 520, stock: 8, icono: "mobo", destacado: 0,
    descripcion: "Para procesadores Intel de 12va y 13va generación, formato micro-ATX." },
  { nombre: "Gabinete Gamer ATX con 4 Ventiladores RGB", categoria: "componentes-pc", precio: 260, stock: 11, icono: "fan", destacado: 0,
    descripcion: "Panel lateral de vidrio templado, buen flujo de aire y ventiladores RGB incluidos." },
  { nombre: "Memoria RAM DDR5 16GB 5600MHz", categoria: "componentes-pc", precio: 320, stock: 14, icono: "ram", destacado: 0,
    descripcion: "Alto rendimiento para las plataformas más recientes de Intel y AMD." },
  { nombre: "SSD NVMe M.2 1TB Gen4", categoria: "componentes-pc", precio: 380, stock: 15, icono: "ssd", destacado: 1,
    descripcion: "Velocidades de lectura de hasta 5000MB/s, ideal para carga rápida de juegos y programas.",
    caracteristicas: "Capacidad 1TB\nInterfaz PCIe Gen4 NVMe\nLectura hasta 5000MB/s\nDisipador incluido" },

  // ---------- Monitores ----------
  { nombre: "Monitor LG 24\" Full HD IPS 100Hz", categoria: "monitores", precio: 550, stock: 13, icono: "monitor", destacado: 1,
    descripcion: "Colores precisos y ángulos de visión amplios, ideal para oficina y multimedia.",
    caracteristicas: "Panel IPS 24\"\nResolución Full HD\nTasa de refresco 100Hz\nEntradas HDMI y VGA" },
  { nombre: "Monitor Gamer Samsung 27\" Curvo 165Hz", categoria: "monitores", precio: 950, stock: 6, icono: "monitor", destacado: 1,
    descripcion: "Panel curvo VA, tiempo de respuesta 1ms, ideal para juegos competitivos.",
    caracteristicas: "Panel curvo VA 27\"\nTasa de refresco 165Hz\nTiempo de respuesta 1ms\nResolución Full HD" },
  { nombre: "Monitor AOC 21.5\" Full HD 75Hz", categoria: "monitores", precio: 420, stock: 16, icono: "monitor", destacado: 0,
    descripcion: "Opción económica y confiable para trabajo diario y estudio." },
  { nombre: "Monitor ASUS 27\" 2K QHD 144Hz", categoria: "monitores", precio: 1190, stock: 5, icono: "monitor", destacado: 0,
    descripcion: "Resolución 2K con alta tasa de refresco, perfecto para diseño y gaming." },
  { nombre: "Soporte de Mesa para Monitor Articulado", categoria: "monitores", precio: 95, stock: 20, icono: "monitor", destacado: 0,
    descripcion: "Brazo ajustable en altura, inclinación y giro para hasta 27 pulgadas." },

  // ---------- Smart Home ----------
  { nombre: "TP-Link Tapo Foco Inteligente WiFi RGB", categoria: "smart-home", precio: 65, stock: 24, icono: "bulb", destacado: 0,
    descripcion: "Control por app y voz, millones de colores y programación de horarios." },
  { nombre: "Enchufe Inteligente WiFi Tapo P100", categoria: "smart-home", precio: 55, stock: 26, icono: "bulb", destacado: 0,
    descripcion: "Enciende y apaga tus equipos a distancia, compatible con Alexa y Google Home." },
  { nombre: "Cámara Smart Home Xiaomi 360° 2K", categoria: "smart-home", precio: 180, stock: 14, icono: "webcam", destacado: 1,
    descripcion: "Visión panorámica, detección de movimiento y audio bidireccional.",
    caracteristicas: "Resolución 2K\nGiro panorámico 360°\nDetección de movimiento con alertas\nAudio bidireccional" },
  { nombre: "Parlante Inteligente Echo Dot 5ta Gen", categoria: "smart-home", precio: 220, stock: 10, icono: "speaker", destacado: 1,
    descripcion: "Asistente de voz Alexa integrado, controla tus dispositivos del hogar con la voz.",
    caracteristicas: "Asistente de voz Alexa integrado\nControl de dispositivos smart home\nAudio mejorado\nConexión WiFi y Bluetooth" },
  { nombre: "Cerradura Inteligente WiFi con Huella", categoria: "smart-home", precio: 590, stock: 5, icono: "bulb", destacado: 0,
    descripcion: "Apertura por huella, clave, tarjeta o app, con registro de accesos." },
  { nombre: "Regulador de Voltaje / UPS 1000VA", categoria: "smart-home", precio: 240, stock: 9, icono: "ups", destacado: 0,
    descripcion: "Protege tus equipos ante cortes y variaciones de energía, autonomía de respaldo incluida." },

  // ---------- Impresoras ----------
  { nombre: "Impresora Multifuncional EPSON EcoTank L3250", categoria: "impresoras", precio: 780, stock: 8, icono: "printer", destacado: 1,
    descripcion: "Sistema de tinta continua, impresión, escaneo y copiado, conexión WiFi." ,
    caracteristicas: "Sistema de tinta continua EcoTank\nImprime, escanea y copia\nConexión WiFi\nBajo costo por impresión" },
  { nombre: "Impresora HP Láser Monocromática M111w", categoria: "impresoras", precio: 650, stock: 7, icono: "printer", destacado: 0,
    descripcion: "Impresión rápida en blanco y negro, ideal para oficinas con alto volumen de documentos." },
  { nombre: "Impresora de Etiquetas Térmica USB", categoria: "impresoras", precio: 290, stock: 12, icono: "printer", destacado: 0,
    descripcion: "Perfecta para negocios: imprime etiquetas de precio, código de barras y más." },
  { nombre: "Cartucho de Tinta Compatible EPSON T664 (pack x4)", categoria: "impresoras", precio: 85, stock: 30, icono: "printer", destacado: 0,
    descripcion: "Botellas de tinta compatibles con impresoras EcoTank, rendimiento equivalente al original." },
  { nombre: "iPhone 18 Pro Max 512GB", categoria: "smart-home", precio: 6499, stock: 15, icono: "laptop", destacado: 1,
    descripcion: "El smartphone más avanzado, titanio oscuro y rendimiento superior.",
    caracteristicas: "Capacidad 512GB\nTitanio oscuro\nChip A18 Bionic\nPantalla Super Retina XDR" },
  { nombre: "Samsung Galaxy S26 Ultra 512GB", categoria: "smart-home", precio: 5899, stock: 12, icono: "laptop", destacado: 1,
    descripcion: "El futuro de Android, con cámaras múltiples y pantalla expansiva.",
    caracteristicas: "Capacidad 512GB\nCámara de 200MP\nPantalla plana OLED\nS Pen incluido" },
  { nombre: "Laptop Gamer Lenovo Legion Pro 7i", categoria: "laptops-pcs", precio: 8200, stock: 5, icono: "laptop", destacado: 1,
    descripcion: "Máximo rendimiento en juegos con chasis premium y teclado RGB.",
    caracteristicas: "Intel Core i9 14va Gen\nRTX 4080 12GB\n32GB RAM DDR5\n2TB SSD NVMe" },
  { nombre: "Consola Nintendo Switch 2 OLED", categoria: "smart-home", precio: 1850, stock: 20, icono: "tv", destacado: 1,
    descripcion: "La última generación de consola portátil con pantalla OLED mejorada.",
    caracteristicas: "Pantalla OLED Edge-to-Edge\nNuevos Joy-Con magnéticos\nDock rediseñado\nResolución 4K en TV" },
  { nombre: "Consola PlayStation 6 Pro", categoria: "smart-home", precio: 3499, stock: 5, icono: "tv", destacado: 1,
    descripcion: "La consola más potente del mundo. Gráficos fotorrealistas y 8K.",
    caracteristicas: "Soporte 8K HDR\nSSD de 4TB\nMando háptico avanzado\nTrazado de rayos" },
  { nombre: "NVIDIA GeForce RTX 5090 32GB", categoria: "componentes-pc", precio: 8900, stock: 3, icono: "gpu", destacado: 1,
    descripcion: "La tarjeta gráfica definitiva para creadores y gamers extremos.",
    caracteristicas: "32GB GDDR7\nArquitectura Blackwell\nDLSS 4.0\nRefrigeración líquida opcional" }
];

const usuarios = [
  { nombre: "Administrador Kernel", email: "admin@kernelsac.com", password: "Admin123!", rol: "admin" },
  { nombre: "Cliente Demo", email: "cliente@kernelsac.com", password: "Cliente123!", rol: "cliente" },
];

const insertCategoria = db.prepare(
  "INSERT OR IGNORE INTO categorias (nombre, slug, icono) VALUES (@nombre, @slug, @icono)"
);
const getCategoriaId = db.prepare("SELECT id FROM categorias WHERE slug = ?");
const insertProducto = db.prepare(`
  INSERT INTO productos (nombre, categoria_id, precio, stock, descripcion, caracteristicas, destacado, icono, imagen_url)
  VALUES (@nombre, @categoria_id, @precio, @stock, @descripcion, @caracteristicas, @destacado, @icono, @imagen_url)
`);
const insertUsuario = db.prepare(`
  INSERT INTO usuarios (nombre, email, password_hash, rol)
  VALUES (@nombre, @email, @password_hash, @rol)
`);

const seed = db.transaction(() => {
  // Limpiar datos previos para poder correr el seed varias veces sin duplicar
  db.exec("DELETE FROM pedido_items; DELETE FROM pedidos; DELETE FROM productos; DELETE FROM categorias; DELETE FROM usuarios;");
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('productos','categorias','pedidos','pedido_items','usuarios');");

  for (const c of categorias) insertCategoria.run(c);

  let currentId = 1;
  for (const p of productos) {
    const cat = getCategoriaId.get(p.categoria);
    if (!cat) {
      console.warn(`Categoría no encontrada para producto "${p.nombre}": ${p.categoria}`);
      continue;
    }
    insertProducto.run({
      nombre: p.nombre,
      categoria_id: cat.id,
      precio: p.precio,
      stock: p.stock,
      descripcion: p.descripcion,
      caracteristicas: p.caracteristicas || "",
      destacado: p.destacado,
      icono: p.icono,
      imagen_url: `/uploads/productos/prod_${currentId++}.jpg`,
    });
  }

  for (const u of usuarios) {
    insertUsuario.run({
      nombre: u.nombre,
      email: u.email,
      password_hash: bcrypt.hashSync(u.password, 10),
      rol: u.rol,
    });
  }
});

seed();
console.log(`Base de datos poblada: ${categorias.length} categorías, ${productos.length} productos, ${usuarios.length} usuarios.`);
console.log(`\nCredenciales de prueba:`);
usuarios.forEach((u) => console.log(`  - ${u.rol.toUpperCase()}: ${u.email} / ${u.password}`));
