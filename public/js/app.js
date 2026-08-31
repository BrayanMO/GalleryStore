/**
 * Archivo principal de inicialización de la aplicación
 */
import { fetchSettings, fetchConfig } from './api.js';
import { setStoreConfig, openCartDrawer, closeCartDrawer, renderCartDrawer, updateCartBadge, switchView, closeProductModal } from './ui.js';
import { initCatalog, loadFeaturedProducts, setCatalogCategory } from './catalog.js';
import { initCheckout, renderCheckoutSummary, setCheckoutConfig } from './checkout.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cargar configuración completa y ajustes visuales desde el backend
  const settings = await fetchSettings();
  const config = settings || await fetchConfig();
  
  setStoreConfig(config);
  setCheckoutConfig(config);

  // Aplicar ajustes visuales dinámicos al Home
  applyDynamicSettings(settings);

  // 2. Inicializar catálogo y productos destacados
  await initCatalog();
  await loadFeaturedProducts();

  // 3. Inicializar checkout
  initCheckout();

  // 4. Inicializar estado del carrito
  updateCartBadge();
  renderCartDrawer();

  // 5. Escuchar evento global de actualización de carrito
  window.addEventListener('cart:updated', () => {
    updateCartBadge();
    renderCartDrawer();
    renderCheckoutSummary();
  });

  // 6. Configurar navegación
  setupNavigation();

  // 7. Configurar Drawer y Modales
  setupModalsAndDrawers();
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
          switchView('catalog');
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
  // Enlaces del navbar
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = el.dataset.nav;
      switchView(targetView);
    });
  });

  // Botón CTA del Hero
  const heroCtaBtn = document.getElementById('hero-cta-btn');
  if (heroCtaBtn) {
    heroCtaBtn.addEventListener('click', () => {
      switchView('catalog');
    });
  }

  // Tarjetas de categorías en Home iniciales
  document.querySelectorAll('[data-category-card]').forEach(card => {
    card.addEventListener('click', async () => {
      const cat = card.dataset.categoryCard;
      switchView('catalog');
      await setCatalogCategory(cat);
    });
  });

  // Botón de Ir al Checkout desde el Drawer
  const drawerCheckoutBtn = document.getElementById('drawer-checkout-btn');
  if (drawerCheckoutBtn) {
    drawerCheckoutBtn.addEventListener('click', () => {
      closeCartDrawer();
      switchView('checkout');
      renderCheckoutSummary();
    });
  }
}

function setupModalsAndDrawers() {
  // Botón abrir carrito en navbar
  const cartToggleBtn = document.getElementById('cart-toggle-btn');
  if (cartToggleBtn) {
    cartToggleBtn.addEventListener('click', openCartDrawer);
  }

  // Botón cerrar carrito
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeCartDrawer);
  }

  // Click en backdrop del drawer para cerrar
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', (e) => {
      if (e.target === drawerBackdrop) {
        closeCartDrawer();
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
      switchView('home');
    });
  }
}
