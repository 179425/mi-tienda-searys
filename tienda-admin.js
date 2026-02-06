// ============================================
// TIENDA-ADMIN.JS - Versión Optimizada v2
// ============================================

let cloudinaryWidget = null;
let currentProductForUpload = null;
let isLoadingAdminData = false;

// ============================================
// FUNCIÓN OPTIMIZADA PARA REFRESCAR PRODUCTOS
// ============================================

async function refreshProductLists() {
  if (isLoadingAdminData) {
    log.warn('Ya se están refrescando las listas');
    return;
  }
  
  try {
    isLoadingAdminData = true;
    
    // Una sola carga de productos desde la base de datos
    await loadTiendaProducts();
    
    // Actualizar ambas listas en paralelo
    await Promise.all([
      loadProductsWithoutImages(),
      loadProductsWithImages()
    ]);
    
    // Re-renderizar productos en la tienda
    if (typeof renderProducts === 'function') {
      renderProducts();
    }
  } finally {
    isLoadingAdminData = false;
  }
}

// ============================================
// CARGAR DATOS DEL ADMIN
// ============================================

async function loadAdminData() {
  log.info('Cargando datos de administración...');

  checkCloudinaryConfig();
  
  await refreshProductLists();
}

// ============================================
// VERIFICAR CONFIGURACIÓN DE CLOUDINARY
// ============================================

function checkCloudinaryConfig() {
  const statusDiv = document.getElementById('cloudinaryStatus');
  if (!statusDiv) return;

  const isConfigured =
    CLOUDINARY_CONFIG.cloudName &&
    CLOUDINARY_CONFIG.cloudName !== 'TU_CLOUD_NAME' &&
    CLOUDINARY_CONFIG.uploadPreset &&
    CLOUDINARY_CONFIG.uploadPreset !== 'TU_UPLOAD_PRESET';

  if (isConfigured) {
    statusDiv.innerHTML = `
      <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 1rem; border-radius: 12px; border: 2px solid var(--secondary); margin-top: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--secondary); font-weight: 700; margin-bottom: 0.5rem;">
          <i class="fas fa-check-circle"></i>
          Cloudinary Configurado
        </div>
        <div style="font-size: 0.9rem; color: var(--gray-700);">
          <strong>Cloud Name:</strong> ${CLOUDINARY_CONFIG.cloudName}<br>
          <strong>Upload Preset:</strong> ${CLOUDINARY_CONFIG.uploadPreset}
        </div>
      </div>
    `;
  } else {
    statusDiv.innerHTML = `
      <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 1rem; border-radius: 12px; border: 2px solid var(--error); margin-top: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--error); font-weight: 700; margin-bottom: 0.5rem;">
          <i class="fas fa-exclamation-triangle"></i>
          Cloudinary NO Configurado
        </div>
        <div style="font-size: 0.9rem; color: var(--gray-700);">
          Por favor edita <code>tienda-config.js</code> con tus credenciales de Cloudinary
        </div>
      </div>
    `;
  }
}

// ============================================
// CARGAR PRODUCTOS SIN IMAGEN
// ============================================

async function loadProductsWithoutImages() {
  const container = document.getElementById('productsWithoutImages');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div><p>Cargando...</p></div>';

  try {
    const products = window.tiendaProducts || [];
    const withoutImages = products.filter((p) => !p.image_url);

    if (withoutImages.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
          <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 1rem; color: var(--secondary);"></i>
          <h4>¡Excelente!</h4>
          <p>Todos los productos tienen imagen</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    withoutImages.forEach((product) => {
      const row = createProductRow(product);
      container.appendChild(row);
    });
  } catch (error) {
    log.error('Error cargando productos: ' + error.message);
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--error);">
        <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>Error al cargar productos</p>
      </div>
    `;
  }
}

function createProductRow(product) {
  const row = document.createElement('div');
  row.className = 'product-row';

  row.innerHTML = `
    <div class="product-row-info">
      <div class="product-row-name">${product.name}</div>
      <div class="product-row-price">${formatPrice(product.sale_price)} | Stock: ${product.quantity}</div>
    </div>
    <button class="upload-btn" data-product-id="${product.id}">
      <i class="fas fa-upload"></i>
      Subir Imagen
    </button>
  `;

  const uploadBtn = row.querySelector('.upload-btn');
  uploadBtn.addEventListener('click', () => {
    openCloudinaryUpload(product);
  });

  return row;
}

// ============================================
// CLOUDINARY UPLOAD
// ============================================

function openCloudinaryUpload(product) {
  const isConfigured =
    CLOUDINARY_CONFIG.cloudName &&
    CLOUDINARY_CONFIG.cloudName !== 'TU_CLOUD_NAME' &&
    CLOUDINARY_CONFIG.uploadPreset &&
    CLOUDINARY_CONFIG.uploadPreset !== 'TU_UPLOAD_PRESET';

  if (!isConfigured) {
    alert('⚠️ Cloudinary no está configurado.\n\nPor favor edita el archivo tienda-config.js con tus credenciales de Cloudinary.');
    return;
  }

  currentProductForUpload = product;

  if (!cloudinaryWidget) {
    cloudinaryWidget = cloudinary.createUploadWidget(
      {
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
        sources: ['local', 'camera', 'url'],
        multiple: false,
        maxFiles: 1,
        maxFileSize: 5000000,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        folder: 'searys-store/products',
        cropping: true,
        croppingAspectRatio: 1,
        croppingDefaultSelectionRatio: 1,
        croppingShowDimensions: true,
        showSkipCropButton: false,
        language: 'es',
        text: {
          es: {
            or: 'o',
            back: 'Atrás',
            advanced: 'Avanzado',
            close: 'Cerrar',
            no_results: 'Sin resultados',
            search_placeholder: 'Buscar archivos',
            about_uw: 'Acerca del widget',
            menu: {
              files: 'Mis Archivos',
              web: 'Web',
              camera: 'Cámara',
            },
            local: {
              browse: 'Explorar',
              dd_title_single: 'Arrastra una imagen aquí',
              dd_title_multi: 'Arrastra imágenes aquí',
              drop_title_single: 'Suelta para subir',
              drop_title_multiple: 'Suelta para subir',
            },
            camera: {
              capture: 'Capturar',
              cancel: 'Cancelar',
              take_pic: 'Tomar una foto',
              explanation: 'Asegúrate de que tu navegador permita el acceso a la cámara',
            },
            crop: {
              title: 'Recortar',
              crop_btn: 'Recortar y Continuar',
              skip_btn: 'Omitir',
              reset_btn: 'Reiniciar',
              close_btn: 'Sí',
              close_prompt: '¿Cerrar sin guardar cambios?',
              image_error: 'Error cargando imagen',
            },
          },
        },
      },
      async (error, result) => {
        if (!error && result && result.event === 'success') {
          log.success('Imagen subida a Cloudinary');
          const imageUrl = result.info.secure_url;
          await saveProductImage(currentProductForUpload.id, imageUrl);
        }

        if (error) {
          log.error('Error en Cloudinary: ' + error.message);
        }
      }
    );
  }

  cloudinaryWidget.open();
}

// ============================================
// GUARDAR IMAGEN EN SUPABASE
// ============================================

async function saveProductImage(productId, imageUrl) {
  try {
    log.info(`Guardando imagen para producto ${productId}...`);

    const { data, error } = await window.tiendaDB
      .from('products')
      .update({ image_url: imageUrl })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    log.success('Imagen guardada en la base de datos');
    showToast('✅ Imagen subida correctamente', 'success');

    // Actualizar producto en el array local
    const products = window.tiendaProducts || [];
    const productIndex = products.findIndex((p) => p.id === productId);
    if (productIndex !== -1) {
      products[productIndex].image_url = imageUrl;
      window.tiendaProducts = products;
    }

    // Usar función optimizada para refrescar listas
    await refreshProductLists();
  } catch (error) {
    log.error('Error guardando imagen: ' + error.message);
    showToast('❌ Error al guardar imagen', 'error');
  }
}

// ============================================
// CARGAR PRODUCTOS CON IMAGEN
// ============================================

async function loadProductsWithImages() {
  const container = document.getElementById('productsWithImages');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div><p>Cargando...</p></div>';

  try {
    const products = window.tiendaProducts || [];
    const withImages = products.filter((p) => p.image_url);

    if (withImages.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
          <i class="fas fa-images" style="font-size: 3rem; margin-bottom: 1rem; color: var(--gray-400);"></i>
          <h4>No hay productos con imagen</h4>
          <p>Sube imágenes desde la sección anterior</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    withImages.forEach((product) => {
      const row = createProductRowWithImage(product);
      container.appendChild(row);
    });
  } catch (error) {
    log.error('Error cargando productos: ' + error.message);
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--error);">
        <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>Error al cargar productos</p>
      </div>
    `;
  }
}

function createProductRowWithImage(product) {
  const row = document.createElement('div');
  row.className = 'product-row-with-image';
  row.style.cssText = `
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 12px;
    margin-bottom: 0.75rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
  `;

  const imageUrl = product.image_url || 'https://via.placeholder.com/80x80?text=Sin+Imagen';

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = product.name;
  img.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid var(--gray-200);';
  img.onerror = function() {
    if (this.src !== 'https://via.placeholder.com/80x80?text=Error') {
      this.onerror = null;
      this.src = 'https://via.placeholder.com/80x80?text=Error';
    }
  };

  const infoDiv = document.createElement('div');
  infoDiv.style.flex = '1';
  infoDiv.innerHTML = `
    <div style="font-weight: 600; color: var(--gray-900); margin-bottom: 0.25rem;">${product.name}</div>
    <div style="font-size: 0.875rem; color: var(--gray-600);">${formatPrice(product.sale_price)} | Stock: ${product.quantity}</div>
  `;

  const changeBtn = document.createElement('button');
  changeBtn.className = 'change-image-btn';
  changeBtn.style.cssText = `
    background: var(--primary);
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
  `;
  changeBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Cambiar Imagen';
  changeBtn.addEventListener('click', () => openCloudinaryUpload(product));

  row.appendChild(img);
  row.appendChild(infoDiv);
  row.appendChild(changeBtn);

  return row;
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================

window.loadAdminData = loadAdminData;
window.loadProductsWithImages = loadProductsWithImages;
window.loadProductsWithoutImages = loadProductsWithoutImages;
window.openCloudinaryUpload = openCloudinaryUpload;
window.saveProductImage = saveProductImage;
window.refreshProductLists = refreshProductLists;

log.success('tienda-admin.js v2 cargado - Optimizado');
