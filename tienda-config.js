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

// Cargar productos desde Supabase
async function loadTiendaProducts() {
  try {
    log.info('Cargando productos de la tienda...');

    const { data, error } = await tiendaDB
      .from('products')
      .select('*')
      .gt('quantity', 0) // Solo productos con stock
      .order('name');

    if (error) throw error;

    window.tiendaProducts = data || [];
    log.success(`${data.length} productos cargados`);

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
window.tiendaDB = null;
window.initTiendaDB = initTiendaDB;
window.loadTiendaProducts = loadTiendaProducts;
window.saveTiendaCart = saveTiendaCart;
window.loadTiendaCart = loadTiendaCart;
window.clearTiendaCart = clearTiendaCart;
window.formatPrice = formatPrice;
window.formatWhatsAppNumber = formatWhatsAppNumber;
window.log = log;

log.success('tienda-config.js cargado ✅ CLOUDINARY Y WHATSAPP CONFIGURADOS');
