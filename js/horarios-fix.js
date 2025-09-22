// Fix para el problema de lista de empleados vacía en asignar horarios
document.addEventListener('DOMContentLoaded', () => {
    console.log('🕐 Horarios fix loading...');
    
    // Función para poblar select de empleados
    window.populateEmpleadosSelect = function(selectId = 'horario_empleado_id') {
        console.log('🔄 Poblando select de empleados para horarios...');
        
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`❌ Select #${selectId} no encontrado`);
            return;
        }
        
        // Verificar si hay empleados disponibles
        let empleados = [];
        
        // Intentar obtener empleados de diferentes fuentes
        if (window.empleadosModule && window.empleadosModule.empleados) {
            empleados = window.empleadosModule.empleados;
            console.log('📋 Empleados obtenidos de empleadosModule:', empleados.length);
        } else {
            console.log('⚠️ empleadosModule no disponible, cargando empleados...');
            loadEmpleadosForHorarios(selectId);
            return;
        }
        
        // Limpiar select manteniendo la opción por defecto
        const defaultOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        
        if (defaultOption) {
            select.appendChild(defaultOption.cloneNode(true));
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Seleccionar empleado...';
            select.appendChild(option);
        }
        
        // Agregar empleados activos
        const empleadosActivos = empleados.filter(emp => emp.activo == 1 || emp.activo === true);
        console.log(`📋 Empleados activos para horarios: ${empleadosActivos.length}`);
        
        empleadosActivos.forEach(empleado => {
            const option = document.createElement('option');
            option.value = empleado.id;
            option.textContent = `${empleado.nombre} ${empleado.apellidos} (${empleado.numero_empleado || empleado.id})`;
            option.dataset.puesto = empleado.puesto || '';
            option.dataset.departamento = empleado.departamento || '';
            select.appendChild(option);
        });
        
        console.log(`✅ Select poblado con ${empleadosActivos.length} empleados`);
        
        // Trigger change event para notificar que se actualizó
        select.dispatchEvent(new Event('employeesLoaded'));
    };
    
    // Función para cargar empleados específicamente para horarios
    async function loadEmpleadosForHorarios(selectId) {
        console.log('🔄 Cargando empleados para horarios...');
        
        try {
            const baseURL = '/asistencias/php/api';
            const response = await fetch(`${baseURL}/empleados.php`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                const empleados = data.data || [];
                console.log(`📋 Empleados cargados para horarios: ${empleados.length}`);
                
                // Guardar en cache global para futuros usos
                window.empleadosCache = empleados;
                
                // Poblar el select
                populateSelectWithEmpleados(selectId, empleados);
                
            } else {
                throw new Error(data.message || 'Error al cargar empleados');
            }
            
        } catch (error) {
            console.error('❌ Error cargando empleados para horarios:', error);
            showHorariosNotification('Error al cargar lista de empleados: ' + error.message, 'error');
        }
    }
    
    // Función auxiliar para poblar select con empleados
    function populateSelectWithEmpleados(selectId, empleados) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Limpiar y agregar opción por defecto
        select.innerHTML = '<option value="">Seleccionar empleado...</option>';
        
        // Filtrar solo empleados activos
        const empleadosActivos = empleados.filter(emp => emp.activo == 1 || emp.activo === true);
        
        empleadosActivos.forEach(empleado => {
            const option = document.createElement('option');
            option.value = empleado.id;
            option.textContent = `${empleado.nombre} ${empleado.apellidos} (${empleado.numero_empleado || empleado.id})`;
            option.dataset.puesto = empleado.puesto || '';
            option.dataset.departamento = empleado.departamento || '';
            select.appendChild(option);
        });
        
        console.log(`✅ Select ${selectId} poblado con ${empleadosActivos.length} empleados`);
    }
    
    // Interceptar cuando se abre el modal de asignar horario
    function setupModalHorarioEvents() {
        console.log('🔧 Configurando eventos del modal de horario...');
        
        // Buscar botón de asignar horario
        const btnAsignarHorario = document.querySelector('button[onclick*="mostrarModalAsignarHorario"], button[onclick*="asignarHorario"], #btn-asignar-horario, .btn-asignar-horario');
        
        if (btnAsignarHorario) {
            console.log('✅ Botón asignar horario encontrado');
            
            btnAsignarHorario.addEventListener('click', function(e) {
                console.log('🕐 Modal de asignar horario abierto');
                
                // Esperar un poco a que se muestre el modal
                setTimeout(() => {
                    populateEmpleadosSelect('horario_empleado_id');
                    
                    // Intentar otros posibles IDs del select
                    const possibleSelects = [
                        'horario_empleado_id',
                        'empleado_id',
                        'empleado-horario',
                        'select-empleado',
                        'empleado_select'
                    ];
                    
                    possibleSelects.forEach(selectId => {
                        if (document.getElementById(selectId)) {
                            populateEmpleadosSelect(selectId);
                        }
                    });
                    
                }, 300);
            });
        } else {
            console.log('⚠️ Botón asignar horario no encontrado');
        }
        
        // También interceptar cuando se muestra cualquier modal
        const modals = document.querySelectorAll('.modal, [id*="modal"]');
        modals.forEach(modal => {
            if (modal.id && modal.id.toLowerCase().includes('horario')) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                            if (modal.style.display === 'block' || modal.style.display === '') {
                                console.log('🕐 Modal de horario detectado abierto');
                                setTimeout(() => {
                                    const selects = modal.querySelectorAll('select[id*="empleado"], select[name*="empleado"]');
                                    selects.forEach(select => {
                                        if (select.id) {
                                            populateEmpleadosSelect(select.id);
                                        }
                                    });
                                }, 200);
                            }
                        }
                    });
                });
                
                observer.observe(modal, { attributes: true });
            }
        });
    }
    
    // Función de notificación para horarios
    function showHorariosNotification(message, type = 'info') {
        if (window.sistemaAsistencia && window.sistemaAsistencia.showNotification) {
            window.sistemaAsistencia.showNotification(message, type);
        } else if (window.empleadosModule && window.empleadosModule.showNotification) {
            window.empleadosModule.showNotification(message, type);
        } else {
            console.log(`HORARIOS ${type.toUpperCase()}: ${message}`);
            alert(message);
        }
    }
    
    // Función global para refrescar empleados en selects
    window.refreshEmpleadosInSelects = function() {
        console.log('🔄 Refrescando empleados en todos los selects...');
        
        const empleadoSelects = document.querySelectorAll('select[id*="empleado"], select[name*="empleado"]');
        empleadoSelects.forEach(select => {
            if (select.id) {
                populateEmpleadosSelect(select.id);
            }
        });
    };
    
    // Auto-setup después de que cargue la página
    setTimeout(() => {
        setupModalHorarioEvents();
        
        // Auto-poblar selects de empleados que ya estén en la página
        refreshEmpleadosInSelects();
        
        console.log('✅ Horarios fix completamente configurado');
    }, 2000);
    
    // Si existe horariosModule, extenderlo
    setTimeout(() => {
        if (window.horariosModule) {
            console.log('🔧 Extendiendo horariosModule...');
            
            // Agregar método para poblar empleados
            window.horariosModule.populateEmpleados = function() {
                populateEmpleadosSelect('horario_empleado_id');
            };
            
            // Sobrescribir método de mostrar modal si existe
            const originalMostrarModal = window.horariosModule.mostrarModalAsignar;
            if (originalMostrarModal) {
                window.horariosModule.mostrarModalAsignar = function() {
                    console.log('🕐 Interceptando mostrarModalAsignar...');
                    const result = originalMostrarModal.call(this);
                    
                    setTimeout(() => {
                        populateEmpleadosSelect('horario_empleado_id');
                    }, 300);
                    
                    return result;
                };
            }
        }
    }, 3000);
});

// Función global para usar desde botones
window.abrirModalAsignarHorario = function() {
    console.log('🕐 Abriendo modal asignar horario...');
    
    // Buscar y mostrar el modal
    const modal = document.querySelector('#modal-asignar-horario, #modalAsignarHorario, .modal-horario');
    if (modal) {
        modal.style.display = 'block';
        
        // Poblar empleados después de mostrar
        setTimeout(() => {
            populateEmpleadosSelect('horario_empleado_id');
        }, 200);
    } else {
        console.error('❌ Modal de asignar horario no encontrado');
    }
};

console.log('🕐 Horarios fix cargado');