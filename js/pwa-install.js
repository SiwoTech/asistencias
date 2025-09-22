// PWA Installation y Service Worker Registration
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.swRegistration = null;
        
        this.init();
    }
    
    init() {
        this.checkIfInstalled();
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.setupUpdateCheck();
        this.createInstallButton();
    }
    
    // Verificar si ya está instalado
    checkIfInstalled() {
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true;
        
        if (this.isInstalled) {
            console.log('📱 PWA ya está instalada');
            this.hideInstallPrompts();
        }
    }
    
    // Registrar Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.swRegistration = await navigator.serviceWorker.register('/asistencias/sw.js', {
                    scope: '/asistencias/'
                });
                
                console.log('✅ Service Worker registrado:', this.swRegistration.scope);
                
                // Escuchar actualizaciones
                this.swRegistration.addEventListener('updatefound', () => {
                    console.log('🔄 Nueva versión disponible');
                    this.handleServiceWorkerUpdate();
                });
                
            } catch (error) {
                console.error('❌ Error registrando Service Worker:', error);
            }
        } else {
            console.log('⚠️ Service Worker no soportado');
        }
    }
    
    // Configurar prompt de instalación
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('📱 Prompt de instalación disponible');
            
            // Prevenir el prompt automático
            e.preventDefault();
            
            // Guardar el evento para usarlo después
            this.deferredPrompt = e;
            
            // Mostrar botón de instalación personalizado
            this.showInstallButton();
        });
        
        // Escuchar cuando se instala
        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA instalada exitosamente');
            this.isInstalled = true;
            this.hideInstallPrompts();
            this.showNotification('¡Aplicación instalada correctamente!', 'success');
        });
    }
    
    // Crear botón de instalación
    createInstallButton() {
        // Buscar si ya existe un botón de instalación
        let installBtn = document.getElementById('pwa-install-btn');
        
        if (!installBtn) {
            // Crear botón flotante
            installBtn = document.createElement('button');
            installBtn.id = 'pwa-install-btn';
            installBtn.innerHTML = `
                <i class="fas fa-download"></i>
                <span>Instalar App</span>
            `;
            installBtn.className = 'pwa-install-btn';
            installBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 50px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
                z-index: 1000;
                display: none;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
                font-family: inherit;
            `;
            
            // Hover effect
            installBtn.addEventListener('mouseenter', () => {
                installBtn.style.transform = 'scale(1.05)';
                installBtn.style.boxShadow = '0 6px 16px rgba(231, 76, 60, 0.4)';
            });
            
            installBtn.addEventListener('mouseleave', () => {
                installBtn.style.transform = 'scale(1)';
                installBtn.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.3)';
            });
            
            // Click event
            installBtn.addEventListener('click', () => {
                this.triggerInstall();
            });
            
            document.body.appendChild(installBtn);
        }
        
        this.installButton = installBtn;
    }
    
    // Mostrar botón de instalación
    showInstallButton() {
        if (this.installButton && !this.isInstalled) {
            this.installButton.style.display = 'flex';
            
            // Animación de entrada
            setTimeout(() => {
                this.installButton.style.opacity = '1';
                this.installButton.style.transform = 'translateY(0)';
            }, 100);
        }
    }
    
    // Ocultar prompts de instalación
    hideInstallPrompts() {
        if (this.installButton) {
            this.installButton.style.display = 'none';
        }
    }
    
    // Activar instalación
    async triggerInstall() {
        if (!this.deferredPrompt) {
            console.log('⚠️ Prompt de instalación no disponible');
            
            // Mostrar instrucciones manuales
            this.showManualInstallInstructions();
            return;
        }
        
        try {
            // Mostrar prompt de instalación
            this.deferredPrompt.prompt();
            
            // Esperar respuesta del usuario
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('✅ Usuario aceptó la instalación');
            } else {
                console.log('❌ Usuario canceló la instalación');
            }
            
            // Limpiar el prompt
            this.deferredPrompt = null;
            
        } catch (error) {
            console.error('❌ Error en instalación:', error);
            this.showManualInstallInstructions();
        }
    }
    
    // Mostrar instrucciones de instalación manual
    showManualInstallInstructions() {
        const instructions = this.getInstallInstructions();
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: inherit;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                position: relative;
            ">
                <button onclick="this.parentElement.parentElement.remove()" style="
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">&times;</button>
                
                <h3 style="color: #333; margin-bottom: 20px;">📱 Instalar CWO TimeTrack</h3>
                
                <div style="text-align: left; margin-bottom: 20px;">
                    ${instructions}
                </div>
                
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #e74c3c;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                ">Entendido</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Obtener instrucciones según el dispositivo
    getInstallInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        
        if (isIOS) {
            return `
                <p><strong>En Safari (iOS):</strong></p>
                <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Toca el botón "Compartir" <i class="fas fa-share"></i></li>
                    <li>Selecciona "Añadir a la pantalla de inicio"</li>
                    <li>Toca "Añadir" para confirmar</li>
                </ol>
            `;
        } else if (isAndroid) {
            return `
                <p><strong>En Chrome (Android):</strong></p>
                <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Toca el menú ⋮ (tres puntos)</li>
                    <li>Selecciona "Añadir a la pantalla de inicio"</li>
                    <li>Toca "Añadir" para confirmar</li>
                </ol>
            `;
        } else {
            return `
                <p><strong>En tu navegador:</strong></p>
                <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Busca el icono de instalación en la barra de direcciones</li>
                    <li>O usa el menú del navegador</li>
                    <li>Selecciona "Instalar aplicación"</li>
                </ol>
            `;
        }
    }
    
    // Manejar actualizaciones del Service Worker
    handleServiceWorkerUpdate() {
        const newWorker = this.swRegistration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    // Nueva versión disponible
                    this.showUpdateNotification();
                }
            }
        });
    }
    
    // Mostrar notificación de actualización
    showUpdateNotification() {
        const updateBanner = document.createElement('div');
        updateBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #2ecc71;
            color: white;
            padding: 15px;
            text-align: center;
            z-index: 9999;
            font-family: inherit;
        `;
        
        updateBanner.innerHTML = `
            <strong>📱 Nueva versión disponible</strong>
            <button onclick="window.location.reload()" style="
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid white;
                padding: 5px 15px;
                border-radius: 3px;
                margin-left: 15px;
                cursor: pointer;
            ">Actualizar</button>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                margin-left: 10px;
                cursor: pointer;
                font-size: 18px;
            ">&times;</button>
        `;
        
        document.body.insertBefore(updateBanner, document.body.firstChild);
    }
    
    // Configurar verificación de actualizaciones
    setupUpdateCheck() {
        // Verificar actualizaciones cada 30 minutos
        setInterval(() => {
            if (this.swRegistration) {
                this.swRegistration.update();
            }
        }, 30 * 60 * 1000);
    }
    
    // Función de notificación
    showNotification(message, type = 'info') {
        if (window.sistemaAsistencia && window.sistemaAsistencia.showNotification) {
            window.sistemaAsistencia.showNotification(message, type);
        } else {
            console.log(`PWA ${type.toUpperCase()}: ${message}`);
        }
    }
}

// Inicializar PWA cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.pwaInstaller = new PWAInstaller();
});

// Función global para forzar instalación
window.installPWA = function() {
    if (window.pwaInstaller) {
        window.pwaInstaller.triggerInstall();
    }
};

console.log('📱 PWA Installer cargado');