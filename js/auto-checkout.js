// Auto Checkout Manager
class AutoCheckoutManager {
    constructor() {
        this.baseURL = window.location.origin + '/asistencias/php/api';
        this.isProcessing = false;
        this.checkInterval = null;
        this.init();
    }

    init() {
        this.startAutoCheckoutMonitoring();
        this.setupEventListeners();
        console.log('Auto Checkout Manager initialized');
    }

    setupEventListeners() {
        // Botón manual de procesamiento
        document.addEventListener('click', (e) => {
            if (e.target.id === 'process-auto-checkout') {
                this.processAutoCheckoutManual();
            }
            if (e.target.classList.contains('manual-checkout-btn')) {
                const empleadoId = e.target.dataset.empleadoId;
                this.processManualCheckout(empleadoId);
            }
        });
    }

    startAutoCheckoutMonitoring() {
        // Verificar cada 2 minutos
        this.checkInterval = setInterval(() => {
            this.processAutoCheckout();
        }, 120000); // 2 minutos

        // Verificar inmediatamente al cargar
        setTimeout(() => {
            this.processAutoCheckout();
        }, 5000);
    }

    async processAutoCheckout() {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            
            const response = await fetch(`${this.baseURL}/auto-checkout.php?action=process`);
            const data = await response.json();
            
            if (data.success && data.data.procesados > 0) {
                this.showAutoCheckoutNotification(data.data);
                
                // Actualizar dashboard si está visible
                if (window.sistemaAsistencia && document.getElementById('dashboard').classList.contains('active')) {
                    window.sistemaAsistencia.loadDashboardData();
                }
                
                // Actualizar asistencia si está visible
                if (window.asistenciaModule && document.getElementById('asistencia').classList.contains('active')) {
                    window.asistenciaModule.loadAsistenciaHoy();
                }
            }
            
        } catch (error) {
            console.error('Error in auto checkout:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async processAutoCheckoutManual() {
        try {
            const response = await fetch(`${this.baseURL}/auto-checkout.php?action=process`);
            const data = await response.json();
            
            if (data.success) {
                const message = data.data.procesados > 0 ? 
                    `Se procesaron ${data.data.procesados} salidas automáticas` :
                    'No hay empleados pendientes de salida automática';
                
                this.showNotification(message, data.data.procesados > 0 ? 'success' : 'info');
                
                if (data.data.procesados > 0) {
                    // Actualizar datos
                    this.refreshCurrentView();
                }
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error processing manual auto checkout:', error);
            this.showNotification('Error al procesar salidas automáticas', 'error');
        }
    }

    async processManualCheckout(empleadoId) {
        if (!empleadoId) return;

        try {
            const response = await fetch(`${this.baseURL}/auto-checkout.php?action=manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empleado_id: empleadoId
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`Salida registrada: ${data.data.hora_salida}`, 'success');
                this.refreshCurrentView();
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error processing manual checkout:', error);
            this.showNotification('Error al registrar salida manual', 'error');
        }
    }

    async getAutoCheckoutStatus() {
        try {
            const response = await fetch(`${this.baseURL}/auto-checkout.php?action=status`);
            const data = await response.json();
            
            if (data.success) {
                return data.data;
            }
        } catch (error) {
            console.error('Error getting auto checkout status:', error);
        }
        return null;
    }

    showAutoCheckoutNotification(data) {
        const empleados = data.empleados.map(emp => emp.nombre_completo).join(', ');
        const message = `🕐 Salida automática registrada para: ${empleados}`;
        
        // Crear notificación especial para salida automática
        this.createAutoCheckoutBanner(message, data);
    }

    createAutoCheckoutBanner(message, data) {
        // Remover banner anterior si existe
        const existingBanner = document.getElementById('auto-checkout-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');
        banner.id = 'auto-checkout-banner';
        banner.className = 'auto-checkout-banner';
        banner.innerHTML = `
            <div class="auto-checkout-content">
                <div class="auto-checkout-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="auto-checkout-text">
                    <h4>Salidas Automáticas Procesadas</h4>
                    <p>${message}</p>
                    <small>Procesadas: ${data.procesados} empleados a las ${new Date().toLocaleTimeString('es-ES')}</small>
                </div>
                <button class="auto-checkout-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(banner);

        // Auto-remover después de 10 segundos
        setTimeout(() => {
            if (banner.parentNode) {
                banner.remove();
            }
        }, 10000);
    }

    refreshCurrentView() {
        // Refrescar la vista actual
        const activeSection = document.querySelector('.section.active');
        if (!activeSection) return;

        const sectionId = activeSection.id;
        
        switch (sectionId) {
            case 'dashboard':
                if (window.sistemaAsistencia) {
                    window.sistemaAsistencia.loadDashboardData();
                }
                break;
            case 'asistencia':
                if (window.asistenciaModule) {
                    window.asistenciaModule.loadAsistenciaHoy();
                }
                break;
        }
    }

    showNotification(message, type) {
        if (window.sistemaAsistencia) {
            window.sistemaAsistencia.showNotification(message, type);
        }
    }

    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// Widget de Estado de Salidas
class AutoCheckoutWidget {
    constructor() {
        this.baseURL = window.location.origin + '/asistencias/php/api';
    }

    async createWidget() {
        const status = await this.getStatus();
        if (!status) return '';

        const pendientes = status.pendientes || [];
        const stats = status.stats || {};

        return `
            <div class="auto-checkout-widget">
                <h3><i class="fas fa-clock"></i> Estado de Salidas</h3>
                
                <div class="checkout-stats">
                    <div class="stat-item">
                        <span class="stat-number">${stats.total_salidas_auto || 0}</span>
                        <span class="stat-label">Salidas Hoy</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.automaticas || 0}</span>
                        <span class="stat-label">Automáticas</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${pendientes.length}</span>
                        <span class="stat-label">Pendientes</span>
                    </div>
                </div>

                ${pendientes.length > 0 ? `
                    <div class="pending-checkouts">
                        <h4>Empleados Pendientes de Salida</h4>
                        <div class="pending-list">
                            ${pendientes.slice(0, 5).map(emp => `
                                <div class="pending-item ${emp.estado_salida}">
                                    <div class="employee-info">
                                        <strong>${emp.nombre_completo}</strong>
                                        <span>Salida: ${emp.hora_salida}</span>
                                    </div>
                                    <div class="checkout-actions">
                                        <span class="status-badge ${emp.estado_salida}">
                                            ${this.getStatusText(emp.estado_salida)}
                                        </span>
                                        ${emp.estado_salida === 'vencida' ? `
                                            <button class="btn btn-sm btn-primary manual-checkout-btn" data-empleado-id="${emp.id}">
                                                <i class="fas fa-sign-out-alt"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ${pendientes.length > 5 ? `<p class="more-pending">Y ${pendientes.length - 5} más...</p>` : ''}
                    </div>
                ` : '<div class="no-pending"><i class="fas fa-check-circle"></i> Todos los empleados han salido</div>'}

                <div class="widget-actions">
                    <button id="process-auto-checkout" class="btn btn-primary btn-sm">
                        <i class="fas fa-play"></i> Procesar Salidas
                    </button>
                </div>
            </div>
        `;
    }

    async getStatus() {
        try {
            const response = await fetch(`${this.baseURL}/auto-checkout.php?action=status`);
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error getting checkout status:', error);
            return null;
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'vencida': return '⏰ Vencida';
            case 'proximo': return '🟡 Próxima';
            case 'pendiente': return '⏳ Pendiente';
            default: return status;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.autoCheckoutManager = new AutoCheckoutManager();
    window.autoCheckoutWidget = new AutoCheckoutWidget();
});

// Limpiar al salir
window.addEventListener('beforeunload', () => {
    if (window.autoCheckoutManager) {
        window.autoCheckoutManager.destroy();
    }
});