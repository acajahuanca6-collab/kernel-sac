// ================= CARRITO =================
function addToCart(id) {
  const numId = Number(id);
  const producto = findProductoUniversal(numId);
  if (!producto) return;
  const existing = state.cart.find((i) => i.id === numId);
  const maxStock = (producto.stock !== undefined && producto.stock > 0) ? producto.stock : 99;
  if (existing) {
    if (existing.cantidad < maxStock) existing.cantidad++;
  } else {
    state.cart.push({ id: numId, cantidad: 1 });
  }
  saveCart();
  renderCart();
  openCart();
}

function changeQty(id, delta) {
  const numId = Number(id);
  const item = state.cart.find((i) => i.id === numId);
  if (!item) return;
  const producto = findProductoUniversal(numId);
  item.cantidad += delta;
  const maxStock = (producto && producto.stock !== undefined && producto.stock > 0) ? producto.stock : 99;
  if (item.cantidad <= 0) {
    state.cart = state.cart.filter((i) => i.id !== numId);
  } else if (item.cantidad > maxStock) {
    item.cantidad = maxStock;
  }
  saveCart();
  renderCart();
}

function removeItem(id) {
  const numId = Number(id);
  state.cart = state.cart.filter((i) => i.id !== numId);
  saveCart();
  renderCart();
}

function saveCart() {
  sessionStorage.setItem("kernel_cart", JSON.stringify(state.cart));
}

function cartTotal() {
  return state.cart.reduce((sum, item) => {
    const p = findProductoUniversal(item.id);
    return sum + (p ? Number(p.precio) * item.cantidad : 0);
  }, 0);
}

function renderCart() {
  const count = state.cart.reduce((s, i) => s + i.cantidad, 0);
  document.getElementById("cartCount").textContent = count;
  document.getElementById("cartTotal").textContent = money(cartTotal());

  const el = document.getElementById("cartItems");
  if (state.cart.length === 0) {
    el.innerHTML = `<div class="empty-cart">Tu carrito está vacío.<br/>Explora el catálogo y agrega productos.</div>`;
    document.getElementById("checkoutBtn").style.display = "none";
    document.getElementById("checkoutForm").classList.remove("open");
    return;
  }
  document.getElementById("checkoutBtn").style.display = "flex";

  el.innerHTML = state.cart
    .map((item) => {
      const p = findProductoUniversal(item.id);
      if (!p) return "";
      return `
      <div class="cart-item">
        <div class="cart-item-icon">${mediaHTML(p)}</div>
        <div class="cart-item-info">
          <h4>${p.nombre}</h4>
          <div class="qty-row">
            <button data-action="dec" data-id="${p.id}">−</button>
            <span>${item.cantidad}</span>
            <button data-action="inc" data-id="${p.id}">+</button>
            <button class="remove-btn" data-action="remove" data-id="${p.id}" style="margin-left:auto;">Quitar</button>
          </div>
        </div>
        <div class="cart-item-price">${money(Number(p.precio) * item.cantidad)}</div>
      </div>`;
    })
    .join("");

  el.querySelectorAll("button[data-action]").forEach((btn) => {
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    btn.addEventListener("click", () => {
      if (action === "inc") changeQty(id, 1);
      if (action === "dec") changeQty(id, -1);
      if (action === "remove") removeItem(id);
    });
  });
}

// ================= DRAWER =================
const overlay = document.getElementById("overlay");
const drawer = document.getElementById("cartDrawer");

function openCart() { overlay.classList.add("open"); drawer.classList.add("open"); }
function closeCart() { overlay.classList.remove("open"); drawer.classList.remove("open"); }

document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
overlay.addEventListener("click", () => { closeCart(); closeAuthModal(); closePedidosModal(); });

// ================= CHECKOUT =================
document.getElementById("checkoutBtn").addEventListener("click", () => {
  if (state.usuario) {
    document.getElementById("cName").value = state.usuario.nombre;
  }
  document.getElementById("checkoutForm").classList.add("open");
  document.getElementById("checkoutBtn").style.display = "none";
});