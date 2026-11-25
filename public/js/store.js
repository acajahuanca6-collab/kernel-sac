// ================= IOS CAROUSEL =================
function initIosCarousel() {
  const track = document.getElementById("iosCarouselTrack");
  const prevBtn = document.getElementById("iosCarouselPrev");
  const nextBtn = document.getElementById("iosCarouselNext");
  const dotsContainer = document.getElementById("iosCarouselDots");
  if (!track) return;

  const slides = track.querySelectorAll(".ios-slide");
  const totalSlides = slides.length;
  let currentIndex = 0;
  let startX = 0;
  let isDragging = false;
  let currentTranslate = 0;
  let prevTranslate = 0;

  dotsContainer.innerHTML = Array.from({length: totalSlides}).map((_, i) => `<div class="ios-dot ${i===0?'active':''}" data-index="${i}"></div>`).join("");
  const dots = dotsContainer.querySelectorAll(".ios-dot");

  function updateCarousel() {
    const slideWidth = slides[0].getBoundingClientRect().width + 20;
    const trackWidth = track.parentElement.getBoundingClientRect().width;
    const visibleSlides = Math.floor(trackWidth / slideWidth) || 1;
    const maxIndex = Math.max(0, totalSlides - visibleSlides);
    
    if (currentIndex > maxIndex) currentIndex = maxIndex;
    if (currentIndex < 0) currentIndex = 0;

    currentTranslate = currentIndex * -slideWidth;
    prevTranslate = currentTranslate;
    track.style.transform = `translateX(${currentTranslate}px)`;

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
    });
  }

  nextBtn.addEventListener("click", () => { currentIndex++; updateCarousel(); });
  prevBtn.addEventListener("click", () => { currentIndex--; updateCarousel(); });

  dots.forEach(dot => {
    dot.addEventListener("click", (e) => {
      currentIndex = parseInt(e.target.dataset.index);
      updateCarousel();
    });
  });

  track.addEventListener("touchstart", dragStart, {passive: true});
  track.addEventListener("mousedown", dragStart);

  function dragStart(e) {
    isDragging = true;
    if (e.type === "touchstart") {
      startX = e.touches[0].clientX;
      window.addEventListener("touchmove", dragAction, {passive: true});
      window.addEventListener("touchend", dragEnd);
    } else {
      startX = e.clientX;
      window.addEventListener("mousemove", dragAction);
      window.addEventListener("mouseup", dragEnd);
    }
  }

  function dragAction(e) {
    if (!isDragging) return;
    const currentPosition = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
    const diff = currentPosition - startX;
    track.style.transform = `translateX(${prevTranslate + diff}px)`;
  }

  function dragEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    window.removeEventListener("mousemove", dragAction);
    window.removeEventListener("mouseup", dragEnd);
    window.removeEventListener("touchmove", dragAction);
    window.removeEventListener("touchend", dragEnd);
    const endPosition = e.type.startsWith("touch") ? (e.changedTouches?.[0]?.clientX ?? startX) : e.clientX;
    const diff = endPosition - startX;

    if (diff < -50) currentIndex++;
    if (diff > 50) currentIndex--;
    
    updateCarousel();
  }

  window.addEventListener("resize", updateCarousel);
  
  // Autoplay
  setInterval(() => {
    if(!isDragging){
      const slideWidth = slides[0].getBoundingClientRect().width + 20;
      const trackWidth = track.parentElement.getBoundingClientRect().width;
      const visibleSlides = Math.floor(trackWidth / slideWidth) || 1;
      const maxIndex = Math.max(0, totalSlides - visibleSlides);
      
      currentIndex++;
      if(currentIndex > maxIndex) currentIndex = 0;
      updateCarousel();
    }
  }, 4500);
}

function renderSocialCarousel() {
  const track = document.getElementById("socialCarouselTrack");
  const sectionTitle = document.querySelector("#socialCarouselSection .section-head h2");
  if (!track) return;

  const cfg = state.configRedes || {
    titulo_seccion: "Síguenos en nuestras redes",
    redes: [
      { id: "instagram", nombre: "Instagram", url: "https://instagram.com", descripcion: "Fotos de setups increíbles, unboxings y detrás de cámaras.", color: "#E1306C", activo: true },
      { id: "tiktok", nombre: "TikTok", url: "https://tiktok.com", descripcion: "Videos rápidos, tips de tecnología y memes de ensamble.", color: "#00f2fe", activo: true },
      { id: "youtube", nombre: "YouTube", url: "https://youtube.com", descripcion: "Reviews a fondo, tutoriales y guías de armado paso a paso.", color: "#FF0000", activo: true },
      { id: "facebook", nombre: "Facebook", url: "https://facebook.com", descripcion: "Únete a nuestra comunidad, mira transmisiones en vivo y sorteos.", color: "#1877F2", activo: true }
    ]
  };

  if (sectionTitle && cfg.titulo_seccion) {
    sectionTitle.textContent = cfg.titulo_seccion;
  }

  const activas = (cfg.redes || []).filter(r => r.activo !== false);
  if (activas.length === 0) {
    track.innerHTML = `<div class="empty-state" style="width:100%; padding:20px; text-align:center;">Próximamente nuevas redes sociales oficiales.</div>`;
    return;
  }

  track.innerHTML = activas.map(r => `
    <div class="ios-slide">
      <a href="${escapeHtml(r.url || '#')}" target="_blank" rel="noopener noreferrer" class="ios-glass-card" style="text-decoration:none; display:flex;">
        <div class="slide-icon" style="color:${r.color || '#fff'};">
          ${typeof getSocialSvgIcon === 'function' ? getSocialSvgIcon(r.id) : ''}
        </div>
        <div class="slide-content">
          <h3>${escapeHtml(r.nombre || '')}</h3>
          <p>${escapeHtml(r.descripcion || '')}</p>
        </div>
      </a>
    </div>
  `).join("");

  initSocialCarousel();
}
window.renderSocialCarousel = renderSocialCarousel;

function initSocialCarousel() {
  const track = document.getElementById("socialCarouselTrack");
  const prevBtn = document.getElementById("socialCarouselPrev");
  const nextBtn = document.getElementById("socialCarouselNext");
  const dotsContainer = document.getElementById("socialCarouselDots");
  if (!track) return;

  const slides = track.querySelectorAll(".ios-slide");
  const totalSlides = slides.length;
  if (!totalSlides) return;
  let currentIndex = 0;
  let startX = 0;
  let isDragging = false;
  let currentTranslate = 0;
  let prevTranslate = 0;

  dotsContainer.innerHTML = Array.from({length: totalSlides}).map((_, i) => `<div class="ios-dot ${i===0?'active':''}" data-index="${i}"></div>`).join("");
  const dots = dotsContainer.querySelectorAll(".ios-dot");

  function updateCarousel() {
    const slideWidth = slides[0].getBoundingClientRect().width + 20;
    const trackWidth = track.parentElement.getBoundingClientRect().width;
    const visibleSlides = Math.floor(trackWidth / slideWidth) || 1;
    const maxIndex = Math.max(0, totalSlides - visibleSlides);
    
    if (currentIndex > maxIndex) currentIndex = maxIndex;
    if (currentIndex < 0) currentIndex = 0;

    currentTranslate = currentIndex * -slideWidth;
    prevTranslate = currentTranslate;
    track.style.transform = `translateX(${currentTranslate}px)`;

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
    });
  }

  nextBtn.addEventListener("click", () => { currentIndex++; updateCarousel(); });
  prevBtn.addEventListener("click", () => { currentIndex--; updateCarousel(); });

  dots.forEach(dot => {
    dot.addEventListener("click", (e) => {
      currentIndex = parseInt(e.target.dataset.index);
      updateCarousel();
    });
  });

  track.addEventListener("touchstart", dragStart, {passive: true});
  track.addEventListener("mousedown", dragStart);

  function dragStart(e) {
    isDragging = true;
    if (e.type === "touchstart") {
      startX = e.touches[0].clientX;
      window.addEventListener("touchmove", dragAction, {passive: true});
      window.addEventListener("touchend", dragEnd);
    } else {
      startX = e.clientX;
      window.addEventListener("mousemove", dragAction);
      window.addEventListener("mouseup", dragEnd);
    }
  }

  function dragAction(e) {
    if (!isDragging) return;
    const currentPosition = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
    const diff = currentPosition - startX;
    track.style.transform = `translateX(${prevTranslate + diff}px)`;
  }

  function dragEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    window.removeEventListener("mousemove", dragAction);
    window.removeEventListener("mouseup", dragEnd);
    window.removeEventListener("touchmove", dragAction);
    window.removeEventListener("touchend", dragEnd);
    const endPosition = e.type.startsWith("touch") ? (e.changedTouches?.[0]?.clientX ?? startX) : e.clientX;
    const diff = endPosition - startX;

    if (diff < -50) currentIndex++;
    if (diff > 50) currentIndex--;
    
    updateCarousel();
  }

  window.addEventListener("resize", updateCarousel);
  
  setInterval(() => {
    if(!isDragging){
      const slideWidth = slides[0].getBoundingClientRect().width + 20;
      const trackWidth = track.parentElement.getBoundingClientRect().width;
      const visibleSlides = Math.floor(trackWidth / slideWidth) || 1;
      const maxIndex = Math.max(0, totalSlides - visibleSlides);
      
      currentIndex++;
      if(currentIndex > maxIndex) currentIndex = 0;
      updateCarousel();
    }
  }, 5500); // ligeramente diferente para asincronía
}

// ================= CARRUSEL HERO (ESTILO CURACAO & LIQUID GLASS) =================
let carruselHeroTimer = null;
let carruselCurrentIndex = 0;

function extraerSpecsPills(caracteristicas, categoria) {
  if (!caracteristicas) {
    return [categoria ? categoria.toUpperCase() : 'ALTA GAMA', 'GARANTÍA'];
  }
  const lineas = caracteristicas.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pills = [];

  for (const linea of lineas) {
    const mStorage = linea.match(/(\d+\s*(?:GB|TB))\s*(?:SSD|NVMe|Almacenamiento)?/i);
    const mRam = linea.match(/(\d+\s*GB)\s*(?:RAM|DDR\d)?/i);
    const mGpu = linea.match(/(RTX\s*\d{4}|GTX\s*\d{4}|Radeon\s*\w+|Intel\s*Iris)/i);
    const mCpu = linea.match(/(Core\s*i\d|Ryzen\s*\d|Apple\s*M\d|Celeron)/i);
    const mScreen = linea.match(/(\d+(\.\d+)?["”]|AMOLED|OLED|IPS|\d{3,4}Hz)/i);
    const mTech = linea.match(/(Wi-?Fi\s*\d?|Bluetooth\s*\d?|Tinta\s*Continua|CCTV|4K|Full\s*HD|Alexa|Inalámbrico|Infrarrojo|Dual\s*Band)/i);

    if (mStorage && !pills.some(p => p.includes('GB') || p.includes('TB'))) {
      pills.push(mStorage[1].toUpperCase() + (mStorage[0].toLowerCase().includes('tb') || mStorage[0].toLowerCase().includes('ssd') ? ' SSD' : ''));
    } else if (mRam && !pills.some(p => p.includes('RAM'))) {
      pills.push(mRam[1].toUpperCase() + ' RAM');
    } else if (mGpu && !pills.some(p => p.includes('RTX') || p.includes('GPU') || p.includes('Radeon'))) {
      pills.push(mGpu[1].toUpperCase());
    } else if (mCpu && !pills.some(p => p.includes('Core') || p.includes('Ryzen'))) {
      pills.push(mCpu[1]);
    } else if (mScreen && !pills.some(p => p.includes('OLED') || p.includes('AMOLED') || p.includes('Hz') || p.includes('"'))) {
      pills.push(mScreen[0].toUpperCase());
    } else if (mTech && !pills.some(p => p.includes('WI-FI') || p.includes('HD'))) {
      pills.push(mTech[0].toUpperCase());
    }
    if (pills.length >= 2) break;
  }

  // Si no se extrajeron specs de hardware, buscar términos tecnológicos clave
  if (!pills.length && lineas.length) {
    const primera = lineas[0];
    if (/tinta/i.test(primera)) pills.push('TINTA CONTINUA');
    else if (/alexa|asistente|smart/i.test(primera)) pills.push('ALEXA / SMART');
    else if (/wifi|inalámbrico|wireless/i.test(primera)) pills.push('CONEXIÓN WI-FI');
    else if (/seguridad|cámara|cctv/i.test(primera)) pills.push('SEGURIDAD CCTV');
    else if (/gamer|juego/i.test(primera)) pills.push('EDICIÓN GAMER');
    else {
      // Tomar palabras completas sin cortar letras a medias
      const palabras = primera.split(/\s+/);
      let limpio = "";
      for (const pal of palabras) {
        if ((limpio + " " + pal).trim().length <= 16) {
          limpio = (limpio + " " + pal).trim();
        } else break;
      }
      pills.push(limpio ? limpio.toUpperCase() : (categoria ? categoria.toUpperCase() : 'ORIGINAL'));
    }
  }

  if (!pills.length) {
    pills.push(categoria ? categoria.toUpperCase() : 'ORIGINAL');
  }
  return pills.slice(0, 2);
}

window.copiarCupon = function(codigo) {
  const code = codigo || "BCP200";
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).catch(() => {});
  }
  const badge = document.getElementById("curacaoCouponBadge");
  if (badge) {
    badge.classList.add("copied");
    const origHTML = badge.innerHTML;
    badge.innerHTML = `<span class="coupon-icon">✓</span> <span>¡CÓDIGO COPIADO!</span>`;
    setTimeout(() => {
      badge.classList.remove("copied");
      badge.innerHTML = origHTML;
    }, 2400);
  }
  mostrarToast(`Cupón "${code}" copiado al portapapeles. ¡Aprovéchalo al finalizar tu compra!`, "ok");
};

function renderCarruselHero() {
  const track = document.getElementById("curacaoSliderTrack");
  if (!track) return;
  const cfg = state.carruselConfig || {
    campana_titulo_1: "CYBER",
    campana_titulo_2: "WOW",
    campana_titulo: "CYBER WOW",
    campana_tag: "OFERTAS EXCLUSIVAS ⚡",
    campana_subtitulo: "OFERTAS EXCLUSIVAS DE TEMPORADA",
    cupon_codigo: "BCP200",
    cupon_texto: "Usa cupón: BCP200",
    mostrar_cupon: true,
    boton_texto: "Comprar Ahora",
    boton_accion: "#catalogo",
    tema_color: "magenta",
    auto_rotacion: true,
    segundos_rotacion: 5,
    mostrar_stats: true,
  };

  // Aplicar tema de color seleccionado en el contenedor master stage
  const masterStage = document.getElementById("curacaoMasterStage");
  if (masterStage) {
    masterStage.setAttribute("data-hero-theme", cfg.tema_color || "magenta");
  }

  // Actualizar textos de la izquierda
  const tagEl = document.getElementById("curacaoTagText");
  if (tagEl) tagEl.textContent = cfg.campana_tag || "OFERTAS EXCLUSIVAS ⚡";
  
  const titleEl = document.getElementById("curacaoTitle");
  const subEl = document.getElementById("curacaoSub");
  if (titleEl && subEl) {
    titleEl.textContent = cfg.campana_titulo_1 || "CYBER";
    subEl.textContent = cfg.campana_titulo_2 || "WOW";
  }

  const promoSubEl = document.getElementById("curacaoPromoSub");
  if (promoSubEl) promoSubEl.textContent = cfg.campana_subtitulo || "OFERTAS EXCLUSIVAS DE TEMPORADA";

  // Cupón interactivo con copiado de 1 clic
  const couponBadge = document.getElementById("curacaoCouponBadge");
  const couponTextEl = document.getElementById("curacaoCouponText");
  if (couponBadge) {
    if (cfg.mostrar_cupon !== false) {
      couponBadge.style.display = "inline-flex";
      const cuponCode = cfg.cupon_codigo || "BCP200";
      if (couponTextEl) {
        couponTextEl.innerHTML = cfg.cupon_texto ? `${cfg.cupon_texto}` : `Usa cupón: <strong>${cuponCode}</strong>`;
      }
      couponBadge.onclick = () => window.copiarCupon(cuponCode);
      couponBadge.title = "Haz clic para copiar el código";
    } else {
      couponBadge.style.display = "none";
    }
  }

  // Botón CTA
  const ctaBtn = document.getElementById("curacaoMainCta");
  if (ctaBtn) {
    const btnSpan = ctaBtn.querySelector("span");
    if (btnSpan) btnSpan.textContent = cfg.boton_texto || "Comprar Ahora";
    ctaBtn.href = cfg.boton_accion || "#catalogo";
  }

  // Mini stats
  const statsWrap = document.querySelector(".curacao-mini-stats");
  if (statsWrap) {
    statsWrap.style.display = cfg.mostrar_stats !== false ? "flex" : "none";
  }

  const productos = state.carruselProductos && state.carruselProductos.length
    ? state.carruselProductos
    : state.productos.slice(0, 8);

  if (!productos.length) {
    track.innerHTML = `<div style="padding:40px; color:#fff; text-align:center;">Cargando ofertas de temporada...</div>`;
    return;
  }

  // Generar productos con Liquid Glass, títulos de 2 líneas y pills limpios
  track.innerHTML = productos.map((p) => {
    const specs = extraerSpecsPills(p.caracteristicas, p.categoria);
    const specsHTML = specs.map(s => `<span class="stage-spec-pill" title="${s}">${s}</span>`).join("");
    
    const etiquetaTexto = p.etiqueta_promo || (p.destacado ? "TOP VENTAS" : "OFERTA");
    const giftHTML = `
      <div class="stage-gift-badge">
        <span class="stage-gift-tag">${etiquetaTexto}</span>
        ${p.regalo_nombre ? `<span class="stage-gift-name" title="${p.regalo_nombre}">INCLUYE: ${p.regalo_nombre}</span>` : ""}
      </div>
    `;

    const imgUrl = p.imagen_url || "/assets/honor-magic8.jpg";
    const anterior = p.precio_anterior || Math.round(p.precio * 1.25);
    const descuento = Math.max(5, Math.round((1 - p.precio / anterior) * 100));

    return `
      <div class="curacao-stage-item" data-prod-id="${p.id}">
        <div class="stage-item-top">
          <div class="stage-specs-column">
            ${specsHTML}
          </div>
          ${giftHTML}
        </div>

        <div class="stage-product-center">
          <div class="stage-contact-shadow"></div>
          <div class="stage-product-img-wrap">
            <img src="${imgUrl}" alt="${p.nombre}" class="stage-product-img" onerror="this.src='/assets/honor-magic8.jpg'" />
          </div>
        </div>

        <div class="stage-product-glass-bar">
          <div class="stage-product-title" title="${p.nombre}">${p.nombre}</div>
          <div class="stage-product-cat">${p.categoria || 'TECNOLOGÍA'}</div>

          <div class="stage-price-row">
            <div class="stage-price-main">
              <span class="stage-price-cur">s/</span>
              <span class="stage-price-amount">${Number(p.precio).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div class="stage-price-sub">
              <span class="stage-old-price">ANTES: S/ ${Number(anterior).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              <span class="stage-discount-tag">-${descuento}%</span>
            </div>
          </div>

          <div class="stage-card-actions">
            <button class="stage-btn-buy" onclick="window.comprarDirecto(${p.id}); event.stopPropagation();">
              Comprar
            </button>
            <button class="stage-btn-cart" onclick="window.agregarAlCarritoRapido(${p.id}); event.stopPropagation();" title="Añadir al carrito">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Clic en la tarjeta abre el detalle del producto
  track.querySelectorAll(".curacao-stage-item").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.prodId);
      const prod = findProductoUniversal(id);
      if (prod) openDetalleModal(prod);
    });
  });

  setupCarruselNavigation(productos.length);
}

function setupCarruselNavigation(totalCards) {
  const track = document.getElementById("curacaoSliderTrack");
  const viewport = document.getElementById("curacaoSliderViewport");
  const prevBtn = document.getElementById("heroPrevBtn");
  const nextBtn = document.getElementById("heroNextBtn");
  const dotsContainer = document.getElementById("heroPagination");
  if (!track || !viewport) return;

  const cards = track.querySelectorAll(".curacao-stage-item");
  if (!cards.length) return;

  function getStepParams() {
    const vWidth = viewport.getBoundingClientRect().width;
    const gap = 16;
    // Mostrar 3 tarjetas exactas en pantallas medianas y grandes, 2 en intermedias, 1 en móvil
    const visibleCards = vWidth > 720 ? 3 : (vWidth > 460 ? 2 : 1);
    const cardWidth = Math.max(180, Math.floor((vWidth - (gap * (visibleCards - 1))) / visibleCards));

    // Ajustar a cada tarjeta su ancho dinámico para cubrir 100% el viewport con total claridad
    cards.forEach((card) => {
      card.style.flex = `0 0 ${cardWidth}px`;
      card.style.width = `${cardWidth}px`;
      card.style.minWidth = `${cardWidth}px`;
      card.style.maxWidth = `${cardWidth}px`;
    });

    const maxIndex = Math.max(0, cards.length - visibleCards);
    return { cardWidth, gap, visibleCards, maxIndex };
  }

  function renderDots() {
    const { maxIndex } = getStepParams();
    const totalDots = maxIndex + 1;
    if (dotsContainer) {
      dotsContainer.innerHTML = Array.from({ length: totalDots }).map((_, i) =>
        `<div class="curacao-dot ${i === carruselCurrentIndex ? 'active' : ''}" data-idx="${i}"></div>`
      ).join("");

      dotsContainer.querySelectorAll(".curacao-dot").forEach((dot) => {
        dot.addEventListener("click", () => {
          goToSlide(parseInt(dot.dataset.idx, 10));
          reiniciarAutoRotacion();
        });
      });
    }
  }

  renderDots();

  function goToSlide(index) {
    const { cardWidth, gap, maxIndex: mIdx } = getStepParams();
    carruselCurrentIndex = Math.max(0, Math.min(index, mIdx));
    const offset = carruselCurrentIndex * (cardWidth + gap);
    track.style.transform = `translateX(-${offset}px)`;

    if (dotsContainer) {
      dotsContainer.querySelectorAll(".curacao-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === carruselCurrentIndex);
      });
    }
  }

  function nextSlide() {
    const { maxIndex: mIdx } = getStepParams();
    if (carruselCurrentIndex >= mIdx) {
      goToSlide(0);
    } else {
      goToSlide(carruselCurrentIndex + 1);
    }
  }

  function prevSlide() {
    const { maxIndex: mIdx } = getStepParams();
    if (carruselCurrentIndex <= 0) {
      goToSlide(mIdx);
    } else {
      goToSlide(carruselCurrentIndex - 1);
    }
  }

  // Event listener para redimensionamiento de pantalla
  if (window._curacaoResizeHandler) {
    window.removeEventListener("resize", window._curacaoResizeHandler);
  }
  window._curacaoResizeHandler = () => {
    getStepParams();
    renderDots();
    goToSlide(carruselCurrentIndex);
  };
  window.addEventListener("resize", window._curacaoResizeHandler);

  nextBtn?.replaceWith(nextBtn.cloneNode(true));
  prevBtn?.replaceWith(prevBtn.cloneNode(true));

  const newNextBtn = document.getElementById("heroNextBtn");
  const newPrevBtn = document.getElementById("heroPrevBtn");

  newNextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    nextSlide();
    reiniciarAutoRotacion();
  });

  newPrevBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    prevSlide();
    reiniciarAutoRotacion();
  });

  // Touch Swipe para móviles
  let startX = 0;
  let isSwiping = false;

  viewport.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    isSwiping = true;
    pausarAutoRotacion();
  }, { passive: true });

  viewport.addEventListener("touchend", (e) => {
    if (!isSwiping) return;
    isSwiping = false;
    const diff = startX - e.changedTouches[0].clientX;
    if (diff > 40) {
      nextSlide();
    } else if (diff < -40) {
      prevSlide();
    }
    reiniciarAutoRotacion();
  });

  function pausarAutoRotacion() {
    if (carruselHeroTimer) {
      clearInterval(carruselHeroTimer);
      carruselHeroTimer = null;
    }
  }

  function reiniciarAutoRotacion() {
    pausarAutoRotacion();
    const cfg = state.carruselConfig || {};
    if (cfg.auto_rotacion !== false) {
      const segs = (Number(cfg.segundos_rotacion) || 5) * 1000;
      carruselHeroTimer = setInterval(nextSlide, segs);
    }
  }

  viewport.addEventListener("mouseenter", pausarAutoRotacion);
  viewport.addEventListener("mouseleave", reiniciarAutoRotacion);

  window.addEventListener("resize", () => {
    goToSlide(carruselCurrentIndex);
  });

  reiniciarAutoRotacion();

  // Conectar botón principal "Comprar Ahora" del Hero para comprar el producto exhibido
  const heroMainCta = document.getElementById("curacaoMainCta");
  if (heroMainCta) {
    heroMainCta.onclick = (e) => {
      e.preventDefault();
      const list = (state.carruselProductos && state.carruselProductos.length)
        ? state.carruselProductos
        : (state.productos || []).slice(0, 8);
      const activeProd = list[carruselCurrentIndex] || list[0];
      if (activeProd) {
        window.comprarDirecto(activeProd.id);
      } else {
        document.querySelector("#catalogo")?.scrollIntoView({ behavior: "smooth" });
      }
    };
  }
}

window.comprarDirecto = function(id) {
  const numId = Number(id);
  const p = findProductoUniversal(numId);
  addToCart(numId);
  mostrarToast(p ? `Comprando: ${p.nombre}` : "Producto añadido al pedido");
  setTimeout(() => {
    openCart();
    const checkoutBtn = document.getElementById("checkoutBtn");
    const checkoutForm = document.getElementById("checkoutForm");
    if (checkoutForm && checkoutBtn) {
      if (state.usuario && state.usuario.nombre) {
        const cName = document.getElementById("cName");
        if (cName) cName.value = state.usuario.nombre;
      }
      checkoutForm.classList.add("open");
      checkoutBtn.style.display = "none";
      const nameInput = document.getElementById("cName");
      if (nameInput) nameInput.focus();
    }
  }, 120);
};

window.agregarAlCarritoRapido = function(id) {
  const numId = Number(id);
  const p = findProductoUniversal(numId);
  addToCart(numId);
  mostrarToast(p ? `${p.nombre} añadido al carrito` : "Producto añadido al carrito");
};

function mostrarToast(mensaje, tipo = "ok") {
  let toast = document.getElementById("curacaoToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "curacaoToast";
    document.body.appendChild(toast);
  }
  let bg = "linear-gradient(135deg, #10b981, #059669)";
  let shadow = "0 10px 30px rgba(16, 185, 129, 0.4)";
  let icon = "✓";
  if (tipo === "err" || tipo === "error") {
    bg = "linear-gradient(135deg, #ef4444, #b91c1c)";
    shadow = "0 10px 30px rgba(239, 68, 68, 0.4)";
    icon = "✕";
  } else if (tipo === "info") {
    bg = "linear-gradient(135deg, #3b82f6, #1d4ed8)";
    shadow = "0 10px 30px rgba(59, 130, 246, 0.4)";
    icon = "ℹ";
  } else if (tipo === "cart") {
    bg = "linear-gradient(135deg, #ff2d67, #ff5c8a)";
    shadow = "0 10px 30px rgba(255, 45, 103, 0.45)";
    icon = "🛒";
  }
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${bg};
    color: #fff;
    padding: 12px 22px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.88rem;
    box-shadow: ${shadow};
    z-index: 99999;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  `;
  toast.innerHTML = `<span style="font-weight:900;">${icon}</span> <span>${mensaje}</span>`;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
  }, 2800);
}

// ================= CATEGORÍAS (BENTO GRID FUTURISTA) =================
const BENTO_CONFIGS = {
  "laptops-pcs": {
    layoutClass: "bento-hero",
    badge: "ALTO RENDIMIENTO",
    pillClass: "pill-crimson",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(225, 29, 72, 0.42), transparent 65%)",
    description: "Laptops gamer, ultrabooks y estaciones de trabajo ensambladas con componentes de última generación."
  },
  "componentes-pc": {
    layoutClass: "bento-wide",
    badge: "HARDWARE & GPUS",
    pillClass: "pill-cyan",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(0, 180, 220, 0.38), transparent 65%)",
    description: "Tarjetas de video RTX, procesadores Intel/Ryzen, placas madre y fuentes modulares 80+."
  },
  "videovigilancia": {
    layoutClass: "bento-standard",
    badge: "CCTV PROFESIONAL",
    pillClass: "pill-gold",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(234, 179, 8, 0.36), transparent 65%)",
    description: "Cámaras de seguridad IP, DVRs y monitoreo en tiempo real."
  },
  "redes": {
    layoutClass: "bento-standard",
    badge: "WI-FI 6 & FIBRA",
    pillClass: "pill-cyan",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(0, 180, 220, 0.35), transparent 65%)",
    description: "Routers de alta velocidad, switches gigabit y fibra."
  },
  "smart-home": {
    layoutClass: "bento-wide",
    badge: "DOMÓTICA & AUDIO",
    pillClass: "pill-purple",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.38), transparent 65%)",
    description: "Asistentes de voz Alexa/Google, iluminación inteligente y sensores conectados para el hogar."
  },
  "monitores": {
    layoutClass: "bento-standard",
    badge: "144Hz & IPS",
    pillClass: "pill-cyan",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(0, 180, 220, 0.32), transparent 65%)",
    description: "Monitores gaming y paneles profesionales calibrados."
  },
  "hardware": {
    layoutClass: "bento-standard",
    badge: "SSD & NVMe",
    pillClass: "pill-crimson",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(225, 29, 72, 0.35), transparent 65%)",
    description: "Almacenamiento NVMe ultrarrápido y módulos de memoria RAM."
  },
  "impresoras": {
    layoutClass: "bento-standard",
    badge: "TINTA CONTINUA",
    pillClass: "pill-gold",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(234, 179, 8, 0.35), transparent 65%)",
    description: "Multifuncionales Wi-Fi de alto rendimiento para oficina y hogar."
  },
  "accesorios": {
    layoutClass: "bento-standard",
    badge: "PERIFÉRICOS & SETUP",
    pillClass: "pill-crimson",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(225, 29, 72, 0.35), transparent 65%)",
    description: "Headsets 7.1, teclados mecánicos, mouses pro y pads."
  },
  "cables": {
    layoutClass: "bento-standard",
    badge: "8K & ULTRA SPEED",
    pillClass: "pill-cyan",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(0, 180, 220, 0.32), transparent 65%)",
    description: "Cables HDMI 2.1, DisplayPort y redes blindadas."
  },
  "adaptadores": {
    layoutClass: "bento-standard",
    badge: "DOCKS & HUBS USB-C",
    pillClass: "pill-purple",
    accentGradient: "radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.35), transparent 65%)",
    description: "Docks multipuerto, convertidores y conexiones universales."
  }
};

const BENTO_ORDER = [
  "laptops-pcs",
  "componentes-pc",
  "videovigilancia",
  "redes",
  "smart-home",
  "monitores",
  "hardware",
  "impresoras",
  "accesorios",
  "cables",
  "adaptadores"
];

function renderCategorias() {
  const el = document.getElementById("catStrip");
  if (!el) return;

  const sorted = [...state.categorias].sort((a, b) => {
    const idxA = BENTO_ORDER.indexOf(a.slug);
    const idxB = BENTO_ORDER.indexOf(b.slug);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.nombre.localeCompare(b.nombre);
  });

  el.className = "bento-cat-grid";
  el.innerHTML = sorted.map((c) => {
    const cfg = BENTO_CONFIGS[c.slug] || {
      layoutClass: "bento-standard",
      badge: `${c.total_productos} productos`,
      pillClass: "count-pill",
      accentGradient: "radial-gradient(circle at 80% 20%, rgba(255, 45, 85, 0.18), transparent 70%)",
      description: "Equipos y componentes garantizados."
    };
    const isActive = state.categoriaActiva === c.slug;

    return `
    <div class="bento-tile cat-card ${cfg.layoutClass} ${isActive ? "active" : ""}" data-slug="${c.slug}">
      <div class="bento-aura" style="background:${cfg.accentGradient}"></div>
      <div class="bento-watermark">${getIcon(c.icono)}</div>

      <div class="bento-top">
        <div class="bento-icon-badge">${getIcon(c.icono)}</div>
        <span class="bento-pill ${cfg.pillClass}">${cfg.badge}</span>
      </div>

      <div class="bento-body">
        <h3 class="bento-title">${c.nombre}</h3>
        <p class="bento-desc">${cfg.description}</p>
      </div>

      <div class="bento-foot">
        <span class="bento-count-label">${c.total_productos} productos</span>
        <span class="bento-action-arrow">
          <span>Ver catálogo</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
      </div>
    </div>`;
  }).join("");

  el.querySelectorAll(".bento-tile").forEach((card) => {
    card.addEventListener("click", () => {
      setCategoriaActiva(card.dataset.slug);
      const catEl = document.getElementById("catalogo");
      if (catEl) catEl.scrollIntoView({ behavior: "smooth" });
    });
  });
}

function renderMega() {
  document.getElementById("megaCategorias").innerHTML = state.categorias
    .map((c) => `<a href="#catalogo" data-slug="${c.slug}">${c.nombre} (${c.total_productos})</a>`).join("");
  document.querySelectorAll("#megaCategorias a").forEach((a) =>
    a.addEventListener("click", () => setCategoriaActiva(a.dataset.slug))
  );

  // Mismas categorías, en el menú móvil.
  const mobileCats = document.getElementById("mobileCategorias");
  if (mobileCats) {
    mobileCats.innerHTML = state.categorias
      .map((c) => `<a href="#catalogo" data-slug="${c.slug}">${c.nombre} (${c.total_productos})</a>`).join("");
    mobileCats.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => { setCategoriaActiva(a.dataset.slug); closeMobileNav(); })
    );
  }
}

// ================= MENÚ MÓVIL (hamburguesa) =================
function closeMobileNav() {
  const panel = document.getElementById("mobileNavPanel");
  const btn = document.getElementById("mobileMenuBtn");
  panel.classList.remove("open");
  btn.classList.remove("open");
  document.getElementById("mobileMenuIconOpen").style.display = "block";
  document.getElementById("mobileMenuIconClose").style.display = "none";
}
(function initMobileNav() {
  const btn = document.getElementById("mobileMenuBtn");
  const panel = document.getElementById("mobileNavPanel");
  const iconOpen = document.getElementById("mobileMenuIconOpen");
  const iconClose = document.getElementById("mobileMenuIconClose");
  btn.addEventListener("click", () => {
    const abierto = panel.classList.toggle("open");
    iconOpen.style.display = abierto ? "none" : "block";
    iconClose.style.display = abierto ? "block" : "none";
  });
  panel.querySelectorAll("a:not(.mobile-cats a)").forEach((a) => a.addEventListener("click", closeMobileNav));

  // El buscador del menú móvil refleja y dispara el mismo buscador de escritorio.
  const mobileSearch = document.getElementById("mobileSearchInput");
  const desktopSearch = document.getElementById("searchInput");
  mobileSearch.addEventListener("input", () => {
    desktopSearch.value = mobileSearch.value;
    renderCatalogo();
  });
})();

function renderFooterCats() {
  document.getElementById("footerCats").innerHTML = state.categorias
    .map((c) => `<li><a href="#catalogo" data-slug="${c.slug}">${c.nombre}</a></li>`).join("");
  document.querySelectorAll("#footerCats a").forEach((a) =>
    a.addEventListener("click", () => setCategoriaActiva(a.dataset.slug))
  );
}

// ================= DESTACADOS =================
function renderDestacados() {
  const destacados = state.destacados && state.destacados.length
    ? state.destacados
    : (state.productos ? state.productos.filter((p) => p.destacado) : []);
  const countEl = document.getElementById("destacadosCount");
  if (countEl) countEl.textContent = `${destacados.length} productos`;
  const grid = document.getElementById("destacadosGrid");
  if (grid) {
    grid.innerHTML = destacados.map(productCardHTML).join("");
    bindAddButtons(grid);
  }
}

// ================= FILTROS / CATÁLOGO PAGINADO (SOPORTA 70K+ PRODUCTOS) =================
function renderFilterTabs() {
  const el = document.getElementById("filterTabs");
  const tabs = [{ slug: "", nombre: "Todos" }, ...state.categorias.map((c) => ({ slug: c.slug, nombre: c.nombre }))];
  el.innerHTML = tabs
    .map((t) => `<button data-cat="${t.slug}" class="${t.slug === state.categoriaActiva ? "active" : ""}">${t.nombre}</button>`)
    .join("");
  el.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", () => setCategoriaActiva(btn.dataset.cat))
  );
}

function setCategoriaActiva(slug) {
  state.categoriaActiva = slug;
  document.querySelectorAll(".bento-tile, .cat-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.slug === slug);
  });
  renderFilterTabs();
  fetchCatalogoPaginado(1);
}

async function fetchCatalogoPaginado(pagina = 1) {
  state.paginaActual = pagina;
  const searchInput = document.getElementById("searchInput");
  const minPriceEl = document.getElementById("minPrice");
  const maxPriceEl = document.getElementById("maxPrice");

  const q = searchInput ? searchInput.value.trim() : "";
  const minP = minPriceEl && minPriceEl.value !== "" ? parseFloat(minPriceEl.value) : null;
  const maxP = maxPriceEl && maxPriceEl.value !== "" ? parseFloat(maxPriceEl.value) : null;

  const params = new URLSearchParams({
    paginado: "1",
    page: String(pagina),
    limit: String(state.porPagina),
  });
  if (state.categoriaActiva) params.set("categoria", state.categoriaActiva);
  if (q) params.set("buscar", q);
  if (minP != null && !isNaN(minP)) params.set("min_precio", String(minP));
  if (maxP != null && !isNaN(maxP)) params.set("max_precio", String(maxP));

  try {
    const data = await fetchJSON(`/api/productos?${params.toString()}`);
    state.productos = data.productos || [];
    state.totalFiltrados = data.total;
    state.totalPaginas = data.totalPaginas;
    renderCatalogo(data);
  } catch (err) {
    console.error("Error al consultar página del catálogo:", err);
  }
}

function renderCatalogo(data) {
  const grid = document.getElementById("catalogoGrid");
  const countEl = document.getElementById("catalogoCount");
  const total = data ? data.total : (state.totalFiltrados != null ? state.totalFiltrados : state.productos.length);
  const pagina = data ? data.pagina : state.paginaActual;
  const porPagina = data ? data.porPagina : state.porPagina;
  const totalPaginas = data ? data.totalPaginas : state.totalPaginas;

  if (countEl) countEl.textContent = `${total.toLocaleString('es-PE')} productos`;

  if (grid) {
    grid.innerHTML = state.productos.length
      ? state.productos.map(productCardHTML).join("")
      : `<div style="grid-column: 1/-1; padding: 48px 20px; text-align: center; color: var(--text-dim);">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">🔍</div>
          <strong style="color: var(--text); font-size: 1.1rem; display: block;">No se encontraron productos</strong>
          <p style="font-size: 0.88rem; margin-top: 6px;">Prueba ajustando la búsqueda o seleccionando otra categoría.</p>
        </div>`;
    bindAddButtons(grid);
  }

  renderPaginador(total, pagina, porPagina, totalPaginas);

  // Ocultar otras secciones si el usuario está buscando o filtrando activamente
  const searchInput = document.getElementById("searchInput");
  const minPriceEl = document.getElementById("minPrice");
  const maxPriceEl = document.getElementById("maxPrice");
  const q = searchInput ? searchInput.value.trim() : "";
  const minP = minPriceEl && minPriceEl.value !== "" ? parseFloat(minPriceEl.value) : NaN;
  const maxP = maxPriceEl && maxPriceEl.value !== "" ? parseFloat(maxPriceEl.value) : NaN;
  const isFiltering = q.length > 0 || state.categoriaActiva || !isNaN(minP) || !isNaN(maxP);

  const heroEl = document.querySelector(".hero");
  const heroCarouselEl = document.getElementById("heroCarouselSection");
  const carouselSectionEl = document.getElementById("infoCarouselSection");
  const destacadosEl = document.getElementById("destacados");
  const catsSectionEl = document.getElementById("catStrip")?.closest(".section");
  const socialCarouselSectionEl = document.getElementById("socialCarouselSection");
  
  if (heroEl) heroEl.style.display = isFiltering ? "none" : "";
  if (heroCarouselEl) heroCarouselEl.style.display = isFiltering ? "none" : "";
  if (carouselSectionEl) carouselSectionEl.style.display = isFiltering ? "none" : "";
  if (destacadosEl) destacadosEl.style.display = isFiltering ? "none" : "";
  if (catsSectionEl) catsSectionEl.style.display = isFiltering ? "none" : "";
  if (socialCarouselSectionEl) socialCarouselSectionEl.style.display = isFiltering ? "none" : "";
}

function renderPaginador(total, pagina, porPagina, totalPaginas) {
  const wrap = document.getElementById("catalogoPaginationWrap");
  const infoEl = document.getElementById("catalogoPaginationInfo");
  const btnsEl = document.getElementById("catalogoPaginationButtons");
  if (!wrap || !btnsEl) return;

  if (total <= porPagina) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "flex";

  const inicio = total > 0 ? (pagina - 1) * porPagina + 1 : 0;
  const fin = Math.min(total, pagina * porPagina);
  if (infoEl) {
    infoEl.textContent = `Mostrando ${inicio.toLocaleString('es-PE')} - ${fin.toLocaleString('es-PE')} de ${total.toLocaleString('es-PE')} productos`;
  }

  let html = "";
  // Botón Anterior
  html += `<button class="page-btn" ${pagina <= 1 ? "disabled" : ""} onclick="cambiarPaginaCatalogo(${pagina - 1})" title="Página anterior">«</button>`;

  // Algoritmo de ventanas de páginas (ej: 1, 2, ..., 15, 16, 17, ..., 2916)
  const delta = 2;
  const range = [];
  for (let i = Math.max(2, pagina - delta); i <= Math.min(totalPaginas - 1, pagina + delta); i++) {
    range.push(i);
  }

  // Página 1 siempre
  html += `<button class="page-btn ${pagina === 1 ? "active" : ""}" onclick="cambiarPaginaCatalogo(1)">1</button>`;

  if (range.length && range[0] > 2) {
    html += `<span class="page-dots">...</span>`;
  }

  range.forEach((p) => {
    html += `<button class="page-btn ${pagina === p ? "active" : ""}" onclick="cambiarPaginaCatalogo(${p})">${p}</button>`;
  });

  if (range.length && range[range.length - 1] < totalPaginas - 1) {
    html += `<span class="page-dots">...</span>`;
  }

  // Última página
  if (totalPaginas > 1) {
    html += `<button class="page-btn ${pagina === totalPaginas ? "active" : ""}" onclick="cambiarPaginaCatalogo(${totalPaginas})">${totalPaginas}</button>`;
  }

  // Botón Siguiente
  html += `<button class="page-btn" ${pagina >= totalPaginas ? "disabled" : ""} onclick="cambiarPaginaCatalogo(${pagina + 1})" title="Página siguiente">»</button>`;

  btnsEl.innerHTML = html;
}

window.cambiarPaginaCatalogo = function(pag) {
  fetchCatalogoPaginado(pag);
  const catSec = document.getElementById("catalogo");
  if (catSec) {
    catSec.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

let searchDebounceTimer = null;
const handleSearchDebounced = () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    fetchCatalogoPaginado(1);
  }, 250);
};

document.getElementById("searchInput")?.addEventListener("input", handleSearchDebounced);
document.getElementById("searchInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    fetchCatalogoPaginado(1);
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
  }
});

const mobSearch = document.getElementById("mobileSearchInput");
if (mobSearch) {
  mobSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchCatalogoPaginado(1);
      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
      if (typeof closeMobileNav === "function") closeMobileNav();
    }
  });
}

document.getElementById("applyPriceFilterBtn")?.addEventListener("click", () => {
  document.getElementById("clearPriceFilterBtn").style.display = "inline-flex";
  fetchCatalogoPaginado(1);
});
document.getElementById("clearPriceFilterBtn")?.addEventListener("click", () => {
  document.getElementById("minPrice").value = "";
  document.getElementById("maxPrice").value = "";
  document.getElementById("clearPriceFilterBtn").style.display = "none";
  fetchCatalogoPaginado(1);
});

// ================= TARJETA DE PRODUCTO =================
function productCardHTML(p) {
  const lowStock = p.stock > 0 && p.stock <= 5;
  const outOfStock = p.stock <= 0;
  const isDestacado = Boolean(p.destacado);
  const anterior = p.precio_anterior || (isDestacado ? Math.round(p.precio * 1.3) : (p.precio >= 200 ? Math.round(p.precio * 1.25) : null));
  const descuento = anterior ? Math.max(5, Math.round((1 - p.precio / anterior) * 100)) : 0;
  const etiqueta = p.etiqueta_promo || (descuento >= 15 ? `-${descuento}% BOOM` : (isDestacado ? 'OFERTA' : ''));

  return `
  <div class="product-card" data-view="${p.id}">
    ${etiqueta ? `<span class="boom-badge">🔥 ${etiqueta}</span>` : (isDestacado ? `<span class="badge">DESTACADO</span>` : "")}
    <div class="product-icon">${mediaHTML(p)}</div>
    <div class="product-cat">${p.categoria}</div>
    <h3>${p.nombre}</h3>
    ${p.regalo_nombre ? `<div class="gift-tag">🎁 Incluye: ${p.regalo_nombre}</div>` : ''}
    <p class="product-desc">${p.descripcion || ""}</p>
    <div class="product-foot">
      <div>
        ${anterior ? `<div class="old-price">${money(anterior)}</div>` : ''}
        <div class="price">${money(p.precio)}</div>
        <div class="stock-tag ${lowStock ? "low" : ""}">${outOfStock ? "Sin stock" : `Stock: ${p.stock}`}</div>
      </div>
      <button class="add-btn" data-id="${p.id}" ${outOfStock ? "disabled" : ""} title="Agregar al carrito">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>
  </div>`;
}

function bindAddButtons(scope) {
  scope.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); addToCart(Number(btn.dataset.id)); });
  });
  scope.querySelectorAll("[data-view]").forEach((card) => {
    card.addEventListener("click", () => openDetalleModal(Number(card.dataset.view)));
  });
}

// ================= MODAL DETALLE DE PRODUCTO (tienda) =================
const detalleOverlay = document.getElementById("detalleModalOverlay");
document.getElementById("detalleModalClose").addEventListener("click", () => detalleOverlay.classList.remove("open"));
detalleOverlay.addEventListener("click", (e) => { if (e.target === detalleOverlay) detalleOverlay.classList.remove("open"); });

async function openDetalleModal(id) {
  let p = (state.productos || []).find((x) => x.id === id) ||
          (state.destacados || []).find((x) => x.id === id) ||
          (state.carruselProductos || []).find((x) => x.id === id);
  if (!p) {
    try {
      p = await fetchJSON(`/api/productos/${id}`);
    } catch (e) {
      console.warn("No se pudo cargar el producto:", e);
      return;
    }
  }
  if (!p) return;

  document.getElementById("detalleIcon").innerHTML = mediaHTML(p);
  document.getElementById("detalleCat").textContent = p.categoria;
  document.getElementById("detalleNombre").textContent = p.nombre;
  document.getElementById("detallePrecio").textContent = money(p.precio);

  const outOfStock = p.stock <= 0;
  const lowStock = p.stock > 0 && p.stock <= 5;
  const stockEl = document.getElementById("detalleStock");
  stockEl.textContent = outOfStock ? "Sin stock" : `Stock: ${p.stock}`;
  stockEl.className = `stock-tag ${lowStock ? "low" : ""}`;

  document.getElementById("detalleDesc").textContent = p.descripcion || "Sin descripción adicional.";

  const caracList = (p.caracteristicas || "").split("\n").map((c) => c.trim()).filter(Boolean);
  const wrap = document.getElementById("detalleCaracWrap");
  const listEl = document.getElementById("detalleCaracList");
  if (caracList.length) {
    wrap.style.display = "block";
    listEl.innerHTML = caracList.map((c) => `
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span>${c}</span></li>
    `).join("");
  } else {
    wrap.style.display = "none";
  }

  const addBtn = document.getElementById("detalleAddBtn");
  addBtn.disabled = outOfStock;
  addBtn.textContent = outOfStock ? "Sin stock" : "Agregar al carrito";
  addBtn.onclick = () => { addToCart(p.id); detalleOverlay.classList.remove("open"); };

  detalleOverlay.classList.add("open");
}