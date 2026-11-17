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
};

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
  const [categorias, stats, carruselData, generalConfig, destacados] = await Promise.all([
    fetchJSON("/api/categorias"),
    fetchJSON("/api/stats").catch(() => null),
    fetchJSON("/api/carrusel").catch(() => null),
    fetchJSON("/api/configuraciones/general").catch(() => null),
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

  renderStats();
  renderCategorias();
  renderMega();
  renderDestacados();
  renderFilterTabs();
  renderFooterCats();
  renderCarruselHero();

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
    }
  } catch (adminErr) {
    console.warn("Actualización admin en segundo plano:", adminErr);
  }
}

function actualizarCanalesWhatsApp() {
  const cfg = state.configGeneral || { whatsapp_ventas: "51967006922", whatsapp_soporte: "51939059976" };
  const vNum = cfg.whatsapp_ventas || "51967006922";
  const sNum = cfg.whatsapp_soporte || "51939059976";

  const vLink = document.getElementById("waVentasLink");
  if (vLink) vLink.href = `https://wa.me/${vNum}?text=${encodeURIComponent("Hola Área de Ventas Kernel SAC, deseo consultar sobre un producto")}`;
  const vDisplay = document.getElementById("waVentasNumDisplay");
  if (vDisplay) vDisplay.textContent = `+51 967 006 922`;

  const sLink = document.getElementById("waSoporteLink");
  if (sLink) sLink.href = `https://wa.me/${sNum}?text=${encodeURIComponent("Hola Soporte Técnico Kernel SAC, requiero asistencia técnica con un equipo")}`;
  const sDisplay = document.getElementById("waSoporteNumDisplay");
  if (sDisplay) sDisplay.textContent = `+51 939 059 976`;

  const hSupp = document.getElementById("headerSupportBtn");
  if (hSupp) hSupp.href = `https://wa.me/${sNum}?text=${encodeURIComponent("Hola Soporte Técnico Kernel SAC, requiero asistencia técnica con mi equipo")}`;

  const cWV = document.getElementById("chatWaVentasBtn");
  if (cWV) cWV.href = `https://wa.me/${vNum}?text=${encodeURIComponent("Hola Área de Ventas Kernel SAC, deseo hacer una consulta")}`;
  const cWS = document.getElementById("chatWaSoporteBtn");
  if (cWS) cWS.href = `https://wa.me/${sNum}?text=${encodeURIComponent("Hola Soporte Técnico Kernel SAC, requiero asistencia técnica")}`;

  // Inputs en el panel admin
  const inV = document.getElementById("cfgWaVentas");
  if (inV && document.activeElement !== inV) inV.value = vNum;
  const inS = document.getElementById("cfgWaSoporte");
  if (inS && document.activeElement !== inS) inS.value = sNum;
}