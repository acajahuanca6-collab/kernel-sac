// ================= ICONOS SVG =================
const ICONS = {
  cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>`,
  ram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="7" width="16" height="10" rx="1"/><path d="M8 7v3M12 7v3M16 7v3M7 17v2M11 17v2M15 17v2"/></svg>`,
  psu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="5" width="16" height="14" rx="1"/><circle cx="9" cy="12" r="2.4"/><path d="M14 9h3M14 12h3M14 15h2"/></svg>`,
  fan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="2"/><path d="M12 10c0-3 1-6 4-6s2 4-1 6M12 14c0 3-1 6-4 6s-2-4 1-6M14 12c3 0 6 1 6 4s-4 2-6-1M10 12c-3 0-6-1-6-4s4-2 6 1"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M6.5 10h.01M9.5 10h.01M12.5 10h.01M15.5 10h.01M6.5 13h.01M9.5 13h11v0"/></svg>`,
  router: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="11" width="18" height="7" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3M7 15h.01M11 15h.01"/></svg>`,
  switch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="8" width="18" height="8" rx="1"/><path d="M6 12h.01M9 12h.01M12 12h.01M15 12h.01M18 12h.01"/></svg>`,
  antenna: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 22V10M7 6a7 7 0 0 1 10 0M4 3a11 11 0 0 1 16 0"/><circle cx="12" cy="8" r="2"/></svg>`,
  tool: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2Z"/></svg>`,
  cable: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3v4a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V3M9 10v4M15 10v4M6 21v-4a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v4"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13.5" r="3.3"/></svg>`,
  dvr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="10" rx="1"/><circle cx="7.5" cy="12" r="1.4"/><path d="M11 10h7M11 14h5"/></svg>`,
  kit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="8" height="8" rx="1"/><rect x="13" y="4" width="8" height="8" rx="1"/><rect x="3" y="14" width="8" height="6" rx="1"/><rect x="13" y="14" width="8" height="6" rx="1"/></svg>`,
  headset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="6" rx="1"/><rect x="17" y="13" width="4" height="6" rx="1"/><path d="M20 19a4 4 0 0 1-4 4h-2"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M9 22h6"/></svg>`,
  mouse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 3v6"/></svg>`,
  padmouse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>`,
  blower: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12a8 8 0 1 1 8 8"/><path d="M12 20h6l-3-3M12 20l0 0"/><circle cx="4" cy="12" r="1"/></svg>`,
  hdd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="10" rx="1.5"/><circle cx="8" cy="12" r="1.6"/><path d="M13 10h5M13 14h3"/></svg>`,
  ssd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="8" width="16" height="8" rx="1.5"/><path d="M8 12h.01M12 12h4"/></svg>`,
  usb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="4" width="10" height="6" rx="1"/><path d="M12 10v6M9 19h6l-1.5-3h-3z"/></svg>`,
  chip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>`,
  laptop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="16" height="11" rx="1"/><path d="M2 19h20l-2-4H4l-2 4Z"/></svg>`,
  monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/></svg>`,
  gpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="9" rx="1.5"/><circle cx="8" cy="11.5" r="2"/><circle cx="14" cy="11.5" r="2"/><path d="M3 18v2M20 18v2"/></svg>`,
  mobo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="1"/><rect x="6" y="6" width="6" height="6"/><path d="M15 6h3M15 10h3M6 15h3M13 15h5M6 19h12"/></svg>`,
  bulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18h6M10 22h4M12 2a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 2Z"/></svg>`,
  printer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1"/><path d="M6 17v4h12v-4"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="9" r="3"/><circle cx="12" cy="17" r="1.4"/></svg>`,
  tablet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="2" width="14" height="20" rx="1.5"/><path d="M11 19h2"/></svg>`,
  ups: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M13 8l-4 5h3l-1 5 5-6h-3l0-4Z"/></svg>`,
  webcam: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="10" r="5"/><circle cx="12" cy="10" r="1.8"/><path d="M6 20c1-2.5 3.5-4 6-4s5 1.5 6 4"/></svg>`,
};
function getIcon(key){ return ICONS[key] || ICONS.chip; }

// Devuelve la imagen del producto si tiene una subida, si no, el ícono SVG de respaldo.
function mediaHTML(p){
  const fallback = `/uploads/productos/prod_${p.id || 1}.jpg`;
  const imgUrl = p.imagen_url || fallback;
  return `<img src="${imgUrl}" alt="${p.nombre}" loading="lazy" onerror="if(this.src.indexOf('prod_${p.id || 1}.jpg')===-1){this.src='${fallback}';}else{this.outerHTML=getIcon('${p.icono || 'chip'}');}" />`;
}