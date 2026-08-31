/**
 * Gestión del estado del Carrito de Compras (localStorage Persistente) - GALLERY STORE
 */

const PRIMARY_KEY = 'gallery_store_cart_v1';
const LEGACY_KEY = 'aura_clothing_cart_v1';

export function getCart() {
  try {
    let raw = localStorage.getItem(PRIMARY_KEY);
    
    // Migración automática si existe carrito anterior
    if (!raw) {
      const legacyRaw = localStorage.getItem(LEGACY_KEY);
      if (legacyRaw) {
        localStorage.setItem(PRIMARY_KEY, legacyRaw);
        raw = legacyRaw;
      }
    }

    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Sanitizar y asegurar que los precios sean numéricos
    return parsed.map(item => ({
      ...item,
      precioUnitario: Number(item.precioUnitario) || 0,
      cantidad: Math.max(1, parseInt(item.cantidad, 10) || 1)
    }));
  } catch (error) {
    console.error('Error al leer el carrito de localStorage:', error);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(PRIMARY_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
  } catch (error) {
    console.error('Error al guardar el carrito:', error);
  }
}

// Sincronización multi-pestaña
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === PRIMARY_KEY) {
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: getCart() } }));
    }
  });
}

export function addToCart(product, talla, color, cantidad = 1) {
  const cart = getCart();
  const itemKey = `${product.id}-${talla}-${color}`;
  const existingIndex = cart.findIndex(item => item.key === itemKey);
  const price = Number(product.precio) || 0;

  if (existingIndex > -1) {
    cart[existingIndex].cantidad += Math.max(1, parseInt(cantidad, 10) || 1);
  } else {
    cart.push({
      key: itemKey,
      productoId: product.id,
      nombre: product.nombre,
      precioUnitario: price,
      talla: talla || 'Única',
      color: color || 'Único',
      cantidad: Math.max(1, parseInt(cantidad, 10) || 1),
      imagen: product.imagenes && product.imagenes.length ? product.imagenes[0] : ''
    });
  }

  saveCart(cart);
}

export function updateQuantity(key, cantidad) {
  let cart = getCart();
  const numQty = parseInt(cantidad, 10);
  
  if (numQty <= 0) {
    cart = cart.filter(item => item.key !== key);
  } else {
    const item = cart.find(item => item.key === key);
    if (item) {
      item.cantidad = numQty;
    }
  }
  saveCart(cart);
}

export function removeFromCart(key) {
  let cart = getCart();
  cart = cart.filter(item => item.key !== key);
  saveCart(cart);
}

export function clearCart() {
  saveCart([]);
}

export function getCartTotal() {
  const cart = getCart();
  return cart.reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
}

export function getCartCount() {
  const cart = getCart();
  return cart.reduce((acc, item) => acc + item.cantidad, 0);
}
