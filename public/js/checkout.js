/**
 * Módulo de Checkout, Geolocalización y Redirección a WhatsApp
 */
import { getCart, getCartTotal, clearCart } from './cart.js';
import { formatPrice, showToast, switchView } from './ui.js';
import { initGeoSelectors } from './geo-peru.js';

let storeConfig = {
  whatsappNumber: '51988182681',
  storeName: 'Gallery | Store',
  paymentMethods: {}
};

let selectedPaymentKey = '';

export function setCheckoutConfig(config) {
  storeConfig = { ...storeConfig, ...config };
  renderPaymentMethods();
}

export function initCheckout() {
  initGeoSelectors('checkout-dept', 'checkout-prov', 'checkout-dist');
  renderPaymentMethods();
  renderCheckoutSummary();
  setupCheckoutForm();
}

export function renderPaymentMethods() {
  const container = document.getElementById('checkout-payment-methods');
  const detailsBox = document.getElementById('payment-details-box');
  if (!container) return;

  const defaultMethods = {
    yape: { enabled: true, title: 'Yape', number: storeConfig.whatsappNumber || '988 182 681', holder: storeConfig.storeName || 'Gallery Store' },
    plin: { enabled: true, title: 'Plin', number: storeConfig.whatsappNumber || '988 182 681', holder: storeConfig.storeName || 'Gallery Store' },
    transferencia: { enabled: true, title: 'Transferencia Bancaria', bank: 'BCP / Interbank', accountNumber: '191-78901234-0-55', cci: '002-191-007890123455-12', holder: storeConfig.storeName || 'Gallery Store' },
    contraentrega: { enabled: true, title: 'Pago Contra Entrega', instructions: 'Paga en efectivo al recibir tu pedido (Sujeto a cobertura)' }
  };

  const pm = (storeConfig.paymentMethods && Object.keys(storeConfig.paymentMethods).length > 0)
    ? storeConfig.paymentMethods
    : defaultMethods;

  const activeKeys = Object.keys(pm).filter(k => pm[k] && pm[k].enabled !== false);

  if (activeKeys.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">Coordinación de pago directa por WhatsApp</p>`;
    if (detailsBox) detailsBox.style.display = 'none';
    return;
  }

  // Preseleccionar primero si no hay selección
  if (!selectedPaymentKey || !pm[selectedPaymentKey] || pm[selectedPaymentKey].enabled === false) {
    selectedPaymentKey = activeKeys[0];
  }

  container.innerHTML = activeKeys.map(key => {
    const method = pm[key];
    const isSelected = key === selectedPaymentKey;
    let badgeClass = 'yape';
    let badgeLabel = 'YAPE';

    if (key === 'plin') { badgeClass = 'plin'; badgeLabel = 'PLIN'; }
    else if (key === 'transferencia') { badgeClass = 'transfer'; badgeLabel = 'BANCO'; }
    else if (key === 'contraentrega') { badgeClass = 'delivery'; badgeLabel = 'EFECTIVO'; }

    return `
      <label class="payment-card-option ${isSelected ? 'selected' : ''}" data-pay-key="${key}">
        <input type="radio" name="metodo_pago" value="${key}" ${isSelected ? 'checked' : ''} />
        <span class="payment-badge ${badgeClass}">${badgeLabel}</span>
        <span style="font-weight: 700; font-size: 0.88rem;">${method.title || key.toUpperCase()}</span>
      </label>
    `;
  }).join('');

  // Event listeners para selección
  container.querySelectorAll('.payment-card-option').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.payment-card-option').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      selectedPaymentKey = card.dataset.payKey;
      updatePaymentDetailsBox(pm[selectedPaymentKey], selectedPaymentKey);
    });
  });

  updatePaymentDetailsBox(pm[selectedPaymentKey], selectedPaymentKey);
}

function updatePaymentDetailsBox(methodData, key) {
  const detailsBox = document.getElementById('payment-details-box');
  if (!detailsBox || !methodData) return;

  let html = '';
  if (key === 'yape' || key === 'plin') {
    html = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <strong>📱 ${key.toUpperCase()}:</strong> <span id="copy-phone-val">${methodData.number || storeConfig.whatsappNumber || ''}</span>
          ${methodData.holder ? `<div style="font-size: 0.8rem; color: var(--text-muted);">Titular: ${methodData.holder}</div>` : ''}
        </div>
        <button type="button" class="copy-btn" onclick="navigator.clipboard.writeText('${methodData.number || storeConfig.whatsappNumber || ''}'); this.textContent='✓ Copiado!'; setTimeout(() => this.textContent='Copiar Número', 2000);">
          Copiar Número
        </button>
      </div>
      <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 0.4rem;">
        💡 Al confirmar el pedido, enviarás la captura o comprobante directo a nuestro WhatsApp.
      </div>
    `;
  } else if (key === 'transferencia') {
    html = `
      <div>
        <strong>🏦 Banco:</strong> ${methodData.bank || 'BCP / Interbank'}
        ${methodData.holder ? ` · <strong>Titular:</strong> ${methodData.holder}` : ''}
        <div style="margin-top: 0.35rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
          <div><strong>N° Cuenta:</strong> <code>${methodData.accountNumber || ''}</code></div>
          ${methodData.accountNumber ? `<button type="button" class="copy-btn" onclick="navigator.clipboard.writeText('${methodData.accountNumber}'); this.textContent='✓ Copiado!'; setTimeout(() => this.textContent='Copiar', 2000);">Copiar</button>` : ''}
        </div>
        ${methodData.cci ? `
          <div style="margin-top: 0.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
            <div><strong>CCI:</strong> <code>${methodData.cci}</code></div>
            <button type="button" class="copy-btn" onclick="navigator.clipboard.writeText('${methodData.cci}'); this.textContent='✓ Copiado!'; setTimeout(() => this.textContent='Copiar', 2000);">Copiar</button>
          </div>
        ` : ''}
      </div>
    `;
  } else if (key === 'contraentrega') {
    html = `
      <div>
        <strong>💵 Pago Contra Entrega:</strong>
        <div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 0.2rem;">
          ${methodData.instructions || 'Paga en efectivo al recibir tu pedido en la puerta de tu casa. Nuestro repartidor llevará cambio si lo solicitas.'}
        </div>
      </div>
    `;
  }

  detailsBox.innerHTML = html;
  detailsBox.style.display = html ? 'block' : 'none';
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
    const departamento = formData.get('departamento')?.trim();
    const provincia = formData.get('provincia')?.trim();
    const distrito = formData.get('distrito')?.trim();
    const direccion = formData.get('direccion')?.trim();
    const notas = formData.get('notas')?.trim() || 'Ninguna';
    const metodoPago = selectedPaymentKey || formData.get('metodo_pago') || 'yape';

    if (!nombre || !telefono || !departamento || !provincia || !distrito || !direccion) {
      showToast('Por favor completa todos los campos de entrega obligatorios (*)', 'warning');
      return;
    }

    const pedido = {
      cliente: { nombre, telefono, departamento, provincia, distrito, direccion, notas, metodoPago },
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
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  let msg = `🛍️ *PEDIDO — ${brandName}*\n`;
  msg += `_Orden #${orderId} · ${dateStr} · ${timeStr}_\n`;
  msg += `──────────────\n\n`;

  msg += `📋 *PRENDAS SOLICITADAS:*\n`;
  pedido.items.forEach(item => {
    const subtotal = formatPrice(item.precioUnitario * item.cantidad);
    msg += `• *${item.cantidad}x ${item.nombre}*\n`;
    msg += `   └ Talla: ${item.talla} | Color: ${item.color}\n`;
    msg += `   └ Subtotal: ${subtotal}\n\n`;
  });

  msg += `──────────────\n`;
  msg += `💳 *TOTAL A PAGAR:* *${formatPrice(pedido.total)}*\n`;
  msg += `──────────────\n\n`;

  msg += `📍 *DATOS DE ENTREGA:*\n`;
  msg += `👤 *Cliente:* ${pedido.cliente.nombre}\n`;
  msg += `📱 *WhatsApp:* ${pedido.cliente.telefono}\n`;
  msg += `🗺️ *Ubicación:* ${pedido.cliente.departamento} › ${pedido.cliente.provincia} › ${pedido.cliente.distrito}\n`;
  msg += `🏠 *Dirección:* ${pedido.cliente.direccion}\n`;
  if (pedido.cliente.notas && pedido.cliente.notas !== 'Ninguna' && pedido.cliente.notas.trim() !== '') {
    msg += `📝 *Referencia:* ${pedido.cliente.notas}\n`;
  }

  // Método de Pago
  let payLabel = pedido.cliente.metodoPago ? pedido.cliente.metodoPago.toUpperCase() : 'YAPE';
  if (pedido.cliente.metodoPago === 'transferencia') payLabel = 'Transferencia Bancaria';
  else if (pedido.cliente.metodoPago === 'contraentrega') payLabel = 'Pago Contra Entrega (Efectivo)';
  
  msg += `\n💳 *MÉTODO DE PAGO ELEGIDO:*\n`;
  msg += `💵 *${payLabel}*\n`;

  msg += `\n─────────────\n`;
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

