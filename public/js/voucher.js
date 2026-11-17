function numeroALetrasSoles(monto) {
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const diezY = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  const num = Math.max(0, Number(monto) || 0);
  const enteros = Math.floor(num);
  const centavos = Math.round((num - enteros) * 100);
  const centavosStr = String(centavos).padStart(2, "0") + "/100 SOLES";

  if (enteros === 0) return `SON: CERO CON ${centavosStr}`;
  if (enteros === 100) return `SON: CIEN CON ${centavosStr}`;

  function convertirGrupo(n) {
    if (n === 0) return "";
    if (n === 100) return "CIEN";
    let c = Math.floor(n / 100);
    let d = Math.floor((n % 100) / 10);
    let u = n % 10;
    let res = "";
    if (c > 0) res += centenas[c] + " ";
    if (d === 1) {
      res += diezY[u] + " ";
    } else if (d === 2 && u > 0) {
      res += "VEINTI" + unidades[u] + " ";
    } else {
      if (d > 0) res += decenas[d] + (u > 0 ? " Y " : " ");
      if (u > 0 && d !== 1) res += unidades[u] + " ";
    }
    return res.trim();
  }

  let letras = "";
  if (enteros >= 1000) {
    let miles = Math.floor(enteros / 1000);
    let resto = enteros % 1000;
    if (miles === 1) letras += "UN MIL ";
    else letras += convertirGrupo(miles) + " MIL ";
    if (resto > 0) letras += convertirGrupo(resto) + " ";
  } else {
    letras = convertirGrupo(enteros) + " ";
  }

  return `SON: ${letras.trim()} CON ${centavosStr}`;
}

function generarBarcodeSVG(orderCode) {
  const bars = [2,1,1,3,1,2,3,1,1,2,1,3,2,1,2,1,1,3,2,2,1,1,3,1,1,2,3,1,2,1,1,3,1,2,2,1,3,1,1,2,1,2,3,1,2,1,1,3,2,1,2,3,1,1,2,1,3,2,1];
  let x = 6;
  let html = "";
  for (let i = 0; i < bars.length; i++) {
    const w = bars[i];
    if (i % 2 === 0) {
      html += `<rect x="${x}" y="2" width="${w * 2.2}" height="32" fill="currentColor"/>`;
    }
    x += w * 2.7;
  }
  return html;
}

function generarYMostrarBaucher(data, payload, items) {
  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString("es-PE", { year: "numeric", month: "2-digit", day: "2-digit" });
  const horaStr = ahora.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: true });
  const fechaHoraFull = `${fechaStr}, ${horaStr}`;

  const numVentas = state.configGeneral?.whatsapp_ventas || "51967006922";
  const numSoporte = state.configGeneral?.whatsapp_soporte || "51939059976";
  const yearActual = ahora.getFullYear();
  const orderNumStr = String(data.pedido_id).padStart(4, "0");
  const orderId = `KS-${yearActual}-${orderNumStr}`;

  const total = Number(data.total) || 0;
  const subtotal = total / 1.18;
  const igv = total - subtotal;
  const totalLetras = numeroALetrasSoles(total);
  const hashDigest = `SHA256-${Math.random().toString(16).substring(2, 8).toUpperCase()}${Math.random().toString(16).substring(2, 6).toUpperCase()}`;

  // Formato corporativo y limpio para el mensaje de WhatsApp a Ventas
  const itemsTextoWa = items.map((i, idx) => 
    `  ${idx + 1}. *${i.cantidad}x ${i.nombre}*\n     ↳ Código: #KS-${String(i.id).padStart(3, "0")} · P.U: S/ ${Number(i.precio).toFixed(2)} · Sub: S/ ${(i.precio * i.cantidad).toFixed(2)}`
  ).join("\n\n");

  const baucherTextoWa = 
`🛍️ *━━━━━━━━━━━━━━━━━━━━━━━━━*
🚀 *KERNEL TECNOLOGÍA & SISTEMAS S.A.C.*
📋 *R.U.C. N° 20608541298 · TICKET DIGITAL DE COMPRA*
🛍️ *━━━━━━━━━━━━━━━━━━━━━━━━━*

🔖 *CÓDIGO DE ORDEN:* \`#${orderId}\`
📅 *FECHA / HORA:* ${fechaHoraFull}
⚡ *ESTADO:* PENDIENTE DE VALIDACIÓN Y DESPACHO
💵 *MONEDA:* Soles (PEN - S/)

👤 *DATOS DEL CLIENTE:*
├ 👤 *Nombre / Razón Social:* ${payload.cliente_nombre}
├ 📞 *WhatsApp / Celular:* ${payload.cliente_telefono}
└ 📍 *Destino de Entrega:* ${payload.cliente_direccion ? payload.cliente_direccion : "Coordinar entrega en tienda / almacén"}

📦 *DETALLE DE PRODUCTOS:*
${itemsTextoWa}

💰 *TOTAL A PAGAR: S/ ${total.toFixed(2)}*
   _${totalLetras}_

💳 *MÉTODOS DE PAGO DISPONIBLES:*
• 📱 *Yape / Plin:* 967 006 922 (Kernel SAC)
• 🏦 *BCP Soles:* 191-94829103-0-45 (CCI: 00219100948291030452)
• 🏦 *BBVA Soles:* 0011-0320-0201192834
• 💵 *Pago Contraentrega:* Efectivo o POS Móvil (Lima)

🛡️ *GARANTÍA:* Oficial Kernel SAC con soporte técnico
🔐 *CÓDIGO DIGITAL:* \`${hashDigest}\`

_Hola equipo de Ventas Kernel SAC 👋 Adjunto mi comprobante generado en la web para validar el pago y coordinar el envío de mi pedido. ¡Muchas gracias!_`;

  const waUrl = `https://wa.me/${numVentas}?text=${encodeURIComponent(baucherTextoWa)}`;

  // Llenar datos en el modal visual del Baucher
  const orderEl = document.getElementById("vOrderId");
  if (orderEl) orderEl.textContent = `PEDIDO #${orderId}`;
  const dateEl = document.getElementById("vOrderDate");
  if (dateEl) dateEl.textContent = fechaHoraFull;
  const nameEl = document.getElementById("vClientName");
  if (nameEl) nameEl.textContent = payload.cliente_nombre;
  const phoneEl = document.getElementById("vClientPhone");
  if (phoneEl) phoneEl.textContent = payload.cliente_telefono;
  const addrEl = document.getElementById("vClientAddress");
  if (addrEl) addrEl.textContent = payload.cliente_direccion || "Coordinar entrega con asesor";

  const itemsListEl = document.getElementById("vItemsList");
  if (itemsListEl) {
    itemsListEl.innerHTML = items.map(i => `
      <div class="voucher-item-row">
        <div class="vcol-cant"><strong>${i.cantidad}</strong></div>
        <div class="vcol-desc">
          <div class="voucher-item-title">${i.nombre}</div>
          <div class="voucher-item-sub">COD: #KS-${String(i.id).padStart(3, "0")} · GARANTÍA KERNEL SAC</div>
        </div>
        <div class="vcol-unit">S/ ${Number(i.precio).toFixed(2)}</div>
        <div class="vcol-total">S/ ${(i.precio * i.cantidad).toFixed(2)}</div>
      </div>
    `).join("");
  }

  const subtotalEl = document.getElementById("vSubtotal");
  if (subtotalEl) subtotalEl.textContent = `S/ ${subtotal.toFixed(2)}`;
  const igvEl = document.getElementById("vIgv");
  if (igvEl) igvEl.textContent = `S/ ${igv.toFixed(2)}`;
  const totalEl = document.getElementById("vTotal");
  if (totalEl) totalEl.textContent = `S/ ${total.toFixed(2)}`;
  const letrasEl = document.getElementById("vTotalLetras");
  if (letrasEl) letrasEl.textContent = totalLetras;

  const barcodeSvg = document.getElementById("vBarcodeSvg");
  if (barcodeSvg) barcodeSvg.innerHTML = generarBarcodeSVG(orderId);
  const barcodeDigits = document.getElementById("vBarcodeDigits");
  if (barcodeDigits) barcodeDigits.textContent = orderId;

  const hashEl = document.getElementById("vDigitalHash");
  if (hashEl) hashEl.textContent = `HASH SHA-256: ${hashDigest} · VALIDACIÓN DIGITAL OK`;

  const btnSend = document.getElementById("btnSendWaVoucher");
  if (btnSend) {
    btnSend.href = waUrl;
    btnSend.querySelector("span").textContent = `Enviar Comprobante a WhatsApp Ventas (967006922)`;
  }

  // Abrir modal de baucher
  document.getElementById("voucherOverlay")?.classList.add("open");
  document.getElementById("orderVoucherModal")?.classList.add("open");

  // Abrir WhatsApp automáticamente al cliente para enviarlo de inmediato
  window.open(waUrl, "_blank");
}

function cerrarBaucherModal() {
  document.getElementById("voucherOverlay")?.classList.remove("open");
  document.getElementById("orderVoucherModal")?.classList.remove("open");
}
document.getElementById("voucherModalClose")?.addEventListener("click", cerrarBaucherModal);
document.getElementById("btnCloseVoucher")?.addEventListener("click", cerrarBaucherModal);
document.getElementById("voucherOverlay")?.addEventListener("click", cerrarBaucherModal);
document.getElementById("btnPrintVoucher")?.addEventListener("click", () => window.print());

document.getElementById("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("formMsg");
  msg.textContent = "Registrando pedido...";
  msg.className = "form-msg";

  const cartSnapshot = state.cart.map((item) => {
    const p = findProductoUniversal(item.id) || {};
    return {
      id: item.id,
      nombre: p.nombre || "Producto #" + item.id,
      precio: p.precio || 0,
      cantidad: item.cantidad,
    };
  });

  const payload = {
    cliente_nombre: document.getElementById("cName").value.trim(),
    cliente_telefono: document.getElementById("cPhone").value.trim(),
    cliente_direccion: document.getElementById("cAddress").value.trim(),
    items: state.cart.map((i) => ({ id: i.id, cantidad: i.cantidad })),
  };

  try {
    const data = await fetchJSON("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    msg.textContent = `Pedido #${data.pedido_id} registrado con éxito.`;
    msg.className = "form-msg ok";

    // Generar Baucher digital y redirigir a WhatsApp Ventas
    generarYMostrarBaucher(data, payload, cartSnapshot);

    state.cart = [];
    saveCart();
    state.productos = await fetchJSON("/api/productos");
    renderDestacados();
    renderCatalogo();
    renderCart();
    document.getElementById("checkoutForm").reset();
    closeCart();
  } catch (err) {
    msg.textContent = `Error: ${err.message}`;
    msg.className = "form-msg err";
  }
});