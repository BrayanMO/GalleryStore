/**
 * Módulo de Checkout y Redirección a WhatsApp
 */
import { getCart, getCartTotal, clearCart } from './cart.js';
import { formatPrice, showToast, switchView } from './ui.js';

let storeConfig = {
  whatsappNumber: '5491123456789',
  storeName: 'AURA | Studio & Apparel'
};

export function setCheckoutConfig(config) {
  storeConfig = { ...storeConfig, ...config };
}

export function initCheckout() {
  renderCheckoutSummary();
  setupCheckoutForm();
}

export function renderCheckoutSummary() {
  const container = document.getElementById('checkout-items-summary');
  const totalEl = document.getElementById('checkout-total-val');
  const submitBtn = document.getElementById('checkout-submit-btn');

  if (!container) return;

  const cart = getCart();
  const total = getCartTotal();

  if (totalEl) totalEl.textContent = formatPrice(total);

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 0; color: var(--text-secondary);">
        <p>No tienes productos en tu carrito.</p>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-back-to-catalog" style="margin-top: 1rem;">
          Ir al Catálogo
        </button>
      </div>
    `;

    const backBtn = document.getElementById('btn-back-to-catalog');
    if (backBtn) {
      backBtn.addEventListener('click', () => switchView('catalog'));
    }

    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  if (submitBtn) submitBtn.disabled = false;

  container.innerHTML = cart.map(item => `
    <div class="order-summary-item">
      <div>
        <strong>${item.cantidad}x ${item.nombre}</strong>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">
          Talla: ${item.talla} | Color: ${item.color}
        </div>
      </div>
      <div style="font-weight: 700;">
        ${formatPrice(item.precioUnitario * item.cantidad)}
      </div>
    </div>
  `).join('');
}

function setupCheckoutForm() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const cart = getCart();
    if (cart.length === 0) {
      showToast('Tu carrito está vacío', 'warning');
      return;
    }

    const formData = new FormData(form);
    const nombre = formData.get('nombre')?.trim();
    const telefono = formData.get('telefono')?.trim();
    const direccion = formData.get('direccion')?.trim();
    const notas = formData.get('notas')?.trim() || 'Ninguna';

    if (!nombre || !telefono || !direccion) {
      showToast('Por favor completa todos los campos obligatorios', 'warning');
      return;
    }

    const pedido = {
      cliente: { nombre, telefono, direccion, notas },
      items: cart,
      total: getCartTotal()
    };

    procesarPedidoWhatsApp(pedido);
  });
}

function generarMensajeWhatsApp(pedido) {
  const brandName = (storeConfig.storeName || 'GALLERY').replace(/\|.*/, '').trim().toUpperCase();
  const orderId = `GL-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

  let msg = `🛍️ *PEDIDO — ${brandName}*\n`;
  msg += `_Orden #${orderId} · ${dateStr}_\n`;
  msg += `────────────────────────\n\n`;

  msg += `📋 *PRENDAS SOLICITADAS:*\n`;
  pedido.items.forEach(item => {
    const subtotal = formatPrice(item.precioUnitario * item.cantidad);
    msg += `• *${item.cantidad}x ${item.nombre}*\n`;
    msg += `   └ Talla: ${item.talla} | Color: ${item.color}\n`;
    msg += `   └ Subtotal: ${subtotal}\n\n`;
  });

  msg += `────────────────────────\n`;
  msg += `💳 *TOTAL A PAGAR:* *${formatPrice(pedido.total)}*\n`;
  msg += `────────────────────────\n\n`;

  msg += `📍 *DATOS DE ENTREGA:*\n`;
  msg += `👤 *Cliente:* ${pedido.cliente.nombre}\n`;
  msg += `📱 *WhatsApp:* ${pedido.cliente.telefono}\n`;
  msg += `🏠 *Dirección:* ${pedido.cliente.direccion}\n`;
  if (pedido.cliente.notas && pedido.cliente.notas !== 'Ninguna' && pedido.cliente.notas.trim() !== '') {
    msg += `📝 *Referencia / Notas:* ${pedido.cliente.notas}\n`;
  }

  msg += `\n────────────────────────\n`;
  msg += `_Hola! Quiero coordinar el pago y envío de mi pedido._`;

  return msg;
}

function procesarPedidoWhatsApp(pedido) {
  const mensajeTexto = generarMensajeWhatsApp(pedido);
  
  // Limpiar y formatear número de WhatsApp
  let phone = (storeConfig.whatsappNumber || '').replace(/\D/g, '');
  if (phone.length === 9 && !phone.startsWith('51')) {
    phone = '51' + phone; // Prefijo Perú por defecto para 9 dígitos
  }

  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(mensajeTexto)}`;

  // Mostrar modal de confirmación
  const confirmBackdrop = document.getElementById('confirm-modal-backdrop');
  const confirmPreview = document.getElementById('whatsapp-msg-preview');
  const progressBar = document.getElementById('redirect-progress-fill');
  const manualBtn = document.getElementById('btn-manual-whatsapp');

  if (confirmPreview) confirmPreview.textContent = mensajeTexto;
  if (manualBtn) manualBtn.href = whatsappUrl;

  if (confirmBackdrop) {
    confirmBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Iniciar barra de progreso de 2 segundos antes de redirección
    if (progressBar) {
      progressBar.style.width = '0%';
      setTimeout(() => {
        progressBar.style.width = '100%';
      }, 50);
    }

    // Vaciar carrito
    clearCart();

    // Resetear formulario
    const form = document.getElementById('checkout-form');
    if (form) form.reset();

    // Redirigir a WhatsApp después de 2.2 segundos
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 2200);
  } else {
    clearCart();
    window.location.href = whatsappUrl;
  }
}
