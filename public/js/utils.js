// ================= GESTIÓN DE TEMA (LIGHT / DARK) =================
function setTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('kernel_theme', t);
  updateThemeUI(t);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  setTheme(next);
}

function updateThemeUI(t) {
  const isLight = t === 'light';
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.setAttribute('title', isLight ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro');
    toggleBtn.setAttribute('aria-label', isLight ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro');
  }
  const mobileLabel = document.getElementById('mobileThemeLabel');
  if (mobileLabel) {
    mobileLabel.textContent = isLight ? 'Modo Oscuro' : 'Modo Claro';
  }
}

function initTheme() {
  const current = localStorage.getItem('kernel_theme') || 'dark';
  setTheme(current);
  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
  document.getElementById('mobileThemeToggleBtn')?.addEventListener('click', toggleTheme);
}

// ================= ESTADO =================
const state = {
  categorias: [],
  productos: [], // productos de la página activa del catálogo (24 items por llamada)
  destacados: [],
  carruselConfig: null,
  carruselProductos: [],
  configGeneral: null,
  configRedes: null,
  configAnuncios: null,
  cart: JSON.parse(sessionStorage.getItem("kernel_cart") || "[]"),
  categoriaActiva: "",
  usuario: null,
  // Paginación y conteo escalable a 70k+ productos
  totalProductos: 0,
  totalFiltrados: 0,
  paginaActual: 1,
  porPagina: 24,
  totalPaginas: 1,
};
const adminState = {
  pedidos: [],
  chatLogs: [],
  filtroPedidoEstado: "todos",
  filtroProdCategoria: "",
  filtroProdStock: "todos",
  prodPaginaActual: 1,
  prodPorPagina: 15,
  redesConfig: null,
};

function getSocialSvgIcon(id, size = 32) {
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
    case "twitter":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>`;
  }
}

const money = (n) => `S/ ${Number(n).toFixed(2)}`;

function findProductoUniversal(id) {
  const numId = Number(id);
  if (!numId) return null;
  return (state.productos || []).find((p) => p.id === numId) ||
         (state.carruselProductos || []).find((p) => p.id === numId) ||
         (state.destacados || []).find((p) => p.id === numId) || null;
}

const SIN_BACKEND_MSG =
  'No se pudo conectar con el servidor de Kernel SAC. Esta página necesita que el backend (Node + Express + SQLite) esté corriendo: abre una terminal en la carpeta del proyecto, ejecuta "npm start" y entra a http://localhost:3000 (no sirve abrir el archivo con Live Server ni con doble clic).';

async function fetchJSON(url, opts = {}) {
  let res;
  try {
    res = await fetch(url, { ...opts, credentials: "include" });
  } catch (netErr) {
    // Falla de red (servidor apagado, puerto equivocado, CORS, etc.)
    throw new Error(SIN_BACKEND_MSG);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    if (err) throw new Error(err.error || "Error de red");
    // Respuesta que no es JSON (p. ej. un 404 HTML de un servidor estático
    // que no tiene esta API) => casi siempre significa "no es el backend real".
    throw new Error(SIN_BACKEND_MSG);
  }
  return res.json();
}

// Carga categorías, métricas y ofertas desde la base de datos SQL y
// refresca la tienda con paginación de alto rendimiento.
async function loadCatalogo() {
  const [categorias, stats, carruselData, generalConfig, redesConfig, anunciosConfig, footerConfig, destacados] = await Promise.all([
    fetchJSON("/api/categorias"),
    fetchJSON("/api/stats").catch(() => null),
    fetchJSON("/api/carrusel").catch(() => null),
    fetchJSON("/api/configuraciones/general").catch(() => null),
    fetchJSON("/api/configuraciones/redes").catch(() => null),
    fetchJSON("/api/configuraciones/anuncios").catch(() => null),
    fetchJSON("/api/configuraciones/footer").catch(() => null),
    fetchJSON("/api/productos?destacado=1&limit=8").catch(() => []),
  ]);
  state.categorias = categorias || [];
  state.destacados = destacados || [];
  if (stats) {
    state.totalProductos = stats.totalProductos || 0;
    state.totalCategorias = stats.totalCategorias || (categorias ? categorias.length : 0);
  } else {
    state.totalProductos = 73;
    state.totalCategorias = (categorias ? categorias.length : 0);
  }
  if (carruselData) {
    state.carruselConfig = carruselData.config;
    state.carruselProductos = carruselData.productos;
  }
  if (generalConfig) {
    state.configGeneral = generalConfig;
    actualizarCanalesWhatsApp();
  }
  if (redesConfig) {
    state.configRedes = redesConfig;
  }
  if (anunciosConfig) {
    state.configAnuncios = anunciosConfig;
  }
  if (footerConfig) {
    state.configFooter = footerConfig;
  }

  renderStats();
  renderCategorias();
  renderMega();
  renderDestacados();
  renderFilterTabs();
  renderFooterCats();
  renderCarruselHero();
  if (typeof renderSocialCarousel === "function") {
    renderSocialCarousel();
  }
  if (typeof aplicarBarrasAnuncios === "function") {
    aplicarBarrasAnuncios(state.configAnuncios);
  }
  if (typeof aplicarConfigFooter === "function") {
    aplicarConfigFooter(state.configFooter);
  }

  await fetchCatalogoPaginado(1);

  // Actualizar vistas del panel admin únicamente si el panel admin está activo
  try {
    const adminView = document.getElementById("adminView");
    if (adminView && adminView.style.display === "block") {
      renderAdminStats();
      renderProductosAdmin();
      renderCarruselAdmin();
      renderCategoriasAdmin();
      fillCategoriaSelectAdmin();
      if (typeof renderRedesAdmin === "function") {
        renderRedesAdmin();
      }
      if (typeof renderAnunciosAdmin === "function") {
        renderAnunciosAdmin();
      }
    }
  } catch (adminErr) {
    console.warn("Actualización admin en segundo plano:", adminErr);
  }
}

function normalizarNumeroWa(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (/^9\d{8}$/.test(digits)) return "51" + digits;
  return digits;
}

function formatWhatsappDisplay(num) {
  const digits = normalizarNumeroWa(num);
  if (/^519\d{8}$/.test(digits)) {
    return `+51 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return digits ? `+${digits}` : "";
}

function actualizarCanalesWhatsApp() {
  const cfg = state.configGeneral || { whatsapp_ventas: "51967006922", whatsapp_soporte: "51939059976" };
  const vNum = normalizarNumeroWa(cfg.whatsapp_ventas || "51967006922") || "51967006922";
  const sNum = normalizarNumeroWa(cfg.whatsapp_soporte || "51939059976") || "51939059976";
  const vDisplayTxt = formatWhatsappDisplay(vNum);
  const sDisplayTxt = formatWhatsappDisplay(sNum);

  const vLink = document.getElementById("waVentasLink");
  if (vLink) vLink.href = `https://wa.me/${vNum}?text=${encodeURIComponent("Hola Área de Ventas Kernel SAC, deseo consultar sobre un producto")}`;
  const vDisplay = document.getElementById("waVentasNumDisplay");
  if (vDisplay) vDisplay.textContent = vDisplayTxt;

  const sLink = document.getElementById("waSoporteLink");
  if (sLink) sLink.href = `https://wa.me/${sNum}?text=${encodeURIComponent("Hola Soporte Técnico Kernel SAC, requiero asistencia técnica con un equipo")}`;
  const sDisplay = document.getElementById("waSoporteNumDisplay");
  if (sDisplay) sDisplay.textContent = sDisplayTxt;

  const hSupp = document.getElementById("headerSupportBtn");
  if (hSupp) hSupp.href = `https://wa.me/${sNum}?text=${encodeURIComponent("Hola Soporte Técnico Kernel SAC, requiero asistencia técnica con mi equipo")}`;

  const cWV = document.getElementById("chatWaVentasBtn");
  if (cWV) cWV.href = `https://wa.me/${vNum}?text=${encodeURIComponent("Hola Área de Ventas Kernel SAC, deseo hacer una consulta")}`;
  const cWS = document.getElementById("chatWaSoporteBtn");
  if (cWS) cWS.href = `https://wa.me/${sNum}?text=${encodeURIComponent("Hola Soporte Técnico Kernel SAC, requiero asistencia técnica")}`;

  const vPhones = document.getElementById("vCompanyPhones");
  if (vPhones) vPhones.textContent = `Ventas: ${vDisplayTxt} · Soporte Técnico: ${sDisplayTxt}`;

  const fWaV = document.getElementById("footerWaVentasLink");
  if (fWaV) fWaV.href = `https://wa.me/${vNum}?text=${encodeURIComponent("Hola Área de Ventas Kernel SAC, deseo hacer una consulta")}`;
  const fWaVLabel = document.getElementById("footerWaVentasLabel");
  if (fWaVLabel) fWaVLabel.textContent = `Ventas: ${vDisplayTxt}`;
  const fWaS = document.getElementById("footerWaSoporteLink");
  if (fWaS) fWaS.href = `https://wa.me/${sNum}?text=${encodeURIComponent("Hola Soporte Técnico Kernel SAC, requiero asistencia técnica")}`;

  const socialWa = document.getElementById("socialLinkWhatsApp");
  if (socialWa && (!socialWa.href || socialWa.href.includes("wa.me/"))) {
    socialWa.href = `https://wa.me/${vNum}`;
  }

  // Inputs y vista previa en el panel admin
  const inV = document.getElementById("cfgWaVentas");
  if (inV && document.activeElement !== inV) inV.value = vNum;
  const inS = document.getElementById("cfgWaSoporte");
  if (inS && document.activeElement !== inS) inS.value = sNum;

  const prevV = document.getElementById("previewWaVentasLink");
  if (prevV) prevV.href = `https://wa.me/${vNum}`;
  const prevS = document.getElementById("previewWaSoporteLink");
  if (prevS) prevS.href = `https://wa.me/${sNum}`;
}

function aplicarConfigFooter(cfg) {
  if (!cfg) return;
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== "") el.textContent = val;
  };
  setTxt("footerLogoSub", cfg.subtitulo_logo);
  setTxt("footerTagline", cfg.descripcion);
  setTxt("footerPayLabel", cfg.titulo_pagos);
  setTxt("footerSoporte1", cfg.soporte_item1);
  setTxt("footerSoporte2", cfg.soporte_item2);
  setTxt("footerSoporte3", cfg.soporte_item3);
  setTxt("footerSoporteWaTxt", cfg.soporte_wa_texto);
  setTxt("footerAddressTxt", cfg.direccion);
  setTxt("footerEmailTxt", cfg.correo);
  setTxt("footerHoursTxt", cfg.horario);
  setTxt("footerCopyrightTxt", cfg.copyright);
  setTxt("footerTrustPill", cfg.trust_texto);

  const emailLink = document.getElementById("footerEmailLink");
  if (emailLink && cfg.correo) {
    emailLink.href = `mailto:${cfg.correo}`;
  }

  const payWrap = document.getElementById("footerPaymentsList");
  if (payWrap && Array.isArray(cfg.metodos_pago)) {
    const classMap = {
      VISA: "pay-visa",
      MASTERCARD: "pay-mc",
      YAPE: "pay-yape",
      PLIN: "pay-plin",
    };
    payWrap.innerHTML = cfg.metodos_pago
      .map((m) => {
        const clean = String(m).trim().toUpperCase();
        const cls = classMap[clean] || "";
        return `<span class="pay-pill ${cls}">${clean.replace(/[<>&"]/g, "")}</span>`;
      })
      .join("");
  }
}
window.aplicarConfigFooter = aplicarConfigFooter;