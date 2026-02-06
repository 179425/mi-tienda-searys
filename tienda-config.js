// ============================================
// TIENDA-CONFIG.JS - Versión Optimizada v2
// ============================================

// Configuración de Supabase
const SUPABASE_URL = 'https://megjcvscblwxikirqchw.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lZ2pjdnNjYmx3eGlraXJxY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDE4OTQsImV4cCI6MjA3ODkxNzg5NH0.Kd9ZdnUf5hF92B84vh3RUA00vsR5ohbFjHkqRp645QA';

// Configuración de Cloudinary
const CLOUDINARY_CONFIG = {
  cloudName: 'dgjsxjxmm',
  uploadPreset: 'searys-store',
  apiKey: '',
};

// Configuración de acceso admin
const ADMIN_CONFIG = {
  secretKey: 'searys2025admin',
  sessionDuration: 24 * 60 * 60 * 1000,
};

// Configuración de la tienda
const TIENDA_CONFIG = {
  nombre: 'SeArys Store',
  whatsappNumber: '573173404951',
  moneda: 'COP',
  iva: 19,
  envioGratis: 50000,
  costoEnvio: 5000,
  colores: {
    primario: '#4f46e5',
    secundario: '#10b981',
    acento: '#f59e0b',
    error: '#ef4444',
  },
  categorias: [
    'Todos',
    'Bebidas',
    'Snacks',
    'Lácteos',
    'Limpieza',
    'Aseo Personal',
    'Mascotas',
    'Otros',
  ],
};

// Cliente de Supabase
window.tiendaDB = null;

function initTiendaDB() {
  if (typeof supabase !== 'undefined' && !window.tiendaDB) {
    window.tiendaDB = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Base de datos de tienda inicializada');
    console.log('✅ Cliente Supabase creado:', window.tiendaDB);
    return true;
  }
  if (window.tiendaDB) {
    console.log('ℹ️ Base de datos ya inicializada');
    return true;
  }
  console.error('❌ No se pudo inicializar base de datos - Supabase no disponible');
  return false;
}

// Logger simple
const log = {
  info: (msg) => console.log('ℹ️', msg),
  success: (msg) => console.log('✅', msg),
  error: (msg) => console.error('❌', msg),
  warn: (msg) => console.warn('⚠️', msg),
};

// Variables globales de la tienda
window.tiendaProducts = [];
window.tiendaCart = [];
window.tiendaCategories = TIENDA_CONFIG.categorias;
window.selectedCategory = 'Todos';

// ============================================
// FUNCIONES DE AUTENTICACIÓN ADMIN
// ============================================

function isAdminAuthenticated() {
  const session = sessionStorage.getItem('searys_admin_session');
  if (!session) return false;

  try {
    const sessionData = JSON.parse(session);
    const now = new Date().getTime();

    if (now < sessionData.expiry) {
      return true;
    } else {
      sessionStorage.removeItem('searys_admin_session');
      return false;
    }
  } catch (error) {
    return false;
  }
}

function authenticateAdmin(secretKey) {
  if (secretKey === ADMIN_CONFIG.secretKey) {
    const expiry = new Date().getTime() + ADMIN_CONFIG.sessionDuration;
    const sessionData = {
      authenticated: true,
      expiry: expiry,
      timestamp: new Date().getTime(),
    };

    sessionStorage.setItem('searys_admin_session', JSON.stringify(sessionData));
    log.success('🔓 Sesión admin iniciada');
    return true;
  }
  return false;
}

function logoutAdmin() {
  sessionStorage.removeItem('searys_admin_session');
  log.info('🔒 Sesión admin cerrada');

  toggleAdminUI();

  const adminModal = document.getElementById('adminModal');
  if (adminModal && adminModal.classList.contains('active')) {
    adminModal.classList.remove('active');
  }

  if (typeof showToast === 'function') {
    showToast('Sesión de administrador cerrada', 'success');
  }
}

function checkAdminAccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const adminKey = urlParams.get('admin');

  if (adminKey) {
    if (authenticateAdmin(adminKey)) {
      window.history.replaceState({}, document.title, window.location.pathname);
      log.success('🔓 Acceso admin concedido');
      
      // Actualizar UI inmediatamente
      toggleAdminUI();
      
      if (typeof showToast === 'function') {
        showToast('Bienvenido Administrador', 'success');
      }
      
      return true;
    } else {
      log.error('🔒 Clave de admin incorrecta');
      
      if (typeof showToast === 'function') {
        showToast('Clave de administrador incorrecta', 'error');
      }
      
      window.history.replaceState({}, document.title, window.location.pathname);
      return false;
    }
  }

  // Actualizar UI basado en autenticación existente
  toggleAdminUI();
  return isAdminAuthenticated();
}

function toggleAdminUI() {
  const adminBtn = document.getElementById('adminBtn');
  const logoutBtn = document.getElementById('logoutAdminBtn');
  const isAuthenticated = isAdminAuthenticated();

  if (adminBtn) {
    adminBtn.style.display = isAuthenticated ? 'flex' : 'none';
  }
  
  if (logoutBtn) {
    logoutBtn.style.display = isAuthenticated ? 'flex' : 'none';
  }

  return isAuthenticated;
}

// ============================================
// FUNCIONES DE PRODUCTOS
// ============================================

let isLoadingFromDB = false;

async function loadTiendaProducts() {
  // Evitar múltiples cargas simultáneas
  if (isLoadingFromDB) {
    log.warn('Ya se está cargando productos de la BD');
    return window.tiendaProducts;
  }

  try {
    isLoadingFromDB = true;
    log.info('Cargando productos de la tienda...');

    const { data, error } = await window.tiendaDB
      .from('products')
      .select('*')
      .order('quantity', { ascending: false })
      .order('name');

    if (error) throw error;

    window.tiendaProducts = data || [];
    log.success(`${data.length} productos cargados (${data.filter(p => p.quantity > 0).length} con stock)`);

    return data;
  } catch (error) {
    log.error('Error cargando productos: ' + error.message);
    return [];
  } finally {
    isLoadingFromDB = false;
  }
}

function saveTiendaCart() {
  localStorage.setItem('searys_tienda_cart', JSON.stringify(window.tiendaCart));
}

function loadTiendaCart() {
  const saved = localStorage.getItem('searys_tienda_cart');
  if (saved) {
    window.tiendaCart = JSON.parse(saved);
    log.info(`Carrito recuperado: ${window.tiendaCart.length} items`);
  }
  return window.tiendaCart;
}

function clearTiendaCart() {
  window.tiendaCart = [];
  localStorage.removeItem('searys_tienda_cart');
  log.info('Carrito limpiado');
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatWhatsAppNumber(number) {
  return number.replace(/[\s\-\(\)]/g, '');
}

// Exportar configuración
window.TIENDA_CONFIG = TIENDA_CONFIG;
window.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG;
window.ADMIN_CONFIG = ADMIN_CONFIG;
// window.tiendaDB ya está inicializado en initTiendaDB()
window.initTiendaDB = initTiendaDB;
window.loadTiendaProducts = loadTiendaProducts;
window.saveTiendaCart = saveTiendaCart;
window.loadTiendaCart = loadTiendaCart;
window.clearTiendaCart = clearTiendaCart;
window.formatPrice = formatPrice;
window.formatWhatsAppNumber = formatWhatsAppNumber;
window.log = log;

// Exportar funciones de admin
window.isAdminAuthenticated = isAdminAuthenticated;
window.authenticateAdmin = authenticateAdmin;
window.logoutAdmin = logoutAdmin;
window.checkAdminAccess = checkAdminAccess;
window.toggleAdminUI = toggleAdminUI;

log.success('tienda-config.js v2 cargado - Optimizado');
