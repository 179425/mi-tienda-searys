// ============================================
// TIENDA-CART.JS - Gestión del Carrito Mejorada
// Con Cupones y Notificaciones
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
      <img src="${imageUrl}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/80x80?text=Sin+Imagen'" loading="lazy">
      <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatPrice(item.price)}</div>
          <div class="cart-item-qty">
              <button class="cart-qty-btn minus-btn" data-index="${index}" aria-label="Disminuir cantidad">
                  <i class="fas fa-minus"></i>
              </button>
              <span class="cart-qty-value">${item.quantity}</span>
              <button class="cart-qty-btn plus-btn" data-index="${index}" aria-label="Aumentar cantidad">
                  <i class="fas fa-plus"></i>
              </button>
          </div>
      </div>
      <button class="cart-item-remove" data-index="${index}" aria-label="Eliminar producto">
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
// ACTUALIZAR RESUMEN CON CUPONES
// ============================================

function updateCartSummary() {
  const subtotalEl = document.getElementById('subtotalAmount');
  const shippingEl = document.getElementById('shippingAmount');
  const totalEl = document.getElementById('totalAmount');

  if (!subtotalEl || !shippingEl || !totalEl) return;

  const cart = window.tiendaCart || [];
  let rawSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let subtotal = rawSubtotal;

  // Aplicar descuento de usuario registrado
  let userDiscount = 0;
  let userDiscountAmount = 0;
  
  if (typeof getUserDiscount === 'function') {
    userDiscount = getUserDiscount();
    if (userDiscount > 0) {
      userDiscountAmount = Math.round(subtotal * (userDiscount / 100));
      subtotal -= userDiscountAmount;
    }
  }

  // Aplicar descuento de cupón
  let couponDiscount = 0;
  let couponDiscountAmount = 0;
  
  if (typeof getCouponDiscount === 'function') {
    couponDiscount = getCouponDiscount();
    if (couponDiscount > 0) {
      couponDiscountAmount = Math.round(subtotal * (couponDiscount / 100));
      subtotal -= couponDiscountAmount;
    }
  }

  // Calcular envío
  let shipping = 0;
  if (subtotal > 0 && subtotal < TIENDA_CONFIG.envioGratis) {
    shipping = TIENDA_CONFIG.costoEnvio;
  }

  const total = subtotal + shipping;

  // Actualizar UI del resumen
  const summaryContainer = document.querySelector('.cart-summary');
  if (!summaryContainer) return;

  // Remover filas de descuento previas
  summaryContainer.querySelectorAll('.discount-row, .coupon-row').forEach(el => el.remove());

  // Agregar fila de descuento de usuario si aplica
  if (userDiscount > 0) {
    const discountRow = document.createElement('div');
    discountRow.className = 'summary-row discount-row';
    discountRow.innerHTML = `
      <span><i class="fas fa-tag"></i> Descuento Usuario (${userDiscount}%):</span>
      <strong style="color: var(--secondary);">-${formatPrice(userDiscountAmount)}</strong>
    `;
    
    const shippingRow = Array.from(summaryContainer.children).find(el => 
      el.textContent.includes('Envío')
    );
    summaryContainer.insertBefore(discountRow, shippingRow);
  }

  // Agregar fila de cupón si aplica
  if (couponDiscount > 0 && window.appliedCoupon) {
    const couponRow = document.createElement('div');
    couponRow.className = 'summary-row coupon-row';
    couponRow.innerHTML = `
      <span>
        <i class="fas fa-ticket-alt"></i> Cupón "${window.appliedCoupon.code}" (${couponDiscount}%):
      </span>
      <strong style="color: var(--secondary);">-${formatPrice(couponDiscountAmount)}</strong>
    `;
    
    const shippingRow = Array.from(summaryContainer.children).find(el => 
      el.textContent.includes('Envío')
    );
    summaryContainer.insertBefore(couponRow, shippingRow);
  }

  // Agregar input de cupón si no existe
  let couponInput = summaryContainer.querySelector('.coupon-input-container');
  if (!couponInput && !window.appliedCoupon) {
    couponInput = document.createElement('div');
    couponInput.className = 'coupon-input-container';
    couponInput.innerHTML = `
      <div class="coupon-input-wrapper">
        <input type="text" id="couponCodeInput" placeholder="Código de cupón" aria-label="Código de cupón">
        <button class="apply-coupon-btn" id="applyCouponBtn">
          <i class="fas fa-check"></i>
          Aplicar
        </button>
      </div>
    `;
    
    const firstRow = summaryContainer.querySelector('.summary-row');
    summaryContainer.insertBefore(couponInput, firstRow);
    
    const applyBtn = couponInput.querySelector('#applyCouponBtn');
    applyBtn.addEventListener('click', () => {
      const input = document.getElementById('couponCodeInput');
      const code = input.value.trim();
      
      if (code && typeof applyCoupon === 'function') {
        if (applyCoupon(code)) {
          input.value = '';
        }
      } else {
        showToast('Ingresa un código de cupón', 'error');
      }
    });
  } else if (couponInput && window.appliedCoupon) {
    // Mostrar botón para remover cupón
    couponInput.innerHTML = `
      <div class="coupon-applied">
        <span><i class="fas fa-check-circle"></i> Cupón aplicado: ${window.appliedCoupon.code}</span>
        <button class="remove-coupon-btn" onclick="removeCoupon()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }

  subtotalEl.textContent = formatPrice(rawSubtotal);
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
// CHECKOUT MEJORADO - CON EMAIL Y TRACKING
// ============================================

async function checkout() {
  const cart = window.tiendaCart || [];

  if (cart.length === 0) {
    showToast('El carrito está vacío', 'error');
    return;
  }

  // Calcular totales
  const rawSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let subtotal = rawSubtotal;
  
  // Aplicar descuentos
  let userDiscount = 0;
  let couponDiscount = 0;
  
  if (typeof getUserDiscount === 'function') {
    userDiscount = getUserDiscount();
    if (userDiscount > 0) {
      subtotal -= Math.round(subtotal * (userDiscount / 100));
    }
  }
  
  if (typeof getCouponDiscount === 'function') {
    couponDiscount = getCouponDiscount();
    if (couponDiscount > 0) {
      subtotal -= Math.round(subtotal * (couponDiscount / 100));
    }
  }
  
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

      const orderData = {
        order_number: orderNumber,
        items: orderItems,
        subtotal: rawSubtotal,
        user_discount: userDiscount,
        coupon_discount: couponDiscount,
        coupon_code: window.appliedCoupon?.code || null,
        shipping: shipping,
        total: total,
        status: 'pending',
        customer_info: {
          source: 'tienda_online',
          user_id: window.currentUser?.id || null,
          user_email: window.currentUser?.email || null,
          user_name: window.currentUser?.name || null
        }
      };

      const { error: orderError } = await tiendaDB
        .from('pending_orders')
        .insert(orderData);

      if (orderError) {
        console.error('Error guardando pedido:', orderError);
        showToast('Advertencia: pedido no guardado en sistema. Se envía por WhatsApp de todas formas.', 'error');
      } else {
        console.log('Pedido guardado OK:', orderNumber);
        
        // Incrementar contador de pedidos del usuario
        if (window.currentUser && typeof incrementUserOrders === 'function') {
          incrementUserOrders(window.currentUser.id);
        }
        
        // Marcar cupón como usado
        if (window.appliedCoupon) {
          const couponIndex = window.coupons?.findIndex(c => c.id === window.appliedCoupon.id);
          if (couponIndex !== -1 && window.coupons) {
            window.coupons[couponIndex].used++;
            if (typeof saveCoupons === 'function') {
              saveCoupons();
            }
          }
        }
        
        // TODO: Enviar email de confirmación
        // sendOrderConfirmationEmail(orderData);
      }
    }
  } catch (e) {
    console.error('Error conexión BD:', e);
  }

  // ---- CONSTRUIR MENSAJE WHATSAPP ----
  let message = '*NUEVO PEDIDO - ' + TIENDA_CONFIG.nombre + '*\n\n';
  message += 'Pedido: #' + orderNumber + '\n';
  
  if (window.currentUser) {
    message += 'Cliente: ' + (window.currentUser.name || 'Usuario Registrado') + '\n';
    message += 'Email: ' + window.currentUser.email + '\n';
  }
  
  message += '\nPRODUCTOS:\n';

  cart.forEach((item, index) => {
    message += (index + 1) + '. ' + item.name + '\n';
    message += '   Cantidad: ' + item.quantity + '\n';
    message += '   Precio: ' + formatPrice(item.price) + '\n';
    message += '   Subtotal: ' + formatPrice(item.price * item.quantity) + '\n\n';
  });

  message += 'RESUMEN:\n';
  message += 'Subtotal: ' + formatPrice(rawSubtotal) + '\n';
  
  if (userDiscount > 0) {
    message += 'Descuento Usuario (' + userDiscount + '%): -' + formatPrice(Math.round(rawSubtotal * (userDiscount / 100))) + '\n';
  }
  
  if (couponDiscount > 0 && window.appliedCoupon) {
    message += 'Cupón "' + window.appliedCoupon.code + '" (' + couponDiscount + '%): -' + formatPrice(Math.round((rawSubtotal - (userDiscount > 0 ? Math.round(rawSubtotal * (userDiscount / 100)) : 0)) * (couponDiscount / 100))) + '\n';
  }
  
  message += 'Envío: ' + (shipping > 0 ? formatPrice(shipping) : 'GRATIS') + '\n';
  message += 'TOTAL: ' + formatPrice(total) + '\n\n';
  message += 'Este pedido está en el sistema POS listo para facturar\n';
  message += 'Enviado desde SeArys Store';

  const whatsappNumber = formatWhatsAppNumber(TIENDA_CONFIG.whatsappNumber);
  const whatsappUrl = 'https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent(message);

  window.open(whatsappUrl, '_blank');

  showToast('Pedido enviado correctamente', 'success');

  // Preguntar si vaciar carrito
  setTimeout(() => {
    if (confirm('Pedido enviado a WhatsApp y guardado en el sistema.\n\n¿Deseas vaciar el carrito?')) {
      clearTiendaCart();
      
      // Limpiar cupón aplicado
      if (window.appliedCoupon && typeof removeCoupon === 'function') {
        window.appliedCoupon = null;
      }
      
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
// FUNCIÓN PARA ENVIAR EMAIL (PLACEHOLDER)
// ============================================

async function sendOrderConfirmationEmail(orderData) {
  // TODO: Implementar con servicio de email (SendGrid, Mailgun, etc.)
  // Esta función se puede conectar con un backend que envíe emails
  
  console.log('Email de confirmación a enviar:', {
    to: orderData.customer_info.user_email,
    order: orderData.order_number,
    total: orderData.total
  });
  
  // Ejemplo con fetch a un endpoint de backend:
  /*
  try {
    const response = await fetch('https://tu-backend.com/api/send-order-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });
    
    if (response.ok) {
      console.log('Email enviado correctamente');
    }
  } catch (error) {
    console.error('Error enviando email:', error);
  }
  */
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
window.sendOrderConfirmationEmail = sendOrderConfirmationEmail;

log.success('tienda-cart.js mejorado cargado - Con cupones y notificaciones');
