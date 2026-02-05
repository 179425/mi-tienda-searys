// ============================================
// TIENDA-MAIN-EXTENDED.JS
// Extensión de funcionalidades para tienda-main.js
// ============================================

// Almacenar el currentProduct globalmente para reviews
let currentProduct = window.currentProduct || null;

// ============================================
// EXTENSIONES DE RENDERIZADO DE PRODUCTOS
// ============================================

// Guardar la función original de renderización
const originalRenderProducts = window.renderProducts;

// Extender renderProducts para incluir filtros y ordenamiento
window.renderProducts = function(productsToRender = null) {
    let products = productsToRender || window.tiendaProducts;
    
    // Aplicar filtros de ordenamiento
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        const sortValue = sortSelect.value;
        
        products = [...products]; // Crear copia para no mutar el original
        
        switch(sortValue) {
            case 'price-asc':
                products.sort((a, b) => a.sale_price - b.sale_price);
                break;
            case 'price-desc':
                products.sort((a, b) => b.sale_price - a.sale_price);
                break;
            case 'name-asc':
                products.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                products.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'stock-desc':
                products.sort((a, b) => b.quantity - a.quantity);
                break;
        }
    }
    
    // Aplicar filtro de disponibilidad
    const stockFilter = document.getElementById('stockFilter');
    if (stockFilter && stockFilter.value !== 'all') {
        if (stockFilter.value === 'in-stock') {
            products = products.filter(p => p.quantity > 5);
        } else if (stockFilter.value === 'low-stock') {
            products = products.filter(p => p.quantity > 0 && p.quantity <= 5);
        }
    }
    
    // Aplicar filtro de rango de precio
    const priceRangeFilter = document.getElementById('priceRangeFilter');
    if (priceRangeFilter && priceRangeFilter.value !== 'all') {
        const range = priceRangeFilter.value;
        
        if (range === '0-5000') {
            products = products.filter(p => p.sale_price < 5000);
        } else if (range === '5000-10000') {
            products = products.filter(p => p.sale_price >= 5000 && p.sale_price < 10000);
        } else if (range === '10000-20000') {
            products = products.filter(p => p.sale_price >= 10000 && p.sale_price < 20000);
        } else if (range === '20000-50000') {
            products = products.filter(p => p.sale_price >= 20000 && p.sale_price < 50000);
        } else if (range === '50000+') {
            products = products.filter(p => p.sale_price >= 50000);
        }
    }
    
    // Actualizar contador de resultados
    updateResultsCount(products.length);
    
    // Llamar a la función original con los productos filtrados
    if (originalRenderProducts) {
        originalRenderProducts(products);
        
        // Después de renderizar, agregar botones de favoritos y actualizar iconos
        setTimeout(() => {
            addFavoriteButtons();
            if (typeof updateFavoriteIcons === 'function') {
                updateFavoriteIcons();
            }
            if (typeof setupLazyLoading === 'function') {
                setupLazyLoading();
            }
        }, 100);
    }
};

// ============================================
// ACTUALIZAR CONTADOR DE RESULTADOS
// ============================================

function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    const showingCount = document.getElementById('showingCount');
    const totalCount = document.getElementById('totalCount');
    
    if (resultsCount && showingCount && totalCount) {
        const totalProducts = window.tiendaProducts ? window.tiendaProducts.length : 0;
        
        showingCount.textContent = count;
        totalCount.textContent = totalProducts;
        
        resultsCount.style.display = count > 0 ? 'block' : 'none';
    }
}

// ============================================
// AGREGAR BOTONES DE FAVORITOS
// ============================================

function addFavoriteButtons() {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        // Verificar si ya tiene botón de favorito
        if (card.querySelector('.favorite-toggle-btn')) return;
        
        const productId = card.dataset.productId;
        if (!productId) return;
        
        const imageContainer = card.querySelector('.product-image-container');
        if (!imageContainer) return;
        
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-toggle-btn';
        favoriteBtn.dataset.productId = productId;
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        favoriteBtn.setAttribute('aria-label', 'Agregar a favoritos');
        favoriteBtn.setAttribute('title', 'Agregar a favoritos');
        
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof toggleFavorite === 'function') {
                toggleFavorite(parseInt(productId));
            }
        });
        
        imageContainer.appendChild(favoriteBtn);
    });
}

// ============================================
// ACTUALIZAR BREADCRUMBS
// ============================================

function updateBreadcrumbs(category) {
    const currentCategory = document.getElementById('currentCategory');
    if (currentCategory) {
        currentCategory.textContent = category || 'Todos';
    }
}

// Extender selectCategory para actualizar breadcrumbs
const originalSelectCategory = window.selectCategory;
if (originalSelectCategory) {
    window.selectCategory = function(category) {
        originalSelectCategory(category);
        updateBreadcrumbs(category);
    };
}

// ============================================
// EXTENDER MODAL DE PRODUCTO CON REVIEWS
// ============================================

const originalOpenProductModal = window.openProductModal;
if (originalOpenProductModal) {
    window.openProductModal = function(product) {
        currentProduct = product;
        window.currentProduct = product;
        
        originalOpenProductModal(product);
        
        // Agregar botón de favorito al modal
        setTimeout(() => {
            const modalImage = document.querySelector('.product-modal-image');
            const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
            
            if (modalFavoriteBtn) {
                const isFav = typeof isFavorite === 'function' ? isFavorite(product.id) : false;
                const icon = modalFavoriteBtn.querySelector('i');
                
                if (icon) {
                    icon.className = isFav ? 'fas fa-heart' : 'far fa-heart';
                }
                
                if (isFav) {
                    modalFavoriteBtn.classList.add('is-favorite');
                } else {
                    modalFavoriteBtn.classList.remove('is-favorite');
                }
                
                modalFavoriteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (typeof toggleFavorite === 'function') {
                        toggleFavorite(product.id);
                        
                        // Actualizar icono
                        const newIsFav = isFavorite(product.id);
                        icon.className = newIsFav ? 'fas fa-heart' : 'far fa-heart';
                        
                        if (newIsFav) {
                            modalFavoriteBtn.classList.add('is-favorite');
                        } else {
                            modalFavoriteBtn.classList.remove('is-favorite');
                        }
                    }
                };
            }
            
            // Actualizar reviews si existen
            if (typeof getProductReviews === 'function' && typeof getAverageRating === 'function') {
                const reviews = getProductReviews(product.id);
                const avgRating = getAverageRating(product.id);
                
                const reviewsSummary = document.getElementById('reviewsSummary');
                if (reviewsSummary) {
                    const starsDisplay = reviewsSummary.querySelector('.stars-display');
                    const ratingNumber = reviewsSummary.querySelector('.rating-number');
                    const reviewsCount = reviewsSummary.querySelector('.reviews-count');
                    
                    if (starsDisplay && typeof generateStarsHTML === 'function') {
                        const starsOnly = starsDisplay.querySelectorAll('i');
                        if (starsOnly.length === 0) {
                            starsDisplay.innerHTML = generateStarsHTML(parseFloat(avgRating));
                        }
                    }
                    
                    if (ratingNumber) {
                        ratingNumber.textContent = avgRating || '0.0';
                    }
                    
                    if (reviewsCount) {
                        reviewsCount.textContent = `(${reviews.length} reseña${reviews.length !== 1 ? 's' : ''})`;
                    }
                }
            }
        }, 100);
    };
}

// ============================================
// SETUP DE EVENT LISTENERS PARA FILTROS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Filtro de ordenamiento
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            if (typeof renderProducts === 'function') {
                renderProducts();
            }
        });
    }
    
    // Filtro de stock
    const stockFilter = document.getElementById('stockFilter');
    if (stockFilter) {
        stockFilter.addEventListener('change', () => {
            if (typeof renderProducts === 'function') {
                renderProducts();
            }
        });
    }
    
    // Filtro de precio
    const priceRangeFilter = document.getElementById('priceRangeFilter');
    if (priceRangeFilter) {
        priceRangeFilter.addEventListener('change', () => {
            if (typeof renderProducts === 'function') {
                renderProducts();
            }
        });
    }
    
    // Cerrar overlay cuando se hace clic en él
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            const cartSidebar = document.getElementById('cartSidebar');
            const favoritesSidebar = document.getElementById('favoritesSidebar');
            
            if (cartSidebar) cartSidebar.classList.remove('active');
            if (favoritesSidebar) favoritesSidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    
    log.success('tienda-main-extended.js cargado - Filtros y nuevas funcionalidades activas');
});

// ============================================
// EXPORTAR FUNCIONES
// ============================================

window.updateResultsCount = updateResultsCount;
window.addFavoriteButtons = addFavoriteButtons;
window.updateBreadcrumbs = updateBreadcrumbs;
