// ============================================
// TIENDA-MAIN.JS - Lógica Principal Mejorada
// ============================================

let currentProduct = null;

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    log.success('Iniciando SeArys Store...');
    
    // Inicializar Supabase
    if (typeof supabase !== 'undefined') {
        initTiendaDB();
    }
    
    // 🔐 Verificar acceso admin desde URL y actualizar UI
    const hasAdminAccess = checkAdminAccess();
    
    // 🔐 Mostrar confirmación si está autenticado
    if (hasAdminAccess && isAdminAuthenticated()) {
        log.success('✅ Modo administrador activado');
    }
    
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

// Guardar miniaturas de categorías en localStorage
function saveCategoryThumbnails(categoryThumbnails) {
    localStorage.setItem('searys_category_thumbnails', JSON.stringify(categoryThumbnails));
    log.info('Miniaturas de categorías guardadas');
}

// Cargar miniaturas de categorías desde localStorage
function loadCategoryThumbnails() {
    const saved = localStorage.getItem('searys_category_thumbnails');
    if (saved) {
        window.categoryThumbnails = JSON.parse(saved);
        log.info('Miniaturas de categorías cargadas');
    } else {
        window.categoryThumbnails = {};
    }
    return window.categoryThumbnails;
}

// Actualizar miniatura de categoría
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
        
        // Imagen de miniatura (usa placeholder si no tiene)
        const thumbnailUrl = thumbnails[cat] || 'https://via.placeholder.com/100x100?text=' + encodeURIComponent(cat);
        
        item.innerHTML = `
            <img src="${thumbnailUrl}" alt="${cat}" class="category-thumbnail" onerror="this.src='https://via.placeholder.com/100x100?text=${encodeURIComponent(cat)}'">
            <div class="category-name">${cat}</div>
        `;
        
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
    
    // Re-renderizar productos
    renderProducts();
}

// ============================================
// CARGAR Y RENDERIZAR PRODUCTOS
// ============================================

async function loadAndRenderProducts() {
    const loadingState = document.getElementById('loadingState');
    const productsGrid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingState) loadingState.style.display = 'block';
    if (productsGrid) productsGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    
    try {
        // Timeout de 10 segundos para evitar carga infinita
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: La conexión tardó demasiado')), 10000)
        );
        
        const products = await Promise.race([
            loadTiendaProducts(),
            timeoutPromise
        ]);
        
        if (loadingState) loadingState.style.display = 'none';
        
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
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            const emptyText = emptyState.querySelector('p');
            if (emptyText) {
                emptyText.textContent = `Error: ${error.message}. Verifica tu conexión con Supabase.`;
            }
        }
        showToast('Error al cargar productos. Revisa la consola.', 'error');
    }
}

function renderProducts(productsToRender = null) {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    
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
    
    // Mostrar estado vacío si no hay productos
    if (products.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    // Renderizar productos
    grid.innerHTML = '';
    
    products.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const imageUrl = product.image_url || 'https://via.placeholder.com/300x300?text=Sin+Imagen';
    const isOutOfStock = product.quantity <= 0;
    
    // Agregar clase si está agotado
    if (isOutOfStock) {
        card.classList.add('out-of-stock');
    }
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x300?text=Sin+Imagen'">
        <div class="product-card-body">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-stock ${isOutOfStock ? 'stock-empty' : ''}">
                <i class="fas ${isOutOfStock ? 'fa-times-circle' : 'fa-box'}"></i>
                <span>${isOutOfStock ? 'Agotado' : `${product.quantity} disponibles`}</span>
            </div>
            <div class="product-price-row">
                <div class="product-price">${formatPrice(product.sale_price)}</div>
                <button class="add-to-cart-btn" title="${isOutOfStock ? 'Producto agotado' : 'Agregar al carrito'}" ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? 'Agotado' : 'Agregar'}
                </button>
            </div>
        </div>
    `;
    
    // Click en la imagen abre visor de imagen
    const productImage = card.querySelector('.product-image');
    productImage.addEventListener('click', (e) => {
        e.stopPropagation();
        openImageViewer(imageUrl, product.name);
    });
    
    // Click en el botón de agregar (solo si hay stock)
    if (!isOutOfStock) {
        const addBtn = card.querySelector('.add-to-cart-btn');
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(product, 1);
        });
    }
    
    return card;
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
    
    if (!modal) return;
    
    if (modalImage) modalImage.src = product.image_url || 'https://via.placeholder.com/400x400?text=Sin+Imagen';
    if (modalName) modalName.textContent = product.name;
    if (modalPrice) modalPrice.textContent = formatPrice(product.sale_price);
    if (modalStock) modalStock.textContent = product.quantity;
    if (modalDescription) {
        modalDescription.textContent = product.description || 'Sin descripción disponible';
    }
    if (modalQty) modalQty.value = 1;
    
    modal.classList.add('active');
}

function closeProductModalFunc() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
    currentProduct = null;
}

// ============================================
// VISOR DE IMAGEN SIMPLE
// ============================================

function openImageViewer(imageUrl, productName) {
    // Crear el visor si no existe
    let viewer = document.getElementById('imageViewer');
    
    if (!viewer) {
        viewer = document.createElement('div');
        viewer.id = 'imageViewer';
        viewer.className = 'image-viewer';
        viewer.innerHTML = `
            <div class="image-viewer-overlay"></div>
            <div class="image-viewer-content">
                <button class="image-viewer-close" aria-label="Cerrar">
                    <i class="fas fa-times"></i>
                </button>
                <img class="image-viewer-img" src="" alt="">
                <div class="image-viewer-name"></div>
            </div>
        `;
        document.body.appendChild(viewer);
        
        // Cerrar al hacer clic en el overlay o botón
        viewer.querySelector('.image-viewer-overlay').addEventListener('click', closeImageViewer);
        viewer.querySelector('.image-viewer-close').addEventListener('click', closeImageViewer);
        
        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && viewer.classList.contains('active')) {
                closeImageViewer();
            }
        });
    }
    
    // Actualizar imagen y mostrar
    const img = viewer.querySelector('.image-viewer-img');
    const name = viewer.querySelector('.image-viewer-name');
    
    if (img) img.src = imageUrl;
    if (name) name.textContent = productName;
    
    viewer.classList.add('active');
    document.body.style.overflow = 'hidden'; // Evitar scroll del body
}

function closeImageViewer() {
    const viewer = document.getElementById('imageViewer');
    if (viewer) {
        viewer.classList.remove('active');
        document.body.style.overflow = ''; // Restaurar scroll
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Cerrar modales con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModalFunc();
            closeAdminPanelFunc();
            closeCartFunc();
        }
    });
    
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
    
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
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
    
    if (modalQtyMinus) {
        modalQtyMinus.addEventListener('click', () => {
            const current = parseInt(modalQty.value) || 1;
            if (current > 1) {
                modalQty.value = current - 1;
            }
        });
    }
    
    if (modalQtyPlus) {
        modalQtyPlus.addEventListener('click', () => {
            const current = parseInt(modalQty.value) || 1;
            if (currentProduct && current < currentProduct.quantity) {
                modalQty.value = current + 1;
            }
        });
    }
    
    // Agregar al carrito desde modal
    const modalAddToCart = document.getElementById('modalAddToCart');
    if (modalAddToCart) {
        modalAddToCart.addEventListener('click', () => {
            if (currentProduct) {
                const qty = parseInt(modalQty.value) || 1;
                addToCart(currentProduct, qty);
                closeProductModalFunc();
            }
        });
    }
    
    // Admin
    const adminBtn = document.getElementById('adminBtn');
    const closeAdminModal = document.getElementById('closeAdminModal');
    
    if (adminBtn) {
        adminBtn.addEventListener('click', openAdminPanel);
    }
    if (closeAdminModal) {
        closeAdminModal.addEventListener('click', closeAdminPanelFunc);
    }
    
    // Tabs de admin
    const adminTabs = document.querySelectorAll('.admin-tab');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            switchAdminTab(targetTab);
        });
    });
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Si la búsqueda está vacía, mostrar categoría seleccionada
    // Si hay búsqueda, ignorar filtro de categoría
    if (searchTerm) {
        window.selectedCategory = 'Todos';
        renderCategories();
    }
    
    renderProducts();
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
    // Actualizar tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Actualizar contenido
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Si es la pestaña de categorías, cargar gestión de categorías
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
        
        row.innerHTML = `
            <img src="${thumbnailUrl}" alt="${cat}" class="category-row-thumbnail" onerror="this.src='https://via.placeholder.com/80x80?text=${encodeURIComponent(cat)}'">
            <div class="category-row-info">
                <div class="category-row-name">${cat}</div>
                <div class="category-row-status">
                    ${hasImage ? '✅ Miniatura configurada' : '⚠️ Sin miniatura'}
                </div>
            </div>
            <button class="category-upload-btn ${hasImage ? 'has-image' : ''}" data-category="${cat}">
                <i class="fas fa-${hasImage ? 'sync' : 'upload'}"></i>
                ${hasImage ? 'Cambiar Imagen' : 'Subir Imagen'}
            </button>
        `;
        
        const uploadBtn = row.querySelector('.category-upload-btn');
        uploadBtn.addEventListener('click', () => uploadCategoryImage(cat));
        
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
            maxFileSize: 5000000, // 5MB
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
                loadCategoriesManagement(); // Recargar la vista
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

log.success('tienda-main.js cargado');
