// Módulo de Asistencia
class AsistenciaModule {
    constructor() {
        // Corregir la ruta base
        this.baseURL = window.location.origin + '/asistencias/php/api';
        this.empleados = [];
        this.currentEmployeeId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadEmpleados();
        this.loadAsistenciaHoy();
        
        // Actualizar cada 30 segundos
        setInterval(() => {
            this.loadAsistenciaHoy();
        }, 30000);
    }

    setupEventListeners() {
        // Botones de entrada y salida
        const btnEntrada = document.getElementById('btn-entrada');
        const btnSalida = document.getElementById('btn-salida');
        const empleadoSelect = document.getElementById('empleado-select');

        if (btnEntrada) {
            btnEntrada.addEventListener('click', () => this.registrarEntrada());
        }

        if (btnSalida) {
            btnSalida.addEventListener('click', () => this.registrarSalida());
        }

        if (empleadoSelect) {
            empleadoSelect.addEventListener('change', (e) => {
                this.currentEmployeeId = e.target.value;
                this.updatePunchButtons();
            });
        }
    }

    async loadEmpleados() {
        try {
            console.log('Cargando empleados desde:', `${this.baseURL}/empleados.php`);
            
            const response = await fetch(`${this.baseURL}/empleados.php`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            console.log('Response empleados:', text);
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Error parsing JSON:', e);
                throw new Error('La respuesta del servidor no es JSON válido');
            }
            
            if (data.success) {
                this.empleados = data.data;
                this.populateEmpleadoSelect();
            } else {
                this.showNotification('Error al cargar empleados: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error loading empleados:', error);
            this.showNotification(`Error de conexión al cargar empleados: ${error.message}`, 'error');
        }
    }

    populateEmpleadoSelect() {
        const select = document.getElementById('empleado-select');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccione un empleado...</option>';
        
        this.empleados.forEach(empleado => {
            if (empleado.activo) {
                const option = document.createElement('option');
                option.value = empleado.id;
                option.textContent = `${empleado.nombre} ${empleado.apellidos} (${empleado.numero_empleado})`;
                select.appendChild(option);
            }
        });
    }

    async loadAsistenciaHoy() {
        try {
            const today = new Date().toISOString().split('T')[0];
            console.log('Cargando asistencia desde:', `${this.baseURL}/asistencia.php?fecha=${today}`);
            
            const response = await fetch(`${this.baseURL}/asistencia.php?fecha=${today}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            console.log('Response asistencia:', text);
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Error parsing JSON:', e);
                throw new Error('La respuesta del servidor no es JSON válido');
            }
            
            if (data.success) {
                this.updateAsistenciaTable(data.data);
            } else {
                this.showNotification('Error al cargar asistencia: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error loading asistencia:', error);
            this.showNotification(`Error de conexión al cargar asistencia: ${error.message}`, 'error');
        }
    }

    updateAsistenciaTable(asistencias) {
        const tbody = document.querySelector('#tabla-asistencia-hoy tbody');
        if (!tbody) return;

        if (asistencias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No hay registros de asistencia para hoy</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = asistencias.map(asistencia => {
            const empleado = this.empleados.find(emp => emp.id == asistencia.empleado_id);
            const nombreEmpleado = empleado ? `${empleado.nombre} ${empleado.apellidos}` : 'Desconocido';
            
            let estado = '';
            
            if (asistencia.tipo_dia === 'falta') {
                estado = '<span class="badge badge-danger"><i class="fas fa-times"></i> Falta</span>';
            } else if (asistencia.tipo_dia === 'vacaciones') {
                estado = '<span class="badge badge-info"><i class="fas fa-calendar-alt"></i> Vacaciones</span>';
            } else if (asistencia.retardo) {
                estado = '<span class="badge badge-warning"><i class="fas fa-clock"></i> Retardo</span>';
            } else if (asistencia.hora_entrada && asistencia.hora_salida) {
                estado = '<span class="badge badge-success"><i class="fas fa-check"></i> Completo</span>';
            } else if (asistencia.hora_entrada) {
                estado = '<span class="badge badge-primary"><i class="fas fa-sign-in-alt"></i> Presente</span>';
            } else {
                estado = '<span class="badge badge-warning"><i class="fas fa-question"></i> Pendiente</span>';
            }

            return `
                <tr>
                    <td>${nombreEmpleado}</td>
                    <td>${asistencia.hora_entrada ? this.formatTime(asistencia.hora_entrada) : '-'}</td>
                    <td>${asistencia.hora_salida ? this.formatTime(asistencia.hora_salida) : '-'}</td>
                    <td>${estado}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="asistenciaModule.editarAsistencia(${asistencia.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="asistenciaModule.eliminarAsistencia(${asistencia.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async registrarEntrada() {
        if (!this.currentEmployeeId) {
            this.showPunchStatus('Debe seleccionar un empleado', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/asistencia.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empleado_id: this.currentEmployeeId,
                    tipo: 'entrada'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.showPunchStatus(`Entrada registrada: ${data.data.hora}`, 'success');
                this.loadAsistenciaHoy();
                this.updatePunchButtons();
                
                // Mostrar notificación global
                if (window.sistemaAsistencia) {
                    window.sistemaAsistencia.showNotification('Entrada registrada correctamente', 'success');
                }
            } else {
                this.showPunchStatus(data.message, 'error');
            }
        } catch (error) {
            console.error('Error registering entrada:', error);
            this.showPunchStatus('Error al registrar entrada', 'error');
        }
    }

    async registrarSalida() {
        if (!this.currentEmployeeId) {
            this.showPunchStatus('Debe seleccionar un empleado', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/asistencia.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empleado_id: this.currentEmployeeId,
                    tipo: 'salida'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.showPunchStatus(`Salida registrada: ${data.data.hora}`, 'success');
                this.loadAsistenciaHoy();
                this.updatePunchButtons();
                
                // Mostrar notificación global
                if (window.sistemaAsistencia) {
                    window.sistemaAsistencia.showNotification('Salida registrada correctamente', 'success');
                }
            } else {
                this.showPunchStatus(data.message, 'error');
            }
        } catch (error) {
            console.error('Error registering salida:', error);
            this.showPunchStatus('Error al registrar salida', 'error');
        }
    }

    async updatePunchButtons() {
        const btnEntrada = document.getElementById('btn-entrada');
        const btnSalida = document.getElementById('btn-salida');
        
        if (!btnEntrada || !btnSalida || !this.currentEmployeeId) {
            return;
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${this.baseURL}/asistencia.php?empleado_id=${this.currentEmployeeId}&fecha=${today}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                const asistencia = data.data[0];
                
                // Si ya tiene entrada, deshabilitar botón de entrada
                if (asistencia.hora_entrada) {
                    btnEntrada.disabled = true;
                    btnEntrada.innerHTML = '<i class="fas fa-check"></i> ENTRADA REGISTRADA';
                } else {
                    btnEntrada.disabled = false;
                    btnEntrada.innerHTML = '<i class="fas fa-sign-in-alt"></i> ENTRADA';
                }
                
                // Si ya tiene salida, deshabilitar botón de salida
                if (asistencia.hora_salida) {
                    btnSalida.disabled = true;
                    btnSalida.innerHTML = '<i class="fas fa-check"></i> SALIDA REGISTRADA';
                } else if (asistencia.hora_entrada) {
                    btnSalida.disabled = false;
                    btnSalida.innerHTML = '<i class="fas fa-sign-out-alt"></i> SALIDA';
                } else {
                    btnSalida.disabled = true;
                    btnSalida.innerHTML = '<i class="fas fa-sign-out-alt"></i> SALIDA';
                }
            } else {
                // No hay registro para hoy
                btnEntrada.disabled = false;
                btnEntrada.innerHTML = '<i class="fas fa-sign-in-alt"></i> ENTRADA';
                btnSalida.disabled = true;
                btnSalida.innerHTML = '<i class="fas fa-sign-out-alt"></i> SALIDA';
            }
        } catch (error) {
            console.error('Error updating punch buttons:', error);
        }
    }

    showPunchStatus(message, type) {
        const statusDiv = document.getElementById('punch-status');
        if (!statusDiv) return;

        statusDiv.textContent = message;
        statusDiv.className = `punch-status ${type}`;
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'punch-status';
        }, 5000);
    }

    async editarAsistencia(id) {
        // Implementar modal de edición
        console.log('Editar asistencia:', id);
        this.showNotification('Función de edición en desarrollo', 'info');
    }

    async eliminarAsistencia(id) {
        if (!confirm('¿Está seguro de eliminar este registro de asistencia?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/asistencia.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.loadAsistenciaHoy();
                this.showNotification('Registro eliminado correctamente', 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting asistencia:', error);
            this.showNotification('Error al eliminar registro', 'error');
        }
    }

    formatTime(datetime) {
        if (!datetime) return '';
        const date = new Date(datetime);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDateTime(datetime) {
        if (!datetime) return '';
        const date = new Date(datetime);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    loadAsistenciaData() {
        this.loadEmpleados();
        this.loadAsistenciaHoy();
    }

    showNotification(message, type) {
        if (window.sistemaAsistencia) {
            window.sistemaAsistencia.showNotification(message, type);
        }
    }
}

// Inicializar módulo
document.addEventListener('DOMContentLoaded', () => {
    window.asistenciaModule = new AsistenciaModule();
});