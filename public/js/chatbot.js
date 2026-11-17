// ================= BOTONES FLOTANTES ARRASTRABLES =================
// El botón del chat y el de WhatsApp se pueden arrastrar a cualquier parte
// de la pantalla (por si tapan algo). Un toque/clic normal se sigue
// abriendo tal cual; solo cuando el movimiento supera el umbral se
// considera arrastre, y en ese caso se bloquea el clic al soltar para que
// no se dispare la acción normal justo después de mover el botón.
// La posición elegida se recuerda (localStorage) mientras dure el navegador.
function makeFloatingButtonDraggable(el, storageKey) {
  if (!el) return;
  const UMBRAL_ARRASTRE = 6; // px

  function ubicar(left, top) {
    const rect = el.getBoundingClientRect();
    const maxLeft = Math.max(4, window.innerWidth - rect.width - 4);
    const maxTop = Math.max(4, window.innerHeight - rect.height - 4);
    left = Math.min(Math.max(4, left), maxLeft);
    top = Math.min(Math.max(4, top), maxTop);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
    return { left, top };
  }

  // Restaura la posición guardada de una sesión anterior, si hay.
  try {
    const guardada = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (guardada && typeof guardada.left === "number" && typeof guardada.top === "number") {
      ubicar(guardada.left, guardada.top);
    }
  } catch (e) { /* posición guardada inválida: se ignora y se usa la posición por defecto */ }

  let presionando = false;
  let arrastrando = false;
  let offsetX = 0;
  let offsetY = 0;

  el.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    presionando = true;
    arrastrando = false;
    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* algunos navegadores no lo soportan en <a>, no pasa nada */ }
  });

  el.addEventListener("pointermove", (e) => {
    if (!presionando) return;
    const nuevoLeft = e.clientX - offsetX;
    const nuevoTop = e.clientY - offsetY;
    if (!arrastrando) {
      const rect = el.getBoundingClientRect();
      if (Math.abs(nuevoLeft - rect.left) > UMBRAL_ARRASTRE || Math.abs(nuevoTop - rect.top) > UMBRAL_ARRASTRE) {
        arrastrando = true;
        el.classList.add("dragging");
      }
    }
    if (arrastrando) {
      e.preventDefault();
      ubicar(nuevoLeft, nuevoTop);
    }
  });

  function terminarArrastre(e) {
    if (!presionando) return;
    presionando = false;
    if (arrastrando) {
      arrastrando = false;
      el.classList.remove("dragging");
      const left = parseFloat(el.style.left);
      const top = parseFloat(el.style.top);
      if (!Number.isNaN(left) && !Number.isNaN(top)) {
        localStorage.setItem(storageKey, JSON.stringify({ left, top }));
      }
      // El clic que el navegador dispara justo después de soltar no debe
      // abrir el chat / ir a WhatsApp: era un arrastre, no un toque real.
      const bloquearClic = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        el.removeEventListener("click", bloquearClic, true);
      };
      el.addEventListener("click", bloquearClic, true);
    }
  }

  el.addEventListener("pointerup", terminarArrastre);
  el.addEventListener("pointercancel", terminarArrastre);

  // Si la ventana cambia de tamaño (o se gira el celular), reacomoda el
  // botón para que no quede fuera de la pantalla.
  window.addEventListener("resize", () => {
    if (el.style.left && el.style.top) {
      ubicar(parseFloat(el.style.left), parseFloat(el.style.top));
    }
  });
}
const waContainer = document.getElementById("waFloatContainer") || document.getElementById("waFloat");
if (waContainer) makeFloatingButtonDraggable(waContainer, "kernel_wa_float_pos");
makeFloatingButtonDraggable(document.getElementById("chatFab"), "kernel_chat_fab_pos");

// Popover de canales de WhatsApp (Ventas y Soporte)
const waFloatBtn = document.getElementById("waFloatBtn") || document.getElementById("waFloat");
const waPopover = document.getElementById("waPopover");
const waPopoverClose = document.getElementById("waPopoverClose");

if (waFloatBtn && waPopover) {
  waFloatBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    waPopover.classList.toggle("open");
  });
}
if (waPopoverClose && waPopover) {
  waPopoverClose.addEventListener("click", (e) => {
    e.stopPropagation();
    waPopover.classList.remove("open");
  });
}
document.addEventListener("click", (e) => {
  if (waPopover && !waPopover.contains(e.target) && e.target !== waFloatBtn) {
    waPopover.classList.remove("open");
  }
});

// ================= CHATBOT (Asesor Tech Amigo + Modo Ventana Aparte) =================
(function initChatbot() {
  const fab = document.getElementById("chatFab");
  const panel = document.getElementById("chatPanel");
  const body = document.getElementById("chatBody");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSendBtn");
  const expandBtn = document.getElementById("chatExpandBtn");
  const expandIcon = document.getElementById("chatExpandIcon");
  let isExpanded = false;

  // Modo ventana aparte / expandido
  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      panel.classList.toggle("expanded", isExpanded);
      if (isExpanded) {
        if (expandIcon) expandIcon.innerHTML = '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14L3 21"/>';
        expandBtn.title = "Restaurar a ventana normal";
      } else {
        if (expandIcon) expandIcon.innerHTML = '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>';
        expandBtn.title = "Abrir en ventana grande / Maximizar";
        reubicarPanelSegunFab();
      }
    });
  }

  // Chips de recomendación interactiva
  document.querySelectorAll(".rec-chip-btn, .quick-chip").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      const q = chip.dataset.query;
      if (!q) return;
      input.value = q;
      form.dispatchEvent(new Event("submit"));
    });
  });

  // Si el usuario movió el botón del chat, el panel se abre pegado a su
  // nueva posición (en vez de quedarse fijo abajo a la derecha).
  function reubicarPanelSegunFab() {
    if (isExpanded) return; // En modo ventana aparte se centra automáticamente
    if (!fab.style.left && !fab.style.top) return; // nunca se movió
    if (window.innerWidth <= 480) return; // celular ocupa ancho por CSS
    const fabRect = fab.getBoundingClientRect();
    const anchoPanel = Math.min(380, window.innerWidth * 0.92);
    const altoPanel = Math.min(580, window.innerHeight * 0.72);
    let left = fabRect.left + fabRect.width / 2 - anchoPanel / 2;
    let top = fabRect.top - altoPanel - 12;
    if (top < 8) top = fabRect.bottom + 12;
    left = Math.min(Math.max(8, left), window.innerWidth - anchoPanel - 8);
    top = Math.min(Math.max(8, top), window.innerHeight - altoPanel - 8);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  // Id de sesión estable mientras dure la pestaña
  let chatSessionId = sessionStorage.getItem("kernel_chat_session");
  if (!chatSessionId) {
    chatSessionId = "web-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem("kernel_chat_session", chatSessionId);
  }

  // Renderiza mensajes con soporte para negritas, botones de productos, WhatsApp y sugerencias
  function addMessage(text, tipo, whatsappUrl, producto, productos, whatsappTexto, sugerencias) {
    const div = document.createElement("div");
    div.className = `chat-msg ${tipo}`;

    // Sanitización y renderizado de negritas markdown (**texto**)
    const escaped = String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    div.innerHTML = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    body.appendChild(div);

    // Botones de productos recomendados para ver en la tienda
    const prodsList = [];
    if (producto && producto.id != null) prodsList.push(producto);
    if (Array.isArray(productos)) {
      for (const p of productos) {
        if (p && p.id != null && !prodsList.some((x) => Number(x.id) === Number(p.id))) {
          prodsList.push(p);
        }
      }
    }

    if (prodsList.length > 0) {
      const pContainer = document.createElement("div");
      pContainer.className = "chat-product-buttons-wrap";
      for (const p of prodsList) {
        const btnProd = document.createElement("button");
        btnProd.type = "button";
        btnProd.className = "chat-product-btn";
        const precioTxt = p.precio ? ` — S/ ${Number(p.precio).toFixed(2)}` : "";
        btnProd.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span>Ver ${p.nombre}${precioTxt}</span>
        `;
        btnProd.addEventListener("click", () => {
          closeChat();
          const irADetalle = () => openDetalleModal(Number(p.id));
          if (Array.isArray(state.productos) && state.productos.some((item) => Number(item.id) === Number(p.id))) {
            irADetalle();
          } else {
            setTimeout(irADetalle, 350);
          }
        });
        pContainer.appendChild(btnProd);
      }
      body.appendChild(pContainer);
    }

    // Botón de WhatsApp oficial si corresponde
    if (whatsappUrl) {
      const btn = document.createElement("a");
      btn.className = "chat-wa-btn";
      btn.href = whatsappUrl;
      btn.target = "_blank";
      btn.rel = "noopener";
      const lbl = whatsappTexto || "Hablar con Asesor en WhatsApp";
      btn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.1c-.24.68-1.4 1.32-1.93 1.36-.5.05-1.03.24-3.45-.72-2.9-1.15-4.76-4.07-4.9-4.26-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.1 1-2.39.26-.28.57-.35.76-.35h.55c.18 0 .42-.07.65.5.24.6.82 2.07.9 2.22.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.16-.3.36-.43.49-.14.14-.29.29-.13.57.17.28.74 1.22 1.59 1.98 1.1.98 2.02 1.28 2.31 1.43.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.28.38-.24.63-.14.26.1 1.63.77 1.91.91.28.14.47.21.53.33.07.12.07.68-.17 1.36z"/></svg> ' +
        lbl;
      body.appendChild(btn);
    }

    // Chips de sugerencia rápida debajo de la respuesta
    if (Array.isArray(sugerencias) && sugerencias.length > 0) {
      const sugWrap = document.createElement("div");
      sugWrap.className = "chat-inline-suggestions";
      for (const s of sugerencias) {
        const sBtn = document.createElement("button");
        sBtn.type = "button";
        sBtn.className = "chat-inline-suggestion-btn";
        sBtn.textContent = s;
        sBtn.addEventListener("click", () => {
          input.value = s;
          form.dispatchEvent(new Event("submit"));
        });
        sugWrap.appendChild(sBtn);
      }
      body.appendChild(sugWrap);
    }

    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "chat-typing";
    el.id = "chatTypingIndicator";
    el.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById("chatTypingIndicator");
    if (el) el.remove();
  }

  // Asesor inteligente local del cliente (garantiza que el bot NUNCA falle ni quede mudo)
  function asesorLocalCliente(mensajeOriginal) {
    const norm = String(mensajeOriginal || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[¿?¡!.,:;()\[\]"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const numVentas = (state.configGeneral && state.configGeneral.whatsapp_ventas) || "51967006922";
    const numSoporte = (state.configGeneral && state.configGeneral.whatsapp_soporte) || "51939059976";
    const waLink = (num, msg) => `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;

    // Saludo
    if (/^(hola|buenas|hey|que tal|buen dia|buenos dias|buenas tardes|buenas noches|alo|amigo|asesor)\b/.test(norm)) {
      return {
        respuesta: "¡Hola crack! 👋 Bienvenido a **Kernel SAC** ⚡ Soy tu Asesor Técnico Especializado.\n\nEstoy listo para recomendarte lo mejor en laptops, computadoras, cámaras de seguridad, redes y componentes según tu presupuesto.\n\n¿En qué podemos asesorarte hoy?",
        whatsapp: null,
        producto: null,
        productos: [],
        sugerencias: ["💻 Laptops recomendadas", "🎮 PCs Gamer", "📹 Cámaras CCTV", "💳 Métodos de Pago", "📍 Ubicación"]
      };
    }

    // Agradecimientos y despedidas
    if (/^(gracias|muchas gracias|ok gracias|listo gracias|te lo agradezco)\b/.test(norm)) {
      return {
        respuesta: "¡Con muchísimo gusto crack! 🙂 En Kernel SAC estamos a tu servicio. Si deseas cotizar o consultar cualquier producto, aquí estaré.",
        whatsapp: null,
        producto: null,
        productos: []
      };
    }
    if (/^(chau|adios|hasta luego|nos vemos|eso es todo)\b/.test(norm)) {
      return {
        respuesta: "¡Ha sido un placer ayudarte! Que tengas un excelente día. Si deseas cerrar algún pedido, te esperamos en Kernel SAC 👋",
        whatsapp: null,
        producto: null,
        productos: []
      };
    }

    // Quién eres
    if (/(quien eres|eres humano|eres un bot|que haces|como te llamas)/.test(norm)) {
      return {
        respuesta: "Soy el **Asesor Técnico Inteligente de Kernel SAC** 🤖⚡. Conozco todo nuestro catálogo de productos, precios y disponibilidad en vivo. Puedo recomendarte el equipo ideal o conectarte con nuestros técnicos especialistas.",
        whatsapp: null,
        producto: null,
        productos: []
      };
    }

    // Hablar con humano
    if (/(hablar con un humano|asesor real|atencion al cliente|numero de whatsapp|telefono)/.test(norm)) {
      return {
        respuesta: "¡Claro! Puedes conversar directamente con un asesor humano en WhatsApp para cotizaciones o consultas de stock:",
        whatsapp: waLink(numVentas, `Hola Kernel SAC, deseo atención personalizada: ${mensajeOriginal}`),
        whatsappTexto: "Chatear con Asesor por WhatsApp",
        producto: null,
        productos: []
      };
    }

    // Ubicación
    if (/(donde estan|donde queda|direccion|tienda fisica|tienen local|ubicacion|lima|wilson)/.test(norm)) {
      return {
        respuesta: "📍 **Nuestra Tienda & Despachos:**\n• **Atención Presencial:** Atendemos en el centro tecnológico de Lima (Av. Garcilaso de la Vega / Wilson) para retiros y asesoría técnica previa coordinación.\n• **Lima:** Delivery express el mismo día o 24 hrs.\n• **Provincias:** Despachos a todo el Perú por Shalom, Olva Courier y Marvisur.",
        whatsapp: waLink(numVentas, "Hola Kernel SAC, deseo consultar sobre el retiro o envío de productos."),
        whatsappTexto: "Consultar Retiro / Envío por WhatsApp",
        producto: null,
        productos: []
      };
    }

    // Horarios
    if (/(horario|a que hora abren|atienden hoy|domingos|hora de atencion)/.test(norm)) {
      return {
        respuesta: "⏰ **Horarios de Atención de Kernel SAC:**\n• **Lunes a Sábado:** 9:00 AM – 8:00 PM (Tienda y Despachos)\n• **Domingos:** Atención virtual y consultas vía WhatsApp las 24 horas.",
        whatsapp: null,
        producto: null,
        productos: []
      };
    }

    // Formas de pago
    if (/(formas de pago|metodos de pago|como pagar|yape|plin|tarjeta|transferencia|bcp|efectivo|contraentrega)/.test(norm)) {
      return {
        respuesta: "💳 **Métodos de Pago 100% Seguros:**\n• 📲 **Yape y Plin** al instante.\n• 🏦 **Transferencias:** BCP, BBVA, Interbank y Banco de la Nación.\n• 💳 **Tarjetas de Débito y Crédito** Visa y Mastercard.\n• 💵 **Contraentrega en Efectivo** en Lima según cobertura.\n\nEmitimos Boleta y Factura con RUC.",
        whatsapp: null,
        producto: null,
        productos: []
      };
    }

    // Envíos
    if (/(envios|delivery|shalom|olva|marvisur|provincia|provincias|cuanto demora)/.test(norm)) {
      return {
        respuesta: "🚚 **Envíos y Cobertura Nacional:**\n• **Lima Metropolitana:** Envíos motorizados express el mismo día o en 24 horas.\n• **Todo el Perú:** Envíos por Shalom, Olva Courier y Marvisur con código de seguimiento y embalaje seguro.",
        whatsapp: waLink(numVentas, "Hola Kernel SAC, deseo cotizar el envío a mi dirección."),
        whatsappTexto: "Cotizar Envío por WhatsApp",
        producto: null,
        productos: []
      };
    }

    // Garantía
    if (/(garantia|boleta|factura|ruc|original|sellado)/.test(norm)) {
      return {
        respuesta: "🛡️ **Garantía Oficial y Facturación:**\n• Todos nuestros equipos son **100% nuevos, sellados y con garantía de 6 a 12 meses**.\n• Emitimos **Boleta o Factura Electrónica** con RUC válida para empresas o negocios.",
        whatsapp: null,
        producto: null,
        productos: []
      };
    }

    // Cupones / Ofertas
    if (/(cupon|descuento|promocion|oferta|cyber)/.test(norm)) {
      return {
        respuesta: "🔥 **Ofertas Cyber WOW en Kernel SAC:**\n• Cupones activos: **BCP200** y **CYBERKERNEL**.\n• Descuentos de hasta 50% en equipos seleccionados. ¡Aprovecha la temporada!",
        whatsapp: null,
        producto: null,
        productos: []
      };
    }

    // Soporte técnico
    if (/(no (enciende|prende|arranca|da video)|pantalla azul|calienta mucho|se apaga sol|hace ruido|esta lenta|soporte tecnico|falla)/.test(norm)) {
      let diag = "🛠️ **Diagnóstico de Soporte Técnico:** Te asistimos en el diagnóstico de encendido, mantenimiento térmico, actualización a SSD y reparación.";
      if (/(calienta|se apaga)/.test(norm)) diag = "🛠️ **Diagnóstico Técnico:** El sobrecalentamiento suele indicar **pasta térmica reseca** o ventiladores obstruidos. Recomendamos pasta **Arctic MX-6** y limpieza de disipadores.";
      if (/(lenta|demora)/.test(norm)) diag = "🛠️ **Diagnóstico Técnico:** Para equipos lentos, la solución número 1 es migrar a un **Disco Sólido SSD (SATA o M.2)** y tener 16GB de RAM. ¡Tu equipo encenderá en 10 segundos!";

      return {
        respuesta: `${diag}\n\n👇 Habla directamente con un técnico especialista en WhatsApp:`,
        whatsapp: waLink(numSoporte, `Hola Soporte Técnico de Kernel SAC, requiero asistencia con mi equipo: ${mensajeOriginal}`),
        whatsappTexto: "Hablar con Soporte Técnico en WhatsApp",
        producto: null,
        productos: []
      };
    }

    // Búsqueda y recomendaciones usando el catálogo del cliente (state.productos)
    const prods = Array.isArray(state.productos) ? state.productos : [];
    const esBarato = /\b(barat|economic|mas comodo|bajo costo)\b/.test(norm);
    const matchPresupuesto = norm.match(/(?:s\/\.?|presupuesto(?:\s+de)?|hasta|tengo|monto)\s*(\d{2,6})/) || norm.match(/(\d{2,6})\s*(?:soles|s\/)/);
    const presupuesto = matchPresupuesto ? Number(matchPresupuesto[1]) : null;

    let filtrados = [];

    // Búsqueda por palabras
    const palabras = norm.split(/\s+/).filter((p) => p.length > 2 && !["para","que","cual","los","las","una","uno","del","con","por"].includes(p));

    if (palabras.length > 0 && prods.length > 0) {
      filtrados = prods.filter((p) => {
        const nom = (p.nombre || "").toLowerCase();
        const desc = (p.descripcion || "").toLowerCase();
        const cat = (p.categoria || "").toLowerCase();
        return palabras.some((pal) => nom.includes(pal) || desc.includes(pal) || cat.includes(pal));
      });
    }

    if (filtrados.length === 0 && prods.length > 0) {
      if (norm.includes("laptop")) filtrados = prods.filter((p) => (p.categoria || "").toLowerCase().includes("laptop") || (p.nombre || "").toLowerCase().includes("laptop"));
      else if (norm.includes("camara") || norm.includes("cctv")) filtrados = prods.filter((p) => (p.categoria || "").toLowerCase().includes("videovigilancia") || (p.nombre || "").toLowerCase().includes("camara"));
      else if (norm.includes("router") || norm.includes("wifi") || norm.includes("red")) filtrados = prods.filter((p) => (p.categoria || "").toLowerCase().includes("redes"));
      else if (norm.includes("celular") || norm.includes("iphone") || norm.includes("samsung")) filtrados = prods.filter((p) => (p.categoria || "").toLowerCase().includes("smart") || (p.nombre || "").toLowerCase().includes("iphone") || (p.nombre || "").toLowerCase().includes("galaxy"));
      else if (presupuesto) filtrados = prods.filter((p) => Number(p.precio) <= presupuesto);
    }

    if (presupuesto && filtrados.length > 0) {
      const dentro = filtrados.filter((p) => Number(p.precio) <= presupuesto);
      if (dentro.length > 0) filtrados = dentro;
    }

    if (filtrados.length > 0) {
      if (esBarato) filtrados.sort((a, b) => Number(a.precio) - Number(b.precio));
      else filtrados.sort((a, b) => (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0) || Number(b.precio) - Number(a.precio));

      const principal = filtrados[0];
      const secundarios = filtrados.slice(1, 4);

      let respTexto = `¡Excelente elección! Como tu asesor técnico de Kernel SAC te recomiendo:\n\n⭐ **${principal.nombre}**\n💰 **Precio:** S/ ${Number(principal.precio).toFixed(2)}\n📦 **Stock:** ${principal.stock > 0 ? `${principal.stock} unid. disponibles` : "Bajo pedido"}`;
      if (principal.descripcion) respTexto += `\n📝 **Detalle:** ${principal.descripcion}`;
      if (secundarios.length > 0) {
        respTexto += `\n\n💡 **Otras opciones destacadas:**\n` + secundarios.map((s) => `• **${s.nombre}** — S/ ${Number(s.precio).toFixed(2)}`).join("\n");
      }
      respTexto += `\n\n👇 Presiona el botón para ver la ficha completa en tienda:`;

      return {
        respuesta: respTexto,
        whatsapp: waLink(numVentas, `Hola Kernel SAC, deseo consultar sobre: ${principal.nombre}`),
        whatsappTexto: "Consultar producto por WhatsApp",
        producto: principal,
        productos: filtrados.slice(0, 4)
      };
    }

    // Default amigable
    return {
      respuesta: "¡Hola! Cuéntame qué tipo de equipo estás buscando (laptop, PC gamer, cámaras CCTV, router o componentes) o indícame tu presupuesto aproximado para darte la recomendación perfecta ⚡",
      whatsapp: null,
      producto: null,
      productos: [],
      sugerencias: ["💻 Laptops recomendadas", "🎮 PC Gamer", "📹 Cámaras de Seguridad", "📍 Ubicación"]
    };
  }

  const saludoKey = "kernel_chat_saludo_" + chatSessionId;
  let chatStarted = sessionStorage.getItem(saludoKey) === "1";

  function openChat() {
    reubicarPanelSegunFab();
    panel.classList.add("open");
    fab.classList.add("open");
    if (!chatStarted) {
      chatStarted = true;
      sessionStorage.setItem(saludoKey, "1");
      addMessage(
        "¡Hola! 👋 Bienvenido a **Kernel SAC**. Soy tu Asesor Técnico Inteligente especializado en hardware, redes y videovigilancia.\n\n¿En qué podemos orientarte hoy? Puedes escribir lo que buscas o elegir una opción rápida:",
        "bot",
        null,
        null,
        null,
        null,
        [
          "💻 Laptops recomendadas",
          "🎮 Recomiéndame una PC Gamer",
          "📹 Cámaras de Seguridad CCTV",
          "💳 Métodos de Pago",
          "📍 Ubicación y Horarios"
        ]
      );
    }
    input.focus();
  }
  function closeChat() {
    panel.classList.remove("open");
    fab.classList.remove("open");
  }

  fab.addEventListener("click", () => {
    panel.classList.contains("open") ? closeChat() : openChat();
  });
  document.getElementById("chatCloseBtn").addEventListener("click", closeChat);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = input.value.trim();
    if (!texto) return;

    addMessage(texto, "user");
    input.value = "";
    input.disabled = true;
    sendBtn.disabled = true;
    showTyping();

    let data = null;
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: texto, sessionId: chatSessionId }),
      });
      if (res.ok) {
        data = await res.json();
      }
    } catch (netErr) {
      console.warn("Falla de red con /api/chatbot, activando asesor local inteligente del cliente:", netErr);
    }

    hideTyping();

    if (data && data.respuesta) {
      addMessage(data.respuesta, "bot", data.whatsapp, data.producto, data.productos, data.whatsappTexto, data.sugerencias);
    } else {
      // Asesor inteligente local del cliente (garantiza cero errores y respuesta continua)
      const local = asesorLocalCliente(texto);
      addMessage(local.respuesta, "bot", local.whatsapp, local.producto, local.productos, local.whatsappTexto, local.sugerencias);
    }

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  });
})();

// Guardar configuración de WhatsApp desde el panel de administración
document.getElementById("btnGuardarConfigWhatsapp")?.addEventListener("click", async () => {
  const msg = document.getElementById("cfgWaMsg");
  const payload = {
    whatsapp_ventas: document.getElementById("cfgWaVentas")?.value.trim(),
    whatsapp_soporte: document.getElementById("cfgWaSoporte")?.value.trim(),
  };
  try {
    const res = await fetchJSON("/api/configuraciones/general", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    state.configGeneral = res.config;
    actualizarCanalesWhatsApp();
    if (msg) {
      msg.textContent = "Canales de WhatsApp guardados exitosamente.";
      msg.className = "form-msg ok";
      setTimeout(() => { if (msg) msg.textContent = ""; }, 3000);
    }
  } catch (err) {
    if (msg) {
      msg.textContent = "Error: " + err.message;
      msg.className = "form-msg err";
    }
  }
});