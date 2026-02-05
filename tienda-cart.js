// ============================================
// TIENDA-CART.JS - Gestión del Carrito
// Versión con integración a POS
// ============================================

// ============================================
// RENDERIZAR CARRITO
// ============================================

function renderCart() {
  const cartItems = document.getElementById('cartItems');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartSummary = document.getElementById('cartSummary');

  if (!cartItems || !cartEmpty || !cartSummary) return;

  const cart = window.tiendaCart || [];

  if (cart.length === 0) {
    cartItems.innerHTML = '';
    cartItems.style.display = 'none';
    cartEmpty.style.display = 'block';
    cartSummary.style.display = 'none';
    return;
  }

  cartItems.style.display = 'block';
  cartEmpty.style.display = 'none';
  cartSummary.style.display = 'block';

  cartItems.innerHTML = '';

  cart.forEach((item, index) => {
    const cartItem = createCartItem(item, index);
    cartItems.appendChild(cartItem);
  });

  updateCartSummary();
}

function createCartItem(item, index) {
  const div = document.createElement('div');
  div.className = 'cart-item';

  const imageUrl = item.image_url || 'https://via.placeholder.com/80x80?text=Sin+Imagen';

  div.innerHTML = `
      <img src="${imageUrl}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/80x80?text=Sin+Imagen'">
      <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatPrice(item.price)}</div>
          <div class="cart-item-qty">
              <button class="cart-qty-btn minus-btn" data-index="${index}">
                  <i class="fas fa-minus"></i>
              </button>
              <span class="cart-qty-value">${item.quantity}</span>
              <button class="cart-qty-btn plus-btn" data-index="${index}">
                  <i class="fas fa-plus"></i>
              </button>
          </div>
      </div>
      <button class="cart-item-remove" data-index="${index}">
          <i class="fas fa-trash-alt"></i>
      </button>
  `;

  const minusBtn = div.querySelector('.minus-btn');
  const plusBtn = div.querySelector('.plus-btn');
  const removeBtn = div.querySelector('.cart-item-remove');

  if (minusBtn) minusBtn.addEventListener('click', () => updateCartItemQty(index, -1));
  if (plusBtn) plusBtn.addEventListener('click', () => updateCartItemQty(index, 1));
  if (removeBtn) removeBtn.addEventListener('click', () => removeFromCart(index));

  return div;
}

// ============================================
// ACTUALIZAR CANTIDAD
// ============================================

function updateCartItemQty(index, change) {
  const cart = window.tiendaCart;
  if (!cart[index]) return;

  const newQty = cart[index].quantity + change;

  if (newQty <= 0) {
    removeFromCart(index);
    return;
  }

  if (newQty > cart[index].stock) {
    showToast('Stock insuficiente', 'error');
    return;
  }

  cart[index].quantity = newQty;
  window.tiendaCart = cart;

  saveTiendaCart();
  updateCartBadge();
  renderCart();
}

// ============================================
// REMOVER DEL CARRITO
// ============================================

function removeFromCart(index) {
  const cart = window.tiendaCart;

  if (confirm('¿Eliminar este producto del carrito?')) {
    cart.splice(index, 1);
    window.tiendaCart = cart;

    saveTiendaCart();
    updateCartBadge();
    renderCart();

    showToast('Producto eliminado', 'success');
  }
}

// ============================================
// ACTUALIZAR BADGE
// ============================================

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;

  const cart = window.tiendaCart || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  badge.textContent = totalItems;
  badge.style.display = totalItems > 0 ? 'flex' : 'none';
}

// ============================================
// ACTUALIZAR RESUMEN
// ============================================

function updateCartSummary() {
  const subtotalEl = document.getElementById('subtotalAmount');
  const shippingEl = document.getElementById('shippingAmount');
  const totalEl = document.getElementById('totalAmount');

  if (!subtotalEl || !shippingEl || !totalEl) return;

  const cart = window.tiendaCart || [];

  let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Aplicar descuento si el usuario está registrado
  let discount = 0;
  let discountAmount = 0;
  
  if (typeof getUserDiscount === 'function') {
    discount = getUserDiscount();
    if (discount > 0) {
      discountAmount = Math.round(subtotal * (discount / 100));
      subtotal -= discountAmount;
    }
  }

  let shipping = 0;
  if (subtotal > 0 && subtotal < TIENDA_CONFIG.envioGratis) {
    shipping = TIENDA_CONFIG.costoEnvio;
  }

  const total = subtotal + shipping;

  // Mostrar descuento si aplica
  const summaryContainer = document.querySelector('.cart-summary');
  let discountRow = summaryContainer?.querySelector('.discount-row');
  
  if (discount > 0 && summaryContainer) {
    if (!discountRow) {
      // Crear fila de descuento si no existe
      discountRow = document.createElement('div');
      discountRow.className = 'summary-row discount-row';
      discountRow.innerHTML = `
        <span><i class="fas fa-tag"></i> Descuento (${discount}%):</span>
        <strong id="discountAmount" style="color: var(--secondary);">-${formatPrice(discountAmount)}</strong>
      `;
      
      // Insertar antes de la fila de envío
      const shippingRow = Array.from(summaryContainer.children).find(el => 
        el.textContent.includes('Envío')
      );
      summaryContainer.insertBefore(discountRow, shippingRow);
    } else {
      // Actualizar descuento existente
      const discountEl = discountRow.querySelector('#discountAmount');
      if (discountEl) {
        discountEl.textContent = `-${formatPrice(discountAmount)}`;
      }
    }
  } else if (discountRow) {
    // Remover fila de descuento si ya no aplica
    discountRow.remove();
  }

  subtotalEl.textContent = formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
  shippingEl.textContent = shipping > 0 ? formatPrice(shipping) : 'GRATIS';
  totalEl.textContent = formatPrice(total);
}

// ============================================
// VACIAR CARRITO
// ============================================

function clearCart() {
  if (confirm('¿Vaciar todo el carrito?')) {
    clearTiendaCart();
    updateCartBadge();
    renderCart();
    showToast('Carrito vaciado', 'success');
  }
}

// ============================================
// SETUP DE BOTONES
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const clearCartBtn = document.getElementById('clearCartBtn');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', clearCart);
  }

  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', checkout);
  }
});

// ============================================
// CHECKOUT - GUARDAR EN BD + ENVIAR WHATSAPP
// ============================================

async function checkout() {
  const cart = window.tiendaCart || [];

  if (cart.length === 0) {
    showToast('El carrito está vacío', 'error');
    return;
  }

  // Calcular totales
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let shipping = 0;
  if (subtotal > 0 && subtotal < TIENDA_CONFIG.envioGratis) {
    shipping = TIENDA_CONFIG.costoEnvio;
  }
  const total = subtotal + shipping;

  // Número de pedido único
  const orderNumber = 'WEB-' + Date.now();

  // ---- GUARDAR EN SUPABASE ----
  try {
    if (!tiendaDB) {
      initTiendaDB();
    }

    if (tiendaDB) {
      const orderItems = cart.map(item => ({
        product_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity
      }));

      const { error: orderError } = await tiendaDB
        .from('pending_orders')
        .insert({
          order_number: orderNumber,
          items: orderItems,
          subtotal: subtotal,
          shipping: shipping,
          total: total,
          status: 'pending',
          customer_info: { source: 'tienda_online' }
        });

      if (orderError) {
        console.error('Error guardando pedido:', orderError);
        showToast('Advertencia: pedido no guardado en sistema. Se envía por WhatsApp de todas forma.', 'error');
      } else {
        console.log('Pedido guardado OK:', orderNumber);
      }
    }
  } catch (e) {
    console.error('Error conexión BD:', e);
  }

  // ---- CONSTRUIR MENSAJE WHATSAPP ----
  let message = '*NUEVO PEDIDO - ' + TIENDA_CONFIG.nombre + '*\n\n';
  message += 'Pedido: #' + orderNumber + '\n';
  message += 'PRODUCTOS:\n';

  cart.forEach((item, index) => {
    message += (index + 1) + '. ' + item.name + '\n';
    message += '   Cantidad: ' + item.quantity + '\n';
    message += '   Precio: ' + formatPrice(item.price) + '\n';
    message += '   Subtotal: ' + formatPrice(item.price * item.quantity) + '\n\n';
  });

  message += 'RESUMEN:\n';
  message += 'Subtotal: ' + formatPrice(subtotal) + '\n';
  message += 'Envio: ' + (shipping > 0 ? formatPrice(shipping) : 'GRATIS') + '\n';
  message += 'TOTAL: ' + formatPrice(total) + '\n\n';
  message += 'Este pedido esta en el sistema POS listo para facturar\n';
  message += 'Enviado desde SeArys Store';

  const whatsappNumber = formatWhatsAppNumber(TIENDA_CONFIG.whatsappNumber);
  const whatsappUrl = 'https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent(message);

  window.open(whatsappUrl, '_blank');

  showToast('Pedido enviado correctamente', 'success');

  // Preguntar si vaciar carrito
  setTimeout(() => {
    if (confirm('Pedido enviado a WhatsApp y guardado en el sistema.\n\nDeseas vaciar el carrito?')) {
      clearTiendaCart();
      updateCartBadge();
      renderCart();

      // Cerrar sidebar del carrito
      const sidebar = document.getElementById('cartSidebar');
      const overlay = document.getElementById('cartOverlay');
      if (sidebar) sidebar.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
    }
  }, 1000);
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================

window.renderCart = renderCart;
window.updateCartBadge = updateCartBadge;
window.updateCartItemQty = updateCartItemQty;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.checkout = checkout;

log.success('tienda-cart.js cargado');
