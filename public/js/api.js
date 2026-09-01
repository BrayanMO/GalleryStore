/**
 * API Client para la tienda
 */

export async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Error al cargar la configuración');
    return await res.json();
  } catch (error) {
    console.error(error);
    return {
      storeName: 'AURA | Studio & Apparel',
      whatsappNumber: '5491123456789',
      currencySymbol: '$',
      currencyCode: 'ARS'
    };
  }
}

export async function fetchSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Error al cargar ajustes visuales');
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function fetchProducts(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'Todos') query.append('category', params.category);
    if (params.size) query.append('size', params.size);
    if (params.search) query.append('search', params.search);
    if (params.featured) query.append('featured', params.featured);

    const url = `/api/products${query.toString() ? '?' + query.toString() : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener productos');
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fetchProductById(id) {
  try {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) throw new Error('Producto no encontrado');
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function fetchCategories() {
  try {
    const res = await fetch('/api/categories?names=true');
    if (!res.ok) throw new Error('Error al obtener categorías');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      if (typeof data[0] === 'string') return data;
      return ['Todos', ...data.map(c => c.nombre || c.name).filter(Boolean)];
    }
    return ['Todos', 'Hombre', 'Mujer', 'Accesorios'];
  } catch (error) {
    console.error(error);
    return ['Todos', 'Hombre', 'Mujer', 'Accesorios'];
  }
}
