// Sistema de Asistencia y Nómina - JavaScript Principal
class SistemaAsistencia {
    constructor() {
        // Corregir la ruta base para que apunte a la carpeta correcta
        this.baseURL = window.location.origin + '/asistencias/php/api';
        this.currentSection = 'dashboard';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateClock();
        this.loadDashboardData();
        this.setupMobileMenu();
        
        // Actualizar reloj cada segundo
        setInterval(() => this.updateClock(), 1000);
        
        // Cargar datos cada 5 minutos
        setInterval(() => this.loadDashboardData(), 300000);
    }

    setupEventListeners() {
        // Navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Formularios
        this.setupFormHandlers();
        
        // Teclas de acceso rápido
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key) {
                    case '1': this.showSection('dashboard'); e.preventDefault(); break;
                    case '2': this.showSection('asistencia'); e.preventDefault(); break;
                    case '3': this.showSection('empleados'); e.preventDefault(); break;
                    case '4': this.showSection('horarios'); e.preventDefault(); break;
                    case '5': this.showSection('nomina'); e.preventDefault(); break;
                    case '6': this.showSection('reportes'); e.preventDefault(); break;
                }
            }
        });
    }

    setupMobileMenu() {
        const header = document.querySelector('.header .container');
        const nav = document.querySelector('.nav');
        
        // Crear botón de menú móvil si no existe
        if (!document.querySelector('.mobile-menu-btn')) {
            const mobileBtn = document.createElement('button');
            mobileBtn.className = 'mobile-menu-btn';
            mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
            mobileBtn.style.display = 'none';
            
            mobileBtn.addEventListener('click', () => {
                nav.querySelector('ul').classList.toggle('show');
            });
            
            header.insertBefore(mobileBtn, nav);
        }

        // Mostrar/ocultar botón según el tamaño de pantalla
        const checkScreenSize = () => {
            const mobileBtn = document.querySelector('.mobile-menu-btn');
            if (window.innerWidth <= 768) {
                mobileBtn.style.display = 'block';
            } else {
                mobileBtn.style.display = 'none';
                nav.querySelector('ul').classList.remove('show');
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
    }

    updateClock() {
        const now = new Date();
        const timeOptions = { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        };
        const dateOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };

        const timeString = now.toLocaleTimeString('es-ES', timeOptions);
        const dateString = now.toLocaleDateString('es-ES', dateOptions);

        // Actualizar reloj principal
        const currentTime = document.getElementById('current-time');
        if (currentTime) currentTime.textContent = timeString;

        // Actualizar reloj de asistencia
        const clockTime = document.getElementById('clock-time');
        const clockDate = document.getElementById('clock-date');
        if (clockTime) clockTime.textContent = timeString;
        if (clockDate) clockDate.textContent = dateString;
    }

    showSection(sectionName) {
        console.log('Showing section:', sectionName);
        
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Desactivar todos los enlaces de navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Mostrar la sección solicitada
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Activar el enlace correspondiente
        const targetLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (targetLink) {
            targetLink.classList.add('active');
        }
        
        // Actualizar sección actual
        this.currentSection = sectionName;
        
        // Cargar datos específicos de cada sección
        this.loadSectionData(sectionName);
    }

    loadSectionData(section) {
        console.log('Loading data for section:', section);
        switch(section) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'empleados':
                console.log('Loading empleados...');
                this.loadModuleData('empleadosModule', 'loadEmpleados', 'empleados');
                break;
            case 'horarios':
                console.log('Loading horarios...');
                this.loadModuleData('horariosModule', 'loadHorarios', 'horarios');
                break;
            case 'asistencia':
                this.loadModuleData('asistenciaModule', 'loadAsistenciaData', 'asistencia');
                break;
            case 'nomina':
                this.loadModuleData('nominaModule', 'loadNominaData', 'nomina');
                break;
            case 'reportes':
                this.loadModuleData('reportesModule', 'loadReportesData', 'reportes');
                break;
            case 'zonas-chequeo':
                this.loadModuleData('zonasChequeoModule', 'loadZonas', 'zonas-chequeo');
                break;
        }
    }

    // --- CORREGIDO: Agregar este método para evitar el error ---
    loadModuleData(moduleName, methodName, section) {
        try {
            const module = window[moduleName];
            if (module && typeof module[methodName] === 'function') {
                module[methodName]();
                console.log(`✅ ${methodName} ejecutado en ${moduleName}`);
            } else {
                console.error(`❌ Método ${methodName} no existe en ${moduleName}`);
                this.showNotification(`Error: Método ${methodName} no existe en ${moduleName}`, 'error');
            }
        } catch (error) {
            console.error(`❌ Error al ejecutar ${methodName} en ${moduleName}:`, error);
            this.showNotification(`Error inesperado en módulo ${moduleName}: ${error.message}`, 'error');
        }
    }
    // --- FIN CORRECCIÓN ---

    async loadDashboardData() {
        try {
            this.showLoading();
            
            // Debug: mostrar la URL completa
            console.log('Cargando dashboard desde:', `${this.baseURL}/dashboard.php`);
            
            const response = await fetch(`${this.baseURL}/dashboard.php`);
            
            // Debug: verificar response
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            console.log('Response text:', text);
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Error parsing JSON:', e);
                throw new Error('La respuesta del servidor no es JSON válido');
            }
            
            if (data.success) {
                this.updateDashboardStats(data.data);
                this.updateRecentActivity(data.data.recent_activity || []);
                
                // Actualizar widget de auto checkout
                if (window.autoCheckoutWidget) {
                    const widgetHTML = await window.autoCheckoutWidget.createWidget();
                    const dashboardContainer = document.querySelector('#dashboard .container');
                    
                    // Buscar widget existente
                    let widgetContainer = document.getElementById('auto-checkout-widget-container');
                    if (!widgetContainer) {
                        widgetContainer = document.createElement('div');
                        widgetContainer.id = 'auto-checkout-widget-container';
                        
                        // Insertar después de las quick actions
                        const quickActions = document.querySelector('.quick-actions');
                        if (quickActions) {
                            quickActions.insertAdjacentElement('afterend', widgetContainer);
                        } else {
                            dashboardContainer.appendChild(widgetContainer);
                        }
                    }
                    
                    widgetContainer.innerHTML = widgetHTML;
                }
            } else {
                this.showNotification('Error al cargar datos del dashboard: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showNotification(`Error de conexión: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateDashboardStats(data) {
        // Actualizar estadísticas
        const updateStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                // Animación de conteo
                this.animateCounter(element, parseInt(value) || 0);
            }
        };

        updateStat('total-empleados', data.total_empleados || 0);
        updateStat('presentes-hoy', data.presentes_hoy || 0);
        updateStat('faltas-hoy', data.faltas_hoy || 0);
        updateStat('retardos-hoy', data.retardos_hoy || 0);
        
        // Actualizar sección de cumpleaños
        if (window.birthdayManager && data.cumpleanos_del_mes) {
            console.log('Updating birthday section with data:', data);
            window.birthdayManager.updateBirthdaySection(data);
        }
    }

    animateCounter(element, targetValue) {
        const duration = 1000; // 1 segundo
        const startValue = parseInt(element.textContent) || 0;
        const increment = (targetValue - startValue) / (duration / 16);
        let currentValue = startValue;

        const timer = setInterval(() => {
            currentValue += increment;
            if ((increment > 0 && currentValue >= targetValue) || 
                (increment < 0 && currentValue <= targetValue)) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.round(currentValue);
        }, 16);
    }

    updateRecentActivity(activities) {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        if (activities.length === 0) {
            activityList.innerHTML = '<p class="text-center">No hay actividad reciente</p>';
            return;
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <h4>${activity.empleado_nombre}</h4>
                    <p>${activity.descripcion} - ${this.formatDateTime(activity.fecha)}</p>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'entrada': 'fa-sign-in-alt',
            'salida': 'fa-sign-out-alt',
            'falta': 'fa-exclamation-triangle',
            'retardo': 'fa-clock',
            'vacaciones': 'fa-calendar-alt'
        };
        return icons[type] || 'fa-info-circle';
    }

    setupFormHandlers() {
        // Validación en tiempo real
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('form-control')) {
                this.validateField(e.target);
            }
        });

        // Prevenir envío de formularios vacíos
        document.addEventListener('submit', (e) => {
            if (!this.validateForm(e.target)) {
                e.preventDefault();
            }
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        // Limpiar mensajes anteriores
        this.clearFieldError(field);

        // Validaciones específicas por tipo
        switch(field.type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (value && !emailRegex.test(value)) {
                    isValid = false;
                    message = 'Email inválido';
                }
                break;
            
            case 'tel':
                const phoneRegex = /^[\d\s\-\+\(\)]+$/;
                if (value && !phoneRegex.test(value)) {
                    isValid = false;
                    message = 'Teléfono inválido';
                }
                break;
            
            case 'number':
                if (value && (isNaN(value) || parseFloat(value) < 0)) {
                    isValid = false;
                    message = 'Número inválido';
                }
                break;
        }

        // Validación de campos requeridos
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            message = 'Campo requerido';
        }

        // Mostrar error si es necesario
        if (!isValid) {
            this.showFieldError(field, message);
        }

        return isValid;
    }

    validateForm(form) {
        const fields = form.querySelectorAll('.form-control[required]');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    showFieldError(field, message) {
        field.classList.add('error');
        
        // Crear mensaje de error si no existe
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.color = 'var(--danger-color)';
        errorElement.style.fontSize = '0.85rem';
        errorElement.style.marginTop = '5px';
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    // Utilidades para API
    async apiRequest(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            this.showLoading();
            const response = await fetch(`${this.baseURL}/${endpoint}`, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            this.showNotification(error.message, 'error');
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    // Utilidades de UI
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.remove('hidden');
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;

        // Agregar ícono según el tipo
        let icon = '';
        switch(type) {
            case 'success': icon = '<i class="fas fa-check-circle"></i>'; break;
            case 'error': icon = '<i class="fas fa-exclamation-circle"></i>'; break;
            case 'warning': icon = '<i class="fas fa-exclamation-triangle"></i>'; break;
            case 'info': icon = '<i class="fas fa-info-circle"></i>'; break;
        }

        notification.innerHTML = `${icon} ${message}`;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatMoney(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount || 0);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    // Exportar a Excel (función auxiliar)
    exportToExcel(data, filename) {
        const csv = this.convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value}"` : value;
            }).join(',')
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }
}

// Funciones globales para compatibilidad
function showSection(section) {
    if (window.sistemaAsistencia) {
        window.sistemaAsistencia.showSection(section);
    }
}

function generarNominaSemanal() {
    if (window.nominaModule) {
        window.nominaModule.generarNominaSemanal();
    } else {
        showSection('nomina');
    }
}

// Inicializar sistema cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing main system...');
    
    // Inicializar sistema principal
    window.sistemaAsistencia = new SistemaAsistencia();
    
    // Esperar a que se carguen todos los módulos y luego cargar datos
    setTimeout(() => {
        console.log('Loading initial data for modules...');
        
        // Cargar empleados si el módulo está disponible
        if (window.empleadosModule) {
            console.log('Loading empleados on startup...');
            window.empleadosModule.loadEmpleados();
        }
        
        // Cargar datos de horarios si el módulo está disponible
        if (window.horariosModule) {
            console.log('Loading horarios data on startup...');
            window.horariosModule.loadEmpleados();
        }
    }, 1500);
});

// Manejar errores globales
window.addEventListener('error', (e) => {
    console.error('Error:', e.error);
    if (window.sistemaAsistencia) {
        window.sistemaAsistencia.showNotification('Se ha producido un error inesperado', 'error');
    }
});

// Manejar pérdida de conexión
window.addEventListener('online', () => {
    if (window.sistemaAsistencia) {
        window.sistemaAsistencia.showNotification('Conexión restaurada', 'success');
        window.sistemaAsistencia.loadDashboardData();
    }
});

window.addEventListener('offline', () => {
    if (window.sistemaAsistencia) {
        window.sistemaAsistencia.showNotification('Sin conexión a internet', 'warning');
    }
});