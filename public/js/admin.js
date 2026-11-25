// ============================================================
// ================= PANEL ADMIN (integrado) =================
// ============================================================

// ---------- DIÁLOGO DE CONFIRMACIÓN MODERNO (Reemplaza confirm nativo) ----------
function confirmDialog({ titulo = "¿Confirmar acción?", mensaje = "Esta acción no se puede deshacer.", botonTexto = "Eliminar", peligro = true } = {}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmModalOverlay");
    const titleEl = document.getElementById("confirmModalTitle");
    const msgEl = document.getElementById("confirmModalMsg");
    const acceptBtn = document.getElementById("btnConfirmAccept");
    const cancelBtn = document.getElementById("btnConfirmCancel");

    if (!overlay || !acceptBtn || !cancelBtn) {
      resolve(confirm(mensaje));
      return;
    }

    if (titleEl) titleEl.textContent = titulo;
    if (msgEl) msgEl.textContent = mensaje;
    acceptBtn.textContent = botonTexto;
    acceptBtn.className = peligro ? "btn btn-primary btn-block btn-danger" : "btn btn-primary btn-block";

    const cleanup = () => {
      overlay.classList.remove("open");
      acceptBtn.removeEventListener("click", onAccept);
      cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onOverlay);
    };

    const onAccept = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    const onOverlay = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };

    acceptBtn.addEventListener("click", onAccept);
    cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("click", onOverlay);

    overlay.classList.add("open");
  });
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function showAdminView() {
  document.getElementById("storeView").style.display = "none";
  document.getElementById("adminView").style.display = "block";
  document.getElementById("adminUserName").textContent = state.usuario ? state.usuario.nombre : "";
  window.location.hash = "admin";
  window.scrollTo(0, 0);

  // Asegurar que el catálogo completo de ventas esté sincronizado
  if (!state.categorias || state.categorias.length === 0 || !state.productos || state.productos.length === 0) {
    await loadCatalogo();
  }

  fillCategoriaFilterAdmin();
  fillCategoriaSelectAdmin();
  renderDashboardAdmin();
  renderProductosAdmin();
  renderCarruselAdmin();
  await renderCategoriasAdmin();
  renderRedesAdmin();
  renderAnunciosAdmin();
  loadAdminPedidos();
  loadAdminChatLogs();
  cargarAlertasStock();
}

document.getElementById("btnGuardarConfigCarrusel")?.addEventListener("click", () => window.guardarConfigCarrusel(true));
document.getElementById("adminSearchCarruselProds")?.addEventListener("input", renderCarruselAdmin);

function showStoreView() {
  document.getElementById("adminView").style.display = "none";
  document.getElementById("storeView").style.display = "";
  if (window.location.hash === "#admin") {
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
  window.scrollTo(0, 0);
  if (typeof aplicarBarrasAnuncios === "function" && state.configAnuncios) {
    aplicarBarrasAnuncios(state.configAnuncios);
  }
}
window.showStoreView = showStoreView;

document.getElementById("verTiendaBtn").addEventListener("click", showStoreView);
document.getElementById("adminLogoutBtn").addEventListener("click", async () => {
  await fetchJSON("/api/auth/logout", { method: "POST" });
  state.usuario = null;
  showStoreView();
  renderAccount();
});

// ---------- TABS DEL PANEL ADMIN ----------
document.querySelectorAll(".tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const tabName = btn.dataset.tab;
    const tabId = "tab" + tabName[0].toUpperCase() + tabName.slice(1);
    const target = document.getElementById(tabId);
    if (target) target.classList.add("active");

    if (tabName === "dashboard") renderDashboardAdmin();
    else if (tabName === "pedidos") renderPedidosAdmin();
    else if (tabName === "productos") renderProductosAdmin();
    else if (tabName === "clientes") loadAdminClientes();
    else if (tabName === "reportes") renderReportesAdmin();
    else if (tabName === "carrusel") renderCarruselAdmin();
    else if (tabName === "chatbot") loadAdminChatLogs();
    else if (tabName === "categorias") renderCategoriasAdmin();
    else if (tabName === "redes") renderRedesAdmin();
    else if (tabName === "anuncios") renderAnunciosAdmin();
  });
});

// ============================================================
// ================= TAB 1: DASHBOARD & ANALÍTICA =============
// ============================================================

function renderSalesChartSVG() {
  const wrap = document.getElementById("dashChartWrap");
  if (!wrap) return;

  const validos = (adminState.pedidos || []).filter(p => p.estado !== "cancelado");
  const subEl = document.getElementById("dashChartSub");

  if (validos.length === 0) {
    if (subEl) subEl.textContent = "0 ventas registradas";
    wrap.innerHTML = `
      <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-dim); text-align:center; padding:20px;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4; margin-bottom:8px;"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        <span style="font-size:0.85rem; font-weight:600;">Sin ventas registradas aún</span>
        <span style="font-size:0.75rem; max-width:280px; margin-top:4px;">Conforme los clientes confirmen compras, aquí se trazará la curva de ingresos en tiempo real.</span>
      </div>
    `;
    return;
  }

  // Tomar hasta los últimos 8 pedidos confirmados/válidos
  const puntosData = validos.slice(-8).map((p, idx) => ({
    label: `#${p.id}`,
    fecha: p.creado_en ? p.creado_en.split(" ")[0] : `P-${idx + 1}`,
    valor: Number(p.total)
  }));

  const maxVal = Math.max(...puntosData.map(d => d.valor), 100) * 1.18;
  const minVal = 0;
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 32;

  const stepX = puntosData.length > 1 ? (width - paddingX * 2) / (puntosData.length - 1) : 0;

  const coords = puntosData.map((d, i) => {
    const x = puntosData.length === 1 ? width / 2 : paddingX + i * stepX;
    const y = height - paddingY - ((d.valor - minVal) / (maxVal - minVal)) * (height - paddingY * 2);
    return { ...d, x, y };
  });

  const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${coords[0].x},${height - paddingY} ` + polylinePoints + ` ${coords[coords.length - 1].x},${height - paddingY}`;

  const circles = coords.map(c => `
    <g class="chart-point">
      <circle cx="${c.x}" cy="${c.y}" r="4.5" fill="#ff2d67" stroke="#fff" stroke-width="2" />
      <text x="${c.x}" y="${c.y - 10}" text-anchor="middle" font-size="10" fill="#fff" font-weight="bold" font-family="var(--font-mono)">S/ ${c.valor.toFixed(0)}</text>
      <text x="${c.x}" y="${height - 12}" text-anchor="middle" font-size="9" fill="var(--text-dim)" font-family="var(--font-mono)">${c.label}</text>
    </g>
  `).join("");

  if (subEl) subEl.textContent = `${validos.length} pedidos analizados`;

  wrap.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%; overflow:visible;">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ff2d67" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#ff2d67" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
      <polygon points="${areaPoints}" fill="url(#chartGrad)" />
      <polyline points="${polylinePoints}" fill="none" stroke="#ff2d67" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${circles}
    </svg>
  `;
}

async function cargarAlertasStock() {
  try {
    const data = await fetchJSON("/api/admin/inventario/alertas");
    adminState.alertasStock = data;
    const pill = document.getElementById("adminStockAlertsPill");
    const countHeader = document.getElementById("adminAlertCountHeader");
    if (pill && countHeader) {
      if (data.totalAlertas > 0) {
        countHeader.textContent = data.totalAlertas;
        pill.style.display = "inline-flex";
      } else {
        pill.style.display = "none";
      }
    }
    return data;
  } catch (err) {
    console.warn("Falla al cargar alertas de inventario:", err);
    return null;
  }
}

document.getElementById("adminStockAlertsPill")?.addEventListener("click", () => {
  document.querySelector('.tabs button[data-tab="productos"]')?.click();
  const sel = document.getElementById("adminFilterStockProductos");
  if (sel) {
    sel.value = "critico";
    adminState.filtroProdStock = "critico";
    adminState.prodPaginaActual = 1;
    renderProductosAdmin();
  }
});

async function renderDashboardAlerts() {
  const container = document.getElementById("dashAlertsList");
  const countEl = document.getElementById("dashAlertCount");
  if (!container) return;

  let data = adminState.alertasStock;
  if (!data) {
    data = await cargarAlertasStock();
  }
  const total = data ? data.totalAlertas : (state.productos || []).filter(p => p.stock <= 5).length;
  if (countEl) {
    countEl.textContent = `${total} ${total === 1 ? 'producto' : 'productos'}`;
    countEl.className = total > 0 ? "badge-status pendiente" : "badge-status entregado";
  }

  const items = data ? [...(data.agotados || []), ...(data.criticos || [])] : (state.productos || []).filter(p => p.stock <= 5);

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:24px 10px; color:#10b981; font-size:0.85rem;">
        <div style="font-size:1.6rem; margin-bottom:4px;">🎉</div>
        <strong>Inventario en óptimo estado</strong>
        <div style="color:var(--text-dim); font-size:0.76rem; margin-top:2px;">Todos los productos cuentan con más de 5 unidades.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(p => `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:8px;">
      <div style="display:flex; align-items:center; gap:8px; min-width:0;">
        <div class="product-icon" style="width:32px; height:32px; flex-shrink:0;">${mediaHTML(p)}</div>
        <div style="min-width:0;">
          <div style="font-size:0.82rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${p.nombre}</div>
          <div style="font-size:0.74rem; color:var(--text-dim); font-family:var(--font-mono);">${money(p.precio)} · <span style="color:#ffde00;">${p.categoria || ''}</span></div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
        <span class="badge-status ${p.stock === 0 ? 'cancelado' : 'pendiente'}" style="font-size:0.72rem;">
          ${p.stock === 0 ? 'Agotado (0)' : `Quedan ${p.stock}`}
        </span>
        <button class="btn-restock-quick" data-quick-restock="${p.id}" data-qty="5" title="Añadir +5 unidades">+5</button>
        <button class="btn-restock-quick" data-quick-restock="${p.id}" data-qty="10" title="Añadir +10 unidades">+10</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-quick-restock]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.quickRestock);
      const qty = Number(btn.dataset.qty) || 5;
      await quickAjustarStock(id, qty);
      await cargarAlertasStock();
      renderDashboardAlerts();
    });
  });
}

async function renderDashboardTopProductos() {
  const container = document.getElementById("dashTopProductosList");
  if (!container) return;

  let stats;
  try {
    stats = await fetchJSON("/api/admin/estadisticas/top-productos?limite=6");
  } catch (e) {
    stats = null;
  }

  let top = (stats && stats.top && stats.top.length) ? stats.top : [];

  if (top.length === 0) {
    top = (state.productos || []).filter(p => p.destacado || p.en_carrusel).slice(0, 6).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      stock: p.stock,
      imagen_url: p.imagen_url,
      unidades_vendidas: 0,
      total_recaudado: 0,
      esCatalogo: true
    }));
  }

  if (top.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Sin productos registrados.</div>`;
    return;
  }

  const maxUnidades = Math.max(...top.map(t => Number(t.unidades_vendidas) || 0), 1);

  container.innerHTML = top.map((item, idx) => {
    const unidades = Number(item.unidades_vendidas) || 0;
    const porcentaje = Math.min(100, Math.round((unidades / maxUnidades) * 100));
    const recaudado = Number(item.total_recaudado) || 0;
    return `
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:10px; padding:10px 14px; position:relative; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:10px; min-width:0;">
            <span style="background:rgba(255,45,103,0.18); color:var(--red); font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:999px; font-family:var(--font-mono); flex-shrink:0;">
              #${idx + 1}
            </span>
            <div class="product-icon" style="width:32px; height:32px; flex-shrink:0;">${mediaHTML(item)}</div>
            <div style="min-width:0;">
              <div style="font-size:0.84rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:210px;">${item.nombre}</div>
              <span style="font-size:0.72rem; color:var(--text-dim);">${item.categoria || 'Hardware'}</span>
            </div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-family:var(--font-mono); font-size:0.86rem; font-weight:700; color:#ffde00;">${unidades} unid.</div>
            <div style="font-size:0.74rem; color:var(--text-dim); font-family:var(--font-mono);">${money(recaudado || item.precio)}</div>
          </div>
        </div>
        <div class="stat-progress-bar">
          <div class="stat-progress-fill" style="width:${porcentaje}%;"></div>
        </div>
      </div>
    `;
  }).join("");
}

async function renderDashboardAdmin(periodo = "hoy") {
  const statRow = document.getElementById("statRow");
  if (statRow) {
    const pedidos = adminState.pedidos || [];
    const validos = pedidos.filter(p => p.estado !== "cancelado");
    const pendientes = pedidos.filter(p => p.estado === "pendiente").length;
    let stats = {};
    try {
      stats = await fetchJSON("/api/stats");
    } catch (e) {
      console.warn("Falla al cargar stats admin:", e);
    }

    const ingresos = stats.totalVentas != null ? stats.totalVentas : validos.reduce((acc, p) => acc + Number(p.total), 0);
    const utilidad = stats.utilidadNeta != null ? stats.utilidadNeta : (ingresos * 0.25);
    const margen = stats.margenPct != null ? stats.margenPct : 25;
    const costoVentas = stats.costoVentas != null ? stats.costoVentas : (ingresos - utilidad);
    const valCosto = stats.valorInventarioCosto || 0;
    const valVenta = stats.valorInventarioVenta || 0;
    const gananciaPot = stats.gananciaPotencialInventario || (valVenta - valCosto);
    const totalCatalogo = stats.totalProductos || state.totalProductos || state.productos.length;

    statRow.innerHTML = `
      <div class="stat-card" style="background:linear-gradient(135deg, rgba(255,45,103,0.18), rgba(255,45,103,0.06)); border-color:rgba(255,45,103,0.4);">
        <strong style="color:#ff2d67; font-size:1.45rem;">${money(ingresos)}</strong>
        <span style="color:#fff;">Ingresos Totales (Venta)</span>
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg, rgba(37,211,102,0.18), rgba(37,211,102,0.05)); border-color:rgba(37,211,102,0.45);">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong style="color:#25d366; font-size:1.45rem;">+${money(utilidad)}</strong>
          <span class="badge-status entregado" style="font-size:0.68rem; padding:2px 6px;">${margen}% margen</span>
        </div>
        <span style="color:#fff; font-weight:600;">Utilidad Neta Real</span>
      </div>
      <div class="stat-card">
        <strong style="color:var(--text-dim); font-size:1.35rem;">${money(costoVentas)}</strong>
        <span>Costo Mercadería (COGS)</span>
      </div>
      <div class="stat-card">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong style="font-size:1.35rem;">${money(valCosto)}</strong>
          <span style="font-size:0.72rem; color:var(--text-dim);">PVP: ${money(valVenta)}</span>
        </div>
        <span>Valor Almacén a Costo</span>
      </div>
      <div class="stat-card">
        <strong style="color:#25d366; font-size:1.35rem;">+${money(gananciaPot)}</strong>
        <span>Ganancia Proyectada Stock</span>
      </div>
      <div class="stat-card">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong style="font-size:1.35rem;">${pedidos.length}</strong>
          ${pendientes > 0 ? `<span class="badge-status pendiente" style="font-size:0.7rem;">${pendientes} pendientes</span>` : ''}
        </div>
        <span>Pedidos Registrados</span>
      </div>
    `;
  }

  renderSalesChartSVG();
  renderDashboardAlerts();
  renderDashboardTopProductos();
  renderDashboardInventarioEstancado();
}

document.querySelectorAll("#dashPeriodFilter .filter-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("#dashPeriodFilter .filter-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    const periodo = pill.dataset.periodo || "hoy";
    renderDashboardAdmin(periodo);
  });
});

document.getElementById("btnDashExportarExcel")?.addEventListener("click", () => {
  if (typeof exportarReporteVentasCSV === "function") exportarReporteVentasCSV();
});
document.getElementById("btnDashImprimirPDF")?.addEventListener("click", () => {
  if (typeof imprimirReporteVentasPDF === "function") imprimirReporteVentasPDF();
});

async function renderDashboardInventarioEstancado() {
  const container = document.getElementById("dashEstancadoList");
  const countEl = document.getElementById("dashEstancadoCount");
  if (!container) return;

  let estancados = [];
  try {
    estancados = await fetchJSON("/api/admin/analitica/inventario-estancado");
  } catch (err) {
    console.warn("Falla al cargar inventario estancado:", err);
  }

  if (countEl) {
    countEl.textContent = `${estancados.length} ${estancados.length === 1 ? 'producto' : 'productos'}`;
    countEl.className = estancados.length > 0 ? "badge-status pendiente" : "badge-status entregado";
  }

  if (!estancados || estancados.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:20px 10px; color:#10b981; font-size:0.84rem;">
        <div style="font-size:1.5rem; margin-bottom:4px;">🚀</div>
        <strong>Rotación de catálogo saludable</strong>
        <div style="color:var(--text-dim); font-size:0.75rem; margin-top:2px;">No hay productos con stock detenido sin ventas.</div>
      </div>
    `;
    return;
  }

  const capitalTotalDormido = estancados.reduce((acc, p) => acc + (p.stock * (p.precio_costo || p.precio * 0.75)), 0);

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,176,32,0.08); border:1px solid rgba(255,176,32,0.25); border-radius:8px; padding:6px 10px; font-size:0.78rem; margin-bottom:4px;">
      <span style="color:#ffb020;">⚠️ Capital inmovilizado en stock:</span>
      <strong style="color:var(--text); font-family:var(--font-mono);">${money(capitalTotalDormido)}</strong>
    </div>
  ` + estancados.slice(0, 10).map(p => {
    const costoUnit = p.precio_costo || (p.precio * 0.75);
    const capitalDormido = p.stock * costoUnit;
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:8px;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <div class="product-icon" style="width:30px; height:30px; flex-shrink:0;">${mediaHTML(p)}</div>
          <div style="min-width:0;">
            <div style="font-size:0.82rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.nombre}</div>
            <div style="font-size:0.72rem; color:var(--text-dim); display:flex; gap:8px;">
              <span>Stock: <strong>${p.stock} unid.</strong></span>
              <span>Costo: ${money(costoUnit)}</span>
              <span style="color:#ffb020;">Dormido: ${money(capitalDormido)}</span>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button class="btn btn-outline btn-sm" data-liquidar="${p.id}" style="padding:3px 8px; font-size:0.72rem; color:#ffde00; border-color:rgba(255,222,0,0.4);" title="Promocionar y destacar para liquidar">⚡ Destacar</button>
          <button class="btn btn-outline btn-sm" data-editestancado="${p.id}" style="padding:3px 8px; font-size:0.72rem;" title="Editar precio o costo">Editar</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-liquidar]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const pid = Number(btn.dataset.liquidar);
      try {
        await fetchJSON(`/api/productos/${pid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destacado: true, en_carrusel: true, etiqueta_promo: "LIQUIDACIÓN" })
        });
        await loadCatalogo();
        renderDashboardAdmin();
        mostrarToast("Producto enviado a Carrusel y Destacados para liquidación rápida.", "ok");
      } catch (err) {
        mostrarToast("Error: " + err.message, "err");
      }
    });
  });

  container.querySelectorAll("[data-editestancado]").forEach(btn => {
    btn.addEventListener("click", () => {
      openProductoModal(Number(btn.dataset.editestancado));
    });
  });
}

function renderAdminStats() {
  renderDashboardAdmin();
}

// ============================================================
// ================= TAB 2: GESTIÓN DE PRODUCTOS & STOCK ======
// ============================================================

function fillCategoriaFilterAdmin() {
  const sel = document.getElementById("adminFilterCatProductos");
  if (!sel) return;
  const actual = adminState.filtroProdCategoria || "";
  sel.innerHTML = `<option value="">Todas las categorías (${state.categorias.length})</option>` +
    state.categorias.map(c => `<option value="${c.slug}" ${c.slug === actual ? 'selected' : ''}>${c.nombre}</option>`).join("");
}

async function renderProductosAdmin() {
  const tbody = document.getElementById("productosBody");
  if (!tbody) return;

  const busqueda = (document.getElementById("adminSearchProductos")?.value || "").trim();
  const catFiltro = adminState.filtroProdCategoria || "";
  const stockFiltro = adminState.filtroProdStock || "todos";

  const params = new URLSearchParams({
    paginado: "1",
    page: String(adminState.prodPaginaActual || 1),
    limit: String(adminState.prodPorPagina === "todos" ? 100 : (adminState.prodPorPagina || 15)),
  });
  if (busqueda) params.set("buscar", busqueda);
  if (catFiltro) params.set("categoria", catFiltro);
  if (stockFiltro !== "todos") params.set("stock_filtro", stockFiltro);

  let data;
  try {
    data = await fetchJSON(`/api/productos?${params.toString()}`);
  } catch (err) {
    console.error("Error al cargar productos en panel admin:", err);
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Error al cargar productos: ${err.message}</td></tr>`;
    return;
  }

  const productos = data.productos || [];
  const total = data.total || 0;
  const porPagina = data.porPagina;
  const totalPaginas = data.totalPaginas || 1;

  adminState.prodPaginaActual = data.pagina;

  const inicio = total > 0 ? (data.pagina - 1) * porPagina + 1 : 0;
  const fin = Math.min(inicio + porPagina - 1, total);

  const countEl = document.getElementById("prodPaginationCount");
  if (countEl) countEl.textContent = `Mostrando ${inicio} - ${fin} de ${total.toLocaleString('es-PE')} productos`;

  const pageLabel = document.getElementById("prodCurrentPageLabel");
  if (pageLabel) pageLabel.textContent = `${data.pagina} / ${totalPaginas}`;

  const prevBtn = document.getElementById("btnProdPrevPage");
  if (prevBtn) prevBtn.disabled = data.pagina <= 1;

  const nextBtn = document.getElementById("btnProdNextPage");
  if (nextBtn) nextBtn.disabled = data.pagina >= totalPaginas;

  tbody.innerHTML = productos.length ? productos.map((p) => {
    const costoUnit = (p.precio_costo != null && p.precio_costo !== "") ? Number(p.precio_costo) : (Number(p.precio) * 0.75);
    const utilidadUnit = Number(p.precio) - costoUnit;
    const margenPct = p.precio > 0 ? Math.round((utilidadUnit / Number(p.precio)) * 100) : 0;
    return `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="product-icon" style="width:36px; height:36px; aspect-ratio:1/1; flex-shrink:0;">${mediaHTML(p)}</div>
          <div>
            <span style="font-weight:600;">${p.nombre}</span>
            <div style="display:flex; gap:4px; margin-top:2px;">
              ${p.destacado ? '<span class="badge-featured">DESTACADO</span>' : ""}
              ${p.en_carrusel ? '<span class="badge-featured" style="background:rgba(255,222,0,0.18); color:#ffde00; border:1px solid rgba(255,222,0,0.4);">CARRUSEL</span>' : ""}
            </div>
          </div>
        </div>
      </td>
      <td>${p.categoria}</td>
      <td class="price-cell" style="font-weight:700;">${money(p.precio)}</td>
      <td class="price-cell" style="color:var(--text-dim); font-size:0.84rem;">
        ${p.precio_costo ? money(p.precio_costo) : `<span title="Margen base sugerido 25%">${money(costoUnit)}</span>`}
      </td>
      <td>
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span style="font-weight:700; font-family:var(--font-mono); font-size:0.82rem; color:${utilidadUnit >= 0 ? '#25d366' : '#ff4d4f'};">
            ${utilidadUnit >= 0 ? '+' : ''}${money(utilidadUnit)}
          </span>
          <span class="badge-status ${margenPct >= 20 ? 'entregado' : (margenPct >= 10 ? 'pendiente' : 'cancelado')}" style="font-size:0.67rem; padding:1px 6px; width:fit-content;">
            ${margenPct}% margen
          </span>
        </div>
      </td>
      <td>
        <div class="quick-stock-box">
          <button class="btn-stock-adjust" data-adj-id="${p.id}" data-adj="-1" title="Restar 1 unidad" ${p.stock <= 0 ? 'disabled' : ''}>-</button>
          <span class="stock-val">${p.stock}</span>
          <button class="btn-stock-adjust" data-adj-id="${p.id}" data-adj="1" title="Sumar 1 unidad">+</button>
          <span class="badge-status ${p.stock === 0 ? 'cancelado' : (p.stock <= 5 ? 'pendiente' : 'entregado')}" style="font-size:0.7rem;">
            ${p.stock === 0 ? 'Agotado' : (p.stock <= 5 ? 'Crítico' : 'En stock')}
          </span>
        </div>
      </td>
      <td class="row-actions" style="text-align:right;">
        <button class="btn btn-outline btn-sm" data-edit="${p.id}" title="Editar ficha completa">Editar</button>
        <button class="btn btn-outline btn-sm" data-dup="${p.id}" title="Duplicar como nuevo producto">Duplicar</button>
        <button class="btn btn-danger btn-sm" data-del="${p.id}" title="Eliminar producto">Eliminar</button>
      </td>
    </tr>`;
  }).join("") : `<tr><td colspan="7" class="empty-state">No se encontraron productos con los filtros seleccionados.</td></tr>`;

  tbody.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openProductoModal(Number(b.dataset.edit))));
  tbody.querySelectorAll("[data-dup]").forEach((b) => b.addEventListener("click", () => duplicarProducto(Number(b.dataset.dup))));
  tbody.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => eliminarProducto(Number(b.dataset.del))));

  tbody.querySelectorAll("[data-adj-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.adjId);
      const delta = Number(btn.dataset.adj);
      quickAjustarStock(id, delta);
    });
  });
}

async function quickAjustarStock(id, delta) {
  try {
    const res = await fetchJSON(`/api/admin/productos/${id}/stock-precio`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock_delta: delta })
    });
    renderProductosAdmin();
    renderDashboardAdmin();
    mostrarToast(`Stock ajustado a ${res.producto?.stock || 0} unid.`, "ok");
  } catch (err) {
    mostrarToast("Error actualizando stock: " + err.message, "err");
  }
}

async function duplicarProducto(id) {
  const p = state.productos.find(x => x.id === id);
  try {
    await fetchJSON(`/api/admin/productos/${id}/duplicar`, { method: "POST" });
    await loadCatalogo();
    renderProductosAdmin();
    renderDashboardAdmin();
    mostrarToast(`Producto "${p ? p.nombre : ''}" duplicado con éxito`, "ok");
  } catch (err) {
    mostrarToast("Error al duplicar producto: " + err.message, "err");
  }
}

document.getElementById("adminSearchProductos")?.addEventListener("input", () => {
  adminState.prodPaginaActual = 1;
  renderProductosAdmin();
});
document.getElementById("adminFilterCatProductos")?.addEventListener("change", (e) => {
  adminState.filtroProdCategoria = e.target.value;
  adminState.prodPaginaActual = 1;
  renderProductosAdmin();
});
document.getElementById("adminFilterStockProductos")?.addEventListener("change", (e) => {
  adminState.filtroProdStock = e.target.value;
  adminState.prodPaginaActual = 1;
  renderProductosAdmin();
});
document.getElementById("adminPageSize")?.addEventListener("change", (e) => {
  adminState.prodPorPagina = e.target.value;
  adminState.prodPaginaActual = 1;
  renderProductosAdmin();
});
document.getElementById("btnProdPrevPage")?.addEventListener("click", () => {
  if (adminState.prodPaginaActual > 1) {
    adminState.prodPaginaActual--;
    renderProductosAdmin();
  }
});
document.getElementById("btnProdNextPage")?.addEventListener("click", () => {
  adminState.prodPaginaActual++;
  renderProductosAdmin();
});

function fillCategoriaSelectAdmin() {
  const sel = document.getElementById("pCategoria");
  if (!sel) return;
  sel.innerHTML = state.categorias.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("");
}

const productoOverlay = document.getElementById("productoModalOverlay");
document.getElementById("nuevoProductoBtn").addEventListener("click", () => openProductoModal(null));
document.getElementById("productoModalClose").addEventListener("click", () => productoOverlay.classList.remove("open"));
productoOverlay.addEventListener("click", (e) => { if (e.target === productoOverlay) productoOverlay.classList.remove("open"); });

// ---------- Imagen del producto en el formulario admin ----------
let imagenPendiente = null;
let imagenUrlManual = null;
let imagenActualUrl = null;
let imagenEliminar = false;

const pImagenInput = document.getElementById("pImagenInput");
const pImagenUrlInput = document.getElementById("pImagenUrlInput");
const pImagenPreview = document.getElementById("pImagenPreview");
const pImagenEliminarBtn = document.getElementById("pImagenEliminarBtn");

function refrescarPreviewImagen() {
  const icono = document.getElementById("pIcono").value.trim() || "chip";
  if (imagenPendiente) {
    pImagenPreview.innerHTML = `<img src="${imagenPendiente}" alt="Vista previa" onerror="this.parentElement.innerHTML=getIcon('${icono}');" />`;
    pImagenEliminarBtn.hidden = false;
  } else if (imagenUrlManual) {
    pImagenPreview.innerHTML = `<img src="${imagenUrlManual}" alt="Vista previa" onerror="this.parentElement.innerHTML=getIcon('${icono}');" />`;
    pImagenEliminarBtn.hidden = false;
  } else if (imagenActualUrl && !imagenEliminar) {
    pImagenPreview.innerHTML = `<img src="${imagenActualUrl}" alt="Vista previa" onerror="this.parentElement.innerHTML=getIcon('${icono}');" />`;
    pImagenEliminarBtn.hidden = false;
  } else {
    pImagenPreview.innerHTML = getIcon(icono);
    pImagenEliminarBtn.hidden = true;
  }
}

pImagenInput.addEventListener("change", () => {
  const msg = document.getElementById("productoMsg"); msg.textContent = ""; msg.className = "form-msg";
  const file = pImagenInput.files && pImagenInput.files[0];
  if (!file) return;

  const tiposValidos = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!tiposValidos.includes(file.type)) {
    msg.textContent = "Formato no permitido. Usa PNG, JPG, WEBP o GIF.";
    msg.className = "form-msg err";
    pImagenInput.value = "";
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    msg.textContent = "La imagen pesa demasiado (máximo 8MB).";
    msg.className = "form-msg err";
    pImagenInput.value = "";
    return;
  }

  const lector = new FileReader();
  lector.onload = () => {
    imagenPendiente = lector.result;
    imagenUrlManual = null;
    pImagenUrlInput.value = "";
    imagenEliminar = false;
    refrescarPreviewImagen();
  };
  lector.readAsDataURL(file);
});

pImagenUrlInput.addEventListener("input", () => {
  const msg = document.getElementById("productoMsg"); msg.textContent = ""; msg.className = "form-msg";
  const valor = pImagenUrlInput.value.trim();
  if (valor) {
    imagenPendiente = null;
    pImagenInput.value = "";
    imagenUrlManual = valor;
    imagenEliminar = false;
  } else {
    imagenUrlManual = null;
  }
  refrescarPreviewImagen();
});

pImagenEliminarBtn.addEventListener("click", () => {
  imagenPendiente = null;
  imagenUrlManual = null;
  pImagenUrlInput.value = "";
  imagenEliminar = true;
  pImagenInput.value = "";
  refrescarPreviewImagen();
});

document.getElementById("pIcono").addEventListener("input", () => {
  if (!imagenPendiente && !imagenUrlManual && !(imagenActualUrl && !imagenEliminar)) refrescarPreviewImagen();
});

async function openProductoModal(id) {
  const msg = document.getElementById("productoMsg"); msg.textContent = ""; msg.className = "form-msg";
  const form = document.getElementById("productoForm");
  form.reset();
  fillCategoriaSelectAdmin();

  imagenPendiente = null;
  imagenUrlManual = null;
  imagenActualUrl = null;
  imagenEliminar = false;
  pImagenInput.value = "";
  pImagenUrlInput.value = "";

  if (id) {
    let p = (state.productos || []).find((x) => x.id === id);
    if (!p) {
      try {
        p = await fetchJSON(`/api/productos/${id}`);
      } catch (e) {
        console.warn("No se pudo cargar producto para edición:", e);
        return;
      }
    }
    if (!p) return;
    document.getElementById("productoModalTitle").textContent = "Editar producto";
    document.getElementById("pId").value = p.id;
    document.getElementById("pNombre").value = p.nombre;
    document.getElementById("pPrecio").value = p.precio;
    const pCostoInput = document.getElementById("pPrecioCosto");
    if (pCostoInput) pCostoInput.value = (p.precio_costo != null && p.precio_costo !== "") ? p.precio_costo : "";
    document.getElementById("pStock").value = p.stock;
    document.getElementById("pDescripcion").value = p.descripcion || "";
    document.getElementById("pCaracteristicas").value = p.caracteristicas || "";
    document.getElementById("pIcono").value = p.icono || "";
    document.getElementById("pDestacado").checked = !!p.destacado;
    document.getElementById("pEnCarrusel").checked = !!p.en_carrusel;
    document.getElementById("pPrecioAnterior").value = p.precio_anterior || "";
    document.getElementById("pEtiquetaPromo").value = p.etiqueta_promo || "";
    document.getElementById("pRegaloNombre").value = p.regalo_nombre || "";
    const cat = state.categorias.find((c) => c.slug === p.categoria_slug);
    if (cat) document.getElementById("pCategoria").value = cat.id;
    imagenActualUrl = p.imagen_url || null;
    if (imagenActualUrl && /^https?:\/\//i.test(imagenActualUrl)) {
      pImagenUrlInput.value = imagenActualUrl;
    }
  } else {
    document.getElementById("productoModalTitle").textContent = "Nuevo producto";
    document.getElementById("pId").value = "";
    const pCostoInput = document.getElementById("pPrecioCosto");
    if (pCostoInput) pCostoInput.value = "";
    document.getElementById("pEnCarrusel").checked = false;
    document.getElementById("pPrecioAnterior").value = "";
    document.getElementById("pEtiquetaPromo").value = "";
    document.getElementById("pRegaloNombre").value = "";
  }
  refrescarPreviewImagen();
  actualizarLiveMargenProducto();
  productoOverlay.classList.add("open");
}

function actualizarLiveMargenProducto() {
  const precioEl = document.getElementById("pPrecio");
  const costoEl = document.getElementById("pPrecioCosto");
  const displayEl = document.getElementById("pMargenLiveDisplay");
  if (!precioEl || !costoEl || !displayEl) return;

  const precio = Number(precioEl.value) || 0;
  const costoVal = costoEl.value !== "" ? Number(costoEl.value) : null;
  const costo = costoVal != null ? costoVal : (precio > 0 ? (precio * 0.75) : 0);

  if (precio <= 0) {
    displayEl.innerHTML = `<span style="color:var(--text-dim);">Ingresa precio para proyectar margen comercial.</span>`;
    return;
  }

  const ganancia = precio - costo;
  const margenPct = Math.round((ganancia / precio) * 100);
  const color = margenPct >= 20 ? "#25d366" : (margenPct >= 10 ? "#ffb020" : "#ff4d4f");

  displayEl.innerHTML = `
    <span style="color:${color}; font-weight:600;">
      💰 Margen neto: ${ganancia >= 0 ? '+' : ''}${money(ganancia)} por unid. (${margenPct}% margen comercial)
      ${costoVal == null ? '<span style="opacity:0.7; font-weight:normal;"> (usando costo base 75%)</span>' : ''}
    </span>
  `;
}

document.getElementById("pPrecio")?.addEventListener("input", actualizarLiveMargenProducto);
document.getElementById("pPrecioCosto")?.addEventListener("input", actualizarLiveMargenProducto);

document.getElementById("productoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("productoMsg");
  const id = document.getElementById("pId").value;
  const payload = {
    nombre: document.getElementById("pNombre").value.trim(),
    categoria_id: Number(document.getElementById("pCategoria").value),
    precio: Number(document.getElementById("pPrecio").value),
    precio_costo: document.getElementById("pPrecioCosto")?.value ? Number(document.getElementById("pPrecioCosto").value) : null,
    stock: Number(document.getElementById("pStock").value),
    descripcion: document.getElementById("pDescripcion").value.trim(),
    caracteristicas: document.getElementById("pCaracteristicas").value.trim(),
    icono: document.getElementById("pIcono").value.trim() || "chip",
    destacado: document.getElementById("pDestacado").checked,
    en_carrusel: document.getElementById("pEnCarrusel").checked,
    precio_anterior: document.getElementById("pPrecioAnterior").value ? Number(document.getElementById("pPrecioAnterior").value) : null,
    etiqueta_promo: document.getElementById("pEtiquetaPromo").value.trim(),
    regalo_nombre: document.getElementById("pRegaloNombre").value.trim(),
  };
  if (imagenPendiente) {
    payload.imagen_base64 = imagenPendiente;
  } else if (imagenUrlManual) {
    payload.imagen_url = imagenUrlManual;
  } else if (imagenEliminar) {
    payload.eliminar_imagen = true;
  }
  try {
    if (id) {
      await fetchJSON(`/api/productos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetchJSON("/api/productos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    productoOverlay.classList.remove("open");
    await loadCatalogo();
    renderProductosAdmin();
    renderDashboardAdmin();
    mostrarToast(id ? "Producto actualizado correctamente" : "Producto creado exitosamente", "ok");
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "form-msg err";
  }
});

async function eliminarProducto(id) {
  const p = state.productos.find((x) => x.id === id);
  const ok = await confirmDialog({
    titulo: "¿Eliminar producto?",
    mensaje: `¿Estás seguro de eliminar "${p ? p.nombre : 'este producto'}" del catálogo? Esta acción no se puede deshacer.`,
    botonTexto: "Eliminar producto",
    peligro: true
  });
  if (!ok) return;
  try {
    await fetchJSON(`/api/productos/${id}`, { method: "DELETE" });
    await loadCatalogo();
    renderProductosAdmin();
    renderDashboardAdmin();
    mostrarToast("Producto eliminado del catálogo", "info");
  } catch (err) {
    mostrarToast(err.message, "err");
  }
}

// ============================================================
// ================= TAB 3: CATEGORÍAS / SECCIONES ============
// ============================================================

async function renderCategoriasAdmin() {
  const tbody = document.getElementById("categoriasBody");
  const cardsContainer = document.getElementById("adminCategoriasCards");
  const countPill = document.getElementById("statTotalCategorias");
  const countProds = document.getElementById("statTotalProductosCats");
  if (!tbody) return;

  // Garantizar que state.categorias no esté vacío consultando la API en vivo
  if (!state.categorias || state.categorias.length === 0) {
    try {
      state.categorias = await fetchJSON("/api/categorias");
    } catch (e) {
      console.warn("Falla cargando categorías:", e);
    }
  }

  const busqueda = (document.getElementById("adminSearchCategorias")?.value || "").toLowerCase().trim();
  const cats = (state.categorias || []).filter(c =>
    (c.nombre || "").toLowerCase().includes(busqueda) ||
    (c.slug || "").toLowerCase().includes(busqueda)
  );

  const totalProds = (state.categorias || []).reduce((acc, c) => acc + (Number(c.total_productos) || 0), 0);
  if (countPill) countPill.textContent = `${state.categorias.length} Categorías Activas`;
  if (countProds) countProds.textContent = `${totalProds} Productos en Tienda`;

  // 1. Grid Visual Estilo Bento (igual a la tienda de ventas)
  if (cardsContainer) {
    cardsContainer.innerHTML = (state.categorias || []).map(c => `
      <div class="admin-cat-card" data-cat-slug="${c.slug}" title="Clic para filtrar productos de esta categoría">
        <div class="admin-cat-icon">${getIcon(c.icono || 'chip')}</div>
        <div style="min-width:0; flex:1;">
          <strong style="display:block; font-size:0.88rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.nombre}</strong>
          <span style="font-size:0.74rem; color:var(--text-dim); font-family:var(--font-mono);">${c.slug}</span>
        </div>
        <div style="text-align:right;">
          <span class="badge-status entregado" style="font-size:0.72rem; padding:3px 8px;">${c.total_productos}</span>
        </div>
      </div>
    `).join("");

    cardsContainer.querySelectorAll(".admin-cat-card").forEach(card => {
      card.addEventListener("click", () => {
        const slug = card.dataset.catSlug;
        adminState.filtroProdCategoria = slug;
        adminState.prodPaginaActual = 1;
        const sel = document.getElementById("adminFilterCatProductos");
        if (sel) sel.value = slug;
        document.querySelector('[data-tab="productos"]')?.click();
      });
    });
  }

  // 2. Tabla Detallada con Iconos y Acciones
  tbody.innerHTML = cats.length ? cats.map((c) => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="admin-cat-icon" style="width:34px; height:34px; border-radius:8px;">
            ${getIcon(c.icono || 'chip')}
          </div>
          <div>
            <strong style="color:var(--text); font-size:0.9rem;">${c.nombre}</strong>
            <div style="font-size:0.74rem; color:var(--text-dim);">Visible en menú y filtros de la tienda</div>
          </div>
        </div>
      </td>
      <td class="price-cell" style="font-size:0.8rem;">${c.slug}</td>
      <td>
        <span class="badge-status entregado" style="font-size:0.76rem; font-weight:700;">
          ${c.total_productos} productos
        </span>
      </td>
      <td>
        <span style="font-size:0.78rem; color:#25d366; font-weight:600; display:inline-flex; align-items:center; gap:5px;">
          <span style="width:7px; height:7px; border-radius:50%; background:#25d366; display:inline-block;"></span>
          Activo en tienda
        </span>
      </td>
      <td class="row-actions" style="text-align:right;">
        <button class="btn btn-outline btn-sm" data-viewcat="${c.slug}" title="Ver productos de esta categoría">Ver Productos</button>
        <button class="btn btn-danger btn-sm" data-delcat="${c.id}" title="Eliminar categoría">Eliminar</button>
      </td>
    </tr>`).join("") : `
      <tr>
        <td colspan="5" class="empty-state">
          <div style="padding:24px 10px; text-align:center;">
            <div style="font-size:1.8rem; margin-bottom:6px;">🏷️</div>
            <strong style="font-size:0.92rem; color:var(--text);">No se encontraron categorías con ese filtro</strong>
            <p style="font-size:0.78rem; color:var(--text-dim); margin-top:4px;">Prueba borrando el texto de búsqueda o sincroniza con la tienda.</p>
          </div>
        </td>
      </tr>`;

  tbody.querySelectorAll("[data-delcat]").forEach((b) => b.addEventListener("click", () => eliminarCategoria(Number(b.dataset.delcat))));
  tbody.querySelectorAll("[data-viewcat]").forEach((b) => b.addEventListener("click", () => {
    adminState.filtroProdCategoria = b.dataset.viewcat;
    adminState.prodPaginaActual = 1;
    const sel = document.getElementById("adminFilterCatProductos");
    if (sel) sel.value = b.dataset.viewcat;
    document.querySelector('[data-tab="productos"]')?.click();
  }));
}

document.getElementById("adminSearchCategorias")?.addEventListener("input", renderCategoriasAdmin);
document.getElementById("btnSyncCategorias")?.addEventListener("click", async () => {
  mostrarToast("Sincronizando categorías y catálogo con la tienda...", "info");
  await loadCatalogo();
  fillCategoriaFilterAdmin();
  fillCategoriaSelectAdmin();
  await renderCategoriasAdmin();
  renderProductosAdmin();
  renderDashboardAdmin();
  mostrarToast("¡Catálogo y categorías sincronizados con la tienda de ventas!", "ok");
});

const categoriaOverlay = document.getElementById("categoriaModalOverlay");
document.getElementById("nuevaCategoriaBtn")?.addEventListener("click", () => {
  document.getElementById("categoriaForm")?.reset();
  const msg = document.getElementById("categoriaMsg");
  if (msg) { msg.textContent = ""; msg.className = "form-msg"; }
  categoriaOverlay?.classList.add("open");
});
document.getElementById("categoriaModalClose")?.addEventListener("click", () => categoriaOverlay?.classList.remove("open"));
categoriaOverlay?.addEventListener("click", (e) => { if (e.target === categoriaOverlay) categoriaOverlay.classList.remove("open"); });

document.getElementById("categoriaForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("categoriaMsg");
  try {
    await fetchJSON("/api/categorias", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: document.getElementById("catNombre").value.trim(),
        slug: document.getElementById("catSlug").value.trim().toLowerCase(),
        icono: document.getElementById("catIcono").value.trim() || "chip",
      }),
    });
    categoriaOverlay?.classList.remove("open");
    await loadCatalogo();
    fillCategoriaFilterAdmin();
    fillCategoriaSelectAdmin();
    renderCategoriasAdmin();
    mostrarToast("Categoría agregada exitosamente", "ok");
  } catch (err) {
    if (msg) {
      msg.textContent = err.message;
      msg.className = "form-msg err";
    }
  }
});

async function eliminarCategoria(id) {
  const ok = await confirmDialog({
    titulo: "¿Eliminar categoría?",
    mensaje: "Solo se puede eliminar esta sección si no tiene productos asociados.",
    botonTexto: "Eliminar categoría",
    peligro: true
  });
  if (!ok) return;
  try {
    await fetchJSON(`/api/categorias/${id}`, { method: "DELETE" });
    await loadCatalogo();
    fillCategoriaFilterAdmin();
    fillCategoriaSelectAdmin();
    renderCategoriasAdmin();
    mostrarToast("Categoría eliminada", "info");
  } catch (err) {
    mostrarToast(err.message, "err");
  }
}

// ============================================================
// ================= TAB 4: PEDIDOS & DESPACHOS ===============
// ============================================================

async function loadAdminPedidos() {
  try {
    adminState.pedidos = await fetchJSON("/api/admin/pedidos");
  } catch (err) {
    adminState.pedidos = [];
  }
  renderDashboardAdmin();
  renderPedidosAdmin();
}

// Filtros por pastillas de estado (pills)
document.querySelectorAll("#pedidoFilterPills .filter-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("#pedidoFilterPills .filter-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    adminState.filtroPedidoEstado = pill.dataset.estado || "todos";
    renderPedidosAdmin();
  });
});

function renderPedidosAdmin() {
  const tbody = document.getElementById("pedidosBody");
  if (!tbody) return;

  const pedidos = adminState.pedidos || [];

  // Actualizar contadores en las pastillas
  const cTodos = pedidos.length;
  const cPendiente = pedidos.filter(p => p.estado === "pendiente").length;
  const cConfirmado = pedidos.filter(p => p.estado === "confirmado").length;
  const cEnviado = pedidos.filter(p => p.estado === "enviado").length;
  const cEntregado = pedidos.filter(p => p.estado === "entregado").length;
  const cCancelado = pedidos.filter(p => p.estado === "cancelado").length;

  const elCountTodos = document.getElementById("countPedTodos"); if (elCountTodos) elCountTodos.textContent = cTodos;
  const elCountPend = document.getElementById("countPedPendiente"); if (elCountPend) elCountPend.textContent = cPendiente;
  const elCountConf = document.getElementById("countPedConfirmado"); if (elCountConf) elCountConf.textContent = cConfirmado;
  const elCountEnv = document.getElementById("countPedEnviado"); if (elCountEnv) elCountEnv.textContent = cEnviado;
  const elCountEnt = document.getElementById("countPedEntregado"); if (elCountEnt) elCountEnt.textContent = cEntregado;
  const elCountCanc = document.getElementById("countPedCancelado"); if (elCountCanc) elCountCanc.textContent = cCancelado;

  const busqueda = (document.getElementById("adminSearchPedidos")?.value || "").toLowerCase();
  const estadoFiltro = adminState.filtroPedidoEstado || "todos";

  let filtrados = pedidos;
  if (estadoFiltro !== "todos") {
    filtrados = filtrados.filter(p => p.estado === estadoFiltro);
  }
  if (busqueda) {
    filtrados = filtrados.filter(p =>
      (p.cliente_nombre || "").toLowerCase().includes(busqueda) ||
      (p.cliente_telefono || "").toLowerCase().includes(busqueda) ||
      String(p.id).includes(busqueda) ||
      (p.estado || "").toLowerCase().includes(busqueda)
    );
  }

  tbody.innerHTML = filtrados.length ? filtrados.map((p) => {
    const waMsg = `Hola ${p.cliente_nombre}, le saludamos de Kernel SAC respecto a su pedido #KS-${p.id}...`;
    const waUrl = waLink(p.cliente_telefono, waMsg);
    return `
      <tr>
        <td><strong>#KS-${p.id}</strong></td>
        <td>
          <div style="font-weight:600;">${p.cliente_nombre}</div>
          <a href="${waUrl}" target="_blank" rel="noopener" style="color:var(--text-dim); font-size:0.76rem; display:inline-flex; align-items:center; gap:4px; text-decoration:none;">
            <span style="color:#25d366;">💬</span> ${p.cliente_telefono || 'Sin teléfono'}
          </a>
        </td>
        <td class="price-cell" style="font-weight:700;">${money(p.total)}</td>
        <td>
          <div style="font-family:var(--font-mono); font-size:0.82rem; font-weight:700; color:${Number(p.ganancia_neta) >= 0 ? '#25d366' : '#ff4d4f'};">
            ${Number(p.ganancia_neta) >= 0 ? '+' : ''}${money(p.ganancia_neta || 0)}
          </div>
          <span class="badge-status ${(p.margen_pct || 25) >= 20 ? 'entregado' : 'pendiente'}" style="font-size:0.65rem; padding:1px 5px;">
            ${p.margen_pct || 25}% margen
          </span>
        </td>
        <td style="font-family:var(--font-mono); font-size:0.76rem;">${p.creado_en}</td>
        <td>
          <select class="order-status-selector" data-id="${p.id}" data-status="${p.estado}">
            ${["pendiente", "confirmado", "enviado", "entregado", "cancelado"].map((s) => `<option value="${s}" ${s === p.estado ? "selected" : ""}>${s.toUpperCase()}</option>`).join("")}
          </select>
        </td>
        <td class="row-actions" style="text-align:right;">
          <button class="btn btn-outline btn-sm" data-vieworder="${p.id}" title="Ver detalle de la orden">Detalle</button>
          <a href="${waLink(p.cliente_telefono, `Hola ${p.cliente_nombre}, le informamos de Kernel SAC que su pedido #KS-${p.id} se encuentra en estado: ${p.estado.toUpperCase()}.`)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="color:#25d366; border-color:rgba(37,211,102,0.4);" title="Notificar estado por WhatsApp">
            WhatsApp
          </a>
          <button class="btn btn-danger btn-sm" data-delorder="${p.id}" title="Eliminar pedido">🗑️</button>
        </td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="7" class="empty-state">No se encontraron pedidos con los filtros aplicados.</td></tr>`;

  tbody.querySelectorAll(".order-status-selector").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const nuevo = sel.value;
      try {
        await fetchJSON(`/api/admin/pedidos/${sel.dataset.id}/estado`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: nuevo }),
        });
        sel.dataset.status = nuevo;
        const p = adminState.pedidos.find(x => x.id === Number(sel.dataset.id));
        if (p) p.estado = nuevo;
        renderDashboardAdmin();
        renderPedidosAdmin();
        mostrarToast(`Estado de orden #KS-${sel.dataset.id} cambiado a "${nuevo.toUpperCase()}"`, "ok");
      } catch (err) { mostrarToast(err.message, "err"); }
    });
  });

  tbody.querySelectorAll("[data-vieworder]").forEach(btn => {
    btn.addEventListener("click", () => openPedidoDetalleModal(Number(btn.dataset.vieworder)));
  });

  tbody.querySelectorAll("[data-delorder]").forEach(btn => {
    btn.addEventListener("click", () => eliminarPedido(Number(btn.dataset.delorder)));
  });
}

const pedidoDetalleOverlay = document.getElementById("pedidoDetalleModalOverlay");
document.getElementById("pedidoDetalleModalClose")?.addEventListener("click", () => pedidoDetalleOverlay.classList.remove("open"));
pedidoDetalleOverlay?.addEventListener("click", (e) => {
  if (e.target === pedidoDetalleOverlay) pedidoDetalleOverlay.classList.remove("open");
});

function openPedidoDetalleModal(id) {
  const pedido = (adminState.pedidos || []).find(p => p.id === id);
  if (!pedido) return;

  const overlay = document.getElementById("pedidoDetalleModalOverlay");
  document.getElementById("modalPedId").textContent = `Pedido #KS-${pedido.id}`;
  document.getElementById("modalPedFecha").textContent = pedido.creado_en || "";
  document.getElementById("modalPedEstadoBadge").innerHTML = `<span class="badge-status ${pedido.estado}">${pedido.estado}</span>`;
  document.getElementById("modalPedCliente").textContent = pedido.cliente_nombre || "-";
  document.getElementById("modalPedTelefono").innerHTML = `<a href="tel:${pedido.cliente_telefono}" style="color:inherit;">${pedido.cliente_telefono || '-'}</a>`;
  document.getElementById("modalPedDireccion").textContent = pedido.cliente_direccion || "Recojo en tienda (Wilson CyberPlaza)";

  const items = pedido.items || [];
  const tbody = document.getElementById("modalPedItemsBody");
  if (tbody) {
    tbody.innerHTML = items.length ? items.map(it => `
      <tr>
        <td><strong>${it.producto_nombre}</strong></td>
        <td style="text-align:center;">${it.cantidad}</td>
        <td>${money(it.precio_unitario)}</td>
        <td style="text-align:right; font-weight:700;">${money(it.cantidad * it.precio_unitario)}</td>
      </tr>
    `).join("") : `<tr><td colspan="4" class="empty-state">No se registraron detalles de ítems.</td></tr>`;
  }

  document.getElementById("modalPedTotal").textContent = money(pedido.total);

  const costoTotal = pedido.costo_total != null ? Number(pedido.costo_total) : (Number(pedido.total) * 0.75);
  const gananciaNeta = pedido.ganancia_neta != null ? Number(pedido.ganancia_neta) : (Number(pedido.total) - costoTotal);
  const margenPct = pedido.margen_pct != null ? pedido.margen_pct : (pedido.total > 0 ? Math.round((gananciaNeta / Number(pedido.total)) * 100) : 0);

  const costoEl = document.getElementById("modalPedCosto");
  if (costoEl) costoEl.textContent = money(costoTotal);
  const gananciaEl = document.getElementById("modalPedGanancia");
  if (gananciaEl) {
    gananciaEl.textContent = `${gananciaNeta >= 0 ? '+' : ''}${money(gananciaNeta)} (${margenPct}% margen neto)`;
    gananciaEl.style.color = gananciaNeta >= 0 ? "#25d366" : "#ff4d4f";
  }

  const selEstado = document.getElementById("modalPedEstadoSelect");
  if (selEstado) {
    selEstado.value = pedido.estado;
    selEstado.onchange = async () => {
      try {
        await fetchJSON(`/api/admin/pedidos/${pedido.id}/estado`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: selEstado.value }),
        });
        pedido.estado = selEstado.value;
        document.getElementById("modalPedEstadoBadge").innerHTML = `<span class="badge-status ${pedido.estado}">${pedido.estado}</span>`;
        renderPedidosAdmin();
        renderDashboardAdmin();
        mostrarToast(`Estado del pedido #KS-${pedido.id} cambiado a "${selEstado.value}"`, "ok");
      } catch (err) {
        mostrarToast(err.message, "err");
      }
    };
  }

  const waBtn = document.getElementById("modalPedWaBtn");
  if (waBtn) {
    const waMsg = `Hola ${pedido.cliente_nombre}, le saludamos de Kernel SAC respecto a su pedido #KS-${pedido.id} por un total de ${money(pedido.total)}. Estado actual: ${pedido.estado.toUpperCase()}.`;
    waBtn.href = waLink(pedido.cliente_telefono, waMsg);
  }

  const printBtn = document.getElementById("modalPedPrintBtn");
  if (printBtn) {
    printBtn.onclick = () => imprimirHojaDespacho(pedido);
  }

  overlay.classList.add("open");
}

function imprimirHojaDespacho(pedido) {
  const win = window.open("", "_blank", "width=850,height=750");
  if (!win) {
    mostrarToast("Por favor habilita las ventanas emergentes para imprimir la hoja de despacho", "err");
    return;
  }
  const itemsHTML = (pedido.items || []).map((it, idx) => `
    <tr>
      <td style="text-align:center; padding:8px; border:1px solid #ddd;">${idx + 1}</td>
      <td style="padding:8px; border:1px solid #ddd;"><strong>${it.producto_nombre}</strong></td>
      <td style="text-align:center; padding:8px; border:1px solid #ddd; font-weight:bold;">${it.cantidad}</td>
      <td style="text-align:right; padding:8px; border:1px solid #ddd;">S/ ${Number(it.precio_unitario).toFixed(2)}</td>
      <td style="text-align:right; padding:8px; border:1px solid #ddd; font-weight:bold;">S/ ${(it.cantidad * it.precio_unitario).toFixed(2)}</td>
      <td style="text-align:center; padding:8px; border:1px solid #ddd;">[  ]</td>
    </tr>
  `).join("");

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Hoja de Despacho #KS-${pedido.id} - Kernel SAC</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 30px; color: #111; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ff2d67; padding-bottom: 15px; margin-bottom: 20px; }
        .logo-box h1 { margin: 0; font-size: 24px; color: #111; letter-spacing: 1px; }
        .logo-box h1 span { color: #ff2d67; }
        .logo-box p { margin: 3px 0 0; font-size: 12px; color: #666; }
        .badge { background: #f3f4f6; border: 1px solid #ddd; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px; }
        .box { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
        th { background: #f3f4f6; padding: 10px; border: 1px solid #ddd; text-align: left; }
        .total-row { text-align: right; margin-top: 15px; font-size: 16px; font-weight: bold; }
        .total-row span { color: #ff2d67; font-size: 20px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; text-align: center; }
        .sig-line { border-top: 1px dashed #666; padding-top: 8px; font-size: 12px; color: #444; }
        @media print { body { margin: 15px; } button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-box">
          <h1>KERNEL <span>SAC</span></h1>
          <p>Hardware, Redes y Videovigilancia · RUC: 20608945123 · Lima, Perú</p>
          <p>Av. Garcilaso de la Vega 1348, C.C. CyberPlaza Semisótano Tienda 2B-115</p>
        </div>
        <div>
          <div class="badge">HOJA DE DESPACHO #KS-${pedido.id}</div>
          <div style="font-size:12px; color:#666; text-align:right; margin-top:4px;">Fecha: ${pedido.creado_en}</div>
        </div>
      </div>

      <div class="box">
        <div class="grid-2">
          <div><strong>Cliente:</strong> ${pedido.cliente_nombre}</div>
          <div><strong>Teléfono:</strong> ${pedido.cliente_telefono}</div>
          <div><strong>Tipo de Cliente:</strong> ${pedido.tipo_cliente || 'Final'}</div>
          <div><strong>Estado de Orden:</strong> ${pedido.estado.toUpperCase()}</div>
          <div style="grid-column: 1 / -1;"><strong>Dirección de Entrega:</strong> ${pedido.cliente_direccion || 'Recojo en tienda'}</div>
        </div>
      </div>

      <h3 style="margin: 0 0 6px; font-size: 15px;">Detalle de Artículos para Almacén / Despacho</h3>
      <table>
        <thead>
          <tr>
            <th style="width:30px; text-align:center;">#</th>
            <th>Descripción del Producto</th>
            <th style="width:70px; text-align:center;">Cant.</th>
            <th style="width:90px; text-align:right;">P. Unit</th>
            <th style="width:100px; text-align:right;">Subtotal</th>
            <th style="width:60px; text-align:center;">Check</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML || '<tr><td colspan="6" style="text-align:center; padding:15px;">Sin artículos registrados</td></tr>'}
        </tbody>
      </table>

      <div class="total-row">
        Total a Cobrar / Liquidar: <span>S/ ${Number(pedido.total).toFixed(2)}</span>
      </div>

      <div class="signatures">
        <div>
          <div style="height: 50px;"></div>
          <div class="sig-line">Preparado / Despachado por (Kernel SAC)</div>
        </div>
        <div>
          <div style="height: 50px;"></div>
          <div class="sig-line">Recibido Conforme (Firma y DNI Cliente)</div>
        </div>
      </div>

      <div style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 24px; font-size: 14px; font-weight: bold; background: #ff2d67; color: white; border: none; border-radius: 6px; cursor: pointer;">🖨️ Imprimir Ticket / Hoja</button>
      </div>
    </body>
    </html>
  `);
  win.document.close();
}

function exportarPedidosCSV() {
  const pedidos = adminState.pedidos || [];
  if (pedidos.length === 0) {
    mostrarToast("No hay pedidos registrados para exportar", "info");
    return;
  }

  const cabeceras = ["ID Orden", "Fecha", "Cliente", "Teléfono", "Dirección", "Tipo Cliente", "Total (S/)", "Estado", "Artículos"];
  const filas = pedidos.map(p => {
    const itemsResumen = (p.items || []).map(it => `${it.cantidad}x ${it.producto_nombre} (S/ ${Number(it.precio_unitario).toFixed(2)})`).join(" | ");
    return [
      `KS-${p.id}`,
      `"${(p.creado_en || '').replace(/"/g, '""')}"`,
      `"${(p.cliente_nombre || '').replace(/"/g, '""')}"`,
      `"${(p.cliente_telefono || '').replace(/"/g, '""')}"`,
      `"${(p.cliente_direccion || '').replace(/"/g, '""')}"`,
      `"${(p.tipo_cliente || '').replace(/"/g, '""')}"`,
      Number(p.total).toFixed(2),
      `"${p.estado}"`,
      `"${itemsResumen.replace(/"/g, '""')}"`
    ].join(",");
  });

  const csvContenido = "\uFEFF" + [cabeceras.join(","), ...filas].join("\r\n");
  const blob = new Blob([csvContenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedidos_kernel_sac_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  mostrarToast("Reporte de pedidos exportado a CSV exitosamente", "ok");
}

document.getElementById("btnExportarPedidosCSV")?.addEventListener("click", exportarPedidosCSV);

async function eliminarPedido(id) {
  const ok = await confirmDialog({
    titulo: "¿Eliminar pedido?",
    mensaje: `¿Estás seguro de eliminar el pedido #KS-${id}? Esta acción lo removerá permanentemente del sistema.`,
    botonTexto: "Eliminar pedido",
    peligro: true
  });
  if (!ok) return;
  try {
    await fetchJSON(`/api/admin/pedidos/${id}`, { method: "DELETE" });
    adminState.pedidos = adminState.pedidos.filter(p => p.id !== id);
    renderDashboardAdmin();
    renderPedidosAdmin();
    mostrarToast(`Pedido #KS-${id} eliminado del sistema`, "info");
  } catch (err) {
    mostrarToast(err.message, "err");
  }
}

document.getElementById("adminSearchPedidos")?.addEventListener("input", renderPedidosAdmin);

function imprimirListaPedidosPDF() {
  const pedidos = adminState.pedidos || [];
  if (pedidos.length === 0) {
    mostrarToast("No hay pedidos registrados para imprimir", "info");
    return;
  }
  const printSec = document.getElementById("adminPrintSection");
  if (!printSec) return;

  const filas = pedidos.map((p, idx) => `
    <tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td><strong>#KS-${p.id}</strong></td>
      <td>${p.creado_en || ''}</td>
      <td>${p.cliente_nombre || ''}</td>
      <td>${p.cliente_telefono || ''}</td>
      <td>${p.cliente_direccion || 'Tienda CyberPlaza'}</td>
      <td style="text-align:right; font-weight:bold;">S/ ${Number(p.total).toFixed(2)}</td>
      <td style="text-align:center; text-transform:uppercase;">${p.estado}</td>
    </tr>
  `).join("");

  const totalSuma = pedidos.reduce((acc, p) => acc + Number(p.total), 0);

  printSec.innerHTML = `
    <div style="border-bottom: 2px solid #ff2d67; padding-bottom: 12px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h1 style="margin:0; font-size:22px; color:#111;">KERNEL <span style="color:#ff2d67;">SAC</span> - Control de Pedidos</h1>
        <p style="margin:4px 0 0; font-size:12px; color:#666;">Hardware, Redes y Videovigilancia · RUC: 20608945123 · Av. Garcilaso de la Vega 1348</p>
      </div>
      <div style="text-align:right;">
        <strong style="font-size:14px;">Fecha: ${new Date().toLocaleDateString('es-PE')}</strong>
        <p style="margin:2px 0 0; font-size:12px; color:#666;">Total de pedidos: ${pedidos.length}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Orden</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Teléfono</th>
          <th>Dirección</th>
          <th style="text-align:right;">Total</th>
          <th style="text-align:center;">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
      <tfoot>
        <tr style="font-weight:bold; background:#fafafa;">
          <td colspan="6" style="text-align:right; padding:10px;">TOTAL GENERAL:</td>
          <td style="text-align:right; color:#ff2d67; font-size:14px;">S/ ${totalSuma.toFixed(2)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;

  window.print();
}

document.getElementById("btnImprimirPedidosPDF")?.addEventListener("click", imprimirListaPedidosPDF);

// ============================================================
// ================= TAB: CLIENTES (CRM & HISTORIAL) ==========
// ============================================================

async function loadAdminClientes() {
  try {
    adminState.clientes = await fetchJSON("/api/admin/clientes");
  } catch (err) {
    adminState.clientes = [];
    console.warn("Falla al cargar clientes:", err);
  }
  renderClientesAdmin();
}

function renderClientesAdmin() {
  const tbody = document.getElementById("clientesBody");
  if (!tbody) return;

  const clientes = adminState.clientes || [];
  const q = (document.getElementById("adminSearchClientes")?.value || "").toLowerCase().trim();

  const filtrados = clientes.filter(c => {
    const nom = (c.nombre || "").toLowerCase();
    const tel = (c.cliente_telefono || "").toLowerCase();
    const dir = (c.direccion || "").toLowerCase();
    return nom.includes(q) || tel.includes(q) || dir.includes(q);
  });

  tbody.innerHTML = filtrados.length ? filtrados.map(c => {
    const iniciales = (c.nombre || "CL").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
    const waMsg = `Hola ${c.nombre}, te saludamos de Kernel SAC. Tenemos novedades en hardware y tecnología para ti.`;
    const waUrl = waLink(c.cliente_telefono, waMsg);
    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="client-avatar">${iniciales}</div>
            <div>
              <strong style="color:var(--text); font-size:0.88rem;">${c.nombre || 'Cliente Anónimo'}</strong>
              <div style="font-size:0.74rem; color:var(--text-dim);">${c.tipo_cliente || 'Cliente Final'}</div>
            </div>
          </div>
        </td>
        <td>
          <a href="${waUrl}" target="_blank" rel="noopener" style="color:var(--text); font-family:var(--font-mono); font-size:0.84rem; display:inline-flex; align-items:center; gap:5px; text-decoration:none;">
            <span style="color:#25d366;">💬</span> ${c.cliente_telefono}
          </a>
        </td>
        <td style="font-size:0.82rem; color:var(--text-dim); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${c.direccion || 'Recojo en tienda CyberPlaza'}
        </td>
        <td style="text-align:center;">
          <span class="badge-status entregado" style="font-size:0.75rem; padding:3px 9px;">${c.total_pedidos} pedidos</span>
        </td>
        <td>
          <strong style="color:#ffde00; font-family:var(--font-mono); font-size:0.92rem;">${money(c.total_gastado)}</strong>
        </td>
        <td style="font-family:var(--font-mono); font-size:0.76rem; color:var(--text-dim);">
          ${c.ultima_compra || '-'}
        </td>
        <td style="text-align:right;">
          <button class="btn btn-outline btn-sm" data-vercliente="${c.cliente_telefono}" title="Ver historial de compras y consultas">Ficha & Historial</button>
          <a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="color:#25d366; border-color:rgba(37,211,102,0.4);" title="Contactar por WhatsApp">WhatsApp</a>
        </td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="7" class="empty-state">No se encontraron clientes registrados con los filtros de búsqueda.</td></tr>`;

  tbody.querySelectorAll("[data-vercliente]").forEach(btn => {
    btn.addEventListener("click", () => openClienteModal(btn.dataset.vercliente));
  });
}

async function openClienteModal(telefono) {
  const overlay = document.getElementById("clienteDetalleModalOverlay");
  if (!overlay) return;

  try {
    const data = await fetchJSON(`/api/admin/clientes/${encodeURIComponent(telefono)}/historial`);
    const cliente = (adminState.clientes || []).find(c => c.cliente_telefono === telefono) || {
      nombre: (data.pedidos && data.pedidos[0]?.cliente_nombre) || "Cliente",
      cliente_telefono: telefono,
      direccion: (data.pedidos && data.pedidos[0]?.cliente_direccion) || "No registrada",
      total_gastado: (data.pedidos || []).reduce((acc, p) => acc + Number(p.total), 0),
      total_pedidos: (data.pedidos || []).length
    };

    document.getElementById("cdNombre").textContent = cliente.nombre;
    document.getElementById("cdTelefono").textContent = `📱 ${cliente.cliente_telefono}`;
    document.getElementById("cdDireccion").textContent = `📍 ${cliente.direccion || 'Recojo en tienda'}`;

    const waBtn = document.getElementById("cdWhatsappBtn");
    if (waBtn) {
      waBtn.href = waLink(cliente.cliente_telefono, `Hola ${cliente.nombre}, te saludamos cordialmente de Kernel SAC.`);
    }

    const totalGastado = Number(cliente.total_gastado) || 0;
    const totalPedidos = Number(cliente.total_pedidos) || (data.pedidos?.length || 0);
    const ticketProm = totalPedidos > 0 ? (totalGastado / totalPedidos) : 0;

    document.getElementById("cdTotalGastado").textContent = money(totalGastado);
    document.getElementById("cdTotalPedidos").textContent = `${totalPedidos} compras`;
    document.getElementById("cdTicketPromedio").textContent = money(ticketProm);

    // Listado de pedidos
    const pedList = document.getElementById("cdPedidosList");
    if (pedList) {
      pedList.innerHTML = (data.pedidos && data.pedidos.length) ? data.pedidos.map(p => `
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:8px; padding:10px 12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="color:var(--text); font-size:0.85rem;">#KS-${p.id}</strong>
              <span class="badge-status ${p.estado}" style="font-size:0.68rem; text-transform:uppercase;">${p.estado}</span>
            </div>
            <strong style="color:#ffde00; font-family:var(--font-mono); font-size:0.9rem;">${money(p.total)}</strong>
          </div>
          <div style="font-size:0.75rem; color:var(--text-dim); margin-bottom:4px;">
            Fecha: ${p.creado_en} · Dirección: ${p.cliente_direccion || 'Tienda CyberPlaza'}
          </div>
          <div style="font-size:0.78rem; color:#fff; display:flex; flex-wrap:wrap; gap:6px;">
            ${(p.items || []).map(it => `
              <span style="background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; font-size:0.72rem;">
                ${it.cantidad}x ${it.producto_nombre} (${money(it.precio_unitario)})
              </span>
            `).join("")}
          </div>
        </div>
      `).join("") : `<div style="color:var(--text-dim); font-size:0.8rem; text-align:center; padding:16px;">Sin compras registradas aún.</div>`;
    }

    // Consultas Chatbot
    const consultasList = document.getElementById("cdConsultasList");
    if (consultasList) {
      consultasList.innerHTML = (data.consultas && data.consultas.length) ? data.consultas.map(c => `
        <div style="background:rgba(255,255,255,0.02); border-left:3px solid #ff2d67; padding:6px 10px; border-radius:4px;">
          <div style="font-size:0.72rem; color:var(--text-dim); font-family:var(--font-mono);">${c.creado_en}</div>
          <div style="font-size:0.8rem; font-weight:600; color:var(--text); margin:2px 0;">P: ${escapeHTML(c.mensaje_usuario)}</div>
          <div style="font-size:0.76rem; color:var(--text-dim);">R: ${escapeHTML(c.respuesta_bot)}</div>
        </div>
      `).join("") : `<div style="color:var(--text-dim); font-size:0.8rem; text-align:center; padding:12px;">No se registraron consultas previas en el chatbot para este teléfono.</div>`;
    }

    overlay.classList.add("open");
  } catch (err) {
    mostrarToast("Error al cargar historial del cliente: " + err.message, "err");
  }
}

document.getElementById("clienteDetalleModalClose")?.addEventListener("click", () => {
  document.getElementById("clienteDetalleModalOverlay")?.classList.remove("open");
});
document.getElementById("clienteDetalleModalOverlay")?.addEventListener("click", (e) => {
  if (e.target.id === "clienteDetalleModalOverlay") {
    e.target.classList.remove("open");
  }
});

function exportarClientesCSV() {
  const clientes = adminState.clientes || [];
  if (clientes.length === 0) {
    mostrarToast("No hay clientes registrados para exportar", "info");
    return;
  }

  const cabeceras = ["Cliente", "Teléfono", "Dirección", "Tipo Cliente", "Total Pedidos", "Total Gastado (S/)", "Última Compra"];
  const filas = clientes.map(c => [
    `"${(c.nombre || '').replace(/"/g, '""')}"`,
    `"${(c.cliente_telefono || '').replace(/"/g, '""')}"`,
    `"${(c.direccion || '').replace(/"/g, '""')}"`,
    `"${(c.tipo_cliente || '').replace(/"/g, '""')}"`,
    c.total_pedidos || 0,
    Number(c.total_gastado || 0).toFixed(2),
    `"${c.ultima_compra || ''}"`
  ].join(","));

  const csvContenido = "\uFEFF" + [cabeceras.join(","), ...filas].join("\r\n");
  const blob = new Blob([csvContenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clientes_kernel_sac_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  mostrarToast("Directorio de clientes exportado a CSV exitosamente", "ok");
}

document.getElementById("btnExportarClientesCSV")?.addEventListener("click", exportarClientesCSV);
document.getElementById("adminSearchClientes")?.addEventListener("input", renderClientesAdmin);

// ============================================================
// ================= TAB: VENTAS & REPORTES ===================
// ============================================================

async function renderReportesAdmin(periodo = "hoy") {
  document.querySelectorAll("#reportesPeriodoFilter .filter-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.periodo === periodo);
  });

  let data;
  try {
    data = await fetchJSON(`/api/admin/reportes/ventas?periodo=${periodo}`);
    adminState.reporteVentas = data;
  } catch (err) {
    console.error("Error al cargar reporte de ventas:", err);
    return;
  }

  // 1. KPI Cards
  const statRow = document.getElementById("reportesStatRow");
  if (statRow) {
    statRow.innerHTML = `
      <div class="stat-card" style="background:linear-gradient(135deg, rgba(255,45,103,0.18), rgba(255,45,103,0.06)); border-color:rgba(255,45,103,0.4);">
        <strong style="color:#ff2d67; font-size:1.45rem;">${money(data.totalVentas || 0)}</strong>
        <span style="color:#fff;">Ingresos Totales (Venta)</span>
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg, rgba(37,211,102,0.18), rgba(37,211,102,0.05)); border-color:rgba(37,211,102,0.45);">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong style="color:#25d366; font-size:1.45rem;">+${money(data.gananciaNeta || 0)}</strong>
          <span class="badge-status entregado" style="font-size:0.68rem; padding:2px 6px;">${data.margenGlobal || 0}% margen</span>
        </div>
        <span style="color:#fff; font-weight:600;">Utilidad Neta Real</span>
      </div>
      <div class="stat-card">
        <strong style="color:var(--text-dim); font-size:1.35rem;">${money(data.totalCosto || 0)}</strong>
        <span>Costo Mercadería (COGS)</span>
      </div>
      <div class="stat-card">
        <strong style="font-size:1.35rem; color:#ffde00;">${money(data.ticketPromedio || 0)}</strong>
        <span>Ticket Promedio</span>
      </div>
      <div class="stat-card">
        <strong style="font-size:1.35rem;">${data.totalPedidos || 0}</strong>
        <span>Órdenes Concretadas</span>
      </div>
    `;
  }

  // 2. Gráfico cronológico de ventas SVG
  renderReporteChartSVG(data.desglose || []);

  // 3. Participación por categoría
  renderReporteCategorias();

  // 4. Tabla de transacciones
  const tbody = document.getElementById("reportesDetalleBody");
  if (tbody) {
    const pedidos = data.pedidos || [];
    tbody.innerHTML = pedidos.length ? pedidos.map(p => `
      <tr>
        <td><strong>#KS-${p.id}</strong></td>
        <td style="font-family:var(--font-mono); font-size:0.76rem;">${p.creado_en}</td>
        <td>
          <div style="font-weight:600;">${p.cliente_nombre}</div>
          <div style="font-size:0.72rem; color:var(--text-dim);">${p.cliente_telefono || '-'}</div>
        </td>
        <td class="price-cell" style="font-weight:700;">${money(p.total)}</td>
        <td style="color:var(--text-dim); font-family:var(--font-mono); font-size:0.84rem;">${money(p.costo || 0)}</td>
        <td style="font-weight:700; font-family:var(--font-mono); color:#25d366;">+${money(p.ganancia || 0)}</td>
        <td>
          <span class="badge-status ${(p.margen_pct || 25) >= 20 ? 'entregado' : 'pendiente'}" style="font-size:0.68rem; padding:2px 6px;">
            ${p.margen_pct || 25}%
          </span>
        </td>
        <td>
          <span class="badge-status ${p.estado}" style="font-size:0.7rem; text-transform:uppercase;">${p.estado}</span>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="8" class="empty-state">No se registraron ventas en el período seleccionado.</td></tr>`;
  }
}

function renderReporteChartSVG(desglose) {
  const wrap = document.getElementById("repChartWrap");
  const sub = document.getElementById("repChartSubtitle");
  if (!wrap) return;

  if (!desglose || desglose.length === 0) {
    if (sub) sub.textContent = "0 ventas";
    wrap.innerHTML = `
      <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-dim); text-align:center; padding:20px;">
        <span style="font-size:0.85rem; font-weight:600;">Sin ventas registradas en este período</span>
        <span style="font-size:0.75rem; margin-top:4px;">Cambia el filtro de período o espera nuevas compras de clientes.</span>
      </div>
    `;
    return;
  }

  if (sub) sub.textContent = `${desglose.length} ${desglose.length === 1 ? 'día registrado' : 'días registrados'}`;

  const maxVal = Math.max(...desglose.map(d => d.total), 50) * 1.15;
  const minVal = 0;
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 32;

  const stepX = desglose.length > 1 ? (width - paddingX * 2) / (desglose.length - 1) : 0;

  const coords = desglose.map((d, i) => {
    const x = desglose.length === 1 ? width / 2 : paddingX + i * stepX;
    const y = height - paddingY - ((d.total - minVal) / (maxVal - minVal)) * (height - paddingY * 2);
    return { ...d, x, y };
  });

  const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${coords[0].x},${height - paddingY} ` + polylinePoints + ` ${coords[coords.length - 1].x},${height - paddingY}`;

  wrap.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%; overflow:visible;">
      <defs>
        <linearGradient id="repChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#25d366" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#25d366" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <polygon points="${areaPoints}" fill="url(#repChartGradient)" />
      <polyline points="${polylinePoints}" fill="none" stroke="#25d366" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${coords.map(c => `
        <circle cx="${c.x}" cy="${c.y}" r="4" fill="#25d366" stroke="#ffffff" stroke-width="2" />
        <text x="${c.x}" y="${c.y - 10}" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="bold" font-family="monospace">S/${Math.round(c.total)}</text>
        <text x="${c.x}" y="${height - paddingY + 14}" text-anchor="middle" fill="var(--text-dim)" font-size="9">${c.fecha ? c.fecha.slice(5) : ''}</text>
      `).join("")}
    </svg>
  `;
}

async function renderReporteCategorias() {
  const container = document.getElementById("repCategoriasList");
  if (!container) return;

  let stats;
  try {
    stats = await fetchJSON("/api/admin/estadisticas/top-productos");
  } catch (err) {
    stats = null;
  }

  const porCat = (stats && stats.porCategoria) ? stats.porCategoria : [];
  if (porCat.length === 0) {
    container.innerHTML = `<div style="color:var(--text-dim); font-size:0.8rem; text-align:center; padding:16px;">Sin datos por categoría en el período.</div>`;
    return;
  }

  const maxIngreso = Math.max(...porCat.map(c => Number(c.ingresos) || 0), 1);

  container.innerHTML = porCat.map(c => {
    const ing = Number(c.ingresos) || 0;
    const pct = Math.min(100, Math.round((ing / maxIngreso) * 100));
    return `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; margin-bottom:4px;">
          <span style="font-weight:600; color:#ffffff;">${c.categoria}</span>
          <span style="font-family:var(--font-mono); font-weight:700; color:#ffde00;">${money(ing)} (${c.unidades || 0} unid.)</span>
        </div>
        <div class="stat-progress-bar">
          <div class="stat-progress-fill" style="width:${pct}%;"></div>
        </div>
      </div>
    `;
  }).join("");
}

document.querySelectorAll("#reportesPeriodoFilter .filter-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    const periodo = pill.dataset.periodo || "hoy";
    renderReportesAdmin(periodo);
  });
});

function exportarReporteVentasCSV() {
  const rep = adminState.reporteVentas;
  if (!rep || !rep.pedidos || rep.pedidos.length === 0) {
    mostrarToast("No hay transacciones en el reporte actual para exportar", "info");
    return;
  }

  const resumen = [
    ["REPORTE EJECUTIVO DE VENTAS - KERNEL SAC"],
    [`Periodo: ${rep.periodo.toUpperCase()}`],
    [`Generado el: ${new Date().toLocaleString('es-PE')}`],
    [`Ingresos Totales (S/):,${rep.totalVentas.toFixed(2)}`],
    [`Costo de Ventas (S/):,${rep.totalCosto.toFixed(2)}`],
    [`Utilidad Neta (S/):,${rep.gananciaNeta.toFixed(2)}`],
    [`Margen Global (%):,${rep.margenGlobal}%`],
    [`Ticket Promedio (S/):,${rep.ticketPromedio.toFixed(2)}`],
    [`Total de Pedidos:,${rep.totalPedidos}`],
    [],
    ["DETALLE DE TRANSACCIONES"],
    ["ID Orden", "Fecha", "Cliente", "Teléfono", "Total Venta (S/)", "Costo (S/)", "Utilidad Neta (S/)", "Margen (%)", "Estado"]
  ];

  const filas = rep.pedidos.map(p => [
    `KS-${p.id}`,
    `"${p.creado_en || ''}"`,
    `"${(p.cliente_nombre || '').replace(/"/g, '""')}"`,
    `"${(p.cliente_telefono || '').replace(/"/g, '""')}"`,
    Number(p.total).toFixed(2),
    Number(p.costo || 0).toFixed(2),
    Number(p.ganancia || 0).toFixed(2),
    `${p.margen_pct || 25}%`,
    `"${p.estado}"`
  ].join(","));

  const csvContenido = "\uFEFF" + resumen.map(r => Array.isArray(r) ? r.join(",") : r).join("\r\n") + "\r\n" + filas.join("\r\n");
  const blob = new Blob([csvContenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte_ventas_kernel_sac_${rep.periodo}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  mostrarToast("Reporte financiero exportado a CSV exitosamente", "ok");
}

document.getElementById("btnExportarReporteCSV")?.addEventListener("click", exportarReporteVentasCSV);

function imprimirReporteVentasPDF() {
  const rep = adminState.reporteVentas;
  if (!rep || !rep.pedidos || rep.pedidos.length === 0) {
    mostrarToast("No hay transacciones en el reporte actual para imprimir", "info");
    return;
  }
  const printSec = document.getElementById("adminPrintSection");
  if (!printSec) return;

  const filas = rep.pedidos.map((p, idx) => `
    <tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td><strong>#KS-${p.id}</strong></td>
      <td>${p.creado_en || ''}</td>
      <td>${p.cliente_nombre || ''}</td>
      <td style="text-align:right;">S/ ${Number(p.total).toFixed(2)}</td>
      <td style="text-align:right;">S/ ${Number(p.costo || 0).toFixed(2)}</td>
      <td style="text-align:right; font-weight:bold; color:#10b981;">+S/ ${Number(p.ganancia || 0).toFixed(2)}</td>
      <td style="text-align:center;">${p.margen_pct || 25}%</td>
      <td style="text-align:center; text-transform:uppercase;">${p.estado}</td>
    </tr>
  `).join("");

  printSec.innerHTML = `
    <div style="border-bottom: 2px solid #ff2d67; padding-bottom: 12px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h1 style="margin:0; font-size:22px; color:#111;">KERNEL <span style="color:#ff2d67;">SAC</span> - Informe Financiero de Ventas</h1>
        <p style="margin:4px 0 0; font-size:12px; color:#666;">RUC: 20608945123 · CyberPlaza Semisótano Tienda 2B-115, Lima</p>
      </div>
      <div style="text-align:right;">
        <strong style="font-size:14px; text-transform:uppercase;">Período: ${rep.periodo}</strong>
        <p style="margin:2px 0 0; font-size:12px; color:#666;">Emisión: ${new Date().toLocaleDateString('es-PE')}</p>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:20px; background:#f9fafb; border:1px solid #e5e7eb; padding:12px; border-radius:6px;">
      <div>
        <div style="font-size:11px; color:#666;">INGRESOS TOTALES</div>
        <strong style="font-size:16px; color:#111;">S/ ${rep.totalVentas.toFixed(2)}</strong>
      </div>
      <div>
        <div style="font-size:11px; color:#666;">COSTO MERCADERÍA</div>
        <strong style="font-size:16px; color:#666;">S/ ${rep.totalCosto.toFixed(2)}</strong>
      </div>
      <div>
        <div style="font-size:11px; color:#666;">UTILIDAD NETA (${rep.margenGlobal}%)</div>
        <strong style="font-size:16px; color:#10b981;">+S/ ${rep.gananciaNeta.toFixed(2)}</strong>
      </div>
      <div>
        <div style="font-size:11px; color:#666;">TOTAL DE PEDIDOS</div>
        <strong style="font-size:16px; color:#111;">${rep.totalPedidos} órdenes</strong>
      </div>
    </div>

    <h3 style="margin:0 0 8px; font-size:14px; color:#111;">Detalle Oficial de Órdenes y Transacciones</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Orden</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th style="text-align:right;">Total Venta</th>
          <th style="text-align:right;">Costo</th>
          <th style="text-align:right;">Utilidad</th>
          <th style="text-align:center;">Margen</th>
          <th style="text-align:center;">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  `;

  window.print();
}

document.getElementById("btnImprimirReportePDF")?.addEventListener("click", imprimirReporteVentasPDF);

// ============================================================
// ================= IMPORTACIÓN & EXPORTACIÓN EXCEL / CSV ====
// ============================================================

const importModal = document.getElementById("importarExcelModalOverlay");
document.getElementById("btnImportarExcelModal")?.addEventListener("click", () => {
  if (importModal) {
    importModal.classList.add("open");
    const summary = document.getElementById("importPreviewSummary");
    const msg = document.getElementById("importMsg");
    if (summary) summary.textContent = "";
    if (msg) msg.textContent = "";
  }
});

document.getElementById("importarModalClose")?.addEventListener("click", () => importModal?.classList.remove("open"));
document.getElementById("btnCancelarImportar")?.addEventListener("click", () => importModal?.classList.remove("open"));
importModal?.addEventListener("click", (e) => {
  if (e.target === importModal) importModal.classList.remove("open");
});

document.getElementById("btnDescargarPlantillaCSV")?.addEventListener("click", () => {
  const contenido = "\uFEFFnombre,categoria,precio,costo,stock,descripcion,caracteristicas,destacado,etiqueta\r\n" +
    "Laptop Gamer Legion Slim 16,Laptops,4899.00,3800.00,12,Laptop gamer potente pantalla 165Hz,Intel Core i7 13va gen\\n16GB RAM DDR5\\nSSD 1TB NVMe\\nRTX 4060 8GB,1,CYBER WOW\r\n" +
    "Switch Gigabit 24 Puertos TP-Link,Redes,349.00,240.00,25,Switch no administrable para empresas,24 puertos 10/100/1000 Mbps\\nCarcasa metalica 19 pulgadas,0,NUEVO\r\n" +
    "Camara IP Domo 4K Hikvision ColorVu,Seguridad,289.00,195.00,30,Camara seguridad vision nocturna color,Resolucion 4K 8MP\\nMicrofono integrado\\nPoE / Exterior IP67,1,OFERTA";

  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_productos_kernel_sac.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  mostrarToast("Plantilla CSV descargada con éxito", "ok");
});

document.getElementById("importCsvFileInput")?.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    const txtArea = document.getElementById("importCsvTextarea");
    if (txtArea) {
      txtArea.value = text;
      actualizarPreviewImportacion(text);
    }
  };
  reader.readAsText(file);
});

document.getElementById("importCsvTextarea")?.addEventListener("input", (e) => {
  actualizarPreviewImportacion(e.target.value);
});

function parsearCSVProductos(texto) {
  if (!texto || !texto.trim()) return [];
  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lineas.length < 2) return [];

  const primeraLinea = lineas[0];
  let delim = ",";
  if (primeraLinea.includes("\t")) delim = "\t";
  else if (primeraLinea.includes(";")) delim = ";";

  const parseRow = (line) => {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delim && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const cabeceras = parseRow(lineas[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  const idxNombre = cabeceras.findIndex(h => h.includes("nombre") || h.includes("producto") || h.includes("title"));
  const idxCat = cabeceras.findIndex(h => h.includes("cat") || h.includes("seccion"));
  const idxPrecio = cabeceras.findIndex(h => h.includes("precio") || h.includes("pvp") || h.includes("venta"));
  const idxCosto = cabeceras.findIndex(h => h.includes("costo") || h.includes("compra"));
  const idxStock = cabeceras.findIndex(h => h.includes("stock") || h.includes("cant") || h.includes("inventario"));
  const idxDesc = cabeceras.findIndex(h => h.includes("desc"));
  const idxCarac = cabeceras.findIndex(h => h.includes("carac") || h.includes("espec") || h.includes("feature"));
  const idxDest = cabeceras.findIndex(h => h.includes("dest") || h.includes("featured"));
  const idxEtiq = cabeceras.findIndex(h => h.includes("etiq") || h.includes("tag") || h.includes("promo"));
  const idxImg = cabeceras.findIndex(h => h.includes("img") || h.includes("imagen") || h.includes("foto"));

  const productos = [];
  for (let i = 1; i < lineas.length; i++) {
    const cols = parseRow(lineas[i]);
    if (!cols.length || !cols[idxNombre >= 0 ? idxNombre : 0]) continue;

    const nombre = cols[idxNombre >= 0 ? idxNombre : 0];
    const categoria = idxCat >= 0 ? cols[idxCat] : "Componentes";
    const precio = parseFloat(idxPrecio >= 0 ? cols[idxPrecio].replace(/[^\d.]/g, "") : "0") || 0;
    const costo = parseFloat(idxCosto >= 0 ? cols[idxCosto].replace(/[^\d.]/g, "") : "0") || Math.round(precio * 0.75);
    const stock = parseInt(idxStock >= 0 ? cols[idxStock].replace(/[^\d]/g, "") : "0", 10) || 0;
    const descripcion = idxDesc >= 0 ? cols[idxDesc] : "";
    const caracteristicas = idxCarac >= 0 ? cols[idxCarac].replace(/\\n/g, "\n") : "";
    const destacado = idxDest >= 0 ? (cols[idxDest] === "1" || cols[idxDest].toLowerCase() === "si" || cols[idxDest].toLowerCase() === "true") : false;
    const etiqueta_promo = idxEtiq >= 0 ? cols[idxEtiq] : "";
    const imagen_url = idxImg >= 0 ? cols[idxImg] : "";

    productos.push({
      nombre,
      categoria,
      precio,
      precio_costo: costo,
      stock,
      descripcion,
      caracteristicas,
      destacado,
      etiqueta_promo,
      imagen_url
    });
  }

  return productos;
}

function actualizarPreviewImportacion(texto) {
  const summary = document.getElementById("importPreviewSummary");
  if (!summary) return;
  const prods = parsearCSVProductos(texto);
  if (prods.length > 0) {
    summary.textContent = `✅ Se detectaron ${prods.length} productos listos para importar al catálogo.`;
    summary.style.color = "#25d366";
  } else {
    summary.textContent = `⚠️ No se detectaron productos válidos. Revisa el formato o usa la plantilla de ejemplo.`;
    summary.style.color = "#ff4d4f";
  }
}

document.getElementById("btnEjecutarImportar")?.addEventListener("click", async () => {
  const txt = document.getElementById("importCsvTextarea")?.value || "";
  const prods = parsearCSVProductos(txt);
  const msg = document.getElementById("importMsg");
  const btn = document.getElementById("btnEjecutarImportar");

  if (!prods.length) {
    if (msg) {
      msg.textContent = "Error: no hay productos válidos para importar.";
      msg.className = "form-msg err";
    }
    return;
  }

  btn.disabled = true;
  btn.textContent = "Importando productos...";

  try {
    const res = await fetchJSON("/api/admin/productos/importar-masivo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productos: prods })
    });

    if (msg) {
      msg.textContent = `¡Excelente! Se importaron ${res.importados} productos correctamente al catálogo.`;
      msg.className = "form-msg ok";
    }
    mostrarToast(`Se importaron ${res.importados} productos con éxito`, "ok");

    setTimeout(async () => {
      importModal?.classList.remove("open");
      btn.disabled = false;
      btn.textContent = "Procesar e Importar Productos";
      await loadCatalogo();
      await renderCategoriasAdmin();
      renderProductosAdmin();
      renderDashboardAdmin();
      cargarAlertasStock();
    }, 1500);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Procesar e Importar Productos";
    if (msg) {
      msg.textContent = "Error durante la importación: " + err.message;
      msg.className = "form-msg err";
    }
    mostrarToast(err.message, "err");
  }
});

async function exportarCatalogoProductosExcel() {
  try {
    const data = await fetchJSON("/api/productos?paginado=0");
    const prods = (data.productos && data.productos.length) ? data.productos : (state.productos || []);

    if (prods.length === 0) {
      mostrarToast("No hay productos en el catálogo para exportar", "info");
      return;
    }

    const cabeceras = ["ID", "Nombre", "Categoría", "Precio Venta (S/)", "Costo Compra (S/)", "Margen Bruto (S/)", "Stock", "Destacado", "En Carrusel", "Etiqueta Promo", "Descripción", "Características"];
    const filas = prods.map(p => {
      const costo = p.precio_costo != null ? Number(p.precio_costo) : (Number(p.precio) * 0.75);
      const utilidad = Number(p.precio) - costo;
      return [
        p.id,
        `"${(p.nombre || '').replace(/"/g, '""')}"`,
        `"${(p.categoria || '').replace(/"/g, '""')}"`,
        Number(p.precio).toFixed(2),
        costo.toFixed(2),
        utilidad.toFixed(2),
        p.stock || 0,
        p.destacado ? "SI" : "NO",
        p.en_carrusel ? "SI" : "NO",
        `"${(p.etiqueta_promo || '').replace(/"/g, '""')}"`,
        `"${(p.descripcion || '').replace(/"/g, '""')}"`,
        `"${(p.caracteristicas || '').replace(/"/g, '""').replace(/\n/g, ' | ')}"`
      ].join(",");
    });

    const csvContenido = "\uFEFF" + [cabeceras.join(","), ...filas].join("\r\n");
    const blob = new Blob([csvContenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogo_productos_kernel_sac_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarToast("Catálogo completo exportado a Excel (CSV) exitosamente", "ok");
  } catch (err) {
    mostrarToast("Error exportando catálogo: " + err.message, "err");
  }
}

document.getElementById("btnExportarProductosExcel")?.addEventListener("click", exportarCatalogoProductosExcel);

// ============================================================
// ================= TAB 5: REGISTRO AUDITORÍA CHATBOT =======
// ============================================================

async function loadAdminChatLogs() {
  try {
    adminState.chatLogs = await fetchJSON("/api/admin/chatbot/logs");
  } catch (err) {
    adminState.chatLogs = [];
  }
  renderChatbotLogsAdmin();
}

function renderChatbotLogsAdmin() {
  const tbody = document.getElementById("chatLogsBody");
  if (!tbody) return;
  const q = (document.getElementById("adminSearchChatLogs")?.value || "").toLowerCase();
  const filtrados = (adminState.chatLogs || []).filter(l => {
    const userQ = (l.mensaje_usuario || l.pregunta || "").toLowerCase();
    const botA = (l.respuesta_bot || l.respuesta || "").toLowerCase();
    return userQ.includes(q) || botA.includes(q);
  });

  tbody.innerHTML = filtrados.length ? filtrados.map(l => {
    const userQ = l.mensaje_usuario || l.pregunta || "";
    const botA = l.respuesta_bot || l.respuesta || "";
    return `
      <tr>
        <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim); white-space:nowrap;">${l.creado_en}</td>
        <td><strong style="color:var(--text);">${escapeHTML(userQ)}</strong></td>
        <td style="font-size:0.82rem; color:var(--text-dim); line-height:1.4;">${escapeHTML(botA)}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="3" class="empty-state">No hay registros de consultas en el chatbot.</td></tr>`;
}

document.getElementById("adminSearchChatLogs")?.addEventListener("input", renderChatbotLogsAdmin);
document.getElementById("btnLimpiarChatLogs")?.addEventListener("click", async () => {
  const ok = await confirmDialog({
    titulo: "¿Limpiar historial del chatbot?",
    mensaje: "Se borrarán todas las consultas registradas hasta ahora de los visitantes.",
    botonTexto: "Limpiar historial",
    peligro: true
  });
  if (!ok) return;
  try {
    await fetchJSON("/api/admin/chatbot/logs", { method: "DELETE" });
    adminState.chatLogs = [];
    renderChatbotLogsAdmin();
    mostrarToast("Historial de consultas del chatbot vaciado correctamente", "ok");
  } catch (err) {
    mostrarToast(err.message, "err");
  }
});

// ============================================================
// ================= GESTOR DEL CARRUSEL & ESCENARIO CYBER =====
// ============================================================

adminState.carruselTodosProds = [];

const THEME_PALETTES = {
  magenta: {
    accent: "#ff2d67",
    accentSub: "#ff5c8a",
    glow: "rgba(255, 45, 103, 0.45)",
    tagBg: "rgba(255, 45, 106, 0.18)",
    tagBorder: "rgba(255, 45, 106, 0.4)",
    orb1: "rgba(255, 45, 103, 0.35)",
    orb2: "rgba(0, 210, 255, 0.20)",
  },
  cyan: {
    accent: "#00d2ff",
    accentSub: "#00f5d4",
    glow: "rgba(0, 210, 255, 0.45)",
    tagBg: "rgba(0, 210, 255, 0.18)",
    tagBorder: "rgba(0, 210, 255, 0.4)",
    orb1: "rgba(0, 210, 255, 0.35)",
    orb2: "rgba(59, 130, 246, 0.20)",
  },
  gold: {
    accent: "#ffb703",
    accentSub: "#fb8500",
    glow: "rgba(255, 183, 3, 0.45)",
    tagBg: "rgba(255, 183, 3, 0.18)",
    tagBorder: "rgba(255, 183, 3, 0.4)",
    orb1: "rgba(255, 183, 3, 0.35)",
    orb2: "rgba(239, 68, 68, 0.20)",
  },
  green: {
    accent: "#10b981",
    accentSub: "#06b6d4",
    glow: "rgba(16, 185, 129, 0.45)",
    tagBg: "rgba(16, 185, 129, 0.18)",
    tagBorder: "rgba(16, 185, 129, 0.4)",
    orb1: "rgba(16, 185, 129, 0.35)",
    orb2: "rgba(6, 182, 212, 0.20)",
  },
  purple: {
    accent: "#a855f7",
    accentSub: "#ec4899",
    glow: "rgba(168, 85, 247, 0.45)",
    tagBg: "rgba(168, 85, 247, 0.18)",
    tagBorder: "rgba(168, 85, 247, 0.4)",
    orb1: "rgba(168, 85, 247, 0.35)",
    orb2: "rgba(236, 72, 153, 0.20)",
  },
};

window.seleccionarTemaHero = function(tema) {
  const hiddenInput = document.getElementById("cfgTemaColor");
  if (hiddenInput) hiddenInput.value = tema;

  document.querySelectorAll(".theme-picker-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.themeVal === tema);
  });

  actualizarPreviewEnVivo();
};

function actualizarPreviewEnVivo() {
  const tit1 = document.getElementById("cfgCampanaTitulo1")?.value || "CYBER";
  const tit2 = document.getElementById("cfgCampanaTitulo2")?.value || "WOW";
  const tag = document.getElementById("cfgCampanaTag")?.value || "OFERTAS EXCLUSIVAS ⚡";
  const sub = document.getElementById("cfgCampanaSubtitulo")?.value || "OFERTAS EXCLUSIVAS DE TEMPORADA";
  const cuponCode = document.getElementById("cfgCuponCodigo")?.value || "BCP200";
  const cuponText = document.getElementById("cfgCuponTexto")?.value || `Usa cupón: ${cuponCode}`;
  const mostrarCupon = document.getElementById("cfgMostrarCupon")?.checked !== false;
  const btnText = document.getElementById("cfgBotonTexto")?.value || "Comprar Ahora";
  const tema = document.getElementById("cfgTemaColor")?.value || "magenta";

  const pal = THEME_PALETTES[tema] || THEME_PALETTES.magenta;

  const prevTag = document.getElementById("prevTagText");
  if (prevTag) prevTag.textContent = tag;

  const prevTitle1 = document.getElementById("prevTitle1");
  if (prevTitle1) prevTitle1.textContent = tit1;

  const prevTitle2 = document.getElementById("prevTitle2");
  if (prevTitle2) {
    prevTitle2.textContent = tit2;
    prevTitle2.style.background = `linear-gradient(135deg, ${pal.accent} 0%, ${pal.accentSub} 100%)`;
    prevTitle2.style.webkitBackgroundClip = "text";
    prevTitle2.style.webkitTextFillColor = "transparent";
    prevTitle2.style.filter = `drop-shadow(0 2px 10px ${pal.glow})`;
  }

  const prevSub = document.getElementById("prevSubText");
  if (prevSub) prevSub.textContent = sub;

  const prevCoupon = document.getElementById("prevCouponPill");
  if (prevCoupon) {
    prevCoupon.style.display = mostrarCupon ? "inline-flex" : "none";
    const spanText = prevCoupon.querySelector("span:last-child");
    if (spanText) spanText.innerHTML = `${cuponText} <strong>${cuponCode}</strong>`;
  }

  const prevCta = document.getElementById("prevCtaBtn");
  if (prevCta) {
    prevCta.textContent = `${btnText} →`;
    prevCta.style.boxShadow = `0 4px 14px ${pal.glow}`;
  }

  const prevSampleBtn = document.getElementById("prevSampleBtn");
  if (prevSampleBtn) {
    prevSampleBtn.style.background = pal.accent;
    prevSampleBtn.style.boxShadow = `0 2px 8px ${pal.glow}`;
  }

  const prevCardTag = document.getElementById("prevCardTag");
  if (prevCardTag) {
    prevCardTag.style.background = pal.accent;
  }

  const liveBox = document.getElementById("adminLivePreview");
  if (liveBox) {
    liveBox.style.background = `radial-gradient(circle at 20% 20%, ${pal.orb1} 0%, transparent 50%),
                                radial-gradient(circle at 80% 80%, ${pal.orb2} 0%, transparent 50%),
                                linear-gradient(145deg, #180d1e 0%, #0d0611 100%)`;
  }
}

async function renderCarruselAdmin() {
  const cfg = state.carruselConfig || {};

  // 1. Cargar valores en campos de texto
  const t1 = document.getElementById("cfgCampanaTitulo1");
  if (t1 && document.activeElement !== t1) t1.value = cfg.campana_titulo_1 || "CYBER";
  const t2 = document.getElementById("cfgCampanaTitulo2");
  if (t2 && document.activeElement !== t2) t2.value = cfg.campana_titulo_2 || "WOW";
  const tag = document.getElementById("cfgCampanaTag");
  if (tag && document.activeElement !== tag) tag.value = cfg.campana_tag || "OFERTAS EXCLUSIVAS ⚡";
  const sub = document.getElementById("cfgCampanaSubtitulo");
  if (sub && document.activeElement !== sub) sub.value = cfg.campana_subtitulo || "OFERTAS EXCLUSIVAS DE TEMPORADA";

  const cupCode = document.getElementById("cfgCuponCodigo");
  if (cupCode && document.activeElement !== cupCode) cupCode.value = cfg.cupon_codigo || "BCP200";
  const cupTxt = document.getElementById("cfgCuponTexto");
  if (cupTxt && document.activeElement !== cupTxt) cupTxt.value = cfg.cupon_texto || "Usa cupón: BCP200";

  const btnTxt = document.getElementById("cfgBotonTexto");
  if (btnTxt && document.activeElement !== btnTxt) btnTxt.value = cfg.boton_texto || "Comprar Ahora";
  const btnAct = document.getElementById("cfgBotonAccion");
  if (btnAct && document.activeElement !== btnAct) btnAct.value = cfg.boton_accion || "#catalogo";

  const chkCupon = document.getElementById("cfgMostrarCupon");
  if (chkCupon) chkCupon.checked = cfg.mostrar_cupon !== false;
  const chkStats = document.getElementById("cfgMostrarStats");
  if (chkStats) chkStats.checked = cfg.mostrar_stats !== false;
  const chkRot = document.getElementById("cfgAutoRotacion");
  if (chkRot) chkRot.checked = cfg.auto_rotacion !== false;
  const segs = document.getElementById("cfgSegundosRotacion");
  if (segs && document.activeElement !== segs) segs.value = cfg.segundos_rotacion || 5;

  const tema = cfg.tema_color || "magenta";
  const temaInput = document.getElementById("cfgTemaColor");
  if (temaInput) temaInput.value = tema;
  document.querySelectorAll(".theme-picker-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.themeVal === tema);
  });

  const modo = cfg.modo || "manual";
  const optAuto = document.getElementById("modeOptionAuto");
  const optManual = document.getElementById("modeOptionManual");
  if (optAuto && optManual) {
    optAuto.classList.toggle("active", modo === "auto");
    optManual.classList.toggle("active", modo === "manual");
  }

  // 2. Conectar listeners de inputs para vista previa en vivo
  [
    "cfgCampanaTitulo1", "cfgCampanaTitulo2", "cfgCampanaTag", "cfgCampanaSubtitulo",
    "cfgCuponCodigo", "cfgCuponTexto", "cfgBotonTexto", "cfgMostrarCupon"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el._liveBound) {
      el._liveBound = true;
      el.addEventListener("input", actualizarPreviewEnVivo);
      el.addEventListener("change", actualizarPreviewEnVivo);
    }
  });

  actualizarPreviewEnVivo();

  // 3. Cargar todos los productos si aún no están cargados
  if (!adminState.carruselTodosProds || adminState.carruselTodosProds.length === 0) {
    try {
      const data = await fetchJSON("/api/carrusel/todos-productos");
      adminState.carruselTodosProds = data.productos || [];
    } catch {
      adminState.carruselTodosProds = state.productos || [];
    }
  }

  // Llenar categorías en el filtro
  const catSelect = document.getElementById("adminFilterCarruselCat");
  if (catSelect && catSelect.options.length <= 1 && state.categorias) {
    state.categorias.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.slug;
      opt.textContent = c.nombre;
      catSelect.appendChild(opt);
    });
    catSelect.onchange = renderCarruselTable;
  }

  renderActiveCarruselCards();
  renderCarruselTable();
}

function renderActiveCarruselCards() {
  const container = document.getElementById("carruselActiveCards");
  const badgeCount = document.getElementById("activeProdsCountBadge");
  if (!container) return;

  const activos = (adminState.carruselTodosProds || []).filter((p) => Boolean(p.en_carrusel));
  if (badgeCount) badgeCount.textContent = activos.length;

  if (activos.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.2); border-radius: 12px; color: var(--text-dim); font-size: 0.88rem;">
        No hay productos activos en el carrusel todavía. Elige productos en la tabla inferior activando el interruptor <strong>"En Carrusel"</strong>.
      </div>
    `;
    return;
  }

  container.innerHTML = activos.map((p) => {
    const imgUrl = p.imagen_url || "/assets/honor-magic8.jpg";
    const anterior = p.precio_anterior ? Number(p.precio_anterior) : Math.round(p.precio * 1.25);
    const etiqueta = p.etiqueta_promo || (p.destacado ? "TOP VENTAS" : "OFERTA");

    return `
      <div class="carrusel-active-card" id="activeCard_${p.id}">
        <div class="active-card-top">
          <img src="${imgUrl}" alt="${p.nombre}" class="active-card-img" onerror="this.src='/assets/honor-magic8.jpg'" />
          <div class="active-card-info">
            <div class="active-card-title" title="${p.nombre}">${p.nombre}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
              <span class="active-card-price">${money(p.precio)}</span>
              <span style="font-size:0.72rem; color:var(--text-dim); text-decoration:line-through;">${money(anterior)}</span>
            </div>
          </div>
        </div>
        <div class="active-card-controls">
          <div>
            <label>Etiqueta Promo</label>
            <input type="text" id="promoTag_${p.id}" value="${etiqueta}" placeholder="ej: TOP VENTAS" />
          </div>
          <div>
            <label>Precio Anterior (S/)</label>
            <input type="number" id="promoAnt_${p.id}" value="${anterior}" placeholder="ej: 3499" />
          </div>
        </div>
        <div class="active-card-actions">
          <button class="btn-quitar-carrusel" onclick="window.toggleCarruselItem(${p.id})">
            ✕ Quitar
          </button>
          <button class="btn-guardar-item-promo" onclick="window.guardarPromoProducto(${p.id})">
            ✓ Guardar Promo
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function renderCarruselTable() {
  const tbody = document.getElementById("carruselProductosBody");
  if (!tbody) return;

  const filtroTexto = (document.getElementById("adminSearchCarruselProds")?.value || "").toLowerCase().trim();
  const filtroCat = (document.getElementById("adminFilterCarruselCat")?.value || "").toLowerCase().trim();

  let prods = adminState.carruselTodosProds || [];
  if (filtroCat) {
    prods = prods.filter((p) => p.categoria_slug === filtroCat || (p.categoria && p.categoria.toLowerCase() === filtroCat));
  }
  if (filtroTexto) {
    prods = prods.filter((p) =>
      p.nombre.toLowerCase().includes(filtroTexto) ||
      (p.categoria && p.categoria.toLowerCase().includes(filtroTexto))
    );
  }

  tbody.innerHTML = prods.length ? prods.map((p) => {
    const anterior = p.precio_anterior ? money(p.precio_anterior) : money(Math.round(p.precio * 1.25));
    const etiqueta = p.etiqueta_promo || (p.destacado ? "DESTACADO" : "OFERTA");
    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="product-icon" style="width:38px; height:38px; aspect-ratio:1/1; flex-shrink:0;">${mediaHTML(p)}</div>
            <div>
              <strong style="display:block; font-size:0.86rem; color:#fff;">${p.nombre}</strong>
              <small style="color:var(--text-dim); font-size:0.75rem;">Stock: ${p.stock} unid.</small>
            </div>
          </div>
        </td>
        <td>${p.categoria || '-'}</td>
        <td class="price-cell">${money(p.precio)}</td>
        <td style="color:var(--text-dim); text-decoration:line-through; font-family:var(--font-mono); font-size:0.82rem;">${anterior}</td>
        <td>
          <span style="background:rgba(255,222,0,0.14); color:#ffde00; border:1px solid rgba(255,222,0,0.3); border-radius:4px; padding:2px 6px; font-size:0.74rem; font-weight:700;">
            ${etiqueta}
          </span>
        </td>
        <td style="font-size:0.78rem; color:var(--text-dim);">${p.regalo_nombre || "-"}</td>
        <td style="text-align:center;">
          <label class="switch-toggle" title="Activar/desactivar en carrusel">
            <input type="checkbox" ${p.en_carrusel ? "checked" : ""} onchange="window.toggleCarruselItem(${p.id})" />
            <span class="switch-slider"></span>
          </label>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openProductoModal(${p.id})">Editar Todo</button>
        </td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="8" class="empty-state">No se encontraron productos que coincidan con la búsqueda.</td></tr>`;
}

window.cambiarModoCarrusel = async function(modo) {
  if (!state.carruselConfig) state.carruselConfig = {};
  state.carruselConfig.modo = modo;

  const optAuto = document.getElementById("modeOptionAuto");
  const optManual = document.getElementById("modeOptionManual");
  if (optAuto && optManual) {
    optAuto.classList.toggle("active", modo === "auto");
    optManual.classList.toggle("active", modo === "manual");
  }

  await window.guardarConfigCarrusel(false);
  mostrarToast(`Modo cambiado a: ${modo === 'manual' ? 'Manual Personalizado' : 'Automático Inteligente'}`, 'ok');
};

window.guardarConfigCarrusel = async function(mostrarAlerta = true) {
  const msg = document.getElementById("cfgCarruselMsg");
  const tit1 = document.getElementById("cfgCampanaTitulo1")?.value || "CYBER";
  const tit2 = document.getElementById("cfgCampanaTitulo2")?.value || "WOW";

  const payload = {
    modo: state.carruselConfig?.modo || "manual",
    campana_titulo_1: tit1,
    campana_titulo_2: tit2,
    campana_titulo: `${tit1} ${tit2}`.trim(),
    campana_tag: document.getElementById("cfgCampanaTag")?.value || "OFERTAS EXCLUSIVAS ⚡",
    campana_subtitulo: document.getElementById("cfgCampanaSubtitulo")?.value || "OFERTAS EXCLUSIVAS DE TEMPORADA",
    cupon_codigo: document.getElementById("cfgCuponCodigo")?.value || "BCP200",
    cupon_texto: document.getElementById("cfgCuponTexto")?.value || "Usa cupón: BCP200",
    mostrar_cupon: document.getElementById("cfgMostrarCupon")?.checked !== false,
    boton_texto: document.getElementById("cfgBotonTexto")?.value || "Comprar Ahora",
    boton_accion: document.getElementById("cfgBotonAccion")?.value || "#catalogo",
    tema_color: document.getElementById("cfgTemaColor")?.value || "magenta",
    auto_rotacion: document.getElementById("cfgAutoRotacion")?.checked !== false,
    segundos_rotacion: Number(document.getElementById("cfgSegundosRotacion")?.value) || 5,
    mostrar_stats: document.getElementById("cfgMostrarStats")?.checked !== false,
  };

  try {
    const res = await fetchJSON("/api/carrusel/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.carruselConfig = res.config;
    if (mostrarAlerta && msg) {
      msg.textContent = "¡Configuración y diseño del carrusel guardados con éxito!";
      msg.className = "form-msg ok";
      setTimeout(() => { if (msg) msg.textContent = ""; }, 3500);
      mostrarToast("Carrusel actualizado en vivo en la tienda", "ok");
    }
    await loadCatalogo();
  } catch (err) {
    if (msg) {
      msg.textContent = "Error: " + err.message;
      msg.className = "form-msg err";
    }
    mostrarToast(err.message, "err");
  }
};

window.toggleCarruselItem = async function(id) {
  try {
    const res = await fetchJSON(`/api/carrusel/toggle/${id}`, { method: "PUT" });
    
    // Actualizar en el estado local de todos los productos
    const item = (adminState.carruselTodosProds || []).find((p) => p.id === id);
    if (item) item.en_carrusel = res.en_carrusel;

    renderActiveCarruselCards();
    renderCarruselTable();
    await loadCatalogo();
    mostrarToast(res.en_carrusel ? "Producto añadido al carrusel" : "Producto quitado del carrusel", "ok");
  } catch (err) {
    mostrarToast("Error al actualizar producto: " + err.message, "err");
  }
};

window.guardarPromoProducto = async function(id) {
  const etiqueta = document.getElementById(`promoTag_${id}`)?.value;
  const anterior = document.getElementById(`promoAnt_${id}`)?.value;

  try {
    const res = await fetchJSON(`/api/carrusel/producto/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        etiqueta_promo: etiqueta,
        precio_anterior: anterior,
      }),
    });

    // Actualizar en estado local
    const item = (adminState.carruselTodosProds || []).find((p) => p.id === id);
    if (item && res.producto) {
      item.etiqueta_promo = res.producto.etiqueta_promo;
      item.precio_anterior = res.producto.precio_anterior;
    }

    renderActiveCarruselCards();
    renderCarruselTable();
    await loadCatalogo();
    mostrarToast("Etiqueta y precio promocional guardados correctamente", "ok");
  } catch (err) {
    mostrarToast("Error: " + err.message, "err");
  }
};

// ================= ATAJO DE TECLADO Y HASH PARA PANEL ADMIN =================
window.addEventListener("hashchange", () => {
  if (window.location.hash === "#admin") {
    if (state.usuario && state.usuario.rol === "admin") {
      showAdminView();
    } else {
      openAuthModal();
      document.querySelector('[data-tab="login"]')?.click();
      setTimeout(() => {
        const emailInput = document.getElementById("loginEmail");
        if (emailInput && !emailInput.value) emailInput.value = "admin@kernelsac.com";
        document.getElementById("loginPassword")?.focus();
      }, 100);
    }
  } else if (!window.location.hash && document.getElementById("adminView").style.display === "block") {
    showStoreView();
  }
});

document.addEventListener("keydown", (e) => {
  // Atajo: Ctrl + Shift + A
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
    e.preventDefault();
    if (state.usuario && state.usuario.rol === "admin") {
      showAdminView();
    } else {
      openAuthModal();
      document.querySelector('[data-tab="login"]').click();
      setTimeout(() => {
        const emailInput = document.getElementById("loginEmail");
        if (emailInput && !emailInput.value) emailInput.value = "admin@kernelsac.com";
        document.getElementById("loginPassword")?.focus();
      }, 100);
    }
  }
});

// ============================================================
// ================= TAB 9: REDES SOCIALES ====================
// ============================================================

const REDES_KEYS = [
  { id: "instagram", suffix: "Instagram", nombre: "Instagram", color: "#E1306C", url: "https://instagram.com", descripcion: "Fotos de setups increíbles, unboxings y detrás de cámaras." },
  { id: "tiktok", suffix: "TikTok", nombre: "TikTok", color: "#00f2fe", url: "https://tiktok.com", descripcion: "Videos rápidos, tips de tecnología y memes de ensamble." },
  { id: "youtube", suffix: "YouTube", nombre: "YouTube", color: "#FF0000", url: "https://youtube.com", descripcion: "Reviews a fondo, tutoriales y guías de armado paso a paso." },
  { id: "facebook", suffix: "Facebook", nombre: "Facebook", color: "#1877F2", url: "https://facebook.com", descripcion: "Únete a nuestra comunidad, mira transmisiones en vivo y sorteos." },
  { id: "whatsapp", suffix: "WhatsApp", nombre: "Canal WhatsApp", color: "#25D366", url: "https://wa.me/51967006922", descripcion: "Ofertas relámpago, alertas de stock y lanzamientos exclusivos." },
  { id: "x", suffix: "X", nombre: "X (Twitter)", color: "#ffffff", url: "https://x.com", descripcion: "Noticias de tecnología y lanzamientos de hardware en tiempo real." }
];

function getSocialSvgIcon(id, size = 24) {
  switch (id) {
    case "instagram":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`;
    case "tiktok":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`;
    case "youtube":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
    case "facebook":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
    case "whatsapp":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.1c-.24.68-1.4 1.32-1.93 1.36-.5.05-1.03.24-3.45-.72-2.9-1.15-4.76-4.07-4.9-4.26-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.1 1-2.39.26-.28.57-.35.76-.35h.55c.18 0 .42-.07.65.5.24.6.82 2.07.9 2.22.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.16-.3.36-.43.49-.14.14-.29.29-.13.57.17.28.74 1.22 1.59 1.98 1.1.98 2.02 1.28 2.31 1.43.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.28.38-.24.63-.14.26.1 1.63.77 1.91.91.28.14.47.21.53.33.07.12.07.68-.17 1.36z"/></svg>`;
    case "x":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`;
  }
}
window.getSocialSvgIcon = getSocialSvgIcon;

async function renderRedesAdmin() {
  const preview = document.getElementById("socialPreviewTrack");
  const tituloInput = document.getElementById("cfgRedesTitulo");
  const subtituloInput = document.getElementById("cfgRedesSubtitulo");

  // Cargar configuración de redes desde backend si aún no está en adminState
  if (!adminState.redesConfig) {
    try {
      const data = await fetchJSON("/api/configuraciones/redes");
      adminState.redesConfig = data;
    } catch {
      adminState.redesConfig = state.configRedes || {
        titulo_seccion: "Síguenos en nuestras redes",
        subtitulo: "Conéctate con nosotros en todas nuestras plataformas oficiales",
        redes: REDES_KEYS
      };
    }
  }

  const cfg = adminState.redesConfig;
  if (tituloInput && !tituloInput.dataset.userEdited) {
    tituloInput.value = cfg.titulo_seccion || "Síguenos en nuestras redes";
  }
  if (subtituloInput && !subtituloInput.dataset.userEdited) {
    subtituloInput.value = cfg.subtitulo || "Conéctate con nosotros en todas nuestras plataformas oficiales";
  }

  const redesList = Array.isArray(cfg.redes) && cfg.redes.length > 0 ? cfg.redes : REDES_KEYS;

  // Llenar cada apartado individual con sus datos y enlazar eventos en vivo
  REDES_KEYS.forEach(def => {
    const item = redesList.find(r => r.id === def.id) || def;
    const urlInput = document.getElementById("cfgUrl" + def.suffix);
    const descInput = document.getElementById("cfgDesc" + def.suffix);
    const activeInput = document.getElementById("cfgActive" + def.suffix);
    const testLink = document.getElementById("testLink" + def.suffix);
    const card = document.getElementById("cardAdmin" + def.suffix);

    if (urlInput && !urlInput.dataset.userEdited) {
      urlInput.value = item.url || "";
    }
    if (descInput && !descInput.dataset.userEdited) {
      descInput.value = item.descripcion || "";
    }
    if (activeInput && !activeInput.dataset.userEdited) {
      activeInput.checked = item.activo !== false;
    }
    if (testLink) {
      testLink.href = item.url || "#";
    }
    if (card) {
      card.classList.toggle("inactivo", item.activo === false);
    }

    if (urlInput && !urlInput._boundPreview) {
      urlInput._boundPreview = true;
      urlInput.addEventListener("input", (e) => {
        urlInput.dataset.userEdited = "1";
        if (testLink) testLink.href = e.target.value.trim() || "#";
        renderSocialPreviewAdmin();
      });
    }

    if (descInput && !descInput._boundPreview) {
      descInput._boundPreview = true;
      descInput.addEventListener("input", () => {
        descInput.dataset.userEdited = "1";
        renderSocialPreviewAdmin();
      });
    }

    if (activeInput && !activeInput._boundPreview) {
      activeInput._boundPreview = true;
      activeInput.addEventListener("change", (e) => {
        activeInput.dataset.userEdited = "1";
        if (card) card.classList.toggle("inactivo", !e.target.checked);
        renderSocialPreviewAdmin();
      });
    }
  });

  if (tituloInput && !tituloInput._boundLive) {
    tituloInput._boundLive = true;
    tituloInput.addEventListener("input", () => {
      tituloInput.dataset.userEdited = "1";
      renderSocialPreviewAdmin();
    });
  }

  renderSocialPreviewAdmin();
}
window.renderRedesAdmin = renderRedesAdmin;

function renderSocialPreviewAdmin() {
  const preview = document.getElementById("socialPreviewTrack");
  if (!preview) return;

  const cardsHtml = REDES_KEYS.map(def => {
    const urlInput = document.getElementById("cfgUrl" + def.suffix);
    const descInput = document.getElementById("cfgDesc" + def.suffix);
    const activeInput = document.getElementById("cfgActive" + def.suffix);
    const isActivo = activeInput ? activeInput.checked : true;
    if (!isActivo) return "";

    const url = (urlInput ? urlInput.value.trim() : "") || def.url;
    const desc = (descInput ? descInput.value.trim() : "") || def.descripcion;

    return `
      <div class="social-preview-card">
        <div class="social-preview-icon" style="color:${def.color};">
          ${getSocialSvgIcon(def.id, 24)}
        </div>
        <div>
          <h4 class="social-preview-title">${escapeHtml(def.nombre)}</h4>
          <p class="social-preview-desc">${escapeHtml(desc)}</p>
        </div>
        <div style="font-size:0.72rem; color:var(--cyan); word-break:break-all; font-family:var(--font-mono); margin-top:4px;">
          ${escapeHtml(url)}
        </div>
      </div>
    `;
  }).filter(Boolean).join("");

  if (!cardsHtml) {
    preview.innerHTML = `<div class="empty-state" style="width:100%; padding:20px; text-align:center;">Todas las redes están desactivadas. Activa al menos una para que se muestre en el carrusel de la tienda.</div>`;
  } else {
    preview.innerHTML = cardsHtml;
  }
}

window.guardarRedesAdmin = async function() {
  const msg = document.getElementById("cfgRedesMsg");
  const btn = document.getElementById("btnGuardarRedes");
  const titulo = document.getElementById("cfgRedesTitulo")?.value.trim() || "Síguenos en nuestras redes";
  const subtitulo = document.getElementById("cfgRedesSubtitulo")?.value.trim() || "";

  if (btn) btn.disabled = true;
  if (msg) {
    msg.textContent = "Guardando configuración de redes...";
    msg.className = "form-msg";
  }

  const redes = REDES_KEYS.map(def => {
    const urlInput = document.getElementById("cfgUrl" + def.suffix);
    const descInput = document.getElementById("cfgDesc" + def.suffix);
    const activeInput = document.getElementById("cfgActive" + def.suffix);
    return {
      id: def.id,
      nombre: def.nombre,
      url: (urlInput ? urlInput.value.trim() : "") || def.url,
      descripcion: (descInput ? descInput.value.trim() : "") || def.descripcion,
      color: def.color,
      activo: activeInput ? activeInput.checked : true
    };
  });

  const payload = {
    titulo_seccion: titulo,
    subtitulo: subtitulo,
    redes: redes
  };

  try {
    const res = await fetchJSON("/api/configuraciones/redes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    adminState.redesConfig = res.config;
    state.configRedes = res.config;

    // Actualizar carrusel en la tienda en vivo inmediatamente
    if (typeof renderSocialCarousel === "function") {
      renderSocialCarousel(res.config);
    }

    if (msg) {
      msg.textContent = "✅ ¡Redes sociales guardadas y sincronizadas exitosamente con la tienda!";
      msg.className = "form-msg ok";
      setTimeout(() => { if (msg) msg.textContent = ""; }, 4000);
    }
    mostrarToast("Redes sociales actualizadas en vivo en la tienda", "ok");
  } catch (err) {
    if (msg) {
      msg.textContent = "❌ Error al guardar redes: " + err.message;
      msg.className = "form-msg err";
    }
    mostrarToast("Error: " + err.message, "err");
  } finally {
    if (btn) btn.disabled = false;
  }
};

document.getElementById("btnGuardarRedes")?.addEventListener("click", () => window.guardarRedesAdmin());

// ================= TAB 10: BARRAS & ANUNCIOS ================
// ============================================================

const PALETAS_PRESET = {
  cyber_magenta: {
    cinta_bg: "#e11d48", cinta_text: "#ffffff",
    boom_bg1: "#be123c", boom_bg2: "#e11d48", boom_bg3: "#be123c", boom_text: "#ffffff",
    tag_bg: "#ffde00", tag_text: "#0b0608", discount_color: "#ffde00",
    btn_bg: "#ffffff", btn_text: "#e11d48"
  },
  electric_cyan: {
    cinta_bg: "#0284c7", cinta_text: "#ffffff",
    boom_bg1: "#0369a1", boom_bg2: "#0284c7", boom_bg3: "#0369a1", boom_text: "#ffffff",
    tag_bg: "#00f2fe", tag_text: "#0b0608", discount_color: "#00f2fe",
    btn_bg: "#00f2fe", btn_text: "#082f49"
  },
  golden_fire: {
    cinta_bg: "#d97706", cinta_text: "#ffffff",
    boom_bg1: "#b45309", boom_bg2: "#d97706", boom_bg3: "#b45309", boom_text: "#ffffff",
    tag_bg: "#ffde00", tag_text: "#000000", discount_color: "#ffde00",
    btn_bg: "#ffde00", btn_text: "#78350f"
  },
  emerald_gamer: {
    cinta_bg: "#059669", cinta_text: "#ffffff",
    boom_bg1: "#047857", boom_bg2: "#059669", boom_bg3: "#047857", boom_text: "#ffffff",
    tag_bg: "#34d399", tag_text: "#022c22", discount_color: "#34d399",
    btn_bg: "#34d399", btn_text: "#064e3b"
  },
  ultra_violet: {
    cinta_bg: "#7e22ce", cinta_text: "#ffffff",
    boom_bg1: "#581c87", boom_bg2: "#7e22ce", boom_bg3: "#581c87", boom_text: "#ffffff",
    tag_bg: "#c084fc", tag_text: "#3b0764", discount_color: "#c084fc",
    btn_bg: "#ffffff", btn_text: "#7e22ce"
  },
  dark_stealth: {
    cinta_bg: "#27272a", cinta_text: "#ffffff",
    boom_bg1: "#18181b", boom_bg2: "#27272a", boom_bg3: "#18181b", boom_text: "#ffffff",
    tag_bg: "#ff2d67", tag_text: "#ffffff", discount_color: "#ff2d67",
    btn_bg: "#ff2d67", btn_text: "#ffffff"
  }
};

window.aplicarPaletaPreset = function(presetKey) {
  const pal = PALETAS_PRESET[presetKey];
  if (!pal) return;

  function syncPair(colorId, hexId, val) {
    const cEl = document.getElementById(colorId);
    const hEl = document.getElementById(hexId);
    if (cEl) cEl.value = val;
    if (hEl) hEl.value = val;
  }

  syncPair("cfgCintaBgColor", "cfgCintaBgHex", pal.cinta_bg);
  syncPair("cfgCintaTextColor", "cfgCintaTextHex", pal.cinta_text);
  syncPair("cfgBoomBg1Color", "cfgBoomBg1Hex", pal.boom_bg1);
  syncPair("cfgBoomBg2Color", "cfgBoomBg2Hex", pal.boom_bg2);
  syncPair("cfgBoomBg3Color", "cfgBoomBg3Hex", pal.boom_bg3);
  syncPair("cfgBoomTextColor", "cfgBoomTextHex", pal.boom_text);
  syncPair("cfgBoomTagBgColor", "cfgBoomTagBgHex", pal.tag_bg);
  syncPair("cfgBoomTagTextColor", "cfgBoomTagTextHex", pal.tag_text);
  syncPair("cfgBoomDiscountColor", "cfgBoomDiscountHex", pal.discount_color);
  syncPair("cfgBoomBtnBgColor", "cfgBoomBtnBgHex", pal.btn_bg);
  syncPair("cfgBoomBtnTextColor", "cfgBoomBtnTextHex", pal.btn_text);

  renderAnunciosLivePreview();
  mostrarToast(`Paleta ${presetKey} aplicada a la vista previa`, "ok");
};

function setupColorPair(colorId, hexId, onChange) {
  const colorEl = document.getElementById(colorId);
  const hexEl = document.getElementById(hexId);
  if (!colorEl || !hexEl) return;

  if (!colorEl._boundSync) {
    colorEl._boundSync = true;
    colorEl.addEventListener("input", (e) => {
      hexEl.value = e.target.value;
      if (onChange) onChange(e.target.value);
    });
  }
  if (!hexEl._boundSync) {
    hexEl._boundSync = true;
    hexEl.addEventListener("input", (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith("#") && val.length === 6) val = "#" + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        colorEl.value = val;
        if (onChange) onChange(val);
      }
    });
  }
}

function recolectarConfigAnunciosForm() {
  return {
    cinta_superior: {
      activo: document.getElementById("cfgCintaActivo")?.checked !== false,
      color_fondo: document.getElementById("cfgCintaBgHex")?.value.trim() || "#e11d48",
      color_texto: document.getElementById("cfgCintaTextHex")?.value.trim() || "#ffffff",
      item1: document.getElementById("cfgCintaItem1")?.value ?? "ENVÍOS A TODO EL PERÚ",
      item2: document.getElementById("cfgCintaItem2")?.value ?? "SOPORTE TÉCNICO ESPECIALIZADO",
      item3: document.getElementById("cfgCintaItem3")?.value ?? "PRODUCTOS CON GARANTÍA",
      item4: document.getElementById("cfgCintaItem4")?.value ?? "MÁS DE 25 000 PRODUCTOS"
    },
    barra_promocional: {
      activo: document.getElementById("cfgBoomActivo")?.checked !== false,
      color_fondo_inicio: document.getElementById("cfgBoomBg1Hex")?.value.trim() || "#be123c",
      color_fondo_medio: document.getElementById("cfgBoomBg2Hex")?.value.trim() || "#e11d48",
      color_fondo_fin: document.getElementById("cfgBoomBg3Hex")?.value.trim() || "#be123c",
      color_texto: document.getElementById("cfgBoomTextHex")?.value.trim() || "#ffffff",
      badge_texto: document.getElementById("cfgBoomTagText")?.value ?? "🔥 CYBER BOOM",
      badge_color_fondo: document.getElementById("cfgBoomTagBgHex")?.value.trim() || "#ffde00",
      badge_color_texto: document.getElementById("cfgBoomTagTextHex")?.value.trim() || "#0b0608",
      titulo: document.getElementById("cfgBoomTitleText")?.value ?? "¡OFERTAS EXPLOSIVAS KERNEL SAC!",
      descuento_texto: document.getElementById("cfgBoomDiscountText")?.value ?? "50% DSCTO",
      descuento_color: document.getElementById("cfgBoomDiscountHex")?.value.trim() || "#ffde00",
      subtitulo: document.getElementById("cfgBoomExtraText")?.value ?? "+ Regalos Gratis 🎁",
      timer_label: document.getElementById("cfgBoomTimerLabel")?.value ?? "⏰ Termina en:",
      boton_texto: document.getElementById("cfgBoomBtnText")?.value ?? "Ver Ofertas ⚡",
      boton_link: document.getElementById("cfgBoomBtnLink")?.value.trim() || "#destacados",
      boton_color_fondo: document.getElementById("cfgBoomBtnBgHex")?.value.trim() || "#ffffff",
      boton_color_texto: document.getElementById("cfgBoomBtnTextHex")?.value.trim() || "#e11d48"
    }
  };
}
window.recolectarConfigAnunciosForm = recolectarConfigAnunciosForm;

async function renderAnunciosAdmin() {
  if (!adminState.anunciosConfig) {
    try {
      const data = await fetchJSON("/api/configuraciones/anuncios");
      adminState.anunciosConfig = data;
    } catch {
      adminState.anunciosConfig = state.configAnuncios || null;
    }
  }

  const cfg = adminState.anunciosConfig;
  if (cfg) {
    // Cinta Superior
    if (cfg.cinta_superior) {
      const c = cfg.cinta_superior;
      const act = document.getElementById("cfgCintaActivo");
      if (act && !act.dataset.userEdited) act.checked = c.activo !== false;
      const bgC = document.getElementById("cfgCintaBgColor");
      const bgH = document.getElementById("cfgCintaBgHex");
      if (bgC && c.color_fondo) bgC.value = c.color_fondo;
      if (bgH && c.color_fondo) bgH.value = c.color_fondo;

      const txC = document.getElementById("cfgCintaTextColor");
      const txH = document.getElementById("cfgCintaTextHex");
      if (txC && c.color_texto) txC.value = c.color_texto;
      if (txH && c.color_texto) txH.value = c.color_texto;

      const i1 = document.getElementById("cfgCintaItem1");
      const i2 = document.getElementById("cfgCintaItem2");
      const i3 = document.getElementById("cfgCintaItem3");
      const i4 = document.getElementById("cfgCintaItem4");
      if (i1 && !i1.dataset.userEdited && c.item1 !== undefined) i1.value = c.item1;
      if (i2 && !i2.dataset.userEdited && c.item2 !== undefined) i2.value = c.item2;
      if (i3 && !i3.dataset.userEdited && c.item3 !== undefined) i3.value = c.item3;
      if (i4 && !i4.dataset.userEdited && c.item4 !== undefined) i4.value = c.item4;
    }

    // Barra Promocional Boom
    if (cfg.barra_promocional) {
      const b = cfg.barra_promocional;
      const act = document.getElementById("cfgBoomActivo");
      if (act && !act.dataset.userEdited) act.checked = b.activo !== false;

      // Colores de degradado
      if (b.color_fondo_inicio) {
        document.getElementById("cfgBoomBg1Color").value = b.color_fondo_inicio;
        document.getElementById("cfgBoomBg1Hex").value = b.color_fondo_inicio;
      }
      if (b.color_fondo_medio) {
        document.getElementById("cfgBoomBg2Color").value = b.color_fondo_medio;
        document.getElementById("cfgBoomBg2Hex").value = b.color_fondo_medio;
      }
      if (b.color_fondo_fin) {
        document.getElementById("cfgBoomBg3Color").value = b.color_fondo_fin;
        document.getElementById("cfgBoomBg3Hex").value = b.color_fondo_fin;
      }
      if (b.color_texto) {
        document.getElementById("cfgBoomTextColor").value = b.color_texto;
        document.getElementById("cfgBoomTextHex").value = b.color_texto;
      }

      // Badge
      const tagText = document.getElementById("cfgBoomTagText");
      if (tagText && !tagText.dataset.userEdited && b.badge_texto !== undefined) tagText.value = b.badge_texto;
      if (b.badge_color_fondo) {
        document.getElementById("cfgBoomTagBgColor").value = b.badge_color_fondo;
        document.getElementById("cfgBoomTagBgHex").value = b.badge_color_fondo;
      }
      if (b.badge_color_texto) {
        document.getElementById("cfgBoomTagTextColor").value = b.badge_color_texto;
        document.getElementById("cfgBoomTagTextHex").value = b.badge_color_texto;
      }

      // Textos
      const title = document.getElementById("cfgBoomTitleText");
      if (title && !title.dataset.userEdited && b.titulo !== undefined) title.value = b.titulo;

      const discount = document.getElementById("cfgBoomDiscountText");
      if (discount && !discount.dataset.userEdited && b.descuento_texto !== undefined) discount.value = b.descuento_texto;
      if (b.descuento_color) {
        document.getElementById("cfgBoomDiscountColor").value = b.descuento_color;
        document.getElementById("cfgBoomDiscountHex").value = b.descuento_color;
      }

      const extra = document.getElementById("cfgBoomExtraText");
      if (extra && !extra.dataset.userEdited && b.subtitulo !== undefined) extra.value = b.subtitulo;

      const timerLabel = document.getElementById("cfgBoomTimerLabel");
      if (timerLabel && !timerLabel.dataset.userEdited && b.timer_label !== undefined) timerLabel.value = b.timer_label;

      const btnText = document.getElementById("cfgBoomBtnText");
      if (btnText && !btnText.dataset.userEdited && b.boton_texto !== undefined) btnText.value = b.boton_texto;

      const btnLink = document.getElementById("cfgBoomBtnLink");
      if (btnLink && !btnLink.dataset.userEdited && b.boton_link !== undefined) btnLink.value = b.boton_link;

      if (b.boton_color_fondo) {
        document.getElementById("cfgBoomBtnBgColor").value = b.boton_color_fondo;
        document.getElementById("cfgBoomBtnBgHex").value = b.boton_color_fondo;
      }
      if (b.boton_color_texto) {
        document.getElementById("cfgBoomBtnTextColor").value = b.boton_color_texto;
        document.getElementById("cfgBoomBtnTextHex").value = b.boton_color_texto;
      }
    }
  }

  // Setup color pickers two-way sync
  setupColorPair("cfgCintaBgColor", "cfgCintaBgHex", renderAnunciosLivePreview);
  setupColorPair("cfgCintaTextColor", "cfgCintaTextHex", renderAnunciosLivePreview);
  setupColorPair("cfgBoomBg1Color", "cfgBoomBg1Hex", renderAnunciosLivePreview);
  setupColorPair("cfgBoomBg2Color", "cfgBoomBg2Hex", renderAnunciosLivePreview);
  setupColorPair("cfgBoomBg3Color", "cfgBoomBg3Hex", renderAnunciosLivePreview);
  setupColorPair("cfgBoomTextColor", "cfgBoomTextHex", renderAnunciosLivePreview);
  setupColorPair("cfgBoomTagBgColor", "cfgBoomTagBgHex", renderAnunciosLivePreview);
  setupColorPair("cfgBoomTagTextColor", "cfgBoomTagTextHex", renderAnunciosLivePreview);
  setupColorPair("cfgBoomDiscountColor", "cfgBoomDiscountHex", renderAnunciosLivePreview);
  setupColorPair("cfgBoomBtnBgColor", "cfgBoomBtnBgHex", renderAnunciosLivePreview);
  setupColorPair("cfgBoomBtnTextColor", "cfgBoomBtnTextHex", renderAnunciosLivePreview);

  // Setup text change listeners for live preview & auto-sync
  [
    "cfgCintaActivo", "cfgBoomActivo",
    "cfgCintaItem1", "cfgCintaItem2", "cfgCintaItem3", "cfgCintaItem4",
    "cfgBoomTagText", "cfgBoomTitleText", "cfgBoomDiscountText", "cfgBoomExtraText",
    "cfgBoomTimerLabel", "cfgBoomBtnText", "cfgBoomBtnLink"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._boundLive) {
      el._boundLive = true;
      el.addEventListener("input", () => {
        el.dataset.userEdited = "1";
        renderAnunciosLivePreview();
      });
      el.addEventListener("change", () => {
        el.dataset.userEdited = "1";
        renderAnunciosLivePreview();
      });
    }
  });

  renderAnunciosLivePreview(false);
}
window.renderAnunciosAdmin = renderAnunciosAdmin;

let _anunciosDebounceTimer = null;

function renderAnunciosLivePreview(triggerAutoSave = true) {
  const currentCfg = recolectarConfigAnunciosForm();
  const pAnnounce = document.getElementById("prevTopAnnounceBar");
  const pBoom = document.getElementById("prevBoomPromoBar");

  // 1. Vista Previa Mockup (dentro del panel admin)
  if (pAnnounce) {
    pAnnounce.style.display = currentCfg.cinta_superior.activo ? "block" : "none";
    pAnnounce.style.setProperty("background", currentCfg.cinta_superior.color_fondo, "important");
    pAnnounce.style.setProperty("color", currentCfg.cinta_superior.color_texto, "important");

    const pi1 = document.getElementById("prevTopItem1");
    const pi2 = document.getElementById("prevTopItem2");
    const pi3 = document.getElementById("prevTopItem3");
    const pi4 = document.getElementById("prevTopItem4");
    if (pi1) pi1.textContent = "🚚 " + (currentCfg.cinta_superior.item1 || "");
    if (pi2) pi2.textContent = "🔧 " + (currentCfg.cinta_superior.item2 || "");
    if (pi3) pi3.textContent = "🛡️ " + (currentCfg.cinta_superior.item3 || "");
    if (pi4) pi4.textContent = "📦 " + (currentCfg.cinta_superior.item4 || "");
  }

  if (pBoom) {
    pBoom.style.display = currentCfg.barra_promocional.activo ? "block" : "none";
    const c1 = currentCfg.barra_promocional.color_fondo_inicio;
    const c2 = currentCfg.barra_promocional.color_fondo_medio;
    const c3 = currentCfg.barra_promocional.color_fondo_fin;
    pBoom.style.setProperty("background", `linear-gradient(90deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`, "important");
    pBoom.style.setProperty("color", currentCfg.barra_promocional.color_texto, "important");

    const tagEl = document.getElementById("prevBoomTag");
    if (tagEl) {
      tagEl.textContent = currentCfg.barra_promocional.badge_texto;
      tagEl.style.setProperty("background-color", currentCfg.barra_promocional.badge_color_fondo, "important");
      tagEl.style.setProperty("color", currentCfg.barra_promocional.badge_color_texto, "important");
    }

    const titleEl = document.getElementById("prevBoomTitle");
    if (titleEl) titleEl.textContent = currentCfg.barra_promocional.titulo;

    const discEl = document.getElementById("prevBoomDiscount");
    if (discEl) {
      discEl.textContent = currentCfg.barra_promocional.descuento_texto;
      discEl.style.setProperty("color", currentCfg.barra_promocional.descuento_color, "important");
    }

    const extraEl = document.getElementById("prevBoomExtra");
    if (extraEl) extraEl.textContent = currentCfg.barra_promocional.subtitulo;

    const timerLabelEl = document.getElementById("prevBoomTimerLabel");
    if (timerLabelEl) timerLabelEl.textContent = currentCfg.barra_promocional.timer_label;

    const btnEl = document.getElementById("prevBoomCta");
    if (btnEl) {
      btnEl.textContent = currentCfg.barra_promocional.boton_texto;
      btnEl.style.setProperty("background-color", currentCfg.barra_promocional.boton_color_fondo, "important");
      btnEl.style.setProperty("color", currentCfg.barra_promocional.boton_color_texto, "important");
    }
  }

  // 2. SINCRONIZACIÓN EN TIEMPO REAL CON LA TIENDA REAL (DOM DE STOREVIEW)
  state.configAnuncios = currentCfg;
  adminState.anunciosConfig = currentCfg;
  if (typeof aplicarBarrasAnuncios === "function") {
    aplicarBarrasAnuncios(currentCfg);
  }

  // 3. AUTO-GUARDADO DEBOUNCED AUTOMÁTICO (a la base de datos SQLite)
  if (triggerAutoSave !== false) {
    const autoBadge = document.getElementById("cfgAnunciosAutoSaveStatus");
    if (autoBadge) {
      autoBadge.innerHTML = "🟡 Sincronizando en vivo...";
      autoBadge.className = "auto-sync-indicator syncing";
    }
    clearTimeout(_anunciosDebounceTimer);
    _anunciosDebounceTimer = setTimeout(async () => {
      try {
        const payload = recolectarConfigAnunciosForm();
        const res = await fetchJSON("/api/configuraciones/anuncios", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        adminState.anunciosConfig = res.config;
        state.configAnuncios = res.config;
        if (autoBadge) {
          autoBadge.innerHTML = "🟢 Sincronizado en tiempo real";
          autoBadge.className = "auto-sync-indicator synced";
        }
      } catch (err) {
        console.warn("Auto-guardado anuncios background:", err);
        if (autoBadge) {
          autoBadge.innerHTML = "⚠️ Guardar manual requerido";
          autoBadge.className = "auto-sync-indicator error";
        }
      }
    }, 600);
  }
}
window.renderAnunciosLivePreview = renderAnunciosLivePreview;

window.guardarAnunciosAdmin = async function() {
  const btnTop = document.getElementById("btnGuardarAnuncios");
  const btnBottom = document.getElementById("btnGuardarAnunciosBottom");
  const msg = document.getElementById("cfgAnunciosMsg");
  const autoBadge = document.getElementById("cfgAnunciosAutoSaveStatus");

  if (btnTop) btnTop.disabled = true;
  if (btnBottom) btnBottom.disabled = true;
  if (autoBadge) {
    autoBadge.innerHTML = "🟡 Guardando...";
    autoBadge.className = "auto-sync-indicator syncing";
  }
  if (msg) {
    msg.textContent = "Guardando y sincronizando con la tienda...";
    msg.className = "form-msg";
  }

  const payload = recolectarConfigAnunciosForm();

  try {
    const res = await fetchJSON("/api/configuraciones/anuncios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    adminState.anunciosConfig = res.config;
    state.configAnuncios = res.config;

    // Sincronizar en vivo con la tienda
    if (typeof aplicarBarrasAnuncios === "function") {
      aplicarBarrasAnuncios(res.config);
    }

    if (autoBadge) {
      autoBadge.innerHTML = "🟢 Sincronizado en tiempo real";
      autoBadge.className = "auto-sync-indicator synced";
    }

    if (msg) {
      msg.textContent = "✅ ¡Configuración guardada y sincronizada al instante con la tienda!";
      msg.className = "form-msg ok";
      setTimeout(() => { if (msg) msg.textContent = ""; }, 4000);
    }
    mostrarToast("¡Barra superior y anuncios sincronizados con éxito!", "ok");
  } catch (err) {
    if (autoBadge) {
      autoBadge.innerHTML = "❌ Error al guardar";
      autoBadge.className = "auto-sync-indicator error";
    }
    if (msg) {
      msg.textContent = "❌ Error: " + err.message;
      msg.className = "form-msg err";
    }
    mostrarToast("Error: " + err.message, "err");
  } finally {
    if (btnTop) btnTop.disabled = false;
    if (btnBottom) btnBottom.disabled = false;
  }
};

document.getElementById("btnGuardarAnuncios")?.addEventListener("click", () => window.guardarAnunciosAdmin());
document.getElementById("btnGuardarAnunciosBottom")?.addEventListener("click", () => window.guardarAnunciosAdmin());


