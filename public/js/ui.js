/**
 * Módulo UI: Controladores de interfaz, drawer, modales, toasts y formateadores
 */
import { getCart, updateQuantity, removeFromCart, getCartTotal, getCartCount, addToCart } from './cart.js';

let currentStoreConfig = {
  currencySymbol: '$',
  currencyCode: 'ARS',
  whatsappNumber: '5491123456789'
};

export function setStoreConfig(config) {
  currentStoreConfig = { ...currentStoreConfig, ...config };
}

export function formatPrice(amount) {
  const val = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
  return `${currentStoreConfig.currencySymbol || 'S/'} ${formatted}`;
}

// Toast Notificaciones
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// Control del Carrito Drawer
export function openCartDrawer() {
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  if (drawerBackdrop) {
    drawerBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCartDrawer();
  }
}

export function closeCartDrawer() {
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  if (drawerBackdrop) {
    drawerBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}

export function renderCartDrawer() {
  const itemsContainer = document.getElementById('drawer-items-list');
  const subtotalEl = document.getElementById('drawer-subtotal-val');
  const countEl = document.getElementById('drawer-cart-count');
  const checkoutBtn = document.getElementById('drawer-checkout-btn');

  if (!itemsContainer) return;

  const cart = getCart();
  const total = getCartTotal();
  const count = getCartCount();

  if (countEl) countEl.textContent = `${count} ${count === 1 ? 'ítem' : 'ítems'}`;
  if (subtotalEl) subtotalEl.textContent = formatPrice(total);

  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
  }

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-state" style="padding: 2.5rem 1rem; border: none;">
        <svg style="margin: 0 auto 1rem; color: var(--text-muted);" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <h3>Tu carrito está vacío</h3>
        <p>Explora nuestras prendas y añade tus favoritas.</p>
      </div>
    `;
    return;
  }

  itemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item" data-key="${item.key}">
      <img src="${item.imagen}" alt="${item.nombre}" class="cart-item-img" loading="lazy" />
      <div class="cart-item-info">
        <h4 class="cart-item-title">${item.nombre}</h4>
        <div class="cart-item-meta">Talla: <strong>${item.talla}</strong> | Color: <strong>${item.color}</strong></div>
        <div class="cart-item-price">${formatPrice(item.precioUnitario)}</div>
      </div>
      <div class="cart-item-actions">
        <div class="qty-stepper">
          <button type="button" class="qty-btn" data-action="decrease" data-key="${item.key}">-</button>
          <span class="qty-val">${item.cantidad}</span>
          <button type="button" class="qty-btn" data-action="increase" data-key="${item.key}">+</button>
        </div>
        <button type="button" class="cart-item-remove" data-action="remove" data-key="${item.key}">Eliminar</button>
      </div>
    </div>
  `).join('');

  // Event Listeners para items del carrito
  itemsContainer.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const key = btn.dataset.key;
      const item = cart.find(i => i.key === key);
      if (item) {
        if (action === 'increase') updateQuantity(key, item.cantidad + 1);
        if (action === 'decrease') updateQuantity(key, item.cantidad - 1);
      }
    });
  });

  itemsContainer.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromCart(btn.dataset.key);
      showToast('Producto eliminado del carrito');
    });
  });
}

// Actualizar badge contador del carrito en el navbar
export function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';

  badge.classList.remove('bounce');
  void badge.offsetWidth; // trigger reflow
  badge.classList.add('bounce');
}

// Modal de Detalle de Producto
export function openProductModal(product) {
  const modalBackdrop = document.getElementById('product-modal-backdrop');
  if (!modalBackdrop) return;

  let selectedSize = product.tallas && product.tallas.length ? product.tallas[0] : 'Única';
  let selectedColor = product.colores && product.colores.length ? product.colores[0] : 'Único';
  let quantity = 1;

  modalBackdrop.innerHTML = `
    <div class="modal-card">
      <button type="button" class="modal-close-btn" id="modal-close-btn" aria-label="Cerrar modal">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div class="modal-product-grid">
        <div class="modal-product-media">
          <img id="modal-main-img" src="${product.imagenes[0]}" alt="${product.nombre}" />
        </div>
        <div class="modal-product-info">
          <div class="product-card-cat">${product.categoria}</div>
          <h2 class="modal-product-title">${product.nombre}</h2>
          <div class="modal-product-price">${formatPrice(product.precio)}</div>
          <p class="modal-product-desc">${product.descripcion}</p>

          <!-- Selector de Tallas -->
          <div>
            <div class="option-group-label">
              <span>Talla seleccionada:</span>
              <span class="selected-val" id="selected-size-label">${selectedSize}</span>
            </div>
            <div class="size-selector" id="modal-size-selector">
              ${product.tallas.map(t => `
                <button type="button" class="size-pill ${t === selectedSize ? 'active' : ''}" data-size="${t}">${t}</button>
              `).join('')}
            </div>
          </div>

          <!-- Selector de Colores -->
          <div>
            <div class="option-group-label">
              <span>Color seleccionado:</span>
              <span class="selected-val" id="selected-color-label">${selectedColor}</span>
            </div>
            <div class="color-selector" id="modal-color-selector">
              ${product.colores.map(c => `
                <button type="button" class="color-pill ${c === selectedColor ? 'active' : ''}" data-color="${c}">${c}</button>
              `).join('')}
            </div>
          </div>

          <!-- Cantidad y Añadir -->
          <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem;">
            <div class="qty-stepper">
              <button type="button" class="qty-btn" id="modal-qty-minus">-</button>
              <span class="qty-val" id="modal-qty-val">1</span>
              <button type="button" class="qty-btn" id="modal-qty-plus">+</button>
            </div>
            <button type="button" class="btn btn-primary btn-full" id="modal-add-to-cart-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              Agregar al Carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  modalBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Event Listeners dentro del Modal
  const closeBtn = document.getElementById('modal-close-btn');
  closeBtn.addEventListener('click', closeProductModal);

  // Tallas
  const sizeBtns = modalBackdrop.querySelectorAll('.size-pill');
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size;
      document.getElementById('selected-size-label').textContent = selectedSize;
    });
  });

  // Colores
  const colorBtns = modalBackdrop.querySelectorAll('.color-pill');
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.color;
      document.getElementById('selected-color-label').textContent = selectedColor;
    });
  });

  // Cantidad
  const qtyVal = document.getElementById('modal-qty-val');
  document.getElementById('modal-qty-minus').addEventListener('click', () => {
    if (quantity > 1) {
      quantity--;
      qtyVal.textContent = quantity;
    }
  });

  document.getElementById('modal-qty-plus').addEventListener('click', () => {
    if (quantity < product.stock) {
      quantity++;
      qtyVal.textContent = quantity;
    } else {
      showToast(`Stock máximo alcanzado (${product.stock} unidades)`, 'warning');
    }
  });

  // Botón Agregar al carrito
  document.getElementById('modal-add-to-cart-btn').addEventListener('click', () => {
    addToCart(product, selectedSize, selectedColor, quantity);
    closeProductModal();
    showToast(`"${product.nombre}" agregado al carrito`);
    openCartDrawer();
  });
}

export function closeProductModal() {
  const modalBackdrop = document.getElementById('product-modal-backdrop');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Navegación de vistas (Home, Catálogo, Checkout)
export function switchView(viewName) {
  const views = document.querySelectorAll('.view-section');
  views.forEach(v => {
    v.style.display = 'none';
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Actualizar estado activo en navbar
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.dataset.view === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}
