// Módulo de Horarios
console.log('📁 Archivo horarios.js cargando...');
console.log('🔍 document.readyState:', document.readyState);
console.log('🔍 window.sistemaAsistencia existe:', !!window.sistemaAsistencia);
class HorariosModule {
    constructor() {
        this.baseURL = 'http://localhost/asistencias/php/api';
        this.horarios = [];
        this.empleados = [];
        this.currentView = 'empleado';
        this.empleadoActual = null;
        this.init();
    }

    async init() {
    console.log('🚀 HorariosModule init iniciado');
    this.setupEventListeners();
    
    try {
        console.log('📡 Iniciando carga de datos...');
        await this.loadHorariosData();
        console.log('✅ Datos cargados exitosamente');
    } catch (error) {
        console.error('❌ Error en init:', error);
        this.showNotification('Error al inicializar horarios: ' + error.message, 'error');
    }
}

    setupEventListeners() {
        // Formulario de horarios
        const formHorario = document.getElementById('form-horario');
        if (formHorario) {
            formHorario.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarHorarios();
            });
        }

        // Filtros
        const empleadoFilter = document.getElementById('horario-empleado-filter');
        const diaFilter = document.getElementById('horario-dia-filter');
        
        if (empleadoFilter) {
            empleadoFilter.addEventListener('change', () => this.filtrarHorarios());
        }
        if (diaFilter) {
            diaFilter.addEventListener('change', () => this.filtrarHorarios());
        }

        // Checkboxes de días activos
        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        dias.forEach(dia => {
            const checkbox = document.getElementById(`${dia}_activo`);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.toggleDayInputs(dia, e.target.checked);
                });
            }
        });
    }

    async loadHorarios() {
    try {
        const url = `${this.baseURL}/horarios.php`;
        console.log('🔍 Cargando horarios desde:', url);
        
        const response = await fetch(url);
        console.log('📡 Respuesta status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 Datos horarios recibidos:', data);
        
        if (data.success) {
            this.horarios = data.data.horarios;
            console.log('✅ Horarios asignados:', this.horarios.length, 'registros');
            this.updateHorariosView();
        } else {
            console.error('❌ API reportó error:', data.message);
            this.showNotification('Error al cargar horarios: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('❌ Error loading horarios:', error);
        this.showNotification('Error de conexión al cargar horarios', 'error');
    }
}

    async loadEmpleados() {
        try {
            const response = await fetch(`${this.baseURL}/empleados.php`);
            const data = await response.json();
            
            if (data.success) {
                this.empleados = data.data;
                this.populateEmpleadoSelects();
            } else {
                this.showNotification('Error al cargar empleados: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error loading empleados:', error);
            this.showNotification('Error de conexión al cargar empleados', 'error');
        }
    }

    populateEmpleadoSelects() {
        const selects = [
            'horario_empleado_id',
            'horario-empleado-filter'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                
                // Limpiar opciones anteriores (excepto la primera)
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
                
                this.empleados.filter(emp => emp.activo).forEach(empleado => {
                    const option = document.createElement('option');
                    option.value = empleado.id;
                    option.textContent = `${empleado.nombre} ${empleado.apellidos} (${empleado.numero_empleado})`;
                    select.appendChild(option);
                });
                
                select.value = currentValue;
            }
        });
    }

    updateHorariosView() {
        if (this.currentView === 'empleado') {
            this.updateEmpleadoView();
        } else {
            this.updateSemanaView();
        }
    }

    updateEmpleadoView() {
		console.log('🔍 Verificando elementos del DOM...');
		
		const container = document.getElementById('horarios-empleado-list');
		console.log('📦 horarios-empleado-list encontrado:', !!container);
		
		if (!container) {
			console.error('❌ CRÍTICO: No se encontró #horarios-empleado-list');
			console.log('🔍 Elementos disponibles en DOM:');
			const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
			console.log('IDs disponibles:', allIds);
			
			// Mostrar mensaje de error en UI
			const horariosSection = document.getElementById('horarios');
			if (horariosSection) {
				horariosSection.innerHTML = `
					<div style="padding: 20px; text-align: center; color: red;">
						❌ Error: No se encontró el contenedor 'horarios-empleado-list'<br>
						Por favor verifica que el HTML tenga el elemento correcto.
					</div>
				`;
			}
			return;
		}

        // Agrupar horarios por empleado
        const horariosPorEmpleado = {};
        this.horarios.forEach(horario => {
            const empId = horario.empleado_id;
            if (!horariosPorEmpleado[empId]) {
                horariosPorEmpleado[empId] = {
                    empleado: horario,
                    horarios: {}
                };
            }
            horariosPorEmpleado[empId].horarios[horario.dia_semana] = horario;
        });

        if (Object.keys(horariosPorEmpleado).length === 0) {
            container.innerHTML = `
                <div class="no-horarios">
                    <i class="fas fa-calendar-times"></i>
                    <p>No hay horarios asignados</p>
                    <button class="btn btn-primary" onclick="mostrarModalHorario()">
                        <i class="fas fa-plus"></i> Asignar Primer Horario
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = Object.values(horariosPorEmpleado).map(emp => 
            this.generateEmpleadoHorarioHTML(emp)
        ).join('');
    }

    generateEmpleadoHorarioHTML(empleadoData) {
        const empleado = empleadoData.empleado;
        const horarios = empleadoData.horarios;
        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        
        return `
            <div class="empleado-horario-card">
                <div class="empleado-header">
                    <div class="empleado-info">
                        <h3>${empleado.empleado_nombre}</h3>
                        <p>No. ${empleado.numero_empleado}</p>
                    </div>
                    <div class="empleado-actions">
                        <button class="btn btn-sm btn-info" onclick="horariosModule.editarHorarioEmpleado(${empleado.empleado_id})" title="Editar horarios">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="horariosModule.eliminarHorarioEmpleado(${empleado.empleado_id})" title="Eliminar horarios">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="horarios-grid">
                    ${dias.map(dia => {
                        const horario = horarios[dia];
                        if (horario && horario.activo) {
                            return `
                                <div class="horario-dia active">
                                    <div class="dia-nombre">${this.capitalizarDia(dia)}</div>
                                    <div class="horario-horas">
                                        <span class="entrada">${this.formatTime(horario.hora_entrada)}</span>
                                        <span class="separator">-</span>
                                        <span class="salida">${this.formatTime(horario.hora_salida)}</span>
                                    </div>
                                    <div class="horas-total">${this.calculateHours(horario.hora_entrada, horario.hora_salida)}h</div>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="horario-dia inactive">
                                    <div class="dia-nombre">${this.capitalizarDia(dia)}</div>
                                    <div class="horario-horas">Descanso</div>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
                <div class="horarios-summary">
                    <span>Total semanal: ${this.calculateWeeklyHours(horarios)} horas</span>
                </div>
            </div>
        `;
    }

    updateSemanaView() {
        const tbody = document.querySelector('#tabla-horarios-semana tbody');
        if (!tbody) return;

        // Agrupar horarios por empleado
        const horariosPorEmpleado = {};
        this.horarios.forEach(horario => {
            const empId = horario.empleado_id;
            if (!horariosPorEmpleado[empId]) {
                horariosPorEmpleado[empId] = {
                    empleado: horario,
                    horarios: {}
                };
            }
            horariosPorEmpleado[empId].horarios[horario.dia_semana] = horario;
        });

        if (Object.keys(horariosPorEmpleado).length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay horarios asignados</td></tr>';
            return;
        }

        tbody.innerHTML = Object.values(horariosPorEmpleado).map(emp => {
            const empleado = emp.empleado;
            const horarios = emp.horarios;
            const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
            
            return `
                <tr>
                    <td>
                        <strong>${empleado.empleado_nombre}</strong><br>
                        <small>No. ${empleado.numero_empleado}</small>
                    </td>
                    ${dias.map(dia => {
                        const horario = horarios[dia];
                        if (horario && horario.activo) {
                            return `
                                <td class="horario-cell active">
                                    <div class="horario-time">${this.formatTime(horario.hora_entrada)}</div>
                                    <div class="horario-separator">-</div>
                                    <div class="horario-time">${this.formatTime(horario.hora_salida)}</div>
                                    <div class="horario-hours">${this.calculateHours(horario.hora_entrada, horario.hora_salida)}h</div>
                                </td>
                            `;
                        } else {
                            return '<td class="horario-cell inactive">Descanso</td>';
                        }
                    }).join('')}
                    <td>
                        <button class="btn btn-sm btn-info" onclick="horariosModule.editarHorarioEmpleado(${empleado.empleado_id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="horariosModule.eliminarHorarioEmpleado(${empleado.empleado_id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    changeView(view) {
        this.currentView = view;
        
        // Actualizar tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Mostrar/ocultar vistas
        document.querySelectorAll('.horarios-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`horarios-${view}-view`).classList.add('active');
        
        this.updateHorariosView();
    }

    filtrarHorarios() {
        // Implementar filtrado si es necesario
        this.loadHorarios();
    }

    mostrarModalHorario(empleadoId = null) {
        const modal = document.getElementById('modal-horario');
        const title = document.getElementById('modal-horario-title');
        const form = document.getElementById('form-horario');
        
        if (!modal || !title || !form) return;

        this.empleadoActual = empleadoId;
        
        if (empleadoId) {
            title.textContent = 'Editar Horarios';
            this.cargarDatosHorario(empleadoId);
        } else {
            title.textContent = 'Asignar Horario';
            form.reset();
            this.resetFormularioHorarios();
        }
        
        modal.style.display = 'block';
    }

    async cargarDatosHorario(empleadoId) {
        try {
            const response = await fetch(`${this.baseURL}/horarios.php?empleado_id=${empleadoId}`);
            const data = await response.json();
            
            if (data.success) {
                const horarios = data.data.horarios;
                
                // Seleccionar empleado
                document.getElementById('horario_empleado_id').value = empleadoId;
                
                // Resetear formulario
                this.resetFormularioHorarios();
                
                // Llenar datos
                horarios.forEach(horario => {
                    const dia = horario.dia_semana;
                    const activoCheckbox = document.getElementById(`${dia}_activo`);
                    const entradaInput = document.getElementById(`${dia}_entrada`);
                    const salidaInput = document.getElementById(`${dia}_salida`);
                    
                    if (activoCheckbox && entradaInput && salidaInput) {
                        activoCheckbox.checked = horario.activo;
                        entradaInput.value = horario.hora_entrada;
                        salidaInput.value = horario.hora_salida;
                        this.toggleDayInputs(dia, horario.activo);
                    }
                });
            } else {
                this.showNotification('Error al cargar datos del horario', 'error');
            }
        } catch (error) {
            console.error('Error loading horario data:', error);
            this.showNotification('Error de conexión', 'error');
        }
    }

    resetFormularioHorarios() {
        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        
        dias.forEach(dia => {
            const checkbox = document.getElementById(`${dia}_activo`);
            const entrada = document.getElementById(`${dia}_entrada`);
            const salida = document.getElementById(`${dia}_salida`);
            
            if (checkbox) {
                checkbox.checked = dia !== 'domingo'; // Todos activos excepto domingo
            }
            if (entrada) {
                entrada.value = '09:00';
            }
            if (salida) {
                salida.value = dia === 'sabado' ? '14:00' : '18:00';
            }
            
            this.toggleDayInputs(dia, checkbox?.checked || false);
        });
    }

    toggleDayInputs(dia, activo) {
        const entradaInput = document.getElementById(`${dia}_entrada`);
        const salidaInput = document.getElementById(`${dia}_salida`);
        const dayGroup = document.querySelector(`#${dia}_activo`).closest('.horario-day-group');
        
        if (entradaInput) entradaInput.disabled = !activo;
        if (salidaInput) salidaInput.disabled = !activo;
        if (dayGroup) {
            dayGroup.classList.toggle('disabled', !activo);
        }
    }

    async guardarHorarios() {
        const form = document.getElementById('form-horario');
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Agregar checkboxes no marcados
        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        dias.forEach(dia => {
            const checkbox = document.getElementById(`${dia}_activo`);
            data[`${dia}_activo`] = checkbox?.checked || false;
        });

        try {
            const url = `${this.baseURL}/horarios.php`;
            const method = this.empleadoActual ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.cerrarModalHorario();
                this.loadHorarios();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error saving horarios:', error);
            this.showNotification('Error al guardar horarios', 'error');
        }
    }

    editarHorarioEmpleado(empleadoId) {
        this.mostrarModalHorario(empleadoId);
    }

    async eliminarHorarioEmpleado(empleadoId) {
        const empleado = this.empleados.find(emp => emp.id === empleadoId);
        if (!empleado) return;

        if (!confirm(`¿Está seguro de eliminar todos los horarios de ${empleado.nombre} ${empleado.apellidos}?`)) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/horarios.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ empleado_id: empleadoId })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.loadHorarios();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting horarios:', error);
            this.showNotification('Error al eliminar horarios', 'error');
        }
    }

    cerrarModalHorario() {
        const modal = document.getElementById('modal-horario');
        if (modal) {
            modal.style.display = 'none';
        }
        this.empleadoActual = null;
    }

    // Utilidades
    capitalizarDia(dia) {
        const dias = {
            'lunes': 'Lunes',
            'martes': 'Martes',
            'miercoles': 'Miércoles',
            'jueves': 'Jueves',
            'viernes': 'Viernes',
            'sabado': 'Sábado',
            'domingo': 'Domingo'
        };
        return dias[dia] || dia;
    }

    formatTime(time) {
        if (!time) return '';
        return time.substring(0, 5); // HH:MM
    }

    calculateHours(entrada, salida) {
        if (!entrada || !salida) return 0;
        
        const [entradaH, entradaM] = entrada.split(':').map(Number);
        const [salidaH, salidaM] = salida.split(':').map(Number);
        
        const entradaMinutos = entradaH * 60 + entradaM;
        const salidaMinutos = salidaH * 60 + salidaM;
        
        const diffMinutos = salidaMinutos - entradaMinutos;
        return (diffMinutos / 60).toFixed(1);
    }

    calculateWeeklyHours(horarios) {
        let totalMinutos = 0;
        
        Object.values(horarios).forEach(horario => {
            if (horario && horario.activo) {
                const [entradaH, entradaM] = horario.hora_entrada.split(':').map(Number);
                const [salidaH, salidaM] = horario.hora_salida.split(':').map(Number);
                
                const entradaMinutos = entradaH * 60 + entradaM;
                const salidaMinutos = salidaH * 60 + salidaM;
                
                totalMinutos += (salidaMinutos - entradaMinutos);
            }
        });
        
        return (totalMinutos / 60).toFixed(1);
    }

    showNotification(message, type) {
        if (window.sistemaAsistencia) {
            window.sistemaAsistencia.showNotification(message, type);
        }
    }
}

// Funciones globales para compatibilidad
function initializeHorariosModule() {
    console.log('🔥 Inicializando HorariosModule...');
    try {
        window.horariosModule = new HorariosModule();
        console.log('✅ HorariosModule inicializado correctamente');
        if (window.sistemaAsistencia) {
            console.log('📡 Notificando a sistema principal que horarios está listo');
        }
    } catch (error) {
        console.error('❌ Error al inicializar HorariosModule:', error);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHorariosModule);
} else {
    initializeHorariosModule();
}