// Módulo de Autenticación Móvil
class MobileAuth {
    constructor() {
        // ✅ Fix: Usar solo baseURL (consistente)
        this.baseURL = window.location.origin + '/asistencias/php/api';
        this.token = localStorage.getItem('auth_token');
        this.empleadoData = null;
        this.currentEmployeeId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateClock();
        this.checkExistingSession();
        
        // Actualizar reloj cada segundo
        setInterval(() => this.updateClock(), 1000);
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                // ✅ Fix: Llamar método correcto
                this.handleLoginForm();
            });
        }

        // Change password form
        const changePasswordForm = document.getElementById('change-password-form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleChangePassword();
            });
        }

        // Attendance buttons
        const btnEntrada = document.getElementById('btn-entrada-mobile');
        const btnSalida = document.getElementById('btn-salida-mobile');
        
        if (btnEntrada) {
            btnEntrada.addEventListener('click', () => this.registrarEntrada());
        }
        
        if (btnSalida) {
            btnSalida.addEventListener('click', () => this.registrarSalida());
        }

        // Password validation
        const newPassword = document.getElementById('new-password');
        const confirmPassword = document.getElementById('confirm-password');
        
        if (newPassword && confirmPassword) {
            newPassword.addEventListener('input', () => this.validatePassword());
            confirmPassword.addEventListener('input', () => this.validatePassword());
        }

        // Prevent zoom on input focus (iOS)
        document.addEventListener('touchstart', function() {}, true);
    }

    // ✅ Fix: Nuevo método para manejar el form de login
    async handleLoginForm() {
        const form = document.getElementById('login-form');
        const formData = new FormData(form);
        
        const username = formData.get('usuario');
        const password = formData.get('password');
        const remember = formData.get('recordar') === 'on';

        if (!username || !password) {
            this.showNotification('Por favor ingrese usuario y contraseña', 'error');
            return;
        }

        try {
            this.showLoading();
            await this.handleLogin(username, password, remember);
        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            this.hideLoading();
        }
    }

    // ✅ Fix: Corregir método handleLogin
    async handleLogin(username, password, remember = false) {
        try {
            console.log('🔐 Attempting login to:', `${this.baseURL}/mobile-auth.php`);
            
            const response = await fetch(`${this.baseURL}/mobile-auth.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'login',
                    usuario: username,
                    password: password,
                    recordar: remember,
                    dispositivo_info: this.getDeviceInfo()
                })
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('📦 Login response:', data);
            
            if (data.success) {
                if (data.data.primer_login) {
                    // Primer login - cambio de contraseña requerido
                    this.token = data.data.temp_token;
                    localStorage.setItem('auth_token', this.token);
                    this.empleadoData = data.data.empleado;
                    this.currentEmployeeId = data.data.empleado.id;
                    this.showChangePasswordInterface();
                    this.showNotification('Primer login detectado. Debe cambiar su contraseña.', 'warning');
                } else {
                    // Login normal exitoso
                    this.token = data.data.token;
                    localStorage.setItem('auth_token', this.token);
                    this.empleadoData = data.data.empleado;
                    this.currentEmployeeId = data.data.empleado.id;
                    localStorage.setItem('empleadoId', this.currentEmployeeId);
                    this.showAttendanceInterface();
                    await this.loadTodayRecord();
                    this.showNotification(`Bienvenido ${data.data.empleado.nombre}`, 'success');
                }
                return data;
            } else {
                throw new Error(data.message || 'Error en login');
            }
        } catch (error) {
            console.error('Error logging in:', error);
            this.showNotification('Error de conexión: ' + error.message, 'error');
            throw error;
        }
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

        // Actualizar todos los relojes
        const timeElements = ['current-time', 'attendance-time'];
        const dateElements = ['attendance-date'];

        timeElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = timeString;
        });

        dateElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = dateString;
        });
    }

    async checkExistingSession() {
        if (this.token) {
            try {
                this.showLoading();
                
                const response = await fetch(`${this.baseURL}/mobile-auth.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        action: 'verify_session'
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    this.empleadoData = data.data;
                    this.currentEmployeeId = data.data.id;
                    localStorage.setItem('empleadoId', this.currentEmployeeId);
                    this.showAttendanceInterface();
                    await this.loadTodayRecord();
                } else {
                    // Token inválido, limpiar y mostrar login
                    localStorage.removeItem('auth_token');
                    this.token = null;
                    this.showLoginInterface();
                }
            } catch (error) {
                console.error('Error checking session:', error);
                this.showLoginInterface();
            } finally {
                this.hideLoading();
            }
        } else {
            this.showLoginInterface();
        }
    }

    async handleChangePassword() {
        const form = document.getElementById('change-password-form');
        const formData = new FormData(form);
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');

        if (newPassword !== confirmPassword) {
            this.showNotification('Las contraseñas no coinciden', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`${this.baseURL}/mobile-auth.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    action: 'change_password',
                    new_password: newPassword
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.token = result.data.token;
                this.empleadoData = result.data.empleado;
                this.currentEmployeeId = result.data.empleado.id;
                localStorage.setItem('empleadoId', this.currentEmployeeId);
                localStorage.setItem('auth_token', this.token);
                
                this.showAttendanceInterface();
                await this.loadTodayRecord();
                this.showNotification('Contraseña cambiada exitosamente', 'success');
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.showNotification('Error de conexión', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ✅ Fix: Agregar método getDeviceInfo mejorado
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${screen.width}x${screen.height}`,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            viewport: `${window.innerWidth}x${window.innerHeight}`
        };
    }

    // ✅ Resto de métodos sin cambios (solo manteniendo consistency)
    async registrarEntrada() {
        await this.registrarAsistencia('entrada');
    }

    async registrarSalida() {
        await this.registrarAsistencia('salida');
    }

    async registrarAsistencia(tipo) {
        if (!this.currentEmployeeId) {
            this.showNotification('Error: No hay sesión válida', 'error');
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`${this.baseURL}/asistencia.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    empleado_id: this.currentEmployeeId,
                    tipo: tipo
                })
            });

            const data = await response.json();
            
            if (data.success) {
                const mensaje = tipo === 'entrada' ? 
                    `Entrada registrada: ${data.data.hora}` : 
                    `Salida registrada: ${data.data.hora}`;
                
                this.showPunchStatus(mensaje, 'success');
                this.showNotification(mensaje, 'success');
                
                await this.loadTodayRecord();
                this.updatePunchButtons();
            } else {
                this.showPunchStatus(data.message, 'error');
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error(`Error registering ${tipo}:`, error);
            this.showPunchStatus(`Error al registrar ${tipo}`, 'error');
            this.showNotification('Error de conexión', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadTodayRecord() {
        if (!this.currentEmployeeId) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(
                `${this.baseURL}/asistencia.php?empleado_id=${this.currentEmployeeId}&fecha=${today}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                }
            );

            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                const record = data.data[0];
                this.updateTodayRecord(record);
                this.updatePunchButtons(record);
                this.updateStatus(record);
            } else {
                this.updateTodayRecord(null);
                this.updatePunchButtons(null);
                this.updateStatus(null);
            }
        } catch (error) {
            console.error('Error loading today record:', error);
        }
    }

    updateTodayRecord(record) {
        const elementos = {
            'record-entrada': record?.hora_entrada ? this.formatTime(record.hora_entrada) : '--:--',
            'record-salida': record?.hora_salida ? this.formatTime(record.hora_salida) : '--:--',
            'record-estado': this.getStatusText(record)
        };

        Object.entries(elementos).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    updatePunchButtons(record = null) {
        const btnEntrada = document.getElementById('btn-entrada-mobile');
        const btnSalida = document.getElementById('btn-salida-mobile');
        
        if (!btnEntrada || !btnSalida) return;

        if (record?.hora_entrada) {
            btnEntrada.disabled = true;
            btnEntrada.innerHTML = '<i class="fas fa-check"></i><span>ENTRADA REGISTRADA</span>';
        } else {
            btnEntrada.disabled = false;
            btnEntrada.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>ENTRADA</span>';
        }

        if (record?.hora_salida) {
            btnSalida.disabled = true;
            btnSalida.innerHTML = '<i class="fas fa-check"></i><span>SALIDA REGISTRADA</span>';
        } else if (record?.hora_entrada) {
            btnSalida.disabled = false;
            btnSalida.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>SALIDA</span>';
        } else {
            btnSalida.disabled = true;
            btnSalida.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>SALIDA</span>';
        }
    }

    updateStatus(record) {
        const statusElement = document.getElementById('current-status');
        if (!statusElement) return;

        let statusText = 'Listo para marcar entrada';
        
        if (record) {
            if (record.tipo_dia === 'falta') {
                statusText = 'Marcado como falta';
            } else if (record.tipo_dia === 'vacaciones') {
                statusText = 'Día de vacaciones';
            } else if (record.hora_salida) {
                statusText = 'Jornada completada';
            } else if (record.hora_entrada) {
                statusText = record.retardo ? 'Presente (con retardo)' : 'Presente - Listo para salida';
            }
        }

        statusElement.textContent = statusText;
    }

    getStatusText(record) {
        if (!record) return 'Sin registro';
        
        if (record.tipo_dia === 'falta') return 'Falta';
        if (record.tipo_dia === 'vacaciones') return 'Vacaciones';
        if (record.hora_salida) return 'Completo';
        if (record.hora_entrada) return record.retardo ? 'Presente (retardo)' : 'Presente';
        
        return 'Sin registro';
    }

    showLoginInterface() {
        this.hideAllContainers();
        document.getElementById('login-container').classList.remove('hidden');
    }

    showChangePasswordInterface() {
        this.hideAllContainers();
        document.getElementById('change-password-container').classList.remove('hidden');
    }

    showAttendanceInterface() {
        this.hideAllContainers();
        document.getElementById('attendance-container').classList.remove('hidden');
        
        if (this.empleadoData) {
            const nameElement = document.getElementById('employee-name');
            const numberElement = document.getElementById('employee-number');
            
            if (nameElement) {
                nameElement.textContent = `${this.empleadoData.nombre} ${this.empleadoData.apellidos}`;
            }
            if (numberElement) {
                numberElement.textContent = `No. ${this.empleadoData.numero_empleado}`;
            }
        }
    }

    hideAllContainers() {
        const containers = [
            'login-container',
            'change-password-container', 
            'attendance-container'
        ];
        
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.classList.add('hidden');
        });
    }

    validatePassword() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        const lengthReq = document.getElementById('req-length');
        const matchReq = document.getElementById('req-match');
        
        // Validar longitud
        if (newPassword.length >= 6) {
            lengthReq.classList.add('valid');
        } else {
            lengthReq.classList.remove('valid');
        }
        
        // Validar coincidencia
        if (confirmPassword && newPassword === confirmPassword) {
            matchReq.classList.add('valid');
        } else {
            matchReq.classList.remove('valid');
        }
    }

    logout() {
        if (confirm('¿Estás seguro de cerrar sesión?')) {
            localStorage.removeItem('auth_token');
            this.token = null;
            this.empleadoData = null;
            this.currentEmployeeId = null;
            this.showLoginInterface();
            this.showNotification('Sesión cerrada', 'info');
        }
    }

    showPunchStatus(message, type) {
        const statusDiv = document.getElementById('punch-status-mobile');
        if (!statusDiv) return;

        statusDiv.textContent = message;
        statusDiv.className = `punch-status-mobile ${type}`;
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    showLoading() {
        const loading = document.getElementById('loading-mobile');
        if (loading) loading.classList.remove('hidden');
    }

    hideLoading() {
        const loading = document.getElementById('loading-mobile');
        if (loading) loading.classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification-mobile');
        if (!notification) return;

        let icon = '';
        switch(type) {
            case 'success': icon = '<i class="fas fa-check-circle"></i>'; break;
            case 'error': icon = '<i class="fas fa-exclamation-circle"></i>'; break;
            case 'warning': icon = '<i class="fas fa-exclamation-triangle"></i>'; break;
            case 'info': icon = '<i class="fas fa-info-circle"></i>'; break;
        }

        notification.innerHTML = `${icon} ${message}`;
        notification.className = `notification-mobile ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    formatTime(datetime) {
        if (!datetime) return '';
        const date = new Date(datetime);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Funciones globales (sin cambios)
function togglePassword(inputId = 'password') {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function showPasswordHelp() {
    alert('Para recuperar tu contraseña, contacta al administrador del sistema.');
}

function logout() {
    window.mobileAuth?.logout();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.mobileAuth = new MobileAuth();
});

// Manejar orientación de dispositivo
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        window.scrollTo(0, 1);
    }, 500);
});