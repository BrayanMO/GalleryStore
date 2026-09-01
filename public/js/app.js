import { fetchSettings, fetchConfig } from './api.js';
import { setStoreConfig, openCartDrawer, closeCartDrawer, renderCartDrawer, updateCartBadge, switchView, closeProductModal, closeLightbox } from './ui.js';
import { initCatalog, loadFeaturedProducts, setCatalogCategory } from './catalog.js';
import { initCheckout, renderCheckoutSummary, setCheckoutConfig } from './checkout.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Restaurar INMEDIATAMENTE el estado del carrito desde localStorage (0ms delay)
  updateCartBadge();
  renderCartDrawer();
  initCheckout();

  // 2. Configurar listeners de navegación y modales de inmediato
  setupNavigation();
  setupModalsAndDrawers();

  // 3. Escuchar evento global de actualización de carrito
  window.addEventListener('cart:updated', () => {
    updateCartBadge();
    renderCartDrawer();
    renderCheckoutSummary();
  });

  // 4. Cargar configuración completa y ajustes visuales desde el backend
  try {
    const settings = await fetchSettings();
    const config = settings || await fetchConfig();
    
    if (config) {
      setStoreConfig(config);
      setCheckoutConfig(config);
      applyDynamicSettings(settings);

      // Re-renderizar con los símbolos y moneda definitivos
      updateCartBadge();
      renderCartDrawer();
      renderCheckoutSummary();
    }
  } catch (err) {
    console.error('Error al cargar configuración:', err);
  }

  // 5. Inicializar catálogo y productos destacados
  await initCatalog();
  await loadFeaturedProducts();
});

function applyDynamicSettings(settings) {
  if (!settings) return;

  // Actualizar nombre de la tienda y título de la pestaña
  if (settings.storeName) {
    document.title = `${settings.storeName} - Tienda Online`;
    document.querySelectorAll('.store-brand-name').forEach(el => {
      el.textContent = settings.storeName;
    });
  }

  // 1. Banner de Anuncios Promocional
  const bannerEl = document.getElementById('announcement-banner');
  const bannerTextEl = document.getElementById('announcement-banner-text');
  if (bannerEl && settings.banner) {
    if (settings.banner.enabled && settings.banner.text) {
      bannerTextEl.textContent = settings.banner.text;
      if (settings.banner.bgColor) bannerEl.style.backgroundColor = settings.banner.bgColor;
      if (settings.banner.textColor) bannerEl.style.color = settings.banner.textColor;
      bannerEl.style.display = 'block';
    } else {
      bannerEl.style.display = 'none';
    }
  }

  // 2. Hero Section Dinámico
  if (settings.hero) {
    if (settings.hero.tag) {
      const tagEl = document.getElementById('hero-tag-text');
      if (tagEl) tagEl.textContent = settings.hero.tag;
    }
    if (settings.hero.title) {
      const titleEl = document.getElementById('hero-title-text');
      if (titleEl) titleEl.textContent = settings.hero.title;
    }
    if (settings.hero.description) {
      const descEl = document.getElementById('hero-desc-text');
      if (descEl) descEl.textContent = settings.hero.description;
    }
    if (settings.hero.ctaText) {
      const ctaEl = document.getElementById('hero-cta-label');
      if (ctaEl) ctaEl.textContent = settings.hero.ctaText;
    }
    if (settings.hero.imageUrl) {
      const imgEl = document.getElementById('hero-image-img');
      if (imgEl) imgEl.src = settings.hero.imageUrl;
    }
    if (settings.hero.badgeTitle) {
      const badgeTitleEl = document.getElementById('hero-badge-title-text');
      if (badgeTitleEl) badgeTitleEl.textContent = settings.hero.badgeTitle;
    }
    if (settings.hero.badgeText) {
      const badgeDescEl = document.getElementById('hero-badge-desc-text');
      if (badgeDescEl) badgeDescEl.textContent = settings.hero.badgeText;
    }
  }

  // 3. Tarjetas de Categorías Dinámicas
  if (settings.categoryCards && Array.isArray(settings.categoryCards)) {
    const catContainer = document.getElementById('categories-home-grid');
    if (catContainer) {
      catContainer.innerHTML = settings.categoryCards.map(c => `
        <div class="category-card" data-category-card="${c.category}">
          <img src="${c.imageUrl}" alt="${c.title}" loading="lazy" />
          <div class="category-card-overlay">
            <h3 class="category-card-title">${c.title}</h3>
            <span class="category-card-cta">
              ${c.subtitle || 'Ver prendas'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          </div>
        </div>
      `).join('');

      // Re-enlazar eventos a las tarjetas de categorías
      catContainer.querySelectorAll('[data-category-card]').forEach(card => {
        card.addEventListener('click', async () => {
          const cat = card.dataset.categoryCard;
          switchView('catalog', true);
          await setCatalogCategory(cat);
        });
      });
    }
  }

  // 4. Sección de Destacados
  if (settings.featuredSection) {
    if (settings.featuredSection.title) {
      const featTitle = document.getElementById('featured-section-title');
      if (featTitle) featTitle.textContent = settings.featuredSection.title;
    }
    if (settings.featuredSection.subtitle) {
      const featSub = document.getElementById('featured-section-subtitle');
      if (featSub) featSub.textContent = settings.featuredSection.subtitle;
    }
  }
}

function setupNavigation() {
  // Enlaces de navegación (Navbar Desktop, Barra Móvil, Footer)
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = el.dataset.nav;
      switchView(targetView, true);
    });
  });

  // Botón volver en la cabecera móvil
  const mobileBackBtn = document.getElementById('mobile-header-back-btn');
  if (mobileBackBtn) {
    mobileBackBtn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        switchView('home', true);
      }
    });
  }

  // Botón CTA del Hero
  const heroCtaBtn = document.getElementById('hero-cta-btn');
  if (heroCtaBtn) {
    heroCtaBtn.addEventListener('click', () => {
      switchView('catalog', true);
    });
  }

  // Tarjetas de categorías en Home iniciales
  document.querySelectorAll('[data-category-card]').forEach(card => {
    card.addEventListener('click', async () => {
      const cat = card.dataset.categoryCard;
      switchView('catalog', true);
      await setCatalogCategory(cat);
    });
  });

  // Botón de Ir al Checkout desde el Drawer
  const drawerCheckoutBtn = document.getElementById('drawer-checkout-btn');
  if (drawerCheckoutBtn) {
    drawerCheckoutBtn.addEventListener('click', () => {
      closeCartDrawer(false);
      switchView('checkout', true);
      renderCheckoutSummary();
    });
  }

  // Manejo del botón Atrás del Navegador Móvil / Gestos de retroceso (PopState)
  window.addEventListener('popstate', () => {
    const lightbox = document.getElementById('lightbox-backdrop');
    const productModal = document.getElementById('product-modal-backdrop');
    const cartDrawer = document.getElementById('drawer-backdrop');

    // 1. Si el lightbox fullscreen estaba abierto, cerrarlo
    if (lightbox && lightbox.classList.contains('active')) {
      closeLightbox();
      return;
    }

    // 2. Si el modal de producto estaba abierto, cerrarlo
    if (productModal && productModal.classList.contains('active')) {
      closeProductModal();
      return;
    }

    // 3. Si el carrito estaba abierto, cerrarlo
    if (cartDrawer && cartDrawer.classList.contains('active')) {
      closeCartDrawer(false);
      return;
    }

    // 4. Navegar a la vista correspondiente en el historial
    const hash = window.location.hash;
    if (hash === '#checkout') {
      switchView('checkout', false);
      renderCheckoutSummary();
    } else if (hash === '#catalog' || hash === '#catalogo') {
      switchView('catalog', false);
    } else {
      switchView('home', false);
    }
  });

  // Restaurar vista si la página cargó con un hash inicial (#catalogo o #checkout)
  const initialHash = window.location.hash;
  if (initialHash === '#checkout') {
    switchView('checkout', false);
    renderCheckoutSummary();
  } else if (initialHash === '#catalog' || initialHash === '#catalogo') {
    switchView('catalog', false);
  } else {
    switchView('home', false);
  }
}

function setupModalsAndDrawers() {
  // Botón abrir carrito en navbar desktop
  const cartToggleBtn = document.getElementById('cart-toggle-btn');
  if (cartToggleBtn) {
    cartToggleBtn.addEventListener('click', () => openCartDrawer(true));
  }

  // Botón abrir carrito en barra móvil inferior
  const mobileCartBtn = document.getElementById('mobile-nav-cart-btn');
  if (mobileCartBtn) {
    mobileCartBtn.addEventListener('click', () => openCartDrawer(true));
  }

  // Botón cerrar carrito
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', () => closeCartDrawer(true));
  }

  // Click en backdrop del drawer para cerrar
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', (e) => {
      if (e.target === drawerBackdrop) {
        closeCartDrawer(true);
      }
    });
  }

  // Click en backdrop del modal de producto para cerrar
  const productModalBackdrop = document.getElementById('product-modal-backdrop');
  if (productModalBackdrop) {
    productModalBackdrop.addEventListener('click', (e) => {
      if (e.target === productModalBackdrop) {
        closeProductModal();
      }
    });
  }

  // Botón cerrar modal de confirmación
  const confirmCloseBtn = document.getElementById('confirm-modal-close-btn');
  if (confirmCloseBtn) {
    confirmCloseBtn.addEventListener('click', () => {
      const confirmModal = document.getElementById('confirm-modal-backdrop');
      if (confirmModal) {
        confirmModal.classList.remove('active');
        document.body.style.overflow = '';
      }
      switchView('home', true);
    });
  }
}
