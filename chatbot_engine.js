// chatbot_engine.js - Motor Inteligente de Asesoría Técnica para Kernel SAC
import { db } from "./db/database.js";

// Memoria de conversación por sesión para dar continuidad inteligente
const sessionMemory = new Map();

export function getSessionMemory(id) {
  if (!id) return { tema: null, categoriaId: null, categoriaSlug: null, presupuesto: null, productos: [], updatedAt: Date.now() };
  let mem = sessionMemory.get(id);
  if (!mem || Date.now() - mem.updatedAt > 1000 * 60 * 45) {
    mem = { tema: null, categoriaId: null, categoriaSlug: null, presupuesto: null, productos: [], updatedAt: Date.now() };
    sessionMemory.set(id, mem);
  }
  return mem;
}

export function updateSessionMemory(id, data) {
  if (!id) return;
  const mem = getSessionMemory(id);
  Object.assign(mem, data, { updatedAt: Date.now() });
  sessionMemory.set(id, mem);
}

// Normaliza el texto para búsquedas sin tildes, signos ni mayúsculas
export function normalizarTexto(txt) {
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,:;()\[\]"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function alAzar(opciones) {
  return opciones[Math.floor(Math.random() * opciones.length)];
}

const PALABRAS_VACIAS = new Set([
  "para", "que", "cual", "conviene", "convendria", "elijo", "elegir",
  "compro", "comprar", "mejor", "mejores", "opcion", "opciones", "presupuesto", "hasta", "tengo", "quiero",
  "busco", "buscando", "necesito", "algo", "tienen", "tienes", "soles", "recomiendas",
  "recomiendame", "recomendar", "recomendarme", "recomendacion", "recomendaciones", "tambien",
  "gracias", "porfa", "porfavor", "favor", "alguna", "alguno", "algun", "cuales", "precio", "precios",
  "cuesta", "cuestan", "vale", "valen", "cuanto", "cuantos", "stock", "disponible", "disponibles",
  "hay", "queda", "quedan", "categoria", "categorias",
  "hola", "buenas", "buenos", "dias", "tardes", "noches", "amigo", "asesor",
  "barato", "barata", "baratos", "baratas", "economico", "economica", "economicos", "economicas",
  "comodo", "comoda", "comodos", "comodas", "potente", "potentes", "rapido", "rapida",
  "mas", "menos", "top", "gama", "alta", "baja", "media", "equipo", "equipos"
]);

// Mapa semántico de términos clave a categorías o términos de productos
const MAPA_INTENCIONES = [
  {
    tema: "laptops",
    categoriaSlug: "laptops-pcs",
    regex: /\b(laptop|laptops|notebook|notebooks|portatil|portatiles|vivobook|ideapad|legion|tuf)\b/,
  },
  {
    tema: "pcs",
    categoriaSlug: "laptops-pcs",
    regex: /\b(pc|computadora|computadoras|ordenador|cpu|desktop|setup|pc de escritorio|torre)\b/,
  },
  {
    tema: "celulares",
    categoriaSlug: "smart-home",
    regex: /\b(celular|celulares|smartphone|smartphones|telefono|telefonos|movil|moviles|iphone|samsung|galaxy|honor|xiaomi|redmi)\b/,
  },
  {
    tema: "consolas",
    categoriaSlug: "smart-home",
    regex: /\b(playstation|ps5|ps6|nintendo|switch|consola|consolas|videojuegos)\b/,
  },
  {
    tema: "camaras",
    categoriaSlug: "videovigilancia",
    regex: /\b(camara|camaras|cctv|videovigilancia|vigilancia|ezviz|hikvision|dahua|dvr|seguridad)\b/,
  },
  {
    tema: "redes",
    categoriaSlug: "redes",
    regex: /\b(router|routers|repetidor|repetidores|wifi|wi-fi|switch|switches|antena|antenas|ubiquiti|red|redes|utp|rj45|ethernet|cable de red)\b/,
  },
  {
    tema: "graficas",
    categoriaSlug: "componentes-pc",
    regex: /\b(tarjeta grafica|tarjeta de video|grafica|graficas|gpu|rtx|gtx|rx 6600|rtx 4060|rtx 5090|geforce|radeon)\b/,
  },
  {
    tema: "componentes",
    categoriaSlug: "componentes-pc",
    regex: /\b(procesador|procesadores|intel|ryzen|core i5|core i7|fuente|fuente de poder|placa|motherboard)\b/,
  },
  {
    tema: "almacenamiento",
    categoriaSlug: "hardware",
    regex: /\b(ssd|disco solido|disco duro|m2|m\.2|nvme|almacenamiento|biwin|kingston|western digital)\b/,
  },
  {
    tema: "memoria",
    categoriaSlug: "hardware",
    regex: /\b(ram|memoria ram|ddr4|ddr5|16gb|32gb)\b/,
  },
  {
    tema: "monitores",
    categoriaSlug: "monitores",
    regex: /\b(monitor|monitores|pantalla|pantallas|display|144hz|165hz|curvo|qhd|ips)\b/,
  },
  {
    tema: "impresoras",
    categoriaSlug: "impresoras",
    regex: /\b(impresora|impresoras|multifuncional|epson|ecotank|canon|laser|tinta)\b/,
  },
  {
    tema: "accesorios",
    categoriaSlug: "accesorios",
    regex: /\b(teclado|teclados|mouse|raton|auricular|auriculares|audifono|audifonos|headset|microfono|pad|soporte|pasta termica)\b/,
  },
  {
    tema: "cables",
    categoriaSlug: "cables",
    regex: /\b(cable hdmi|cable usb|cable tipo c|cable de poder)\b/,
  },
  {
    tema: "adaptadores",
    categoriaSlug: "adaptadores",
    regex: /\b(adaptador|hub usb|lector de memoria|bluetooth usb)\b/,
  },
];

export function procesarMensajeChatbot(mensajeOriginal, sessionId = null, configGeneral = {}) {
  const norm = normalizarTexto(mensajeOriginal);
  const numVentas = configGeneral.whatsapp_ventas || "51967006922";
  const numSoporte = configGeneral.whatsapp_soporte || "51939059976";
  const mem = getSessionMemory(sessionId);

  // Helper para armar links de WhatsApp
  const waLink = (numero, textoWa) =>
    `https://wa.me/${numero}?text=${encodeURIComponent(textoWa)}`;

  // 1. SALUDOS Y PRESENTACIÓN
  if (
    /^(hola|buenas|hey|que tal|buen dia|buenos dias|buenas tardes|buenas noches|alo|amigo|asesor)\b/.test(norm) &&
    norm.split(" ").length <= 4
  ) {
    return {
      texto: alAzar([
        "¡Hola crack! 👋 Bienvenido a **Kernel SAC** ⚡ Soy tu Asesor Técnico Especializado.\n\nEstoy listo para recomendarte lo mejor en:\n• 💻 **Laptops y PCs** (Gamer, Oficina, Estudio)\n• 📹 **Cámaras de Seguridad CCTV y Wi-Fi**\n• 🌐 **Redes, Routers y Conectividad**\n• ⚙️ **Componentes, SSDs, RAM y Tarjetas de Video**\n• 🛠️ **Diagnóstico y Soporte Técnico**\n\n¿Qué tipo de solución buscas hoy o cuál es tu presupuesto estimado?",
        "¡Qué onda! Bienvenido a **Kernel SAC** 🚀 Tu asesor técnico amigo a tu servicio.\n\nCuéntame qué proyecto o requerimiento tienes en mente (laptop, armar una PC, mejorar tu Wi-Fi, cámaras para tu negocio) o de cuánto es tu presupuesto, y te muestro las opciones ideales al instante.",
      ]),
      whatsapp: null,
      producto: null,
      productos: [],
    };
  }

  // 2. AGRADECIMIENTOS Y DESPEDIDAS
  if (/^(gracias|muchas gracias|ok gracias|listo gracias|te lo agradezco|vale gracias)\b/.test(norm)) {
    return {
      texto: alAzar([
        "¡Con muchísimo gusto crack! 🙂 En Kernel SAC estamos para ayudarte a equiparte con lo mejor. Si tienes cualquier otra consulta, aquí sigo a tu disposición.",
        "¡De nada amigo! Ha sido un placer asesorarte. Cuando quieras coordinar un pedido o tengas dudas técnicas, aquí estaré 🚀",
      ]),
      whatsapp: null,
      producto: null,
      productos: [],
    };
  }

  if (/^(chau|adios|hasta luego|nos vemos|eso es todo|listo eso seria todo)\b/.test(norm)) {
    return {
      texto: "¡Un gusto haber conversado contigo! Que tengas un excelente día. Si deseas cerrar algún pedido o consultar stock, te esperamos en Kernel SAC 👋",
      whatsapp: null,
      producto: null,
      productos: [],
    };
  }

  // 3. IDENTIDAD / QUIÉN ERES
  if (/(quien eres|eres humano|eres (un )?(bot|robot|ia|inteligencia artificial)|con quien hablo|como te llamas)/.test(norm)) {
    return {
      texto: "Soy el **Asesor Técnico Inteligente de Kernel SAC** 🤖⚡.\n\nEstoy sincronizado en tiempo real con nuestra base de datos para brindarte:\n✅ Recomendaciones precisas de equipos según tu presupuesto.\n✅ Precios oficiales, promociones Cyber y stock disponible.\n✅ Diagnóstico de fallas técnicas y enlace directo con soporte.\n✅ Asistencia inmediata para cerrar tu compra.\n\n¿En qué te puedo asesorar en este momento?",
      whatsapp: null,
      producto: null,
      productos: [],
    };
  }

  // 4. CONTACTO HUMANO DIRECTO / WHATSAPP
  if (/(hablar con (un )?(humano|persona|asesor real)|numero de (whatsapp|telefono|contacto)|atencion al cliente|asesor de ventas)/.test(norm)) {
    const wa = waLink(numVentas, `Hola Kernel SAC, deseo hablar con un asesor comercial sobre una consulta: ${mensajeOriginal}`);
    return {
      texto: "¡Por supuesto! 👨‍💼 Puedes conversar directamente con nuestro equipo de atención humana por WhatsApp para consultas comerciales, cotizaciones formales o pedidos al por mayor.\n\n👇 Haz clic en el botón para abrir el chat de WhatsApp:",
      whatsapp: wa,
      whatsappTexto: "Chatear con Asesor por WhatsApp",
      producto: null,
      productos: [],
    };
  }

  // 5. PREGUNTAS FRECUENTES (FAQS) DE LA TIENDA
  // Ubicación / Tienda física
  if (/(donde estan|donde queda|direccion|tienda fisica|tienen local|ubicacion|donde comprar|lima|wilson|compuplaza)/.test(norm)) {
    const wa = waLink(numVentas, "Hola Kernel SAC, deseo información sobre la dirección de la tienda y retiro de productos.");
    return {
      texto: "📍 **Nuestra Tienda & Cobertura:**\n• **Atención Presencial:** Atendemos en el centro comercial tecnológico de Lima (Av. Garcilaso de la Vega / Wilson) para retiros y asesoría técnica previa coordinación.\n• **Ventas Online:** Despachamos a toda Lima Metropolitana con delivery express (el mismo día o 24 hrs).\n• **Envíos Nacionales:** Despachamos a todo el Perú mediante Shalom, Olva Courier y Marvisur.\n\n¿Deseas coordinar un envío o consultar el stock para retiro?",
      whatsapp: wa,
      whatsappTexto: "Consultar Ubicación / Retiro por WhatsApp",
      producto: null,
      productos: [],
    };
  }

  // Horarios de atención
  if (/(horario|a que hora abren|atienden hoy|domingos|hora de atencion|hasta que hora)/.test(norm)) {
    return {
      texto: "⏰ **Horarios de Atención de Kernel SAC:**\n• **Lunes a Sábado:** 9:00 AM – 8:00 PM (Tienda, Soporte Técnico y Despachos)\n• **Domingos:** Atención virtual y toma de pedidos vía WhatsApp.\n• **Tienda Web:** Puedes comprar y consultar las 24 horas del día los 7 días de la semana.",
      whatsapp: null,
      producto: null,
      productos: [],
    };
  }

  // Métodos de pago
  if (/(formas de pago|metodos de pago|como puedo pagar|como pagar|yape|plin|tarjeta|transferencia|bcp|bbva|interbank|efectivo|contraentrega|cuotas)/.test(norm)) {
    return {
      texto: "💳 **Métodos de Pago 100% Seguros:**\n• 📲 **Billeteras Digitales:** Yape y Plin (al instante sin comisión).\n• 🏦 **Transferencias directas:** BCP, BBVA, Interbank y Banco de la Nación.\n• 💳 **Tarjetas:** Débito y Crédito (Visa, Mastercard, Diners, American Express) de todos los bancos.\n• 💵 **Contraentrega en Efectivo:** Válido para Lima Metropolitana según cobertura.\n\nTodos los pagos incluyen comprobante electrónico (Boleta o Factura).",
      whatsapp: null,
      producto: null,
      productos: [],
    };
  }

  // Envíos / Delivery / Provincias
  if (/(envios|delivery|shalom|olva|marvisur|provincia|provincias|cuanto demora el envio|costo de envio|trujillo|arequipa|cusco|chiclayo|piura|huancayo)/.test(norm)) {
    const wa = waLink(numVentas, "Hola Kernel SAC, deseo consultar el costo y tiempo de envío a mi localidad.");
    return {
      texto: "🚚 **Envíos y Entregas a Todo el Perú:**\n• **Lima Metropolitana:** Envíos express en moto o móvil. ¡Recíbelo el mismo día o en 24 horas!\n• **Provincias:** Despachos diarios garantizados vía **Shalom, Olva Courier o Marvisur** con clave y número de seguimiento para que rastrees tu paquete.\n• **Embalaje seguro:** Equipos embalados con protección acolchada anti-golpes.\n\n¿A qué distrito o provincia te gustaría recibir tu pedido?",
      whatsapp: wa,
      whatsappTexto: "Cotizar Envío por WhatsApp",
      producto: null,
      productos: [],
    };
  }

  // Garantía y Facturación
  if (/(garantia|boleta|factura|ruc|original|sellado|es confiable|es seguro)/.test(norm)) {
    return {
      texto: "🛡️ **Garantía Oficial y Facturación:**\n• Todos nuestros productos son **100% nuevos, originales y sellados de fábrica**.\n• Cuentan con **garantía oficial de 6 a 12 meses** (o más según el fabricante).\n• Emitimos **Boleta de Venta Electrónica** y **Factura con RUC** válida para empresas y personas naturales.\n• Cuentas con soporte técnico post-venta directo de nuestro equipo de ingenieros.",
      whatsapp: null,
      producto: null,
      productos: [],
    };
  }

  // Promociones / Cupones / Cyber
  if (/(promocion|promociones|descuento|descuentos|oferta|ofertas|cupon|cupones|cyber|cyber wow)/.test(norm)) {
    return {
      texto: "🔥 **Temporada de Ofertas Cyber en Kernel SAC:**\n• Tenemos equipos seleccionados con hasta **50% de descuento** en catálogo.\n• 🎟️ Cupones válidos:\n  - Usa **BCP200** para descuentos en laptops y celulares de alta gama.\n  - Usa **CYBERKERNEL** para promociones en periféricos y redes.\n\nPuedes aplicarlos directamente en la web al finalizar tu pedido o mencionarlo a tu asesor.",
      whatsapp: null,
      producto: null,
      productos: [],
    };
  }

  // Cómo comprar
  if (/(como compro|como comprar|como hago el pedido|como hacer el pedido|pasos para comprar)/.test(norm)) {
    return {
      texto: "🛒 **Cómo comprar en Kernel SAC (¡Sencillo y rápido!):**\n1️⃣ Explora nuestro catálogo y presiona **Comprar** o añade los productos a tu carrito 🛒\n2️⃣ Abre tu carrito (ícono arriba a la derecha), completa tus datos de entrega y confirma.\n3️⃣ ¡O más fácil aún! Presiona el botón verde **Comprar por WhatsApp** en cualquier producto y coordinamos tu pedido y pago al instante con un asesor.",
      whatsapp: null,
      producto: null,
      productos: [],
    };
  }

  // 6. SOPORTE TÉCNICO Y DIAGNÓSTICO DE FALLAS
  const esFalla =
    /(no (me |le )?(enciende|prende|arranca|carga|bootea|funciona|da video)|pantalla azul|pantalla negra|se apaga sol|se reinicia sol|calienta mucho|se calienta|hace ruido|huele a quemado|humea|sin senal|se cuelga|se congela|tiene virus|esta fallando|falla mi|falla el|problema con mi (pc|laptop|computadora|impresora|camara|router)|soporte tecnico|necesito tecnico|reparacion|revisar mi equipo|esta lenta|muy lenta)/.test(
      norm
    );

  if (esFalla) {
    let explicacion = "";
    let prodRecomendado = null;

    if (/(calienta|se apaga sol|ruido|hace ruido)/.test(norm)) {
      explicacion =
        "🛠️ **Diagnóstico Técnico:** El sobrecalentamiento y apagados repentinos casi siempre indican que la **pasta térmica del procesador se ha resecado** o que los disipadores tienen polvo acumulado. Recomendamos mantenimiento preventivo con pasta térmica de alto rendimiento (como la **Arctic MX-6** que tenemos disponible).";
      const mx = db.prepare("SELECT id, nombre, precio, stock FROM productos WHERE nombre LIKE '%Arctic%' LIMIT 1").get();
      if (mx) prodRecomendado = mx;
    } else if (/(esta lenta|muy lenta|se cuelga|se congela|demora en abrir)/.test(norm)) {
      explicacion =
        "🛠️ **Diagnóstico Técnico:** Si tu equipo tarda en encender o abrir programas, en el 90% de los casos se debe a un disco duro mecánico antiguo o desgastado. **La solución definitiva es cambiar a un Disco Sólido SSD (SATA o M.2 NVMe)** y tener al menos 16GB de RAM. ¡Tu equipo encenderá en 10 segundos!";
      const ssd = db.prepare("SELECT id, nombre, precio, stock FROM productos WHERE nombre LIKE '%SSD%' AND stock > 0 ORDER BY precio ASC LIMIT 1").get();
      if (ssd) prodRecomendado = ssd;
    } else {
      explicacion =
        "🛠️ **Diagnóstico Técnico:** Fallas de encendido, pantalla azul o falta de señal de video requieren descartar problemas en fuente de poder, memorias RAM o sistema operativo. Nuestro equipo técnico puede asistirte paso a paso.";
    }

    const waMsg = `Hola Soporte Técnico de Kernel SAC, requiero asistencia técnica con mi equipo. Síntoma: ${mensajeOriginal}`;
    const wa = waLink(numSoporte, waMsg);

    let textoFinal = `${explicacion}\n\n👇 Dale clic al botón para hablar directamente con un técnico especialista en WhatsApp y coordinar una solución:`;
    return {
      texto: textoFinal,
      whatsapp: wa,
      whatsappTexto: "Hablar con Soporte Técnico en WhatsApp",
      producto: prodRecomendado ? { id: prodRecomendado.id, nombre: prodRecomendado.nombre, precio: prodRecomendado.precio } : null,
      productos: prodRecomendado ? [prodRecomendado] : [],
    };
  }

  // 7. CONSULTA DE CATEGORÍAS GENERALES
  if (/^(que categorias tienen|cuales son las categorias|ver categorias|que venden|que productos tienen)\b/.test(norm)) {
    const cats = db.prepare("SELECT nombre FROM categorias ORDER BY id").all();
    return {
      texto: `¡Tenemos un catálogo completo en tecnología y seguridad! 🚀\n\nNuestras categorías principales son:\n${cats.map((c) => `• 🔹 ${c.nombre}`).join("\n")}\n\n¿En cuál de ellas te gustaría ver recomendaciones o buscar un equipo?`,
      whatsapp: null,
      producto: null,
      productos: [],
    };
  }

  // 8. DETECCIÓN DE MODIFICADORES Y PRESUPUESTO
  // Solo se usa presupuesto si el usuario lo menciona en este mensaje puntual
  // o si dice expresamente "mi presupuesto", "con esa plata", "con ese dinero"
  const matchPresupuesto =
    norm.match(/(?:s\/\.?|presupuesto(?:\s+de)?|hasta|tengo|maximo|monto)\s*(\d{2,6})/) ||
    norm.match(/(\d{2,6})\s*(?:soles|s\/)/);
  const mencionaPresupuestoPrevio = /(con ese presupuesto|con esa plata|con ese dinero|dentro de mi presupuesto)/.test(norm);
  const presupuesto = matchPresupuesto ? Number(matchPresupuesto[1]) : (mencionaPresupuestoPrevio ? mem.presupuesto : null);

  const esBarato = /\b(barat\w*|economic\w*|mas comod\w*|bajo costo|menor precio|mas accesibl\w*)\b/.test(norm);
  const esPotente = /\b(potent\w*|gama alta|mas rapid\w*|maximo rendimiento|tope de gama)\b/.test(norm);
  const esGamer = /\b(gamer|gaming|juegos|jugar|warzone|fortnite|valorant|gta)\b/.test(norm);
  const pidePrecio = /\b(precio|cuesta|cuestan|vale|valen|cuanto|cotizacion)\b/.test(norm);
  const pideStock = /\b(stock|disponible|disponibles|hay|queda|quedan|unidades)\b/.test(norm);

  // 9. DETECCIÓN DE TEMA O CATEGORÍA
  let temaEncontrado = null;
  let categoriaSlug = null;
  for (const item of MAPA_INTENCIONES) {
    if (item.regex.test(norm)) {
      temaEncontrado = item.tema;
      categoriaSlug = item.categoriaSlug;
      break;
    }
  }

  // Si no se detectó un tema explícito pero el mensaje hace referencia ("cuál es la más barata", "tienes otra", "y en laptop?"),
  // usamos el tema previo de la sesión
  if (!temaEncontrado && mem.tema) {
    temaEncontrado = mem.tema;
    categoriaSlug = mem.categoriaSlug;
  }

  // Guardamos en memoria si hubo tema nuevo o presupuesto nuevo
  updateSessionMemory(sessionId, {
    tema: temaEncontrado || mem.tema,
    categoriaSlug: categoriaSlug || mem.categoriaSlug,
    presupuesto: matchPresupuesto ? presupuesto : mem.presupuesto,
  });

  // 10. BÚSQUEDA Y FILTRADO DE PRODUCTOS EN SQLITE
  let productos = [];

  // Palabras significativas para filtrar en nombre/descripción (excluyendo stop words y adjetivos)
  const palabrasBusqueda = norm
    .split(/\s+/)
    .filter((p) => p.length > 2 && !/^\d+$/.test(p) && !PALABRAS_VACIAS.has(p));

  // A. Si se detectó una categoría específica
  let catId = null;
  if (categoriaSlug) {
    const catRow = db.prepare("SELECT id, nombre FROM categorias WHERE slug = ?").get(categoriaSlug);
    if (catRow) catId = catRow.id;
  }

  let ordenSql = "p.stock > 0 DESC, p.destacado DESC, p.precio DESC";
  if (esBarato) ordenSql = "p.stock > 0 DESC, p.precio ASC";
  if (esPotente) ordenSql = "p.stock > 0 DESC, p.precio DESC";

  // Intento 0: Si busca modelo específico (ej. "iphone 18", "galaxy s26", "rtx 4060", "lenovo legion", "vivobook")
  if (palabrasBusqueda.length >= 1) {
    const condsExactas = palabrasBusqueda.map(() => "p.nombre LIKE ?").join(" AND ");
    const paramsExactas = palabrasBusqueda.map((p) => `%${p}%`);
    let sqlExacta = `SELECT p.id, p.nombre, p.precio, p.stock, p.descripcion, c.nombre as categoria FROM productos p JOIN categorias c ON p.categoria_id = c.id WHERE (${condsExactas}) ORDER BY ${ordenSql} LIMIT 4`;
    productos = db.prepare(sqlExacta).all(...paramsExactas);
  }

  // Intento 1: Si busca algo gamer específicamente (ej. "pc gamer", "laptop gamer")
  if (!productos.length && esGamer) {
    let sqlGamer = `SELECT p.id, p.nombre, p.precio, p.stock, p.descripcion, c.nombre as categoria FROM productos p JOIN categorias c ON p.categoria_id = c.id WHERE (p.nombre LIKE '%Gamer%' OR p.descripcion LIKE '%juegos%' OR p.descripcion LIKE '%Gamer%' OR p.nombre LIKE '%RTX%' OR p.nombre LIKE '%Legion%' OR p.nombre LIKE '%TUF%')`;
    if (catId) sqlGamer += ` AND (p.categoria_id = ${catId} OR p.categoria_id = 7 OR p.categoria_id = 8)`;
    if (presupuesto) sqlGamer += ` AND p.precio <= ${presupuesto}`;
    sqlGamer += ` ORDER BY ${ordenSql} LIMIT 4`;
    productos = db.prepare(sqlGamer).all();
  }

  // Intento 2: Si hay categoría y palabras de búsqueda
  if (!productos.length && catId && palabrasBusqueda.length) {
    const conds = palabrasBusqueda.map(() => "p.nombre LIKE ?").join(" OR ");
    const params = palabrasBusqueda.map((p) => `%${p}%`);
    let sql = `SELECT p.id, p.nombre, p.precio, p.stock, p.descripcion, c.nombre as categoria FROM productos p JOIN categorias c ON p.categoria_id = c.id WHERE p.categoria_id = ? AND (${conds})`;
    if (presupuesto) sql += ` AND p.precio <= ${presupuesto}`;
    sql += ` ORDER BY ${ordenSql} LIMIT 4`;
    productos = db.prepare(sql).all(catId, ...params);
  }

  // Intento 3: Si hay categoría (o contexto de categoría) y no hay palabras adicionales de modelo
  // (ej. "cuál es la más barata", "tienen laptops?", "recomiéndame laptops")
  if (!productos.length && catId) {
    let filtroSubtipo = "";
    if (temaEncontrado === "laptops") {
      filtroSubtipo = " AND p.nombre LIKE '%Laptop%'";
    } else if (temaEncontrado === "pcs") {
      filtroSubtipo = " AND (p.nombre LIKE '%PC%' OR p.nombre LIKE '%Escritorio%')";
    } else if (temaEncontrado === "celulares") {
      filtroSubtipo = " AND (p.nombre LIKE '%iPhone%' OR p.nombre LIKE '%Galaxy%' OR p.nombre LIKE '%Magic%' OR p.nombre LIKE '%Celular%')";
    }

    let sql = `SELECT p.id, p.nombre, p.precio, p.stock, p.descripcion, c.nombre as categoria FROM productos p JOIN categorias c ON p.categoria_id = c.id WHERE p.categoria_id = ?${filtroSubtipo}`;
    if (presupuesto) sql += ` AND p.precio <= ${presupuesto}`;
    sql += ` ORDER BY ${ordenSql} LIMIT 4`;
    productos = db.prepare(sql).all(catId);

    if (!productos.length) {
      let sqlCat = `SELECT p.id, p.nombre, p.precio, p.stock, p.descripcion, c.nombre as categoria FROM productos p JOIN categorias c ON p.categoria_id = c.id WHERE p.categoria_id = ?`;
      if (presupuesto) sqlCat += ` AND p.precio <= ${presupuesto}`;
      sqlCat += ` ORDER BY ${ordenSql} LIMIT 4`;
      productos = db.prepare(sqlCat).all(catId);
    }
  }

  // Intento 4: Búsqueda general amplia por palabras clave
  if (!productos.length && palabrasBusqueda.length) {
    const condsNombre = palabrasBusqueda.map(() => "p.nombre LIKE ?").join(" OR ");
    const paramsNombre = palabrasBusqueda.map((p) => `%${p}%`);
    let sql = `SELECT p.id, p.nombre, p.precio, p.stock, p.descripcion, c.nombre as categoria FROM productos p JOIN categorias c ON p.categoria_id = c.id WHERE (${condsNombre})`;
    if (presupuesto) sql += ` AND p.precio <= ${presupuesto}`;
    sql += ` ORDER BY ${ordenSql} LIMIT 4`;
    productos = db.prepare(sql).all(...paramsNombre);

    if (!productos.length) {
      const condsAmp = palabrasBusqueda.map(() => "(p.nombre LIKE ? OR p.descripcion LIKE ? OR p.caracteristicas LIKE ?)").join(" OR ");
      const paramsAmp = [];
      palabrasBusqueda.forEach((p) => paramsAmp.push(`%${p}%`, `%${p}%`, `%${p}%`));
      let sqlAmp = `SELECT p.id, p.nombre, p.precio, p.stock, p.descripcion, c.nombre as categoria FROM productos p JOIN categorias c ON p.categoria_id = c.id WHERE (${condsAmp})`;
      if (presupuesto) sqlAmp += ` AND p.precio <= ${presupuesto}`;
      sqlAmp += ` ORDER BY ${ordenSql} LIMIT 4`;
      productos = db.prepare(sqlAmp).all(...paramsAmp);
    }
  }

  // Intento 5: Si solo indicó presupuesto (ej. "tengo 2000 soles que me alcanza?")
  if (!productos.length && presupuesto) {
    productos = db
      .prepare(
        `SELECT p.id, p.nombre, p.precio, p.stock, p.descripcion, c.nombre as categoria FROM productos p JOIN categorias c ON p.categoria_id = c.id WHERE p.precio <= ? ORDER BY ${ordenSql} LIMIT 4`
      )
      .all(presupuesto);
  }

  // 11. GENERACIÓN DE RESPUESTA BASADA EN RESULTADOS
  if (productos.length) {
    const elegido = productos[0];
    const alternativos = productos.slice(1);

    let textoRespuesta = "";

    if (pidePrecio) {
      textoRespuesta = `¡Claro crack! Te comparto los precios oficiales:\n\n` +
        productos.map((p) => `• 🔹 **${p.nombre}**: S/ ${Number(p.precio).toFixed(2)} (${p.stock > 0 ? `${p.stock} unid. en stock` : "Bajo pedido"})`).join("\n") +
        `\n\nTodos nuestros precios incluyen IGV y garantía oficial.`;
    } else if (pideStock) {
      textoRespuesta = `Aquí tienes el estado de stock en tiempo real:\n\n` +
        productos.map((p) => `• 📦 **${p.nombre}**: ${p.stock > 0 ? `✅ **${p.stock} unidades disponibles** para entrega inmediata` : "⚠️ Stock agotado (puedes reservarlo)"}`).join("\n");
    } else {
      // Recomendación experta
      const encabezado = alAzar([
        "¡Excelente elección! Como tu asesor técnico te recomiendo especialmente el:",
        "¡Buena consulta crack! La mejor opción calidad-precio que tenemos es el:",
        "¡Esta es tremenda máquina para lo que buscas! Te sugiero el:",
      ]);

      textoRespuesta = `${encabezado}\n\n⭐ **${elegido.nombre}**\n💰 **Precio:** S/ ${Number(elegido.precio).toFixed(2)}\n📦 **Disponibilidad:** ${elegido.stock > 0 ? `En stock oficial (${elegido.stock} unid.)` : "Disponible bajo pedido"}`;
      if (elegido.descripcion) {
        textoRespuesta += `\n📝 **Detalle:** ${elegido.descripcion}`;
      }

      if (presupuesto && Number(elegido.precio) <= presupuesto) {
        textoRespuesta += `\n✅ Se ajusta perfectamente a tu presupuesto de S/ ${presupuesto}.`;
      } else if (presupuesto && Number(elegido.precio) > presupuesto) {
        textoRespuesta += `\n💡 Se pasa ligeramente de tu presupuesto de S/ ${presupuesto}, pero su durabilidad y potencia justifican 100% la inversión.`;
      }

      if (alternativos.length) {
        textoRespuesta += `\n\n💡 **Otras excelentes alternativas:**\n` +
          alternativos.map((p) => `• **${p.nombre}** — S/ ${Number(p.precio).toFixed(2)}`).join("\n");
      }

      textoRespuesta += `\n\n👇 Presiona el botón de abajo para ver la ficha completa, fotos y especificaciones:`;
    }

    const wa = waLink(
      numVentas,
      `Hola Kernel SAC, deseo consultar sobre el producto: ${elegido.nombre} (S/ ${Number(elegido.precio).toFixed(2)})`
    );

    return {
      texto: textoRespuesta,
      whatsapp: wa,
      whatsappTexto: "Consultar este producto por WhatsApp",
      producto: { id: elegido.id, nombre: elegido.nombre, precio: elegido.precio },
      productos: productos.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio, stock: p.stock })),
    };
  }

  // 12. RESPUESTA INTELIGENTE POR DEFECTO
  return {
    texto: alAzar([
      "¡Hola! Cuéntame un poquito más para darte la recomendación exacta: ¿qué tipo de equipo buscas (laptop, PC gamer, componentes, cámaras de seguridad o redes) y tienes algún presupuesto estimado en mente? Así te muestro la mejor alternativa.",
      "Con gusto te oriento crack ⚡ Dime el nombre de algún componente o producto que tengas en mente, o indícame para qué lo vas a usar (juegos, trabajo, oficina, hogar) y te paso opciones con stock y precios en vivo.",
    ]),
    whatsapp: null,
    producto: null,
    productos: [],
  };
}
