// public/js/app.js
// Entrada principal de la aplicación cliente y orquestación

// ================= CUENTA (login / registro / invitado) =================
const authOverlay = document.getElementById("authModalOverlay");
function openAuthModal() { authOverlay.classList.add("open"); }
function closeAuthModal() { authOverlay.classList.remove("open"); }
document.getElementById("authModalClose").addEventListener("click", closeAuthModal);
authOverlay.addEventListener("click", (e) => { if (e.target === authOverlay) closeAuthModal(); });

document.querySelectorAll(".modal-tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".modal-tabs button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".modal-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab === "login" ? "panelLogin" : "panelRegistro").classList.add("active");
  });
});

document.getElementById("guestBtnLogin").addEventListener("click", closeAuthModal);
document.getElementById("guestBtnRegistro").addEventListener("click", closeAuthModal);

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("loginMsg");
  msg.textContent = "Ingresando...";
  msg.className = "auth-msg";
  try {
    const data = await fetchJSON("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value,
      }),
    });
    state.usuario = data.usuario;
    renderAccount();
    closeAuthModal();
    document.getElementById("loginForm").reset();
    msg.textContent = "";

    if (state.usuario && state.usuario.rol === "admin") {
      showAdminView();
      mostrarToast("¡Bienvenido al Panel de Administración!", "ok");
    } else {
      mostrarToast(`Bienvenido, ${state.usuario.nombre}`, "ok");
    }
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "auth-msg err";
  }
});

document.getElementById("registroForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("registroMsg");
  msg.textContent = "Creando cuenta...";
  msg.className = "auth-msg";
  try {
    const data = await fetchJSON("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: document.getElementById("regNombre").value.trim(),
        email: document.getElementById("regEmail").value.trim(),
        password: document.getElementById("regPassword").value,
      }),
    });
    state.usuario = data.usuario;
    renderAccount();
    closeAuthModal();
    document.getElementById("registroForm").reset();
    msg.textContent = "";
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "auth-msg err";
  }
});

const accountBtn = document.getElementById("accountBtn");
const accountPanel = document.getElementById("accountPanel");

function goToMainHome() {
  // Si está en el panel admin, volver a la vista principal de tienda
  const adminView = document.getElementById("adminView");
  if (adminView && adminView.style.display !== "none" && typeof showStoreView === "function") {
    showStoreView();
  }

  // Cerrar modales, carrito y menús abiertos
  document.querySelectorAll(".modal-overlay.open").forEach((m) => m.classList.remove("open"));
  if (typeof closeCart === "function") closeCart();
  if (typeof closeMobileNav === "function") closeMobileNav();
  accountPanel?.classList.remove("open");

  // Restablecer filtros si había alguno activo
  const searchEl = document.getElementById("searchInput");
  const mobSearchEl = document.getElementById("mobileSearchInput");
  const minPriceEl = document.getElementById("minPrice");
  const maxPriceEl = document.getElementById("maxPrice");
  const clearPriceBtn = document.getElementById("clearPriceFilterBtn");
  const hadFilters = Boolean(
    state.categoriaActiva ||
    (state.paginaActual && state.paginaActual > 1) ||
    (searchEl && searchEl.value.trim()) ||
    (mobSearchEl && mobSearchEl.value.trim()) ||
    (minPriceEl && minPriceEl.value !== "") ||
    (maxPriceEl && maxPriceEl.value !== "")
  );

  if (searchEl) searchEl.value = "";
  if (mobSearchEl) mobSearchEl.value = "";
  if (minPriceEl) minPriceEl.value = "";
  if (maxPriceEl) maxPriceEl.value = "";
  if (clearPriceBtn) clearPriceBtn.style.display = "none";
  if (hadFilters && typeof setCategoriaActiva === "function") {
    setCategoriaActiva("");
  }

  // Limpiar hash (#admin, #catalogo, #contacto, etc.) y volver arriba al apartado principal
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("#storeView .logo, #adminView .logo").forEach((logoEl) => {
  logoEl.addEventListener("click", (e) => {
    // Evitar que el clic en la píldora de alertas dentro del header admin dispare el retorno
    if (e.target.closest("#adminStockAlertsPill")) return;
    goToMainHome();
  });
  logoEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToMainHome();
    }
  });
});
if (accountBtn && accountPanel) {
  accountBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!state.usuario) { openAuthModal(); return; }
    accountPanel.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!accountPanel.contains(e.target) && e.target !== accountBtn) accountPanel.classList.remove("open");
  });
}

function renderAccount() {
  const label = document.getElementById("accountLabel");
  if (!state.usuario) {
    label.textContent = "Cuenta";
    accountPanel.innerHTML = "";
    return;
  }
  label.textContent = state.usuario.nombre.split(" ")[0];
  const esAdmin = state.usuario.rol === "admin";
  accountPanel.innerHTML = `
    <div class="who">
      <strong>${state.usuario.nombre}</strong>
      <span>${esAdmin ? "Administrador" : "Cliente registrado"}</span>
    </div>
    ${esAdmin ? `<button id="goAdminBtn">Panel de administración</button>` : `<button id="misPedidosBtn">Mis pedidos</button>`}
    <button id="logoutBtn">Cerrar sesión</button>
  `;
  const misPedidosBtn = document.getElementById("misPedidosBtn");
  if (misPedidosBtn) misPedidosBtn.addEventListener("click", openPedidosModal);
  const goAdminBtn = document.getElementById("goAdminBtn");
  if (goAdminBtn) goAdminBtn.addEventListener("click", () => { accountPanel.classList.remove("open"); showAdminView(); });
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await fetchJSON("/api/auth/logout", { method: "POST" });
    state.usuario = null;
    accountPanel.classList.remove("open");
    renderAccount();
  });
}

// ================= MIS PEDIDOS =================
const pedidosOverlay = document.getElementById("pedidosModalOverlay");
function closePedidosModal() { pedidosOverlay.classList.remove("open"); }
document.getElementById("pedidosModalClose").addEventListener("click", closePedidosModal);
pedidosOverlay.addEventListener("click", (e) => { if (e.target === pedidosOverlay) closePedidosModal(); });

async function openPedidosModal() {
  accountPanel.classList.remove("open");
  pedidosOverlay.classList.add("open");
  const el = document.getElementById("pedidosList");
  el.innerHTML = `<p style="color:var(--text-dim); font-size:0.85rem;">Cargando...</p>`;
  try {
    const pedidos = await fetchJSON("/api/mis-pedidos");
    el.innerHTML = pedidos.length
      ? pedidos.map((p) => `
        <div class="pedido-item">
          <div class="top-row"><span>Pedido #${p.id}</span><span>${p.creado_en}</span></div>
          <div style="margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
            <strong class="price">${money(p.total)}</strong>
            <span class="estado-tag">${p.estado}</span>
          </div>
        </div>`).join("")
      : `<p style="color:var(--text-dim); font-size:0.85rem;">Aún no tienes pedidos.</p>`;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger); font-size:0.85rem;">${err.message}</p>`;
  }
}

// ================= INIT =================
async function init() {
  initTheme();
  try {
    const meRes = await fetchJSON("/api/auth/me");
    state.usuario = meRes.usuario;
  } catch (authErr) {
    console.warn("Sesión inicial:", authErr);
    state.usuario = null;
  }

  await loadCatalogo();
  renderCart();
  renderAccount();
  initIosCarousel();
  initSocialCarousel();
  initBoomTimer();

  window.irAlPanelAdmin = function() {
    if (state.usuario && state.usuario.rol === "admin") {
      showAdminView();
    } else {
      window.location.hash = "admin";
      openAuthModal();
      document.querySelector('[data-tab="login"]')?.click();
      setTimeout(() => {
        const emailInput = document.getElementById("loginEmail");
        const passInput = document.getElementById("loginPassword");
        if (emailInput) emailInput.value = "admin@kernelsac.com";
        if (passInput) {
          passInput.value = "admin";
          passInput.focus();
        }
      }, 100);
    }
  };

  document.getElementById("quickAdminLoginBtn")?.addEventListener("click", () => {
    const emailInput = document.getElementById("loginEmail");
    const passInput = document.getElementById("loginPassword");
    if (emailInput) emailInput.value = "admin@kernelsac.com";
    if (passInput) passInput.value = "admin";
    document.getElementById("loginForm")?.requestSubmit();
  });

  if (window.location.hash === "#admin") {
    if (state.usuario && state.usuario.rol === "admin") {
      showAdminView();
    } else {
      openAuthModal();
      document.querySelector('[data-tab="login"]')?.click();
      setTimeout(() => {
        const emailInput = document.getElementById("loginEmail");
        const passInput = document.getElementById("loginPassword");
        if (emailInput && !emailInput.value) emailInput.value = "admin@kernelsac.com";
        if (passInput && !passInput.value) passInput.value = "admin";
        passInput?.focus();
      }, 150);
    }
  }
}

function initBoomTimer() {
  const timerEl = document.getElementById("boomTimerDigits");
  if (!timerEl) return;
  let remainingSeconds = 16155;
  setInterval(() => {
    remainingSeconds = Math.max(0, remainingSeconds - 1);
    const h = String(Math.floor(remainingSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(remainingSeconds % 60).padStart(2, "0");
    timerEl.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

function renderStats() {
  const total = state.totalProductos != null ? state.totalProductos : (state.productos ? state.productos.length : 0);
  const pEl = document.getElementById("statProductos");
  const cEl = document.getElementById("statCategorias");
  if (pEl) pEl.textContent = Number(total).toLocaleString('es-PE');
  if (cEl) cEl.textContent = state.categorias.length;
}

function startApp() {
  init().catch((err) => {
    console.error(err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="position:sticky; top:0; z-index:999; background:#ff5c5c; color:#1a0405; padding:14px 20px; text-align:center; font-family:'IBM Plex Mono', monospace; font-size:0.85rem; line-height:1.5; box-shadow:0 4px 16px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>${err.message}</span>
      </div>`
    );
  });
}

// Ejecutar inicialización al cargar el DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}