// ============================================
// TIENDA-MAIN.JS - Lógica Principal
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
    
    // 🔐 Verificar acceso admin desde URL
    checkAdminAccess();
    
    // 🔐 Mostrar/ocultar controles de admin
    toggleAdminUI();
    
    // Cargar carrito guardado
    loadTiendaCart();
    updateCartBadge();
    
    // Renderizar categorías
    renderCategories();
    
    // Cargar productos
    await loadAndRenderProducts();
    
    // Event Listeners
    setupEventListeners();
    
    log.success('Tienda inicializada');
});

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
        const products = await loadTiendaProducts();
        
        if (loadingState) loadingState.style.display = 'none';
        
        if (products && products.length > 0) {
            renderProducts(products);
        } else {
            if (emptyState) emptyState.style.display = 'block';
        }
    } catch (error) {
        log.error('Error cargando productos: ' + error.message);
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    }
}

function renderProducts(productsToRender = null) {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const productsCount = document.getElementById('productsCount');
    
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
    
    // Actualizar contador
    if (productsCount) {
        productsCount.textContent = products.length;
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
    
    // Imagen por defecto si no tiene
    const imageUrl = product.image_url || 'https://via.placeholder.com/300x300?text=Sin+Imagen';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x300?text=Sin+Imagen'">
        <div class="product-card-body">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-stock">
                <i class="fas fa-box"></i>
                <span>${product.quantity} disponibles</span>
            </div>
            <div class="product-price-row">
                <div class="product-price">${formatPrice(product.sale_price)}</div>
                <button class="add-to-cart-btn" title="Agregar al carrito">
                    <i class="fas fa-cart-plus"></i>
                </button>
            </div>
        </div>
    `;
    
    // Click en la tarjeta abre modal
    card.addEventListener('click', (e) => {
        // Si no se clickeó el botón de agregar
        if (!e.target.closest('.add-to-cart-btn')) {
            openProductModal(product);
        }
    });
    
    // Click en el botón de agregar
    const addBtn = card.querySelector('.add-to-cart-btn');
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(product, 1);
    });
    
    return card;
}

// ============================================
// CATEGORÍAS
// ============================================

function renderCategories() {
    const categoriesNav = document.getElementById('categoriesNav');
    const categoriesDesktop = document.getElementById('categoriesDesktop');
    
    const categories = window.tiendaCategories || [];
    
    // Renderizar en sidebar (móvil)
    if (categoriesNav) {
        categoriesNav.innerHTML = '';
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.textContent = cat;
            if (cat === window.selectedCategory) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', () => selectCategory(cat));
            categoriesNav.appendChild(btn);
        });
    }
    
    // Renderizar en desktop
    if (categoriesDesktop) {
        categoriesDesktop.innerHTML = '';
        categories.forEach(cat => {
            const chip = document.createElement('button');
            chip.className = 'category-chip';
            chip.textContent = cat;
            if (cat === window.selectedCategory) {
                chip.classList.add('active');
            }
            chip.addEventListener('click', () => selectCategory(cat));
            categoriesDesktop.appendChild(chip);
        });
    }
}

function selectCategory(category) {
    window.selectedCategory = category;
    
    // Actualizar título
    const categoryTitle = document.getElementById('categoryTitle');
    if (categoryTitle) {
        categoryTitle.textContent = category === 'Todos' ? 'Todos los Productos' : category;
    }
    
    // Actualizar UI de categorías
    document.querySelectorAll('.category-chip, .categories-nav button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === category) {
            btn.classList.add('active');
        }
    });
    
    // Cerrar sidebar si está abierto
    closeSidebar();
    
    // Re-renderizar productos
    renderProducts();
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
    const modalQty = document.getElementById('modalQty');
    
    if (!modal) return;
    
    const imageUrl = product.image_url || 'https://via.placeholder.com/500x500?text=Sin+Imagen';
    
    if (modalImage) {
        modalImage.src = imageUrl;
        modalImage.onerror = () => {
            modalImage.src = 'https://via.placeholder.com/500x500?text=Sin+Imagen';
        };
    }
    if (modalName) modalName.textContent = product.name;
    if (modalPrice) modalPrice.textContent = formatPrice(product.sale_price);
    if (modalStock) modalStock.textContent = product.quantity;
    if (modalQty) modalQty.value = 1;
    
    modal.classList.add('active');
}

function closeProductModalFunc() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
    currentProduct = null;
}

// ============================================
// BÚSQUEDA
// ============================================

let searchTimeout = null;

function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        renderProducts();
    }, 300);
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Menú móvil
    const menuToggle = document.getElementById('menuToggle');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', openSidebar);
    }
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
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
    
    // 🔐 Admin - Solo si está autenticado
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

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.add('active');
    if (overlay) overlay.classList.add('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
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
    // 🔐 Verificar autenticación antes de abrir
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
}

// ============================================
// AGREGAR AL CARRITO
// ============================================

function addToCart(product, quantity = 1) {
    const cart = window.tiendaCart;
    
    // Verificar stock
    if (quantity > product.quantity) {
        showToast('Stock insuficiente', 'error');
        return;
    }
    
    // Buscar si ya existe
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex !== -1) {
        // Actualizar cantidad
        const newQty = cart[existingIndex].quantity + quantity;
        
        if (newQty > product.quantity) {
            showToast('Stock insuficiente', 'error');
            return;
        }
        
        cart[existingIndex].quantity = newQty;
    } else {
        // Agregar nuevo
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

log.success('tienda-main.js cargado');
