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
  let mensaje = `Hola! Quiero hacer este pedido:\n\n`;

  pedido.items.forEach(item => {
    mensaje += `- ${item.cantidad}x ${item.nombre} (Talla ${item.talla}, ${item.color}) - ${formatPrice(item.precioUnitario * item.cantidad)}\n`;
  });

  mensaje += `\nTotal: ${formatPrice(pedido.total)}\n\n`;
  mensaje += `Nombre: ${pedido.cliente.nombre}\n`;
  mensaje += `Teléfono: ${pedido.cliente.telefono}\n`;
  mensaje += `Dirección: ${pedido.cliente.direccion}\n`;
  mensaje += `Notas: ${pedido.cliente.notas}`;

  return mensaje;
}

function procesarPedidoWhatsApp(pedido) {
  const mensajeTexto = generarMensajeWhatsApp(pedido);
  const whatsappUrl = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(mensajeTexto)}`;

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
