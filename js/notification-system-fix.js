// Sistema mejorado de notificaciones que se ve sobre los modales
class NotificationSystem {
    constructor() {
        this.container = null;
        this.createContainer();
    }

    createContainer() {
        // Crear contenedor de notificaciones si no existe
        this.container = document.getElementById('notifications-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notifications-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
            `;
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 5000) {
        console.log('🔔 Showing notification:', type, message);
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            background: white;
            border: 2px solid ${this.getColorForType(type)};
            border-radius: 8px;
            padding: 15px 20px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-weight: bold;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
            color: ${this.getTextColorForType(type)};
            background: ${this.getBackgroundForType(type)};
            position: relative;
            word-wrap: break-word;
        `;
        
        // Agregar icono
        const icon = this.getIconForType(type);
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${icon}" style="font-size: 1.2rem;"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none; 
                    border: none; 
                    font-size: 1.2rem; 
                    cursor: pointer; 
                    color: inherit;
                    margin-left: auto;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>
        `;
        
        this.container.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-remover después del tiempo especificado
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }
        
        return notification;
    }

    remove(notification) {
        if (notification && notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }

    getColorForType(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    getTextColorForType(type) {
        const colors = {
            success: '#155724',
            error: '#721c24',
            warning: '#856404',
            info: '#0c5460'
        };
        return colors[type] || colors.info;
    }

    getBackgroundForType(type) {
        const colors = {
            success: '#d4edda',
            error: '#f8d7da',
            warning: '#fff3cd',
            info: '#d1ecf1'
        };
        return colors[type] || colors.info;
    }

    getIconForType(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
}

// Crear instancia global
window.notificationSystem = new NotificationSystem();

// Sobrescribir alert nativo para que se vea sobre modales
const originalAlert = window.alert;
window.alert = function(message) {
    console.log('🚨 Alert intercepted:', message);
    
    // Determinar tipo basado en el mensaje
    let type = 'info';
    if (message.includes('❌') || message.toLowerCase().includes('error')) {
        type = 'error';
    } else if (message.includes('✅') || message.toLowerCase().includes('guardado') || message.toLowerCase().includes('correcto')) {
        type = 'success';
    } else if (message.includes('⚠️') || message.toLowerCase().includes('advertencia')) {
        type = 'warning';
    }
    
    // Limpiar emojis del mensaje
    const cleanMessage = message.replace(/[✅❌⚠️]/g, '').trim();
    
    // Mostrar notificación
    window.notificationSystem.show(cleanMessage, type, 8000);
};