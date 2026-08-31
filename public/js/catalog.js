/**
 * Módulo de Catálogo: Renderizado, Filtros y Detalle de Productos
 */
import { fetchProducts, fetchCategories } from './api.js';
import { formatPrice, openProductModal, showToast, openCartDrawer } from './ui.js';
import { addToCart } from './cart.js';

let allProducts = [];
let activeCategory = 'Todos';
let activeSize = '';
let searchQuery = '';

export async function initCatalog() {
  await loadCategories();
  await loadProducts();
  setupCatalogEvents();
}

export async function loadFeaturedProducts() {
  const container = document.getElementById('featured-products-grid');
  if (!container) return;

  const featured = await fetchProducts({ featured: 'true' });
  if (featured.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No hay productos destacados por el momento.</p>`;
    return;
  }

  container.innerHTML = featured.map(p => createProductCardHtml(p)).join('');
  attachProductCardEvents(container, featured);
}

async function loadCategories() {
  const pillsContainer = document.getElementById('catalog-category-pills');
  if (!pillsContainer) return;

  const categories = await fetchCategories();
  pillsContainer.innerHTML = categories.map(cat => `
    <button type="button" class="filter-btn ${cat === activeCategory ? 'active' : ''}" data-category="${cat}">
      ${cat}
    </button>
  `).join('');

  pillsContainer.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pillsContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      applyFilters();
    });
  });
}

export async function setCatalogCategory(catName) {
  activeCategory = catName;
  const pillsContainer = document.getElementById('catalog-category-pills');
  if (pillsContainer) {
    pillsContainer.querySelectorAll('.filter-btn').forEach(b => {
      if (b.dataset.category.toLowerCase() === catName.toLowerCase()) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }
  await applyFilters();
}

async function loadProducts() {
  allProducts = await fetchProducts();
  renderProductsGrid(allProducts);
}

function createProductCardHtml(product) {
  const badgeHtml = product.tag
    ? `<span class="product-card-badge ${product.destacado ? 'tag-accent' : ''}">${product.tag}</span>`
    : '';

  return `
    <article class="product-card" data-id="${product.id}">
      <div class="product-card-media" data-action="open-detail">
        ${badgeHtml}
        <img class="product-card-img" src="${product.imagenes[0]}" alt="${product.nombre}" loading="lazy" />
      </div>
      <div class="product-card-content">
        <span class="product-card-cat">${product.categoria}</span>
        <h3 class="product-card-title" data-action="open-detail">${product.nombre}</h3>
        <div class="product-card-price">${formatPrice(product.precio)}</div>
        <div class="product-card-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-full" data-action="open-detail">
            Ver Detalle / Opciones
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderProductsGrid(products) {
  const container = document.getElementById('catalog-products-grid');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg style="margin: 0 auto 1rem; color: var(--text-muted);" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3>No se encontraron productos</h3>
        <p>Prueba con otros términos de búsqueda o cambiando los filtros.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(p => createProductCardHtml(p)).join('');
  attachProductCardEvents(container, products);
}

function attachProductCardEvents(container, productsList) {
  container.querySelectorAll('.product-card').forEach(card => {
    const productId = card.dataset.id;
    const product = productsList.find(p => p.id === productId);
    if (!product) return;

    // Abrir modal de detalle
    card.querySelectorAll('[data-action="open-detail"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openProductModal(product);
      });
    });
  });
}

function setupCatalogEvents() {
  // Buscador en tiempo real
  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = e.target.value.trim().toLowerCase();
        applyFilters();
      }, 250);
    });
  }

  // Filtro de tallas
  const sizeFilter = document.getElementById('catalog-size-filter');
  if (sizeFilter) {
    sizeFilter.addEventListener('change', (e) => {
      activeSize = e.target.value;
      applyFilters();
    });
  }
}

async function applyFilters() {
  let filtered = [...allProducts];

  if (activeCategory && activeCategory !== 'Todos') {
    filtered = filtered.filter(p => p.categoria.toLowerCase() === activeCategory.toLowerCase());
  }

  if (activeSize) {
    filtered = filtered.filter(p => p.tallas.includes(activeSize));
  }

  if (searchQuery) {
    filtered = filtered.filter(p =>
      p.nombre.toLowerCase().includes(searchQuery) ||
      p.descripcion.toLowerCase().includes(searchQuery) ||
      p.categoria.toLowerCase().includes(searchQuery)
    );
  }

  renderProductsGrid(filtered);
}
