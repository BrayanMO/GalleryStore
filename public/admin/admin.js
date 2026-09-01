/**
 * LÓGICA DEL PANEL DE ADMINISTRACIÓN MOBILE-FIRST - AURA STUDIO
 */

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '38', '40', '42', '44', 'Única'];
const DEFAULT_COLORS = ['Negro', 'Blanco', 'Gris', 'Crema', 'Terracota', 'Verde Bosque', 'Azul Marino'];

let currentAdminToken = sessionStorage.getItem('aura_admin_token') || '';
let products = [];
let availableCategories = [];
let siteSettings = {};
let activeSizes = new Set();
let activeColors = new Set();
let currentProductImages = [];
let deletingProductId = null;

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  if (currentAdminToken) {
    showDashboard();
  } else {
    showLogin();
  }
});

function showLogin() {
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('dashboard-view').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'block';
  loadDashboardData();
}

let categoriesList = [];
let editingCategoryId = null;
let deletingCategoryId = null;

// Helper para peticiones autenticadas
async function authFetch(url, options = {}) {
  const headers = options.headers || {};
  if (currentAdminToken) {
    headers['Authorization'] = `Bearer ${currentAdminToken}`;
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    sessionStorage.removeItem('aura_admin_token');
    currentAdminToken = '';
    showLogin();
    showToast('Sesión expirada. Por favor ingresa nuevamente.', 'error');
    throw new Error('No autorizado');
  }
  return response;
}

// ==========================================================================
// TABS SWITCHER (MOBILE & DESKTOP)
// ==========================================================================
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  const targetPane = document.getElementById(`tab-content-${tabId}`);
  const targetBtn = document.getElementById(`tab-btn-${tabId}`);

  if (targetPane) targetPane.style.display = 'block';
  if (targetBtn) targetBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
};
const switchTab = window.switchTab;

// ==========================================================================
// CARGA DE DATOS & MÉTRICAS
// ==========================================================================
async function loadDashboardData() {
  try {
    // 1. Cargar Configuración Visual Completa
    const setRes = await fetch('/api/settings');
    if (setRes.ok) {
      siteSettings = await setRes.json();
      populateSettingsForm(siteSettings);

      const badge = document.getElementById('db-status-badge');
      if (siteSettings.dbStatus === 'neon-postgresql') {
        badge.textContent = '🟢 Neon DB';
        badge.className = 'badge-tag badge-neon';
      } else {
        badge.textContent = '🟡 Local JSON';
        badge.className = 'badge-tag badge-local';
      }

      const storageBadge = document.getElementById('storage-status-badge');
      if (storageBadge) {
        if (siteSettings.storageStatus === 'cloudinary') {
          storageBadge.textContent = '☁️ Cloudinary';
          storageBadge.className = 'badge-tag badge-neon';
          storageBadge.title = 'Fotos almacenadas permanentemente en Cloudinary CDN';
        } else {
          storageBadge.textContent = '💾 Local';
          storageBadge.className = 'badge-tag badge-local';
        }
      }

      document.querySelectorAll('.store-brand-name').forEach(el => {
        el.textContent = siteSettings.storeName || 'GALLERY';
      });
    }

    // 2. Cargar Productos
    const prodRes = await fetch('/api/products');
    products = prodRes.ok ? await prodRes.json() : [];

    // 3. Cargar Categorías
    const catRes = await fetch('/api/categories');
    categoriesList = catRes.ok ? await catRes.json() : [];

    // 4. Actualizar Métricas, Dropdowns y Tablas
    updateMetrics();
    populateCategoryDropdowns();
    renderProductsTable();
    renderCategoriesTable();
  } catch (error) {
    console.error('Error al cargar datos del dashboard:', error);
    showToast('Error al conectar con el servidor', 'error');
  }
}

function updateMetrics() {
  const totalProducts = products.length;
  const categoriesCount = categoriesList.length || new Set(products.map(p => p.categoria)).size;
  const featuredCount = products.filter(p => p.destacado).length;
  const lowStockCount = products.filter(p => (p.stock || 0) <= 5).length;

  document.getElementById('metric-total-products').textContent = totalProducts;
  document.getElementById('metric-total-categories').textContent = categoriesCount;
  document.getElementById('metric-total-featured').textContent = featuredCount;
  document.getElementById('metric-total-low-stock').textContent = lowStockCount;
}

function populateCategoryDropdowns(selectedCategory = '') {
  const productSelect = document.getElementById('form-categoria');
  const filterSelect = document.getElementById('admin-category-filter');

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="Todos">Todas las Categorías</option>';
    categoriesList.forEach(c => {
      filterSelect.innerHTML += `<option value="${c.nombre}">${c.nombre}</option>`;
    });
  }

  if (productSelect) {
    if (categoriesList.length === 0) {
      productSelect.innerHTML = '<option value="">No hay categorías creadas. ¡Crea una!</option>';
    } else {
      productSelect.innerHTML = '<option value="">Selecciona una categoría...</option>' + 
        categoriesList.map(c => `<option value="${c.nombre}" ${c.nombre === selectedCategory ? 'selected' : ''}>${c.nombre}</option>`).join('');
    }
  }
}

// ==========================================================================
// RENDERIZADO DE TABLA DE PRODUCTOS
// ==========================================================================
function renderProductsTable() {
  const tbody = document.getElementById('products-table-body');
  const searchTerm = document.getElementById('admin-search-input').value.toLowerCase().trim();
  const selectedCat = document.getElementById('admin-category-filter').value;
  const currencySymbol = siteSettings.currencySymbol || '$';

  let filtered = products.filter(p => {
    const matchSearch = !searchTerm ||
      p.nombre.toLowerCase().includes(searchTerm) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm)) ||
      p.id.toLowerCase().includes(searchTerm);

    const matchCat = selectedCat === 'Todos' || p.categoria.toLowerCase() === selectedCat.toLowerCase();

    return matchSearch && matchCat;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
          <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">No se encontraron productos</div>
          <div style="font-size: 0.85rem;">Prueba con otros términos de búsqueda o añade una prenda nueva.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const imgUrl = (p.imagenes && p.imagenes.length) ? p.imagenes[0] : '';
    const stockClass = (p.stock || 0) <= 5 ? 'stock-low' : 'stock-ok';
    const tagHtml = p.tag ? `<span class="pill-tag" style="color: var(--accent-light); font-weight: 700;">${p.tag}</span>` : '';
    const featuredHtml = p.destacado ? '⭐ Sí' : '<span style="color: var(--text-dim);">No</span>';

    const tallasHtml = (p.tallas || []).map(t => `<span class="pill-tag">${t}</span>`).join('') || '<span style="color: var(--text-dim);">-</span>';

    return `
      <tr>
        <td>
          ${imgUrl ? `<img src="${imgUrl}" alt="${p.nombre}" class="table-img" />` : `<div class="table-img" style="display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: var(--text-muted);">Sin foto</div>`}
        </td>
        <td>
          <div style="font-weight: 800; color: var(--text-main); font-size: 0.95rem;">${p.nombre}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); font-family: monospace; margin-top: 2px;">${p.id}</div>
          ${tagHtml}
        </td>
        <td><span class="pill-tag" style="background: var(--bg-surface-elevated);">${p.categoria}</span></td>
        <td style="font-weight: 800; color: var(--accent); font-size: 0.95rem;">${currencySymbol} ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.precio || 0)}</td>
        <td style="max-width: 170px;">${tallasHtml}</td>
        <td><span class="stock-badge ${stockClass}">${p.stock} un.</span></td>
        <td>${featuredHtml}</td>
        <td style="text-align: right;">
          <div class="table-actions-cell">
            <button type="button" class="btn-action-edit" onclick="editProduct('${p.id}')" title="Editar producto">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <span>Editar</span>
            </button>
            <button type="button" class="btn-action-delete" onclick="confirmDelete('${p.id}')" title="Eliminar prenda">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// RENDERIZADO DE TABLA DE CATEGORÍAS
// ==========================================================================
function renderCategoriesTable() {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;

  if (categoriesList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
          <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">No hay categorías registradas</div>
          <div style="font-size: 0.85rem;">Haz clic en "+ Nueva Categoría" para crear la primera.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = categoriesList.map(c => {
    const imgHtml = c.imagen 
      ? `<img src="${c.imagen}" alt="${c.nombre}" class="table-img" />`
      : `<div class="table-img" style="display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: var(--text-muted); background: var(--bg-surface-elevated);">Sin foto</div>`;

    return `
      <tr>
        <td>${imgHtml}</td>
        <td>
          <div style="font-weight: 800; color: var(--text-main); font-size: 0.95rem;">${c.nombre}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); font-family: monospace; margin-top: 2px;">${c.id}</div>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: var(--text-muted); max-width: 340px;">${c.descripcion || '<span style="color: var(--text-dim);">- Sin descripción -</span>'}</div>
        </td>
        <td style="text-align: center;">
          <span class="badge-tag" style="background: var(--bg-surface-elevated); font-size: 0.8rem; font-weight: 700;">
            ${c.totalProductos || 0} prendas
          </span>
        </td>
        <td style="text-align: right;">
          <div class="table-actions-cell">
            <button type="button" class="btn-action-edit" onclick="editCategory('${c.id}')" title="Editar categoría">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <span>Editar</span>
            </button>
            <button type="button" class="btn-action-delete" onclick="confirmDeleteCategory('${c.id}')" title="Eliminar categoría">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Modal Crear/Editar Categoría
function openCategoryModal(catToEdit = null) {
  const modal = document.getElementById('category-modal');
  const title = document.getElementById('modal-category-title');
  const form = document.getElementById('category-form');
  const previewWrap = document.getElementById('category-image-preview-wrap');
  const previewImg = document.getElementById('category-image-preview');

  editingCategoryId = catToEdit ? catToEdit.id : null;

  if (catToEdit) {
    title.textContent = `Editar Categoría: ${catToEdit.nombre}`;
    document.getElementById('form-category-id').value = catToEdit.id;
    document.getElementById('form-category-nombre').value = catToEdit.nombre || '';
    document.getElementById('form-category-descripcion').value = catToEdit.descripcion || '';
    document.getElementById('category-image-url').value = catToEdit.imagen || '';
    if (catToEdit.imagen) {
      previewImg.src = catToEdit.imagen;
      previewWrap.style.display = 'block';
    } else {
      previewWrap.style.display = 'none';
    }
  } else {
    title.textContent = 'Crear Nueva Categoría';
    form.reset();
    document.getElementById('form-category-id').value = '';
    previewWrap.style.display = 'none';
  }

  modal.classList.add('active');
}

function closeCategoryModal() {
  document.getElementById('category-modal').classList.remove('active');
  editingCategoryId = null;
}

window.editCategory = (catId) => {
  const cat = categoriesList.find(c => c.id === catId);
  if (cat) openCategoryModal(cat);
};

window.confirmDeleteCategory = (catId) => {
  const cat = categoriesList.find(c => c.id === catId);
  if (!cat) return;
  deletingCategoryId = catId;
  const label = document.getElementById('delete-category-name-label');
  if (label) {
    label.innerHTML = `La categoría <strong>"${cat.nombre}"</strong> será eliminada (${cat.totalProductos || 0} prendas vinculadas).`;
  }
  document.getElementById('delete-category-modal').classList.add('active');
};

async function executeDeleteCategory() {
  if (!deletingCategoryId) return;
  try {
    const res = await authFetch(`/api/categories/${deletingCategoryId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Categoría eliminada exitosamente', 'success');
      document.getElementById('delete-category-modal').classList.remove('active');
      deletingCategoryId = null;
      await loadDashboardData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error al eliminar categoría', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  }
}

async function handleSaveCategory(e) {
  e.preventDefault();
  const id = document.getElementById('form-category-id').value;
  const nombre = document.getElementById('form-category-nombre').value.trim();
  const descripcion = document.getElementById('form-category-descripcion').value.trim();
  const imagen = document.getElementById('category-image-url').value.trim();

  if (!nombre) {
    return showToast('El nombre de la categoría es obligatorio', 'error');
  }

  const payload = { nombre, descripcion, imagen };
  const isEditing = Boolean(id);
  const url = isEditing ? `/api/categories/${id}` : '/api/categories';
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const saved = await res.json();
      showToast(`Categoría "${saved.nombre}" guardada correctamente`, 'success');
      closeCategoryModal();
      await loadDashboardData();

      // Si el modal de producto está abierto, seleccionarla automáticamente
      const prodModal = document.getElementById('product-modal');
      if (prodModal && prodModal.classList.contains('active')) {
        populateCategoryDropdowns(saved.nombre);
      }
    } else {
      const err = await res.json();
      showToast(err.error || 'Error al guardar categoría', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error al conectar con el servidor', 'error');
  }
}

// ==========================================================================
// FORMULARIOS DE BANNERS & PORTADA Y CONFIGURACIÓN
// ==========================================================================
function populateSettingsForm(s) {
  if (!s) return;

  // 1. Banner Superior
  if (s.banner) {
    document.getElementById('banner-enabled').checked = !!s.banner.enabled;
    document.getElementById('banner-text').value = s.banner.text || '';
    document.getElementById('banner-bg-color').value = s.banner.bgColor || '#0d9488';
    document.getElementById('banner-bg-color-picker').value = s.banner.bgColor || '#0d9488';
    document.getElementById('banner-text-color').value = s.banner.textColor || '#ffffff';
    document.getElementById('banner-text-color-picker').value = s.banner.textColor || '#ffffff';
  }

  // 2. Hero
  if (s.hero) {
    document.getElementById('hero-tag').value = s.hero.tag || '';
    document.getElementById('hero-title').value = s.hero.title || '';
    document.getElementById('hero-desc').value = s.hero.description || '';
    document.getElementById('hero-cta').value = s.hero.ctaText || '';
    document.getElementById('hero-image-url').value = s.hero.imageUrl || '';
    document.getElementById('hero-image-preview').src = s.hero.imageUrl || '';
    document.getElementById('hero-badge-title').value = s.hero.badgeTitle || '';
    document.getElementById('hero-badge-text').value = s.hero.badgeText || '';
  }

  // 3. Categorías Cards en Home
  renderCategoryCardsEditor(s.categoryCards || []);

  // 4. Sección de Destacados
  if (s.featuredSection) {
    document.getElementById('featured-title').value = s.featuredSection.title || '';
    document.getElementById('featured-subtitle').value = s.featuredSection.subtitle || '';
  }

  // 5. Configuración General
  document.getElementById('settings-store-name').value = s.storeName || '';
  document.getElementById('settings-whatsapp').value = s.whatsappNumber || '';
  document.getElementById('settings-currency-symbol').value = s.currencySymbol || '$';
  document.getElementById('settings-currency-code').value = s.currencyCode || 'ARS';

  // 6. Métodos de Pago
  const pm = s.paymentMethods || {};
  const yape = pm.yape || {};
  const plin = pm.plin || {};
  const transfer = pm.transferencia || {};
  const delivery = pm.contraentrega || {};

  document.getElementById('payment-yape-enabled').checked = yape.enabled !== false;
  document.getElementById('payment-yape-number').value = yape.number || s.whatsappNumber || '';
  document.getElementById('payment-yape-holder').value = yape.holder || '';

  document.getElementById('payment-plin-enabled').checked = plin.enabled !== false;
  document.getElementById('payment-plin-number').value = plin.number || s.whatsappNumber || '';
  document.getElementById('payment-plin-holder').value = plin.holder || '';

  document.getElementById('payment-transfer-enabled').checked = transfer.enabled !== false;
  document.getElementById('payment-transfer-bank').value = transfer.bank || 'BCP / Interbank';
  document.getElementById('payment-transfer-holder').value = transfer.holder || '';
  document.getElementById('payment-transfer-account').value = transfer.accountNumber || '';
  document.getElementById('payment-transfer-cci').value = transfer.cci || '';

  document.getElementById('payment-delivery-enabled').checked = delivery.enabled !== false;
  document.getElementById('payment-delivery-instructions').value = delivery.instructions || '';
}

function renderCategoryCardsEditor(cards) {
  const container = document.getElementById('category-cards-editor-container');
  if (!container) return;

  const defaultCats = [
    { category: 'Hombre', title: 'Hombre', subtitle: 'Ver prendas', imageUrl: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=800&q=80' },
    { category: 'Mujer', title: 'Mujer', subtitle: 'Ver prendas', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80' },
    { category: 'Accesorios', title: 'Accesorios', subtitle: 'Ver accesorios', imageUrl: 'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=800&q=80' }
  ];

  const items = (cards && cards.length >= 3) ? cards : defaultCats;

  container.innerHTML = items.map((c, idx) => `
    <div class="category-sub-card" data-cat-index="${idx}">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1rem; font-weight: 800; color: var(--accent-light);">
          Colección: ${c.category}
        </h3>
        <span class="badge-tag" style="background: var(--bg-input); font-size: 0.7rem;">Tarjeta #${idx+1}</span>
      </div>
      
      <div class="form-group">
        <label class="form-label">Título en Tarjeta</label>
        <input type="text" class="form-input cat-title-input" value="${c.title || c.category}" />
      </div>

      <div class="form-group">
        <label class="form-label">Subtítulo / CTA</label>
        <input type="text" class="form-input cat-sub-input" value="${c.subtitle || 'Ver prendas'}" />
      </div>

      <div class="form-group">
        <label class="form-label">Foto de Portada</label>
        <input type="file" accept="image/*" class="cat-file-input" style="display: none;" id="cat-file-${idx}" />
        <button type="button" class="btn btn-secondary btn-sm btn-full" onclick="document.getElementById('cat-file-${idx}').click()" style="margin-bottom: 0.5rem;">
          📷 Subir Foto para ${c.category}
        </button>
        <input type="url" class="form-input cat-url-input" value="${c.imageUrl || ''}" placeholder="O URL de imagen" style="font-size: 0.85rem;" />
        <div class="single-img-preview-box" style="height: 130px; margin-top: 0.6rem;">
          <img class="cat-img-preview" src="${c.imageUrl || ''}" alt="${c.title}" />
        </div>
      </div>
    </div>
  `).join('');

  // Event listeners para archivos y URLs de categorías
  items.forEach((c, idx) => {
    const fileInput = document.getElementById(`cat-file-${idx}`);
    const cardEl = container.querySelector(`[data-cat-index="${idx}"]`);
    const urlInput = cardEl.querySelector('.cat-url-input');
    const previewImg = cardEl.querySelector('.cat-img-preview');

    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        const uploadedUrl = await uploadSingleFile(e.target.files[0]);
        if (uploadedUrl) {
          urlInput.value = uploadedUrl;
          previewImg.src = uploadedUrl;
        }
      }
    });

    urlInput.addEventListener('input', (e) => {
      previewImg.src = e.target.value.trim();
    });
  });
}

// Guardar Banners, Portada y Categorías
async function handleSaveBannersAndHome() {
  const saveBtn = document.getElementById('btn-save-banners');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando cambios...';

  // Recolectar datos de Categorías
  const categoryCards = [];
  const catCards = document.querySelectorAll('#category-cards-editor-container .category-sub-card');
  const defaultNames = ['Hombre', 'Mujer', 'Accesorios'];

  catCards.forEach((el, i) => {
    categoryCards.push({
      category: defaultNames[i] || `Cat-${i+1}`,
      title: el.querySelector('.cat-title-input').value.trim(),
      subtitle: el.querySelector('.cat-sub-input').value.trim(),
      imageUrl: el.querySelector('.cat-url-input').value.trim()
    });
  });

  const payload = {
    banner: {
      enabled: document.getElementById('banner-enabled').checked,
      text: document.getElementById('banner-text').value.trim(),
      bgColor: document.getElementById('banner-bg-color').value.trim(),
      textColor: document.getElementById('banner-text-color').value.trim()
    },
    hero: {
      tag: document.getElementById('hero-tag').value.trim(),
      title: document.getElementById('hero-title').value.trim(),
      description: document.getElementById('hero-desc').value.trim(),
      ctaText: document.getElementById('hero-cta').value.trim(),
      imageUrl: document.getElementById('hero-image-url').value.trim(),
      badgeTitle: document.getElementById('hero-badge-title').value.trim(),
      badgeText: document.getElementById('hero-badge-text').value.trim()
    },
    categoryCards,
    featuredSection: {
      title: document.getElementById('featured-title').value.trim(),
      subtitle: document.getElementById('featured-subtitle').value.trim()
    }
  };

  try {
    const res = await authFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Banners y portada actualizados con éxito', 'success');
      await loadDashboardData();
    } else {
      showToast('Error al guardar ajustes', 'error');
    }
  } catch (err) {
    console.error(err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Guardar Banners y Portada';
  }
}

// Guardar Configuración de Tienda, WhatsApp y Métodos de Pago
async function handleSaveStoreSettings() {
  const saveBtn = document.getElementById('btn-save-settings');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  const payload = {
    storeName: document.getElementById('settings-store-name').value.trim(),
    whatsappNumber: document.getElementById('settings-whatsapp').value.trim(),
    currencySymbol: document.getElementById('settings-currency-symbol').value.trim(),
    currencyCode: document.getElementById('settings-currency-code').value.trim(),
    paymentMethods: {
      yape: {
        enabled: document.getElementById('payment-yape-enabled').checked,
        number: document.getElementById('payment-yape-number').value.trim(),
        holder: document.getElementById('payment-yape-holder').value.trim()
      },
      plin: {
        enabled: document.getElementById('payment-plin-enabled').checked,
        number: document.getElementById('payment-plin-number').value.trim(),
        holder: document.getElementById('payment-plin-holder').value.trim()
      },
      transferencia: {
        enabled: document.getElementById('payment-transfer-enabled').checked,
        bank: document.getElementById('payment-transfer-bank').value.trim(),
        holder: document.getElementById('payment-transfer-holder').value.trim(),
        accountNumber: document.getElementById('payment-transfer-account').value.trim(),
        cci: document.getElementById('payment-transfer-cci').value.trim()
      },
      contraentrega: {
        enabled: document.getElementById('payment-delivery-enabled').checked,
        instructions: document.getElementById('payment-delivery-instructions').value.trim()
      }
    }
  };

  if (!payload.storeName || !payload.whatsappNumber) {
    showToast('El nombre de la tienda y el WhatsApp son requeridos', 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Guardar Configuración y Métodos de Pago';
    return;
  }

  try {
    const res = await authFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Configuración y métodos de pago guardados con éxito', 'success');
      await loadDashboardData();
    } else {
      showToast('Error al guardar configuración', 'error');
    }
  } catch (err) {
    console.error(err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Guardar Configuración y Métodos de Pago';
  }
}

// ==========================================================================
// MODAL DE PRODUCTO (CREAR & EDITAR)
// ==========================================================================
function openProductModal(productToEdit = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('modal-form-title');
  const form = document.getElementById('product-form');

  activeSizes.clear();
  activeColors.clear();
  currentProductImages = [];

  const initialCategory = productToEdit ? (productToEdit.categoria || '') : '';
  populateCategoryDropdowns(initialCategory);

  if (productToEdit) {
    title.textContent = `Editar: ${productToEdit.nombre}`;
    document.getElementById('form-product-id').value = productToEdit.id;
    document.getElementById('form-nombre').value = productToEdit.nombre || '';
    document.getElementById('form-categoria').value = productToEdit.categoria || '';
    document.getElementById('form-precio').value = productToEdit.precio || '';
    document.getElementById('form-stock').value = productToEdit.stock !== undefined ? productToEdit.stock : 10;
    document.getElementById('form-tag').value = productToEdit.tag || '';
    document.getElementById('form-destacado').checked = !!productToEdit.destacado;
    document.getElementById('form-descripcion').value = productToEdit.descripcion || '';

    (productToEdit.tallas || []).forEach(t => activeSizes.add(t));
    (productToEdit.colores || []).forEach(c => activeColors.add(c));
    currentProductImages = [...(productToEdit.imagenes || [])];
  } else {
    title.textContent = 'Crear Nuevo Producto';
    form.reset();
    document.getElementById('form-product-id').value = '';
    document.getElementById('form-stock').value = 10;
    ['S', 'M', 'L', 'XL'].forEach(t => activeSizes.add(t));
    ['Negro', 'Blanco'].forEach(c => activeColors.add(c));
  }

  renderSizeChips();
  renderColorChips();
  renderImagePreviews();

  modal.classList.add('active');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('active');
}

function renderSizeChips() {
  const container = document.getElementById('size-chips-container');
  const allSizes = [...new Set([...DEFAULT_SIZES, ...activeSizes])];

  container.innerHTML = allSizes.map(size => `
    <button type="button" class="chip-btn ${activeSizes.has(size) ? 'selected' : ''}" data-size="${size}">
      ${size}
    </button>
  `).join('');

  container.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.size;
      if (activeSizes.has(s)) {
        activeSizes.delete(s);
      } else {
        activeSizes.add(s);
      }
      renderSizeChips();
    });
  });
}

function renderColorChips() {
  const container = document.getElementById('color-chips-container');
  const allColors = [...new Set([...DEFAULT_COLORS, ...activeColors])];

  container.innerHTML = allColors.map(color => `
    <button type="button" class="chip-btn ${activeColors.has(color) ? 'selected' : ''}" data-color="${color}">
      ${color}
    </button>
  `).join('');

  container.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = btn.dataset.color;
      if (activeColors.has(c)) {
        activeColors.delete(c);
      } else {
        activeColors.add(c);
      }
      renderColorChips();
    });
  });
}

let draggedImageIndex = null;

function renderImagePreviews() {
  const container = document.getElementById('images-preview-list');
  if (!container) return;

  if (currentProductImages.length === 0) {
    container.innerHTML = `<span style="font-size: 0.825rem; color: var(--text-dim); padding: 0.5rem 0;">No hay fotos cargadas aún.</span>`;
    return;
  }

  container.innerHTML = currentProductImages.map((url, index) => `
    <div class="image-preview-item ${index === 0 ? 'is-cover' : ''}" 
         draggable="true" 
         data-index="${index}" 
         title="Arrastra para reordenar la foto">
      <span class="preview-order-badge ${index === 0 ? 'badge-cover' : ''}">
        ${index === 0 ? '★ Portada' : `#${index + 1}`}
      </span>
      <img src="${url}" alt="Foto ${index + 1}" draggable="false" />
      
      <div class="image-preview-actions">
        ${index > 0 ? `<button type="button" class="img-move-btn" onclick="event.stopPropagation(); moveImage(${index}, -1)" title="Mover a la izquierda">◀</button>` : '<span></span>'}
        ${index < currentProductImages.length - 1 ? `<button type="button" class="img-move-btn" onclick="event.stopPropagation(); moveImage(${index}, 1)" title="Mover a la derecha">▶</button>` : '<span></span>'}
      </div>
      
      <button type="button" class="image-remove-btn" onclick="event.stopPropagation(); removeImage(${index})" title="Quitar foto">&times;</button>
    </div>
  `).join('');

  // Eventos de Drag & Drop para ordenar fotos
  const items = container.querySelectorAll('.image-preview-item');
  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedImageIndex = parseInt(item.dataset.index, 10);
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedImageIndex);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      items.forEach(i => i.classList.remove('drag-over'));
      draggedImageIndex = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const targetIndex = parseInt(item.dataset.index, 10);
      if (draggedImageIndex !== null && draggedImageIndex !== targetIndex) {
        const [movedUrl] = currentProductImages.splice(draggedImageIndex, 1);
        currentProductImages.splice(targetIndex, 0, movedUrl);
        renderImagePreviews();
      }
    });
  });
}

window.moveImage = (index, delta) => {
  const newIndex = index + delta;
  if (newIndex >= 0 && newIndex < currentProductImages.length) {
    const [moved] = currentProductImages.splice(index, 1);
    currentProductImages.splice(newIndex, 0, moved);
    renderImagePreviews();
  }
};

window.removeImage = (index) => {
  currentProductImages.splice(index, 1);
  renderImagePreviews();
};

window.editProduct = (productId) => {
  const prod = products.find(p => p.id === productId);
  if (prod) openProductModal(prod);
};

/**
 * Transforma y redimensiona cualquier imagen subida a un tamaño estándar uniforme
 * (1000x1250 px, proporción 4:5) con recorte centrado y compresión optimizada.
 */
function normalizeImageFile(file, targetWidth = 1000, targetHeight = 1250, quality = 0.88) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // Cálculo de recorte cover centrado
        const targetRatio = targetWidth / targetHeight;
        const sourceRatio = img.width / img.height;
        let sourceX = 0;
        let sourceY = 0;
        let sourceW = img.width;
        let sourceH = img.height;

        if (sourceRatio > targetRatio) {
          sourceW = img.height * targetRatio;
          sourceX = (img.width - sourceW) / 2;
        } else {
          sourceH = img.width / targetRatio;
          // En fotos de moda y personas, enfocar la parte superior (cabeza, rostro y torso)
          sourceY = Math.max(0, (img.height - sourceH) * 0.08);
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, targetWidth, targetHeight);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const standardizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "-gallery.jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(standardizedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// Subir archivo individual con transformación automática
async function uploadSingleFile(file) {
  if (!file) return null;

  showToast('Estandarizando tamaño de imagen...', 'info');

  try {
    const processedFile = await normalizeImageFile(file, 1000, 1250, 0.88);
    const formData = new FormData();
    formData.append('imagen', processedFile);

    const res = await authFetch('/api/admin/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.success && data.url) {
      showToast('Foto estandarizada y cargada con éxito', 'success');
      return data.url;
    } else {
      showToast(data.error || 'Error al subir foto', 'error');
      return null;
    }
  } catch (error) {
    console.error('Error al procesar/subir imagen:', error);
    showToast('Error al conectar con el servidor', 'error');
    return null;
  }
}

// Guardar Producto
async function handleSaveProduct(e) {
  e.preventDefault();

  const id = document.getElementById('form-product-id').value;
  const nombre = document.getElementById('form-nombre').value.trim();
  const categoria = document.getElementById('form-categoria').value.trim();
  const precio = parseFloat(document.getElementById('form-precio').value);
  const stock = parseInt(document.getElementById('form-stock').value, 10) || 0;
  const tag = document.getElementById('form-tag').value.trim();
  const destacado = document.getElementById('form-destacado').checked;
  const descripcion = document.getElementById('form-descripcion').value.trim();

  if (!nombre || isNaN(precio) || !categoria) {
    showToast('Por favor completa nombre, precio y categoría', 'error');
    return;
  }

  const payload = {
    nombre,
    categoria,
    precio,
    stock,
    tag,
    destacado,
    descripcion,
    tallas: Array.from(activeSizes),
    colores: Array.from(activeColors),
    imagenes: currentProductImages
  };

  const isEditing = Boolean(id);
  const url = isEditing ? `/api/products/${id}` : '/api/products';
  const method = isEditing ? 'PUT' : 'POST';

  const saveBtn = document.getElementById('btn-save-product');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  try {
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(isEditing ? 'Prenda actualizada correctamente' : 'Prenda agregada al catálogo', 'success');
      closeProductModal();
      await loadDashboardData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error al guardar', 'error');
    }
  } catch (error) {
    console.error('Error al guardar:', error);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar Producto';
  }
}

// ==========================================================================
// ELIMINACIÓN DE PRODUCTO
// ==========================================================================
window.confirmDelete = (productId) => {
  deletingProductId = productId;
  const prod = products.find(p => p.id === productId);
  document.getElementById('delete-product-name-label').textContent =
    `¿Estás seguro de que deseas eliminar "${prod ? prod.nombre : productId}"?`;
  document.getElementById('delete-modal').classList.add('active');
};

async function executeDelete() {
  if (!deletingProductId) return;

  const btn = document.getElementById('btn-confirm-delete');
  btn.disabled = true;
  btn.textContent = 'Eliminando...';

  try {
    const res = await authFetch(`/api/products/${deletingProductId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showToast('Prenda eliminada del catálogo', 'success');
      document.getElementById('delete-modal').classList.remove('active');
      deletingProductId = null;
      await loadDashboardData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error al eliminar', 'error');
    }
  } catch (error) {
    console.error('Error al eliminar:', error);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Eliminar';
  }
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ==========================================================================
// SETUP EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
  // Tabs Switcher
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Login Form
  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('login-password').value.trim();

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        currentAdminToken = data.token;
        sessionStorage.setItem('aura_admin_token', currentAdminToken);
        showToast('Bienvenido al Panel de Control', 'success');
        showDashboard();
      } else {
        showToast('Contraseña incorrecta', 'error');
      }
    } catch (err) {
      showToast('Error al conectar con el servidor', 'error');
    }
  });

  // Pestañas del Admin
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('aura_admin_token');
    currentAdminToken = '';
    showToast('Sesión cerrada');
    showLogin();
  });

  // Buscador y Filtro Productos
  document.getElementById('admin-search-input').addEventListener('input', renderProductsTable);
  document.getElementById('admin-category-filter').addEventListener('change', renderProductsTable);

  // Abrir y Cerrar Modal Producto
  document.getElementById('btn-open-create-modal').addEventListener('click', () => openProductModal());
  document.getElementById('btn-close-product-modal').addEventListener('click', closeProductModal);
  document.getElementById('btn-cancel-product-modal').addEventListener('click', closeProductModal);

  // Form Submit Producto
  document.getElementById('product-form').addEventListener('submit', handleSaveProduct);

  // Botón Rápido "+ Nueva" dentro del modal de producto
  const quickNewCatBtn = document.getElementById('btn-quick-new-category');
  if (quickNewCatBtn) {
    quickNewCatBtn.addEventListener('click', () => openCategoryModal());
  }

  // Abrir y Cerrar Modal Categoría
  const openCatModalBtn = document.getElementById('btn-open-category-modal');
  if (openCatModalBtn) {
    openCatModalBtn.addEventListener('click', () => openCategoryModal());
  }

  const closeCatModalBtn = document.getElementById('btn-close-category-modal');
  if (closeCatModalBtn) closeCatModalBtn.addEventListener('click', closeCategoryModal);

  const cancelCatModalBtn = document.getElementById('btn-cancel-category-modal');
  if (cancelCatModalBtn) cancelCatModalBtn.addEventListener('click', closeCategoryModal);

  // Submit Categoría Form
  const categoryForm = document.getElementById('category-form');
  if (categoryForm) categoryForm.addEventListener('submit', handleSaveCategory);

  // Subida de foto de Categoría
  const catDropzone = document.getElementById('category-dropzone');
  const catFileInput = document.getElementById('category-file-input');
  const catUrlInput = document.getElementById('category-image-url');
  const catPreviewWrap = document.getElementById('category-image-preview-wrap');
  const catPreviewImg = document.getElementById('category-image-preview');

  if (catDropzone && catFileInput) {
    catDropzone.addEventListener('click', () => catFileInput.click());
    catFileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        const url = await uploadSingleFile(e.target.files[0]);
        if (url) {
          catUrlInput.value = url;
          catPreviewImg.src = url;
          catPreviewWrap.style.display = 'block';
        }
      }
    });
  }

  const btnApplyCatUrl = document.getElementById('btn-apply-category-url');
  if (btnApplyCatUrl && catUrlInput) {
    btnApplyCatUrl.addEventListener('click', () => {
      const url = catUrlInput.value.trim();
      if (url) {
        catPreviewImg.src = url;
        catPreviewWrap.style.display = 'block';
        showToast('Vista previa de categoría actualizada');
      }
    });
  }

  // Eliminar Categoría Modal
  const cancelDelCatBtn = document.getElementById('btn-cancel-delete-category');
  if (cancelDelCatBtn) {
    cancelDelCatBtn.addEventListener('click', () => {
      document.getElementById('delete-category-modal').classList.remove('active');
      deletingCategoryId = null;
    });
  }

  const confirmDelCatBtn = document.getElementById('btn-confirm-delete-category');
  if (confirmDelCatBtn) confirmDelCatBtn.addEventListener('click', executeDeleteCategory);

  // Guardar Banners & Portada
  document.getElementById('btn-save-banners').addEventListener('click', handleSaveBannersAndHome);

  // Guardar Configuración Tienda
  document.getElementById('btn-save-settings').addEventListener('click', handleSaveStoreSettings);

  // Color Pickers sincronizados con inputs de texto
  const bgPicker = document.getElementById('banner-bg-color-picker');
  const bgText = document.getElementById('banner-bg-color');
  bgPicker.addEventListener('input', (e) => bgText.value = e.target.value);
  bgText.addEventListener('input', (e) => bgPicker.value = e.target.value);

  const txtPicker = document.getElementById('banner-text-color-picker');
  const txtText = document.getElementById('banner-text-color');
  txtPicker.addEventListener('input', (e) => txtText.value = e.target.value);
  txtText.addEventListener('input', (e) => txtPicker.value = e.target.value);

  // Subida de foto Hero
  const heroDropzone = document.getElementById('hero-dropzone');
  const heroFileInput = document.getElementById('hero-file-input');
  const heroUrlInput = document.getElementById('hero-image-url');
  const heroPreview = document.getElementById('hero-image-preview');

  heroDropzone.addEventListener('click', () => heroFileInput.click());
  heroFileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      const url = await uploadSingleFile(e.target.files[0]);
      if (url) {
        heroUrlInput.value = url;
        heroPreview.src = url;
      }
    }
  });

  document.getElementById('btn-apply-hero-url').addEventListener('click', () => {
    const url = heroUrlInput.value.trim();
    if (url) {
      heroPreview.src = url;
      showToast('Vista previa de portada actualizada');
    }
  });

  // Tallas y Colores Personalizados en Producto
  document.getElementById('btn-add-custom-size').addEventListener('click', () => {
    const input = document.getElementById('input-custom-size');
    const val = input.value.trim().toUpperCase();
    if (val) {
      activeSizes.add(val);
      input.value = '';
      renderSizeChips();
    }
  });

  document.getElementById('btn-add-custom-color').addEventListener('click', () => {
    const input = document.getElementById('input-custom-color');
    const val = input.value.trim();
    if (val) {
      activeColors.add(val);
      input.value = '';
      renderColorChips();
    }
  });

  // Subida de foto de producto
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('file-upload-input');
  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      showToast(`Procesando ${files.length} foto(s)...`, 'info');
      let uploadedCount = 0;

      for (const file of files) {
        const url = await uploadSingleFile(file);
        if (url) {
          currentProductImages.push(url);
          uploadedCount++;
        }
      }

      fileInput.value = '';
      renderImagePreviews();
      if (uploadedCount > 0) {
        showToast(`${uploadedCount} foto(s) agregada(s) a la galería`, 'success');
      }
    }
  });

  document.getElementById('btn-add-image-url').addEventListener('click', () => {
    const input = document.getElementById('input-image-url');
    const url = input.value.trim();
    if (url) {
      currentProductImages.push(url);
      input.value = '';
      renderImagePreviews();
      showToast('Enlace agregado');
    }
  });

  // Modal Eliminar
  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    document.getElementById('delete-modal').classList.remove('active');
    deletingProductId = null;
  });

  document.getElementById('btn-confirm-delete').addEventListener('click', executeDelete);
}
