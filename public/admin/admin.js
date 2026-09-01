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
  if (currentAdminToken) {
    showDashboard();
  } else {
    showLogin();
  }

  setupEventListeners();
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
function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  const targetPane = document.getElementById(`tab-content-${tabId}`);
  const targetBtn = document.getElementById(`tab-btn-${tabId}`);

  if (targetPane) targetPane.style.display = 'block';
  if (targetBtn) targetBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
    availableCategories = catRes.ok ? await catRes.json() : [];

    // 4. Actualizar Métricas y Tabla
    updateMetrics();
    populateCategoryFilters();
    renderProductsTable();
  } catch (error) {
    console.error('Error al cargar datos del dashboard:', error);
    showToast('Error al conectar con el servidor', 'error');
  }
}

function updateMetrics() {
  const totalProducts = products.length;
  const categoriesCount = new Set(products.map(p => p.categoria)).size;
  const featuredCount = products.filter(p => p.destacado).length;
  const lowStockCount = products.filter(p => (p.stock || 0) <= 5).length;

  document.getElementById('metric-total-products').textContent = totalProducts;
  document.getElementById('metric-total-categories').textContent = categoriesCount;
  document.getElementById('metric-total-featured').textContent = featuredCount;
  document.getElementById('metric-total-low-stock').textContent = lowStockCount;
}

function populateCategoryFilters() {
  const filterSelect = document.getElementById('admin-category-filter');
  const datalist = document.getElementById('categories-datalist');

  filterSelect.innerHTML = '<option value="Todos">Todas las Categorías</option>';
  datalist.innerHTML = '';

  const uniqueCats = ['Hombre', 'Mujer', 'Accesorios', ...availableCategories.filter(c => c !== 'Todos')];
  const distinct = [...new Set(uniqueCats)];

  distinct.forEach(cat => {
    filterSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    datalist.innerHTML += `<option value="${cat}"></option>`;
  });
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

// Guardar Configuración de Tienda y WhatsApp
async function handleSaveStoreSettings() {
  const saveBtn = document.getElementById('btn-save-settings');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  const payload = {
    storeName: document.getElementById('settings-store-name').value.trim(),
    whatsappNumber: document.getElementById('settings-whatsapp').value.trim(),
    currencySymbol: document.getElementById('settings-currency-symbol').value.trim(),
    currencyCode: document.getElementById('settings-currency-code').value.trim()
  };

  if (!payload.storeName || !payload.whatsappNumber) {
    showToast('El nombre de la tienda y el WhatsApp son requeridos', 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Guardar Configuración';
    return;
  }

  try {
    const res = await authFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Configuración de tienda y WhatsApp actualizada', 'success');
      await loadDashboardData();
    } else {
      showToast('Error al guardar configuración', 'error');
    }
  } catch (err) {
    console.error(err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Guardar Configuración';
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

function renderImagePreviews() {
  const container = document.getElementById('images-preview-list');

  if (currentProductImages.length === 0) {
    container.innerHTML = `<span style="font-size: 0.825rem; color: var(--text-dim); padding: 0.5rem 0;">No hay fotos cargadas aún.</span>`;
    return;
  }

  container.innerHTML = currentProductImages.map((url, index) => `
    <div class="image-preview-item">
      <img src="${url}" alt="Preview" />
      <button type="button" class="image-remove-btn" onclick="removeImage(${index})" title="Quitar foto">&times;</button>
    </div>
  `).join('');
}

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
          sourceY = (img.height - sourceH) / 2;
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
    if (e.target.files && e.target.files[0]) {
      const url = await uploadSingleFile(e.target.files[0]);
      if (url) {
        currentProductImages.push(url);
        renderImagePreviews();
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
