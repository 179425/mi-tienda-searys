// ============================================
// TIENDA-USERS.JS - Sistema de Usuarios
// ============================================

// Variables globales
let currentUser = null;
const USER_DISCOUNT = 5; // 5% de descuento para usuarios registrados

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

async function registerUser(name, email, password) {
    try {
        // Registrar en Supabase Auth
        const { data, error } = await tiendaDB.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    display_name: name
                },
                emailRedirectTo: window.location.origin
            }
        });

        if (error) throw error;

        // Verificar si el usuario necesita confirmar email
        if (data?.user && !data.session) {
            log.warn('Usuario creado pero requiere confirmación de email');
            showToast('⚠️ Revisa tu email para confirmar tu cuenta', 'warning');
            return data;
        }

        log.success('Usuario registrado exitosamente');
        
        // Si hay sesión activa (email auto-confirmado), guardar datos
        if (data.session) {
            showToast('✅ Cuenta creada con éxito. ¡Bienvenido!', 'success');
            
            // Guardar datos del usuario
            await saveUserData({
                id: data.user.id,
                email: email,
                name: name,
                created_at: new Date().toISOString(),
                total_orders: 0
            });
            
            currentUser = data.user;
            await loadUserData(data.user.id);
            updateUserUI();
        } else {
            showToast('✅ Cuenta creada. Revisa tu email para confirmar.', 'success');
        }

        return data;
    } catch (error) {
        log.error('Error registrando usuario: ' + error.message);
        
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
            showToast('❌ Este correo ya está registrado. Intenta iniciar sesión.', 'error');
        } else if (error.message.includes('Password')) {
            showToast('❌ La contraseña debe tener al menos 6 caracteres', 'error');
        } else {
            showToast('❌ Error al crear cuenta: ' + error.message, 'error');
        }
        
        throw error;
    }
}

async function loginUser(email, password) {
    try {
        const { data, error } = await tiendaDB.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        log.success('Inicio de sesión exitoso');
        showToast('✅ ¡Bienvenido de nuevo!', 'success');
        
        currentUser = data.user;
        
        // Cargar datos adicionales del usuario
        await loadUserData(data.user.id);
        updateUserUI();
        
        return data;
    } catch (error) {
        log.error('Error en login: ' + error.message);
        console.error('Detalles del error:', error);
        
        if (error.message.includes('Invalid login credentials')) {
            showToast('❌ Correo o contraseña incorrectos', 'error');
        } else if (error.message.includes('Email not confirmed')) {
            showToast('⚠️ Debes confirmar tu email primero. Revisa tu correo.', 'warning');
        } else if (error.message.includes('Invalid')) {
            showToast('❌ Credenciales inválidas. Verifica tus datos.', 'error');
        } else {
            showToast('❌ Error al iniciar sesión: ' + error.message, 'error');
        }
        
        throw error;
    }
}

async function logoutUser() {
    try {
        const { error } = await tiendaDB.auth.signOut();
        
        if (error) throw error;
        
        currentUser = null;
        updateUserUI();
        
        log.info('Sesión cerrada');
        showToast('Sesión cerrada correctamente', 'success');
        
        // Cerrar modal
        const userModal = document.getElementById('userModal');
        if (userModal) {
            userModal.classList.remove('active');
        }
    } catch (error) {
        log.error('Error cerrando sesión: ' + error.message);
        showToast('Error al cerrar sesión', 'error');
    }
}

async function checkUserSession() {
    try {
        const { data: { session } } = await tiendaDB.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            await loadUserData(session.user.id);
            updateUserUI();
            log.info('Sesión de usuario activa');
        }
    } catch (error) {
        log.error('Error verificando sesión: ' + error.message);
    }
}

// ============================================
// GESTIÓN DE DATOS DE USUARIO
// ============================================

async function saveUserData(userData) {
    try {
        const { error } = await tiendaDB
            .from('users')
            .upsert(userData);
        
        if (error) throw error;
        
        log.success('Datos de usuario guardados');
    } catch (error) {
        log.error('Error guardando datos: ' + error.message);
    }
}

async function loadUserData(userId) {
    try {
        const { data, error } = await tiendaDB
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            // Si no existe el usuario en la tabla, crear registro
            if (error.code === 'PGRST116') {
                const { data: authUser } = await tiendaDB.auth.getUser();
                await saveUserData({
                    id: userId,
                    email: authUser.user.email,
                    name: authUser.user.user_metadata.display_name || 'Usuario',
                    created_at: new Date().toISOString(),
                    total_orders: 0
                });
                return;
            }
            throw error;
        }
        
        if (data) {
            currentUser = { ...currentUser, ...data };
        }
    } catch (error) {
        log.error('Error cargando datos: ' + error.message);
    }
}

async function incrementUserOrders(userId) {
    try {
        const { error } = await tiendaDB.rpc('increment_user_orders', {
            user_id: userId
        });
        
        if (error) throw error;
        
        if (currentUser) {
            currentUser.total_orders = (currentUser.total_orders || 0) + 1;
            updateUserUI();
        }
    } catch (error) {
        log.error('Error incrementando pedidos: ' + error.message);
    }
}

// ============================================
// UI Y FUNCIONES AUXILIARES
// ============================================

function updateUserUI() {
    const userBtn = document.getElementById('userBtn');
    const userAuthView = document.getElementById('userAuthView');
    const userProfileView = document.getElementById('userProfileView');
    
    if (currentUser) {
        // Usuario logueado
        if (userBtn) {
            userBtn.classList.add('logged-in');
        }
        
        if (userAuthView) {
            userAuthView.style.display = 'none';
        }
        
        if (userProfileView) {
            userProfileView.style.display = 'block';
            
            // Actualizar datos en el perfil
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            const totalOrders = document.getElementById('totalOrders');
            
            if (profileName) {
                profileName.textContent = currentUser.name || currentUser.user_metadata?.display_name || 'Usuario';
            }
            
            if (profileEmail) {
                profileEmail.textContent = currentUser.email;
            }
            
            if (totalOrders) {
                totalOrders.textContent = currentUser.total_orders || 0;
            }
        }
    } else {
        // Usuario no logueado
        if (userBtn) {
            userBtn.classList.remove('logged-in');
        }
        
        if (userAuthView) {
            userAuthView.style.display = 'block';
        }
        
        if (userProfileView) {
            userProfileView.style.display = 'none';
        }
    }
    
    // Actualizar carrito para reflejar descuento
    if (typeof renderCart === 'function') {
        renderCart();
    }
}

function openUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.classList.add('active');
        updateUserUI();
    }
}

function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function switchAuthTab(tabName) {
    // Actualizar tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Actualizar contenido
    document.querySelectorAll('.auth-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

function getUserDiscount() {
    return currentUser ? USER_DISCOUNT : 0;
}

function isUserLoggedIn() {
    return currentUser !== null;
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Verificar sesión al cargar
    if (tiendaDB) {
        checkUserSession();
    }
    
    // Botón de usuario
    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.addEventListener('click', openUserModal);
    }
    
    // Cerrar modal
    const closeUserModal = document.getElementById('closeUserModal');
    if (closeUserModal) {
        closeUserModal.addEventListener('click', () => {
            const modal = document.getElementById('userModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    // Tabs de autenticación
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchAuthTab(tab.dataset.tab);
        });
    });
    
    // Formulario de registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            
            try {
                await registerUser(name, email, password);
                
                // Limpiar formulario
                registerForm.reset();
                
                // Cambiar a vista de perfil
                updateUserUI();
            } catch (error) {
                // Error ya manejado en registerUser
            }
        });
    }
    
    // Formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                await loginUser(email, password);
                
                // Limpiar formulario
                loginForm.reset();
                
                // Cambiar a vista de perfil
                updateUserUI();
            } catch (error) {
                // Error ya manejado en loginUser
            }
        });
    }
    
    // Botón de logout
    const logoutBtn = document.getElementById('logoutUserBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }
});

// ============================================
// EXPORTAR FUNCIONES
// ============================================

window.currentUser = currentUser;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.checkUserSession = checkUserSession;
window.updateUserUI = updateUserUI;
window.getUserDiscount = getUserDiscount;
window.isUserLoggedIn = isUserLoggedIn;
window.incrementUserOrders = incrementUserOrders;

log.success('tienda-users.js cargado - Sistema de usuarios activo');
