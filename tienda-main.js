// ============================================
// TIENDA-MAIN.JS - Versión Optimizada v3 con Paginación
// ============================================

let currentProduct = null;
let isLoadingProducts = false; // Flag para evitar múltiples cargas
let renderTimeout = null; // Para debouncing

// Variables de paginación
let currentPage = 1;
const PRODUCTS_PER_PAGE = 20; // Cambia este número según prefieras
let totalPages = 1;
let allFilteredProducts = []; // Productos después de filtrar

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    log.success('Iniciando SeArys Store...');
    
    // Inicializar Supabase
    if (typeof supabase !== 'undefined') {
        initTiendaDB();
    }
    
    // Verificar acceso admin desde URL
    checkAdminAccess();
    
    // Cargar carrito guardado
    loadTiendaCart();
    updateCartBadge();
    
    // Cargar miniaturas de categorías desde localStorage
    loadCategoryThumbnails();
    
    // Renderizar categorías con miniaturas
    renderCategories();
    
    // Cargar productos
    await loadAndRenderProducts();
    
    // Event Listeners
    setupEventListeners();
    
    log.success('Tienda inicializada');
});

// ============================================
// CATEGORÍAS CON MINIATURAS
// ============================================

function saveCategoryThumbnails(categoryThumbnails) {
    localStorage.setItem('searys_category_thumbnails', JSON.stringify(categoryThumbnails));
}

function loadCategoryThumbnails() {
    const saved = localStorage.getItem('searys_category_thumbnails');
    if (saved) {
        window.categoryThumbnails = JSON.parse(saved);
    } else {
        window.categoryThumbnails = {};
    }
    return window.categoryThumbnails;
}

function updateCategoryThumbnail(categoryName, imageUrl) {
    if (!window.categoryThumbnails) {
        window.categoryThumbnails = {};
    }
    
    window.categoryThumbnails[categoryName] = imageUrl;
    saveCategoryThumbnails(window.categoryThumbnails);
    renderCategories();
    
    log.success(`Miniatura actualizada para ${categoryName}`);
}

function renderCategories() {
    const categoriesGallery = document.getElementById('categoriesGallery');
    
    if (!categoriesGallery) return;
    
    const categories = window.tiendaCategories || [];
    const thumbnails = window.categoryThumbnails || {};
    
    categoriesGallery.innerHTML = '';
    
    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'category-item';
        if (cat === window.selectedCategory) {
            item.classList.add('active');
        }
        
        const thumbnailUrl = thumbnails[cat] || 'https://via.placeholder.com/100x100?text=' + encodeURIComponent(cat);
        
        const img = document.createElement('img');
        img.src = thumbnailUrl;
        img.alt = cat;
        img.className = 'category-thumbnail';
        img.onerror = function() {
            // Prevenir bucle: solo intentar una vez
            if (this.src !== 'https://via.placeholder.com/100x100?text=' + encodeURIComponent(cat)) {
                this.onerror = null;
                this.src = 'https://via.placeholder.com/100x100?text=' + encodeURIComponent(cat);
            }
        };
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'category-name';
        nameDiv.textContent = cat;
        
        item.appendChild(img);
        item.appendChild(nameDiv);
        item.addEventListener('click', () => selectCategory(cat));
        categoriesGallery.appendChild(item);
    });
}

function selectCategory(category) {
    window.selectedCategory = category;
    
    // Actualizar UI de categorías
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
        const nameElem = item.querySelector('.category-name');
        if (nameElem && nameElem.textContent === category) {
            item.classList.add('active');
        }
    });
    
    resetPagination(); // Reiniciar a página 1
    
    // Re-renderizar productos con debounce
    debouncedRenderProducts();
}

// ============================================
// CARGAR Y RENDERIZAR PRODUCTOS
// ============================================

async function loadAndRenderProducts() {
    if (isLoadingProducts) {
        log.warn('Ya se están cargando productos, evitando carga duplicada');
        return;
    }
    
    isLoadingProducts = true;
    const loadingState = document.getElementById('loadingState');
    const productsGrid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    
    try {
        if (loadingState) loadingState.style.display = 'block';
        if (productsGrid) productsGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: La conexión tardó demasiado')), 8000)
        );
        
        const products = await Promise.race([
            loadTiendaProducts(),
            timeoutPromise
        ]);
        
        if (products && products.length > 0) {
            renderProducts(products);
        } else {
            if (emptyState) {
                emptyState.style.display = 'block';
                const emptyText = emptyState.querySelector('p');
                if (emptyText) {
                    emptyText.textContent = 'No hay productos disponibles. Verifica tu base de datos en Supabase.';
                }
            }
            log.warn('No se encontraron productos en la base de datos');
        }
    } catch (error) {
        log.error('Error cargando productos: ' + error.message);
        
        if (emptyState) {
            emptyState.style.display = 'block';
            const emptyText = emptyState.querySelector('p');
            if (emptyText) {
                emptyText.textContent = `Error: ${error.message}. Verifica tu conexión con Supabase.`;
            }
        }
        showToast('Error al cargar productos. Revisa la consola.', 'error');
    } finally {
        // SIEMPRE ocultar loading state
        if (loadingState) loadingState.style.display = 'none';
        isLoadingProducts = false;
    }
}

function renderProducts(productsToRender = null) {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (!grid) return;
    
    let products = productsToRender || window.tiendaProducts;
    
    // Filtrar por categoría
    if (window.selectedCategory && window.selectedCategory !== 'Todos') {
        products = products.filter(p => p.category === window.selectedCategory);
    }
    
    // Filtrar por búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.toLowerCase();
        products = products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            (p.barcode && p.barcode.includes(searchTerm))
        );
    }
    
    // Guardar productos filtrados
    allFilteredProducts = products;
    
    // Calcular paginación
    totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
    
    // Asegurar que currentPage esté en rango válido
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }
    
    // Mostrar estado vacío si no hay productos
    if (products.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }
    
    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    // Calcular productos a mostrar en la página actual
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const productsToShow = products.slice(startIndex, endIndex);
    
    // Renderizar productos de la página actual
    grid.innerHTML = '';
    
    productsToShow.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
    
    // Actualizar paginación
    updatePagination();
    
    // Scroll al inicio de productos
    const productsSection = document.querySelector('.products-section');
    if (productsSection && currentPage > 1) {
        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const hasImage = product.image_url && product.image_url.trim() !== '';
    const isOutOfStock = product.quantity <= 0;
    
    if (isOutOfStock) {
        card.classList.add('out-of-stock');
    }
    
    // Contenedor de imagen
    const imageContainer = document.createElement('div');
    imageContainer.className = 'product-image-container' + (hasImage ? '' : ' no-image');
    
    // Imagen del producto
    const productImage = document.createElement('img');
    productImage.className = 'product-image';
    productImage.alt = product.name;
    if (hasImage) {
        productImage.src = product.image_url;
        // Si falla la imagen, voltar a estado placeholder
        productImage.onerror = function() {
            this.onerror = null;
            imageContainer.classList.add('no-image');
        };
    }
    
    // Badge de stock - solo mostrar si está agotado
    if (isOutOfStock) {
        const stockBadge = document.createElement('div');
        stockBadge.className = 'stock-badge';
        stockBadge.innerHTML = '<i class="fas fa-times-circle"></i> Agotado';
        imageContainer.appendChild(stockBadge);
    }
    
    // Ensamblar contenedor de imagen
    imageContainer.appendChild(productImage);
    
    // Click en imagen para abrir modal de SOLO IMAGEN
    imageContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hasImage) {
            openImageModal(product.image_url);
        }
    });
    
    // Info del producto
    const infoDiv = document.createElement('div');
    infoDiv.className = 'product-info';
    
    // Nombre del producto
    const nameH3 = document.createElement('h3');
    nameH3.className = 'product-name';
    nameH3.textContent = product.name;
    
    // Precio del producto
    const priceDiv = document.createElement('div');
    priceDiv.className = 'product-price';
    priceDiv.textContent = formatPrice(product.sale_price);
    
    // Botón de agregar al carrito
    const addBtn = document.createElement('button');
    addBtn.className = 'add-to-cart-btn';
    addBtn.disabled = isOutOfStock;
    addBtn.innerHTML = isOutOfStock ? 
        '<i class="fas fa-ban"></i> No Disponible' : 
        'Agregar';
    
    if (!isOutOfStock) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(product, 1);
        });
    }
    
    // Ensamblar info
    infoDiv.appendChild(nameH3);
    infoDiv.appendChild(priceDiv);
    infoDiv.appendChild(addBtn);
    
    // Ensamblar tarjeta completa
    card.appendChild(imageContainer);
    card.appendChild(infoDiv);
    
    return card;
}

// Debounce para evitar renders excesivos
function debouncedRenderProducts() {
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    renderTimeout = setTimeout(() => {
        renderProducts();
    }, 150);
}

// ============================================
// MODAL DE PRODUCTO
// ============================================

function openProductModal(product) {
    currentProduct = product;
    
    const modal = document.getElementById('productModal');
    const modalImage = document.getElementById('modalProductImage');
    const modalName = document.getElementById('modalProductName');
    const modalPrice = document.getElementById('modalProductPrice');
    const modalStock = document.getElementById('modalProductStock');
    const modalDescription = document.getElementById('modalProductDescription');
    const modalQty = document.getElementById('modalQty');
    
    if (modalImage) {
        const modalImgWrap = modalImage.parentElement;
        if (product.image_url && product.image_url.trim() !== '') {
            modalImage.src = product.image_url;
            modalImage.style.display = 'block';
            if (modalImgWrap) modalImgWrap.classList.remove('no-image');
            modalImage.onerror = function() {
                this.onerror = null;
                this.style.display = 'none';
                if (modalImgWrap) modalImgWrap.classList.add('no-image');
            };
        } else {
            modalImage.style.display = 'none';
            if (modalImgWrap) modalImgWrap.classList.add('no-image');
        }
    }
    if (modalName) modalName.textContent = product.name;
    if (modalPrice) modalPrice.textContent = formatPrice(product.sale_price);
    if (modalStock) modalStock.textContent = product.quantity;
    if (modalDescription) modalDescription.textContent = product.description || 'Sin descripción';
    if (modalQty) modalQty.value = 1;
    
    if (modal) modal.classList.add('active');
}

function closeProductModalFunc() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
    currentProduct = null;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Carrito
    const cartBtn = document.getElementById('cartBtn');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartBtn) {
        cartBtn.addEventListener('click', openCart);
    }
    if (closeCart) {
        closeCart.addEventListener('click', closeCartFunc);
    }
    if (cartOverlay) {
        cartOverlay.addEventListener('click', closeCartFunc);
    }
    
    // Búsqueda con debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(handleSearch, 300);
        });
    }
    
    // Modal de producto
    const closeProductModal = document.getElementById('closeProductModal');
    if (closeProductModal) {
        closeProductModal.addEventListener('click', closeProductModalFunc);
    }
    
    // Cantidad en modal
    const modalQtyMinus = document.getElementById('modalQtyMinus');
    const modalQtyPlus = document.getElementById('modalQtyPlus');
    const modalQty = document.getElementById('modalQty');
    
    if (modalQtyMinus && modalQty) {
        modalQtyMinus.addEventListener('click', () => {
            let qty = parseInt(modalQty.value);
            if (qty > 1) {
                modalQty.value = qty - 1;
            }
        });
    }
    
    if (modalQtyPlus && modalQty && currentProduct) {
        modalQtyPlus.addEventListener('click', () => {
            let qty = parseInt(modalQty.value);
            if (currentProduct && qty < currentProduct.quantity) {
                modalQty.value = qty + 1;
            }
        });
    }
    
    // Agregar al carrito desde modal
    const modalAddToCart = document.getElementById('modalAddToCart');
    if (modalAddToCart && modalQty) {
        modalAddToCart.addEventListener('click', () => {
            if (currentProduct) {
                const qty = parseInt(modalQty.value);
                addToCart(currentProduct, qty);
                closeProductModalFunc();
            }
        });
    }
    
    // Admin panel
    const adminBtn = document.getElementById('adminBtn');
    const closeAdminModal = document.getElementById('closeAdminModal');
    
    if (adminBtn) {
        adminBtn.addEventListener('click', openAdminPanel);
    }
    if (closeAdminModal) {
        closeAdminModal.addEventListener('click', closeAdminPanelFunc);
    }
    
    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchAdminTab(tabName);
        });
    });
    
    // Paginación
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', goToPrevPage);
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', goToNextPage);
    }
    
    // Modal de imagen
    const closeImageModal = document.getElementById('closeImageModal');
    const imageModal = document.getElementById('imageModal');
    
    if (closeImageModal) {
        closeImageModal.addEventListener('click', () => {
            window.closeImageModal();
        });
    }
    
    // Cerrar modal de imagen al hacer clic en el fondo
    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                window.closeImageModal();
            }
        });
    }
    
    // Cerrar modal de imagen con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeImageModal();
        }
    });
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm) {
        window.selectedCategory = 'Todos';
        renderCategories();
    }
    
    resetPagination(); // Reiniciar a página 1
    debouncedRenderProducts();
}

function openCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartSidebar) cartSidebar.classList.add('active');
    if (cartOverlay) cartOverlay.classList.add('active');
    
    renderCart();
}

function closeCartFunc() {
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartSidebar) cartSidebar.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
}

function openAdminPanel() {
    if (!isAdminAuthenticated()) {
        showToast('❌ Acceso denegado', 'error');
        log.warn('Intento de acceso no autorizado al panel de administración');
        return;
    }
    
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.classList.add('active');
        loadAdminData();
    }
}

function closeAdminPanelFunc() {
    const modal = document.getElementById('adminModal');
    if (modal) modal.classList.remove('active');
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    if (tabName === 'categories') {
        loadCategoriesManagement();
    }
}

// ============================================
// GESTIÓN DE CATEGORÍAS EN ADMIN
// ============================================

function loadCategoriesManagement() {
    const container = document.getElementById('categoriesManagement');
    if (!container) return;
    
    const categories = window.tiendaCategories || [];
    const thumbnails = window.categoryThumbnails || {};
    
    container.innerHTML = '';
    
    categories.forEach(cat => {
        const row = document.createElement('div');
        row.className = 'category-row';
        
        const thumbnailUrl = thumbnails[cat] || 'https://via.placeholder.com/80x80?text=' + encodeURIComponent(cat);
        const hasImage = !!thumbnails[cat];
        
        const img = document.createElement('img');
        img.src = thumbnailUrl;
        img.alt = cat;
        img.className = 'category-row-thumbnail';
        img.onerror = function() {
            if (this.src !== 'https://via.placeholder.com/80x80?text=' + encodeURIComponent(cat)) {
                this.onerror = null;
                this.src = 'https://via.placeholder.com/80x80?text=' + encodeURIComponent(cat);
            }
        };
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'category-row-info';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'category-row-name';
        nameDiv.textContent = cat;
        
        const statusDiv = document.createElement('div');
        statusDiv.className = 'category-row-status';
        statusDiv.textContent = hasImage ? '✅ Miniatura configurada' : '⚠️ Sin miniatura';
        
        const uploadBtn = document.createElement('button');
        uploadBtn.className = `category-upload-btn ${hasImage ? 'has-image' : ''}`;
        uploadBtn.innerHTML = `<i class="fas fa-${hasImage ? 'sync' : 'upload'}"></i> ${hasImage ? 'Cambiar Imagen' : 'Subir Imagen'}`;
        uploadBtn.addEventListener('click', () => uploadCategoryImage(cat));
        
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(statusDiv);
        
        row.appendChild(img);
        row.appendChild(infoDiv);
        row.appendChild(uploadBtn);
        
        container.appendChild(row);
    });
}

function uploadCategoryImage(categoryName) {
    if (typeof cloudinary === 'undefined') {
        showToast('Error: Cloudinary no está configurado', 'error');
        return;
    }
    
    const widget = cloudinary.createUploadWidget(
        {
            cloudName: CLOUDINARY_CONFIG.cloudName,
            uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
            sources: ['local', 'url', 'camera'],
            multiple: false,
            resourceType: 'image',
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            maxFileSize: 5000000,
            cropping: true,
            croppingAspectRatio: 1,
            croppingShowDimensions: true,
        },
        (error, result) => {
            if (error) {
                log.error('Error en Cloudinary: ' + error.message);
                showToast('Error subiendo imagen', 'error');
                return;
            }
            
            if (result.event === 'success') {
                const imageUrl = result.info.secure_url;
                updateCategoryThumbnail(categoryName, imageUrl);
                loadCategoriesManagement();
                showToast(`✅ Miniatura actualizada para ${categoryName}`, 'success');
            }
        }
    );
    
    widget.open();
}

// ============================================
// AGREGAR AL CARRITO
// ============================================

function addToCart(product, quantity = 1) {
    const cart = window.tiendaCart;
    
    if (quantity > product.quantity) {
        showToast('Stock insuficiente', 'error');
        return;
    }
    
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex !== -1) {
        const newQty = cart[existingIndex].quantity + quantity;
        
        if (newQty > product.quantity) {
            showToast('Stock insuficiente', 'error');
            return;
        }
        
        cart[existingIndex].quantity = newQty;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.sale_price,
            quantity: quantity,
            image_url: product.image_url,
            stock: product.quantity
        });
    }
    
    window.tiendaCart = cart;
    saveTiendaCart();
    updateCartBadge();
    renderCart();
    
    showToast('Producto agregado al carrito', 'success');
}

// ============================================
// TOAST
// ============================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// PAGINACIÓN
// ============================================

function updatePagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (!paginationContainer) return;
    
    // Mostrar/ocultar paginación
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // Actualizar info
    if (paginationInfo) {
        paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    }
    
    // Actualizar botones
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderProducts();
    }
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderProducts();
    }
}

function resetPagination() {
    currentPage = 1;
}

// ============================================
// MODAL DE IMAGEN
// ============================================

function openImageModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const img = document.getElementById('imageModalImg');
    
    if (modal && img) {
        img.src = imageUrl;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================

window.renderProducts = renderProducts;
window.openProductModal = openProductModal;
window.closeProductModalFunc = closeProductModalFunc;
window.selectCategory = selectCategory;
window.addToCart = addToCart;
window.showToast = showToast;
window.openAdminPanel = openAdminPanel;
window.closeAdminPanelFunc = closeAdminPanelFunc;
window.updateCategoryThumbnail = updateCategoryThumbnail;
window.loadCategoriesManagement = loadCategoriesManagement;
window.renderCategories = renderCategories;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
window.goToNextPage = goToNextPage;
window.goToPrevPage = goToPrevPage;

log.success('tienda-main.js v3 cargado - Con paginación y modal de imagen');
