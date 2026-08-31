/**
 * Gestión del estado del Carrito de Compras (localStorage)
 */

const STORAGE_KEY = 'aura_clothing_cart_v1';

export function getCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error al leer el carrito de localStorage:', error);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
  } catch (error) {
    console.error('Error al guardar el carrito:', error);
  }
}

export function addToCart(product, talla, color, cantidad = 1) {
  const cart = getCart();
  const itemKey = `${product.id}-${talla}-${color}`;
  const existingIndex = cart.findIndex(item => item.key === itemKey);

  if (existingIndex > -1) {
    cart[existingIndex].cantidad += cantidad;
  } else {
    cart.push({
      key: itemKey,
      productoId: product.id,
      nombre: product.nombre,
      precioUnitario: product.precio,
      talla,
      color,
      cantidad,
      imagen: product.imagenes && product.imagenes.length ? product.imagenes[0] : ''
    });
  }

  saveCart(cart);
}

export function updateQuantity(key, cantidad) {
  let cart = getCart();
  if (cantidad <= 0) {
    cart = cart.filter(item => item.key !== key);
  } else {
    const item = cart.find(item => item.key === key);
    if (item) {
      item.cantidad = cantidad;
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
  return cart.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
}

export function getCartCount() {
  const cart = getCart();
  return cart.reduce((acc, item) => acc + item.cantidad, 0);
}
