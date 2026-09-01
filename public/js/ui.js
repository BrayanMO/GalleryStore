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

// Control del Carrito Drawer con Historial
export function openCartDrawer(pushHistory = true) {
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  if (drawerBackdrop) {
    drawerBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCartDrawer();
    if (pushHistory && window.location.hash !== '#carrito') {
      history.pushState({ drawer: 'cart' }, '', '#carrito');
    }
  }
}

export function closeCartDrawer(syncHistory = false) {
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  if (drawerBackdrop && drawerBackdrop.classList.contains('active')) {
    drawerBackdrop.classList.remove('active');
    document.body.style.overflow = '';
    if (syncHistory && window.location.hash === '#carrito') {
      window.history.back();
    }
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

// Actualizar badge contador del carrito en el navbar desktop y mobile
export function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const mobileBadge = document.getElementById('mobile-cart-badge');
  const count = getCartCount();

  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
    badge.classList.remove('bounce');
    void badge.offsetWidth; // trigger reflow
    badge.classList.add('bounce');
  }

  if (mobileBadge) {
    mobileBadge.textContent = count;
    mobileBadge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// Modal de Detalle de Producto con Galería y Zoom
export function openProductModal(product, pushHistory = true) {
  const modalBackdrop = document.getElementById('product-modal-backdrop');
  if (!modalBackdrop) return;

  if (pushHistory && product && product.id) {
    history.pushState({ modal: 'product', id: product.id }, '', `#producto-${product.id}`);
  }

  const images = product.imagenes && product.imagenes.length ? product.imagenes : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80'];
  let currentImgIndex = 0;
  let selectedSize = product.tallas && product.tallas.length ? product.tallas[0] : 'Única';
  let selectedColor = product.colores && product.colores.length ? product.colores[0] : 'Único';
  let quantity = 1;

  modalBackdrop.innerHTML = `
    <div class="modal-card">
      <div class="modal-drag-bar" id="modal-drag-bar" aria-label="Desliza para cerrar">
        <div class="modal-drag-pill"></div>
      </div>

      <button type="button" class="modal-close-btn" id="modal-close-btn" aria-label="Cerrar modal">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div class="modal-product-grid">
        <!-- Galería Interactiva con Miniaturas y Zoom -->
        <div class="modal-gallery-container">
          <div class="modal-product-media" id="modal-img-trigger">
            <img id="modal-main-img" src="${images[0]}" alt="${product.nombre}" />
            
            <button type="button" class="zoom-badge-btn" id="btn-zoom-trigger">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              <span>Toca para ampliar</span>
            </button>

            ${images.length > 1 ? `
              <button type="button" class="gallery-nav-arrow arrow-prev" id="gallery-prev-btn" aria-label="Anterior">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button type="button" class="gallery-nav-arrow arrow-next" id="gallery-next-btn" aria-label="Siguiente">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            ` : ''}
          </div>

          ${images.length > 1 ? `
            <div class="modal-thumbnails-strip" id="modal-thumbnails-strip">
              ${images.map((img, idx) => `
                <button type="button" class="thumb-pill-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="Ver foto ${idx + 1}">
                  <img src="${img}" alt="${product.nombre} foto ${idx + 1}" loading="lazy" />
                </button>
              `).join('')}
            </div>
          ` : ''}
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
          <div style="display: flex; gap: 0.75rem; align-items: center; margin-top: 0.5rem; width: 100%;">
            <div class="qty-stepper" style="flex-shrink: 0;">
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

  const modalCard = modalBackdrop.querySelector('.modal-card');

  // Cerrar al hacer clic en el backdrop fuera de la tarjeta
  modalBackdrop.onclick = (e) => {
    if (e.target === modalBackdrop) {
      closeProductModal();
    }
  };

  // Gesto táctil nativo para deslizar hacia abajo y cerrar en móvil (Pull-to-Dismiss)
  if (modalCard) {
    let cardStartY = 0;
    let cardCurrentY = 0;
    let isDraggingCard = false;

    modalCard.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        cardStartY = e.touches[0].clientY;
        cardCurrentY = cardStartY;
        // Permitir arrastrar si se toca la barra superior o si el scroll interno está arriba del todo
        if (e.target.closest('.modal-drag-bar') || modalCard.scrollTop <= 0) {
          isDraggingCard = true;
        }
      }
    }, { passive: true });

    modalCard.addEventListener('touchmove', (e) => {
      if (!isDraggingCard || e.touches.length !== 1) return;
      cardCurrentY = e.touches[0].clientY;
      const diffY = cardCurrentY - cardStartY;

      // Solo permitir arrastre hacia abajo cuando el scroll está al tope
      if (diffY > 0 && modalCard.scrollTop <= 0) {
        modalCard.style.transition = 'none';
        modalCard.style.transform = `translateY(${diffY}px)`;
      }
    }, { passive: true });

    modalCard.addEventListener('touchend', () => {
      if (!isDraggingCard) return;
      isDraggingCard = false;
      const diffY = cardCurrentY - cardStartY;

      if (diffY > 75 && modalCard.scrollTop <= 0) {
        closeProductModal();
      } else {
        modalCard.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
        modalCard.style.transform = 'translateY(0)';
        setTimeout(() => {
          modalCard.style.transition = '';
        }, 260);
      }
    }, { passive: true });
  }

  // Función para cambiar de imagen en la galería
  function switchImage(index) {
    if (index < 0) index = images.length - 1;
    if (index >= images.length) index = 0;
    currentImgIndex = index;

    const mainImg = document.getElementById('modal-main-img');
    if (mainImg) {
      mainImg.style.opacity = '0.7';
      mainImg.src = images[currentImgIndex];
      requestAnimationFrame(() => {
        mainImg.style.opacity = '1';
      });
    }

    const thumbBtns = modalBackdrop.querySelectorAll('.thumb-pill-btn');
    thumbBtns.forEach((btn, i) => {
      btn.classList.toggle('active', i === currentImgIndex);
    });
  }

  // Eventos de Miniaturas
  modalBackdrop.querySelectorAll('.thumb-pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchImage(parseInt(btn.dataset.index, 10));
    });
  });

  // Flechas en modal
  const prevBtn = document.getElementById('gallery-prev-btn');
  const nextBtn = document.getElementById('gallery-next-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchImage(currentImgIndex - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchImage(currentImgIndex + 1);
    });
  }

  // Abrir Zoom / Lightbox al tocar la foto o el botón de zoom
  const mediaTrigger = document.getElementById('modal-img-trigger');
  if (mediaTrigger) {
    mediaTrigger.addEventListener('click', (e) => {
      if (!e.target.closest('.gallery-nav-arrow')) {
        openLightbox(images, currentImgIndex);
      }
    });

    // Soporte táctil de deslizamiento (Swipe) en móvil dentro del popup de producto
    attachSwipeGestures(
      mediaTrigger,
      () => switchImage(currentImgIndex + 1), // Deslizar izquierda -> siguiente
      () => switchImage(currentImgIndex - 1)  // Deslizar derecha -> anterior
    );
  }

  // Cerrar Modal con botón X
  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeProductModal);

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
    if (quantity < (product.stock || 99)) {
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
  if (modalBackdrop && modalBackdrop.classList.contains('active')) {
    const modalCard = modalBackdrop.querySelector('.modal-card');
    if (modalCard) {
      modalCard.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      modalCard.style.transform = 'translateY(100%)';
    }
    setTimeout(() => {
      modalBackdrop.classList.remove('active');
      if (modalCard) {
        modalCard.style.transform = '';
        modalCard.style.transition = '';
      }
      document.body.style.overflow = '';
    }, 220);
  }
}

/* ==========================================================================
   HELPER DE GESTOS TÁCTILES (SWIPE NATIVO PARA MÓVIL)
   ========================================================================== */
function attachSwipeGestures(element, onSwipeLeft, onSwipeRight, onSwipeDown = null) {
  if (!element) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let isSwiping = false;

  element.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchEndX = touchStartX;
      touchEndY = touchStartY;
      isSwiping = true;
    }
  }, { passive: true });

  element.addEventListener('touchmove', (e) => {
    if (!isSwiping || e.touches.length !== 1) return;
    touchEndX = e.touches[0].clientX;
    touchEndY = e.touches[0].clientY;
  }, { passive: true });

  element.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    // Umbral de 35px para detectar deslizamiento horizontal claro
    if (absX > 35 && absX > absY * 1.1) {
      if (diffX < 0) {
        // Deslizar izquierda -> Siguiente
        if (typeof onSwipeLeft === 'function') onSwipeLeft();
      } else {
        // Deslizar derecha -> Anterior
        if (typeof onSwipeRight === 'function') onSwipeRight();
      }
    } else if (absY > 70 && absY > absX * 1.4 && diffY > 0 && typeof onSwipeDown === 'function') {
      // Deslizar hacia abajo -> Cerrar vista fullscreen
      onSwipeDown();
    }
  }, { passive: true });
}

/* ==========================================================================
   LIGHTBOX FULL-SCREEN ZOOM VIEWER
   ========================================================================== */
let lightboxImages = [];
let lightboxCurrentIndex = 0;

export function openLightbox(imagesList, startIndex = 0, pushHistory = true) {
  const lightbox = document.getElementById('lightbox-backdrop');
  if (!lightbox || !imagesList || imagesList.length === 0) return;

  lightboxImages = imagesList;
  lightboxCurrentIndex = startIndex >= 0 && startIndex < imagesList.length ? startIndex : 0;

  renderLightboxImage();
  lightbox.classList.add('active');

  if (pushHistory && window.location.hash !== '#zoom') {
    history.pushState({ modal: 'lightbox' }, '', '#zoom');
  }

  // Gestos táctiles de deslizamiento (Swipe) en pantalla completa
  const imgWrap = lightbox.querySelector('.lightbox-image-wrap');
  if (imgWrap) {
    attachSwipeGestures(
      imgWrap,
      () => navigateLightbox(1),  // Deslizar izquierda -> Siguiente foto
      () => navigateLightbox(-1), // Deslizar derecha -> Foto anterior
      closeLightbox              // Deslizar abajo -> Cerrar
    );
  }

  // Listeners de Lightbox
  const closeBtn = document.getElementById('lightbox-close-btn');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');

  if (closeBtn) closeBtn.onclick = closeLightbox;
  if (prevBtn) {
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      navigateLightbox(-1);
    };
  }
  if (nextBtn) {
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      navigateLightbox(1);
    };
  }

  lightbox.onclick = (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-image-wrap')) {
      closeLightbox();
    }
  };

  window.addEventListener('keydown', handleLightboxKeydown);
}

function renderLightboxImage() {
  const imgEl = document.getElementById('lightbox-main-img');
  const counterEl = document.getElementById('lightbox-counter');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');

  if (imgEl && lightboxImages[lightboxCurrentIndex]) {
    imgEl.style.opacity = '0.75';
    imgEl.src = lightboxImages[lightboxCurrentIndex];
    requestAnimationFrame(() => {
      imgEl.style.opacity = '1';
    });
  }

  if (counterEl) {
    counterEl.textContent = `${lightboxCurrentIndex + 1} / ${lightboxImages.length}`;
  }

  // Ocultar flechas si solo hay una imagen
  if (prevBtn) prevBtn.style.display = lightboxImages.length > 1 ? 'flex' : 'none';
  if (nextBtn) nextBtn.style.display = lightboxImages.length > 1 ? 'flex' : 'none';
}

function navigateLightbox(direction) {
  if (!lightboxImages.length) return;
  lightboxCurrentIndex += direction;
  if (lightboxCurrentIndex < 0) lightboxCurrentIndex = lightboxImages.length - 1;
  if (lightboxCurrentIndex >= lightboxImages.length) lightboxCurrentIndex = 0;
  renderLightboxImage();
}

function handleLightboxKeydown(e) {
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
}

export function closeLightbox() {
  const lightbox = document.getElementById('lightbox-backdrop');
  if (lightbox) {
    lightbox.classList.remove('active');
  }
  window.removeEventListener('keydown', handleLightboxKeydown);
}

// Navegación de vistas (Home, Catálogo, Checkout) con Historial Web
export function switchView(viewName, pushHistory = true) {
  const validViews = ['home', 'catalog', 'checkout'];
  const activeView = validViews.includes(viewName) ? viewName : 'home';

  const views = document.querySelectorAll('.view-section');
  views.forEach(v => {
    v.style.display = 'none';
  });

  const targetView = document.getElementById(`view-${activeView}`);
  if (targetView) {
    targetView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Actualizar estado activo en navbar desktop y barra móvil
  document.querySelectorAll('.nav-link').forEach(link => {
    const isAct = link.dataset.view === activeView || link.dataset.nav === activeView;
    link.classList.toggle('active', isAct);
  });

  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    const isAct = item.dataset.view === activeView || item.dataset.nav === activeView;
    item.classList.toggle('active', isAct);
  });

  // Mostrar botón volver en cabecera móvil si no estamos en inicio
  const mobileBackBtn = document.getElementById('mobile-header-back-btn');
  if (mobileBackBtn) {
    if (activeView === 'checkout' || activeView === 'catalog') {
      mobileBackBtn.style.display = 'inline-flex';
    } else {
      mobileBackBtn.style.display = 'none';
    }
  }

  // Registrar en historial del navegador para que la flecha Atrás funcione perfectamente
  if (pushHistory) {
    const hash = activeView === 'home' ? '' : `#${activeView}`;
    if (window.location.hash !== hash) {
      history.pushState({ view: activeView }, '', hash || window.location.pathname);
    }
  }
}
