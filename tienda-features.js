// ============================================
// TIENDA-FEATURES.JS - Nuevas Funcionalidades
// Favoritos, Reviews, Modo Oscuro, Cupones
// ============================================

// ============================================
// SISTEMA DE FAVORITOS
// ============================================

let favorites = [];

function loadFavorites() {
    const saved = localStorage.getItem('searys_favorites');
    favorites = saved ? JSON.parse(saved) : [];
    updateFavoritesBadge();
    return favorites;
}

function saveFavorites() {
    localStorage.setItem('searys_favorites', JSON.stringify(favorites));
    updateFavoritesBadge();
}

function toggleFavorite(productId) {
    const index = favorites.findIndex(fav => fav.id === productId);
    
    if (index !== -1) {
        favorites.splice(index, 1);
        showToast('Eliminado de favoritos', 'info');
    } else {
        const product = window.tiendaProducts.find(p => p.id === productId);
        if (product) {
            favorites.push({
                id: product.id,
                name: product.name,
                price: product.sale_price,
                image_url: product.image_url,
                stock: product.quantity
            });
            showToast('Agregado a favoritos ❤️', 'success');
        }
    }
    
    saveFavorites();
    renderFavorites();
    updateFavoriteIcons();
}

function isFavorite(productId) {
    return favorites.some(fav => fav.id === productId);
}

function updateFavoritesBadge() {
    const badge = document.getElementById('favoritesBadge');
    if (badge) {
        badge.textContent = favorites.length;
        badge.style.display = favorites.length > 0 ? 'flex' : 'none';
    }
}

function renderFavorites() {
    const favoritesItems = document.getElementById('favoritesItems');
    const favoritesEmpty = document.getElementById('favoritesEmpty');
    
    if (!favoritesItems || !favoritesEmpty) return;
    
    if (favorites.length === 0) {
        favoritesItems.style.display = 'none';
        favoritesEmpty.style.display = 'flex';
        return;
    }
    
    favoritesItems.style.display = 'block';
    favoritesEmpty.style.display = 'none';
    favoritesItems.innerHTML = '';
    
    favorites.forEach(item => {
        const favItem = document.createElement('div');
        favItem.className = 'favorite-item';
        
        const imageUrl = item.image_url || 'https://via.placeholder.com/80x80?text=Sin+Imagen';
        
        favItem.innerHTML = `
            <img src="${imageUrl}" alt="${item.name}" class="favorite-item-image" 
                 onerror="this.src='https://via.placeholder.com/80x80?text=Sin+Imagen'">
            <div class="favorite-item-info">
                <div class="favorite-item-name">${item.name}</div>
                <div class="favorite-item-price">${formatPrice(item.price)}</div>
                <div class="favorite-item-stock">Stock: ${item.stock}</div>
            </div>
            <div class="favorite-item-actions">
                <button class="add-to-cart-from-fav" data-product-id="${item.id}" title="Agregar al carrito">
                    <i class="fas fa-cart-plus"></i>
                </button>
                <button class="remove-from-fav" data-product-id="${item.id}" title="Quitar de favoritos">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        favoritesItems.appendChild(favItem);
    });
    
    // Event listeners para los botones
    document.querySelectorAll('.add-to-cart-from-fav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.currentTarget.dataset.productId);
            const product = window.tiendaProducts.find(p => p.id === productId);
            if (product) {
                addToCart(product, 1);
            }
        });
    });
    
    document.querySelectorAll('.remove-from-fav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.currentTarget.dataset.productId);
            toggleFavorite(productId);
        });
    });
}

function updateFavoriteIcons() {
    // Actualizar iconos en las tarjetas de productos
    document.querySelectorAll('.favorite-toggle-btn').forEach(btn => {
        const productId = parseInt(btn.dataset.productId);
        const icon = btn.querySelector('i');
        
        if (isFavorite(productId)) {
            icon.className = 'fas fa-heart';
            btn.classList.add('is-favorite');
        } else {
            icon.className = 'far fa-heart';
            btn.classList.remove('is-favorite');
        }
    });
}

// ============================================
// SISTEMA DE REVIEWS
// ============================================

let reviews = {};
let currentReviewProduct = null;

function loadReviews() {
    const saved = localStorage.getItem('searys_reviews');
    reviews = saved ? JSON.parse(saved) : {};
    return reviews;
}

function saveReviews() {
    localStorage.setItem('searys_reviews', JSON.stringify(reviews));
}

function addReview(productId, rating, text) {
    if (!reviews[productId]) {
        reviews[productId] = [];
    }
    
    const userName = currentUser?.name || currentUser?.user_metadata?.display_name || 'Cliente Anónimo';
    const userEmail = currentUser?.email || '';
    
    reviews[productId].push({
        id: Date.now(),
        rating: rating,
        text: text,
        userName: userName,
        userEmail: userEmail,
        date: new Date().toISOString(),
        helpful: 0
    });
    
    saveReviews();
    showToast('¡Gracias por tu reseña! 🌟', 'success');
}

function getProductReviews(productId) {
    return reviews[productId] || [];
}

function getAverageRating(productId) {
    const productReviews = getProductReviews(productId);
    if (productReviews.length === 0) return 0;
    
    const sum = productReviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / productReviews.length).toFixed(1);
}

function openReviewsModal(productId) {
    currentReviewProduct = productId;
    const modal = document.getElementById('reviewsModal');
    const product = window.tiendaProducts.find(p => p.id === productId);
    
    if (!modal || !product) return;
    
    // Actualizar título
    const title = modal.querySelector('h2');
    if (title) {
        title.innerHTML = `<i class="fas fa-star"></i> Reseñas: ${product.name}`;
    }
    
    renderReviewsList(productId);
    modal.classList.add('active');
}

function renderReviewsList(productId) {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;
    
    const productReviews = getProductReviews(productId);
    const avgRating = getAverageRating(productId);
    
    // Actualizar estadísticas
    const overallRating = document.querySelector('.big-rating');
    const totalReviewsEl = document.querySelector('.total-reviews');
    const starsLarge = document.querySelector('.stars-large');
    
    if (overallRating) overallRating.textContent = avgRating || '0.0';
    if (totalReviewsEl) totalReviewsEl.textContent = `Basado en ${productReviews.length} reseña${productReviews.length !== 1 ? 's' : ''}`;
    if (starsLarge) starsLarge.innerHTML = generateStarsHTML(parseFloat(avgRating));
    
    // Renderizar lista de reseñas
    if (productReviews.length === 0) {
        reviewsList.innerHTML = `
            <div class="no-reviews">
                <i class="fas fa-comment-slash"></i>
                <p>Aún no hay reseñas para este producto</p>
                <p>¡Sé el primero en dejar una opinión!</p>
            </div>
        `;
        return;
    }
    
    reviewsList.innerHTML = '';
    
    // Ordenar reseñas por fecha (más recientes primero)
    const sortedReviews = [...productReviews].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    sortedReviews.forEach(review => {
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        
        const date = new Date(review.date);
        const formattedDate = date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        reviewItem.innerHTML = `
            <div class="review-header">
                <div class="review-user">
                    <i class="fas fa-user-circle"></i>
                    <strong>${review.userName}</strong>
                </div>
                <div class="review-date">${formattedDate}</div>
            </div>
            <div class="review-rating">
                ${generateStarsHTML(review.rating)}
            </div>
            <div class="review-text">${review.text}</div>
            <div class="review-actions">
                <button class="helpful-btn" onclick="markHelpful(${review.id})">
                    <i class="far fa-thumbs-up"></i>
                    Útil (${review.helpful || 0})
                </button>
            </div>
        `;
        
        reviewsList.appendChild(reviewItem);
    });
}

function generateStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let html = '';
    
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        html += '<i class="fas fa-star-half-alt"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        html += '<i class="far fa-star"></i>';
    }
    
    return html;
}

function markHelpful(reviewId) {
    for (let productId in reviews) {
        const review = reviews[productId].find(r => r.id === reviewId);
        if (review) {
            review.helpful = (review.helpful || 0) + 1;
            saveReviews();
            renderReviewsList(parseInt(productId));
            showToast('¡Gracias por tu feedback!', 'success');
            return;
        }
    }
}

// ============================================
// MODO OSCURO
// ============================================

let darkMode = false;

function loadDarkMode() {
    const saved = localStorage.getItem('searys_dark_mode');
    darkMode = saved === 'true';
    applyDarkMode();
}

function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem('searys_dark_mode', darkMode);
    applyDarkMode();
    showToast(darkMode ? 'Modo oscuro activado 🌙' : 'Modo claro activado ☀️', 'success');
}

function applyDarkMode() {
    const body = document.body;
    const themeBtn = document.getElementById('themeToggleBtn');
    const icon = themeBtn?.querySelector('i');
    
    if (darkMode) {
        body.classList.add('dark-mode');
        if (icon) icon.className = 'fas fa-sun';
    } else {
        body.classList.remove('dark-mode');
        if (icon) icon.className = 'fas fa-moon';
    }
}

// ============================================
// SISTEMA DE CUPONES
// ============================================

let coupons = [];
let appliedCoupon = null;

function loadCoupons() {
    const saved = localStorage.getItem('searys_coupons');
    coupons = saved ? JSON.parse(saved) : [];
    return coupons;
}

function saveCoupons() {
    localStorage.setItem('searys_coupons', JSON.stringify(coupons));
}

function createCoupon(code, discount, expiryDate, minPurchase = 0) {
    const coupon = {
        id: Date.now(),
        code: code.toUpperCase(),
        discount: discount,
        expiryDate: expiryDate,
        minPurchase: minPurchase,
        used: 0,
        maxUses: 100,
        active: true,
        createdAt: new Date().toISOString()
    };
    
    coupons.push(coupon);
    saveCoupons();
    return coupon;
}

function validateCoupon(code) {
    const coupon = coupons.find(c => 
        c.code === code.toUpperCase() && 
        c.active &&
        c.used < c.maxUses &&
        new Date(c.expiryDate) > new Date()
    );
    
    return coupon;
}

function applyCoupon(code) {
    const coupon = validateCoupon(code);
    
    if (!coupon) {
        showToast('Cupón inválido o expirado', 'error');
        return false;
    }
    
    const cart = window.tiendaCart || [];
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    if (subtotal < coupon.minPurchase) {
        showToast(`Compra mínima de ${formatPrice(coupon.minPurchase)} requerida`, 'error');
        return false;
    }
    
    appliedCoupon = coupon;
    showToast(`¡Cupón aplicado! ${coupon.discount}% de descuento`, 'success');
    
    if (typeof renderCart === 'function') {
        renderCart();
    }
    
    return true;
}

function removeCoupon() {
    appliedCoupon = null;
    showToast('Cupón removido', 'info');
    
    if (typeof renderCart === 'function') {
        renderCart();
    }
}

function getCouponDiscount() {
    if (!appliedCoupon) return 0;
    
    const coupon = validateCoupon(appliedCoupon.code);
    if (!coupon) {
        appliedCoupon = null;
        return 0;
    }
    
    return coupon.discount;
}

function renderCouponsList() {
    const couponsList = document.getElementById('couponsList');
    if (!couponsList) return;
    
    if (coupons.length === 0) {
        couponsList.innerHTML = `
            <div class="no-coupons">
                <i class="fas fa-tags"></i>
                <p>No hay cupones creados</p>
            </div>
        `;
        return;
    }
    
    couponsList.innerHTML = '';
    
    coupons.forEach(coupon => {
        const item = document.createElement('div');
        item.className = 'coupon-item';
        
        const isExpired = new Date(coupon.expiryDate) < new Date();
        const isActive = coupon.active && !isExpired && coupon.used < coupon.maxUses;
        
        item.innerHTML = `
            <div class="coupon-info">
                <div class="coupon-code">${coupon.code}</div>
                <div class="coupon-details">
                    ${coupon.discount}% de descuento
                    ${coupon.minPurchase > 0 ? `| Compra mín: ${formatPrice(coupon.minPurchase)}` : ''}
                </div>
                <div class="coupon-meta">
                    Usos: ${coupon.used}/${coupon.maxUses} | 
                    Vence: ${new Date(coupon.expiryDate).toLocaleDateString('es-CO')}
                </div>
            </div>
            <div class="coupon-status ${isActive ? 'active' : 'inactive'}">
                ${isActive ? '✓ Activo' : '✗ Inactivo'}
            </div>
            <button class="delete-coupon-btn" onclick="deleteCoupon(${coupon.id})">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        
        couponsList.appendChild(item);
    });
}

function deleteCoupon(couponId) {
    if (!confirm('¿Eliminar este cupón?')) return;
    
    const index = coupons.findIndex(c => c.id === couponId);
    if (index !== -1) {
        coupons.splice(index, 1);
        saveCoupons();
        renderCouponsList();
        showToast('Cupón eliminado', 'success');
    }
}

// ============================================
// LAZY LOADING DE IMÁGENES
// ============================================

function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback para navegadores antiguos
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Cargar favoritos
    loadFavorites();
    
    // Cargar reviews
    loadReviews();
    
    // Cargar modo oscuro
    loadDarkMode();
    
    // Cargar cupones
    loadCoupons();
    
    // Event Listeners para favoritos
    const favoritesBtn = document.getElementById('favoritesBtn');
    if (favoritesBtn) {
        favoritesBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('favoritesSidebar');
            const overlay = document.getElementById('cartOverlay');
            
            if (sidebar) {
                sidebar.classList.add('active');
                renderFavorites();
            }
            if (overlay) overlay.classList.add('active');
        });
    }
    
    const closeFavorites = document.getElementById('closeFavorites');
    if (closeFavorites) {
        closeFavorites.addEventListener('click', () => {
            const sidebar = document.getElementById('favoritesSidebar');
            const overlay = document.getElementById('cartOverlay');
            
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        });
    }
    
    // Event listener para modo oscuro
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleDarkMode);
    }
    
    // Event listener para reviews
    const viewReviewsBtn = document.getElementById('viewReviewsBtn');
    if (viewReviewsBtn) {
        viewReviewsBtn.addEventListener('click', () => {
            if (currentProduct) {
                openReviewsModal(currentProduct.id);
            }
        });
    }
    
    const closeReviewsModal = document.getElementById('closeReviewsModal');
    if (closeReviewsModal) {
        closeReviewsModal.addEventListener('click', () => {
            const modal = document.getElementById('reviewsModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    // Formulario de reviews
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const text = document.getElementById('reviewText').value;
            const ratingInput = document.querySelector('.stars-input i.fas.fa-star:last-of-type');
            const rating = ratingInput ? parseInt(ratingInput.dataset.rating) : 0;
            
            if (rating === 0) {
                showToast('Por favor selecciona una calificación', 'error');
                return;
            }
            
            if (text.trim() === '') {
                showToast('Por favor escribe tu opinión', 'error');
                return;
            }
            
            if (currentReviewProduct) {
                addReview(currentReviewProduct, rating, text);
                renderReviewsList(currentReviewProduct);
                reviewForm.reset();
                
                // Resetear estrellas
                document.querySelectorAll('.stars-input i').forEach(star => {
                    star.className = 'far fa-star';
                });
            }
        });
    }
    
    // Sistema de calificación con estrellas
    const starsInput = document.querySelectorAll('.stars-input i');
    starsInput.forEach((star, index) => {
        star.addEventListener('click', () => {
            starsInput.forEach((s, i) => {
                if (i <= index) {
                    s.className = 'fas fa-star';
                } else {
                    s.className = 'far fa-star';
                }
            });
        });
        
        star.addEventListener('mouseenter', () => {
            starsInput.forEach((s, i) => {
                if (i <= index) {
                    s.style.color = '#f59e0b';
                } else {
                    s.style.color = '';
                }
            });
        });
    });
    
    const starsContainer = document.querySelector('.stars-input');
    if (starsContainer) {
        starsContainer.addEventListener('mouseleave', () => {
            starsInput.forEach(s => {
                if (s.className === 'far fa-star') {
                    s.style.color = '';
                }
            });
        });
    }
    
    // Event listener para crear cupones
    const createCouponBtn = document.getElementById('createCouponBtn');
    if (createCouponBtn) {
        createCouponBtn.addEventListener('click', () => {
            const code = prompt('Código del cupón:');
            if (!code) return;
            
            const discount = parseInt(prompt('Porcentaje de descuento (ej: 10):'));
            if (!discount || discount <= 0 || discount > 100) {
                showToast('Descuento inválido', 'error');
                return;
            }
            
            const days = parseInt(prompt('Días de validez:'));
            if (!days || days <= 0) {
                showToast('Días inválidos', 'error');
                return;
            }
            
            const minPurchase = parseInt(prompt('Compra mínima (0 para sin mínimo):') || '0');
            
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);
            
            createCoupon(code, discount, expiryDate.toISOString(), minPurchase);
            renderCouponsList();
            showToast('Cupón creado exitosamente', 'success');
        });
    }
    
    // Setup lazy loading
    setupLazyLoading();
    
    log.success('tienda-features.js cargado - Favoritos, Reviews, Modo Oscuro y Cupones activos');
});

// ============================================
// EXPORTAR FUNCIONES
// ============================================

window.toggleFavorite = toggleFavorite;
window.isFavorite = isFavorite;
window.renderFavorites = renderFavorites;
window.updateFavoriteIcons = updateFavoriteIcons;
window.toggleDarkMode = toggleDarkMode;
window.addReview = addReview;
window.getProductReviews = getProductReviews;
window.getAverageRating = getAverageRating;
window.openReviewsModal = openReviewsModal;
window.markHelpful = markHelpful;
window.applyCoupon = applyCoupon;
window.removeCoupon = removeCoupon;
window.getCouponDiscount = getCouponDiscount;
window.renderCouponsList = renderCouponsList;
window.deleteCoupon = deleteCoupon;
window.setupLazyLoading = setupLazyLoading;
window.generateStarsHTML = generateStarsHTML;
