// ============================================
// TIENDA-CONFIG.JS - Configuración de la Tienda Virtual
// ============================================

// Configuración de Supabase (misma que tu app de recepción)
const SUPABASE_URL = 'https://megjcvscblwxikirqchw.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lZ2pjdnNjYmx3eGlraXJxY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDE4OTQsImV4cCI6MjA3ODkxNzg5NH0.Kd9ZdnUf5hF92B84vh3RUA00vsR5ohbFjHkqRp645QA';

// Configuración de Cloudinary - ✅ YA CONFIGURADO
const CLOUDINARY_CONFIG = {
  cloudName: 'dgjsxjxmm',
  uploadPreset: 'searys-store',
  apiKey: '',
};

// 🔐 CONFIGURACIÓN DE ACCESO ADMIN
// ⚠️ CAMBIA ESTA CLAVE POR UNA PROPIA Y MANTENLA SECRETA
const ADMIN_CONFIG = {
  secretKey: 'searys2025admin', // Cambia esto por tu propia clave secreta
  sessionDuration: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
};

// Configuración de la tienda
const TIENDA_CONFIG = {
  nombre: 'SeArys Store',
  whatsappNumber: '573173404951', // ✅ Tu número de Colombia
  moneda: 'COP',
  iva: 19, // Porcentaje de IVA por defecto
  envioGratis: 50000, // Pedidos mayores a este valor tienen envío gratis
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
let tiendaDB = null;

function initTiendaDB() {
  if (typeof supabase !== 'undefined' && !tiendaDB) {
    tiendaDB = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Base de datos de tienda inicializada');
    return true;
  }
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
// 🔐 FUNCIONES DE AUTENTICACIÓN ADMIN
// ============================================

// Verificar si hay sesión admin activa
function isAdminAuthenticated() {
  const session = sessionStorage.getItem('searys_admin_session');
  if (!session) return false;

  try {
    const sessionData = JSON.parse(session);
    const now = new Date().getTime();

    // Verificar si la sesión no ha expirado
    if (now < sessionData.expiry) {
      return true;
    } else {
      // Sesión expirada, limpiar
      sessionStorage.removeItem('searys_admin_session');
      return false;
    }
  } catch (error) {
    return false;
  }
}

// Autenticar admin con clave secreta
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

// Cerrar sesión admin
function logoutAdmin() {
  sessionStorage.removeItem('searys_admin_session');
  log.info('🔒 Sesión admin cerrada');

  // Ocultar botones de admin
  const adminBtn = document.getElementById('adminBtn');
  const logoutBtn = document.getElementById('logoutAdminBtn');
  
  if (adminBtn) {
    adminBtn.style.display = 'none';
  }
  
  if (logoutBtn) {
    logoutBtn.style.display = 'none';
  }

  // Cerrar modal de admin si está abierto
  const adminModal = document.getElementById('adminModal');
  if (adminModal && adminModal.classList.contains('active')) {
    adminModal.classList.remove('active');
  }

  // Mostrar toast si la función está disponible
  if (typeof showToast === 'function') {
    showToast('Sesión de administrador cerrada', 'success');
  }
}

// Verificar URL para activar modo admin
function checkAdminAccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const adminKey = urlParams.get('admin');

  if (adminKey) {
    if (authenticateAdmin(adminKey)) {
      // Limpiar URL sin recargar la página
      window.history.replaceState({}, document.title, window.location.pathname);
      log.success('🔓 Acceso admin concedido');
      
      // Mostrar toast si la función ya está disponible
      if (typeof showToast === 'function') {
        showToast('Bienvenido Administrador', 'success');
      }
      
      // Actualizar UI de admin
      setTimeout(() => {
        toggleAdminUI();
      }, 100);
      
      return true;
    } else {
      log.error('🔒 Clave de admin incorrecta');
      
      // Mostrar toast si la función ya está disponible
      if (typeof showToast === 'function') {
        showToast('Clave de administrador incorrecta', 'error');
      }
      
      window.history.replaceState({}, document.title, window.location.pathname);
      return false;
    }
  }

  return isAdminAuthenticated();
}

// Mostrar/ocultar controles de admin según autenticación
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
// FUNCIONES ORIGINALES
// ============================================

// Cargar productos desde Supabase
async function loadTiendaProducts() {
  try {
    log.info('Cargando productos de la tienda...');

    const { data, error } = await tiendaDB
      .from('products')
      .select('*')
      .order('quantity', { ascending: false }) // Primero con stock, luego sin stock
      .order('name');

    if (error) throw error;

    window.tiendaProducts = data || [];
    log.success(`${data.length} productos cargados (${data.filter(p => p.quantity > 0).length} con stock)`);

    return data;
  } catch (error) {
    log.error('Error cargando productos: ' + error.message);
    return [];
  }
}

// Guardar carrito en localStorage
function saveTiendaCart() {
  localStorage.setItem('searys_tienda_cart', JSON.stringify(window.tiendaCart));
  log.info('Carrito guardado');
}

// Cargar carrito desde localStorage
function loadTiendaCart() {
  const saved = localStorage.getItem('searys_tienda_cart');
  if (saved) {
    window.tiendaCart = JSON.parse(saved);
    log.info(`Carrito recuperado: ${window.tiendaCart.length} items`);
  }
  return window.tiendaCart;
}

// Limpiar carrito
function clearTiendaCart() {
  window.tiendaCart = [];
  localStorage.removeItem('searys_tienda_cart');
  log.info('Carrito limpiado');
}

// Formatear precio
function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// Formatear número para WhatsApp
function formatWhatsAppNumber(number) {
  // Remover espacios, guiones y paréntesis
  return number.replace(/[\s\-\(\)]/g, '');
}

// Exportar configuración
window.TIENDA_CONFIG = TIENDA_CONFIG;
window.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG;
window.ADMIN_CONFIG = ADMIN_CONFIG;
window.tiendaDB = null;
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

log.success('tienda-config.js cargado ✅ CLOUDINARY, WHATSAPP Y SEGURIDAD ADMIN CONFIGURADOS');
