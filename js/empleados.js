// Módulo de Empleados Completo - Versión con Debug de Estadísticas Mejorado
class EmpleadosModule {
    constructor() {
        this.baseURL = '/asistencias/php/api';
        this.empleados = [];
        this.empleadoActual = null;
        this.currentTab = 'basicos';
        console.log('EmpleadosModule initialized');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupValidations();
        console.log('EmpleadosModule init completed');
    }

    setupEventListeners() {
        // Formulario de empleados
        const formEmpleado = document.getElementById('form-empleado');
        if (formEmpleado) {
            formEmpleado.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarEmpleado();
            });
        }

        // Event listeners para validación en tiempo real
        this.setupFieldValidations();
    }

    setupFieldValidations() {
        setTimeout(() => {
            // Validación de RFC
            const rfcInput = document.getElementById('rfc');
            if (rfcInput) {
                rfcInput.addEventListener('input', (e) => {
                    this.validateRFC(e.target);
                });
                rfcInput.addEventListener('blur', (e) => {
                    this.validateRFC(e.target);
                });
            }

            // Validación de CURP
            const curpInput = document.getElementById('curp');
            if (curpInput) {
                curpInput.addEventListener('input', (e) => {
                    this.validateCURP(e.target);
                });
                curpInput.addEventListener('blur', (e) => {
                    this.validateCURP(e.target);
                });
            }

            // Cálculo automático de antigüedad
            const fechaIngresoInput = document.getElementById('fecha_ingreso');
            if (fechaIngresoInput) {
                fechaIngresoInput.addEventListener('change', (e) => {
                    this.calculateAntiguedad(e.target.value);
                });
            }

            // Validación de CLABE
            const clabeInput = document.getElementById('clabe_interbancaria');
            if (clabeInput) {
                clabeInput.addEventListener('input', (e) => {
                    this.validateCLABE(e.target);
                });
            }

            // Validación de NSS
            const nssInput = document.getElementById('numero_seguro_social');
            if (nssInput) {
                nssInput.addEventListener('input', (e) => {
                    this.validateNSS(e.target);
                });
            }

            // Validación de CP
            const cpInput = document.getElementById('codigo_postal');
            if (cpInput) {
                cpInput.addEventListener('input', (e) => {
                    this.validateCP(e.target);
                });
            }

            // Auto-uppercase para RFC y CURP
            const upperCaseFields = ['rfc', 'curp'];
            upperCaseFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.addEventListener('input', (e) => {
                        e.target.value = e.target.value.toUpperCase();
                    });
                }
            });

            // Solo números para ciertos campos
            const numericFields = ['numero_seguro_social', 'codigo_postal', 'clabe_interbancaria', 'numero_cuenta'];
            numericFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.addEventListener('input', (e) => {
                        e.target.value = e.target.value.replace(/\D/g, '');
                    });
                }
            });
        }, 1000);
    }

    setupValidations() {
        console.log('Validations setup completed');
    }

    async loadEmpleados() {
        console.log('=== loadEmpleados called ===');
        try {
            const url = `${this.baseURL}/empleados.php`;
            console.log('Cargando empleados desde:', url);
            
            const response = await fetch(url);
            console.log('Response status:', response.status, 'ok:', response.ok);
            
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
                this.empleados = data.data || [];
                console.log('✅ Empleados cargados:', this.empleados.length, 'registros');
                
                // Actualizar tabla
                setTimeout(() => {
                    this.updateEmpleadosTable();
                }, 100);
                
                // CALCULAR Y ACTUALIZAR ESTADÍSTICAS - CON DEBUG MEJORADO
                setTimeout(() => {
                    console.log('🔢 Calculando estadísticas...');
                    this.debugSearchStatsElements(); // NUEVO: Debug completo
                    this.calculateEmpleadosStats();
                    this.updateDepartmentStats();
                }, 500); // Aumentado el tiempo para asegurar que DOM esté listo
                
                // Actualizar selects
                this.populateEmpleadoSelects();
                
            } else {
                console.error('❌ API error:', data.message);
                this.showError('Error: ' + data.message);
            }
        } catch (error) {
            console.error('❌ Error in loadEmpleados:', error);
            this.showError('Error de conexión: ' + error.message);
        }
    }

    // NUEVO: Debug completo para encontrar elementos de estadísticas
    debugSearchStatsElements() {
        console.log('🔍 ===== DEBUG BÚSQUEDA ELEMENTOS ESTADÍSTICAS =====');
        
        // 1. Buscar todos los elementos que contengan números
        console.log('📊 1. Elementos que contienen solo números:');
        const allElements = document.querySelectorAll('*');
        const numericElements = [];
        
        allElements.forEach(element => {
            if (element.children.length === 0) { // Solo elementos hoja
                const text = element.textContent.trim();
                if (/^\d+$/.test(text)) { // Solo números
                    const parentInfo = this.getParentContext(element);
                    numericElements.push({
                        element: element,
                        value: text,
                        id: element.id,
                        classes: Array.from(element.classList).join(' '),
                        parentText: parentInfo.text,
                        parentClasses: parentInfo.classes,
                        selector: this.getElementSelector(element)
                    });
                }
            }
        });
        
        numericElements.forEach((item, index) => {
            console.log(`  ${index + 1}. Valor: "${item.value}" | ID: "${item.id}" | Classes: "${item.classes}"`);
            console.log(`     Contexto padre: "${item.parentText}" | Selector: "${item.selector}"`);
        });
        
        // 2. Buscar elementos por palabras clave
        console.log('📊 2. Elementos por palabras clave:');
        const keywords = ['empleado', 'activo', 'nuevo', 'departamento', 'total', 'statistics', 'stats', 'count'];
        const keywordElements = [];
        
        allElements.forEach(element => {
            const text = (element.textContent || '').toLowerCase();
            const id = typeof element.id === 'string' ? element.id.toLowerCase() : '';
            const classes = Array.from(element.classList).join(' ').toLowerCase();
            
            keywords.forEach(keyword => {
                if (text.includes(keyword) || id.includes(keyword) || classes.includes(keyword)) {
                    if (!keywordElements.some(item => item.element === element)) {
                        keywordElements.push({
                            element: element,
                            keyword: keyword,
                            id: element.id,
                            classes: Array.from(element.classList).join(' '),
                            text: element.textContent.trim(),
                            selector: this.getElementSelector(element)
                        });
                    }
                }
            });
        });
        
        keywordElements.forEach((item, index) => {
            console.log(`  ${index + 1}. Keyword: "${item.keyword}" | ID: "${item.id}" | Text: "${item.text.substring(0, 50)}..."`);
            console.log(`     Selector: "${item.selector}"`);
        });
        
        // 3. Buscar elementos en contenedores tipo dashboard/stats
        console.log('📊 3. Elementos en contenedores de estadísticas:');
        const statsContainers = document.querySelectorAll('.stats, .statistics, .dashboard, .cards, .widgets, .summary, .overview, [class*="stat"], [class*="card"], [class*="widget"], [class*="dash"]');
        
        statsContainers.forEach((container, index) => {
            console.log(`  Container ${index + 1}: ${container.tagName} | ID: "${container.id}" | Classes: "${Array.from(container.classList).join(' ')}"`);
            
            const numbersInContainer = container.querySelectorAll('*');
            numbersInContainer.forEach(el => {
                if (el.children.length === 0 && /^\d+$/.test(el.textContent.trim())) {
                    console.log(`    ↳ Número encontrado: "${el.textContent.trim()}" | Elemento: ${el.tagName} | ID: "${el.id}" | Classes: "${Array.from(el.classList).join(' ')}"`);
                }
            });
        });
        
        // 4. Elementos con IDs o clases específicas
        console.log('📊 4. Elementos con IDs/clases sospechosas:');
        const suspiciousSelectors = [
            '#total', '#count', '#empleados', '#activos', '#departamentos',
            '.total', '.count', '.empleados', '.activos', '.departamentos',
            '[id*="total"]', '[id*="count"]', '[id*="empleado"]', '[id*="activo"]', '[id*="departamento"]',
            '[class*="total"]', '[class*="count"]', '[class*="empleado"]', '[class*="activo"]', '[class*="departamento"]'
        ];
        
        suspiciousSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`  Selector "${selector}" encontró ${elements.length} elementos:`);
                    elements.forEach((el, idx) => {
                        console.log(`    ${idx + 1}. ${el.tagName} | ID: "${el.id}" | Text: "${el.textContent.trim()}" | Value: "${el.value || 'N/A'}"`);
                    });
                }
            } catch (e) {
                // Selector inválido, ignorar
            }
        });
        
        console.log('🔍 ===== FIN DEBUG BÚSQUEDA ESTADÍSTICAS =====');
    }

    // Método auxiliar para obtener contexto del padre
    getParentContext(element) {
        let parent = element.parentElement;
        let parentText = '';
        let parentClasses = '';
        
        // Buscar hasta 3 niveles hacia arriba para obtener contexto
        for (let i = 0; i < 3 && parent; i++) {
            const text = parent.textContent.trim();
            if (text && text.length > element.textContent.trim().length) {
                parentText = text.substring(0, 100);
                parentClasses = Array.from(parent.classList).join(' ');
                break;
            }
            parent = parent.parentElement;
        }
        
        return { text: parentText, classes: parentClasses };
    }

    // Método auxiliar para obtener selector único
    getElementSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.className) {
            const classes = Array.from(element.classList).slice(0, 2).join('.');
            return `.${classes}`;
        }
        
        let selector = element.tagName.toLowerCase();
        if (element.parentElement) {
            const siblings = Array.from(element.parentElement.children);
            const index = siblings.indexOf(element);
            if (index > 0) {
                selector += `:nth-child(${index + 1})`;
            }
        }
        
        return selector;
    }

    updateEmpleadosTable() {
        console.log('=== updateEmpleadosTable called ===');
        console.log('Empleados to show:', this.empleados.length);
        
        const tbody = document.querySelector('#tabla-empleados tbody');
        console.log('Table tbody found:', !!tbody);
        
        if (!tbody) {
            console.error('❌ Table body #tabla-empleados tbody not found!');
            return;
        }
    
        if (this.empleados.length === 0) {
            console.log('No empleados to show');
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay empleados registrados</td></tr>';
            return;
        }
    
        console.log('Generating HTML for empleados...');
        const html = this.empleados.map(empleado => {
            console.log('Processing empleado:', empleado);
            return `
                <tr>
                    <td>${empleado.numero_empleado || 'N/A'}</td>
                    <td>
                        <div class="employee-info">
                            <strong>${empleado.nombre || ''} ${empleado.apellidos || ''}</strong>
                            ${empleado.email ? `<br><small class="text-muted">${empleado.email}</small>` : ''}
                        </div>
                    </td>
                    <td>${empleado.puesto || 'N/A'}</td>
                    <td>${empleado.departamento || 'Sin asignar'}</td>
                    <td>${this.formatMoney(empleado.salario_semanal)}</td>
                    <td class="text-center">${this.formatDate(empleado.fecha_ingreso) || 'N/A'}</td>
                    <td class="text-center">
                        <span class="badge ${empleado.activo ? 'badge-success' : 'badge-danger'}">
                            <i class="fas ${empleado.activo ? 'fa-check' : 'fa-times'}"></i>
                            ${empleado.activo ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td class="text-center">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-info" onclick="empleadosModule.verDetalleEmpleado(${empleado.id})" title="Ver detalle">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="empleadosModule.editarEmpleado(${empleado.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="empleadosModule.imprimirEmpleado(${empleado.id})" title="Imprimir">
                                <i class="fas fa-print"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="empleadosModule.eliminarEmpleado(${empleado.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log('Generated HTML length:', html.length);
        console.log('Setting table HTML...');
        tbody.innerHTML = html;
        console.log('✅ Table updated successfully');
        // BOTONES DE CONTROL MÓVIL
        setTimeout(() => {
            this.addMobileControlButtons();
        }, 100);
    }

    populateEmpleadoSelects() {
        console.log('=== populateEmpleadoSelects called ===');
        const selects = document.querySelectorAll('select[id*="empleado"]');
        console.log('Empleado selects found:', selects.length);
        
        selects.forEach((select, index) => {
            console.log(`Select ${index}:`, select.id);
            if (select.id === 'empleado-select' || select.id === 'empleado-reporte' || select.id === 'horario-empleado-filter' || select.id === 'horario_empleado_id') {
                const currentValue = select.value;
                
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
    // NUEVA FUNCIÓN: Agregar botones de control móvil
    addMobileControlButtons() {
        console.log('📱 Agregando botones de control móvil...');
        
        const tbody = document.querySelector('#tabla-empleados tbody');
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            // Verificar si ya tiene el botón móvil
            if (row.querySelector('.btn-mobile-toggle')) {
                return;
            }
            
            // Obtener el empleado correspondiente
            const empleado = this.empleados[index];
            if (!empleado) return;
            
            // Buscar la celda de acciones (última columna)
            const actionsCell = row.querySelector('td:last-child .btn-group');
            if (!actionsCell) return;
            
            // Determinar estado actual del acceso móvil
            const currentMobileAccess = empleado.activo_movil == 1 || empleado.activo_movil === true;
            
            // Crear botón de toggle móvil
            const mobileBtn = document.createElement('button');
            mobileBtn.className = `btn btn-sm ${currentMobileAccess ? 'btn-success' : 'btn-secondary'} btn-mobile-toggle`;
            mobileBtn.title = currentMobileAccess ? 'Deshabilitar activo móvil' : 'Habilitar activo móvil';
            mobileBtn.innerHTML = `<i class="fas fa-mobile-alt"></i>`;
            mobileBtn.style.marginLeft = '2px';
            
            // Evento click para toggle
            mobileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMobileAccess(empleado.id, currentMobileAccess, mobileBtn);
            });
            
            // Agregar el botón al grupo de acciones
            actionsCell.appendChild(mobileBtn);
        });
        
        console.log(`📱 Botones móvil agregados a ${rows.length} empleados`);
    }

   // FUNCIÓN CORREGIDA: Toggle acceso móvil
    async toggleMobileAccess(empleadoId, currentAccess, button) {
        console.log(`📱 Toggling activo_movil for empleado ${empleadoId}, current: ${currentAccess}`);
        
        const newAccess = !currentAccess;
        const empleado = this.empleados.find(emp => emp.id == empleadoId);
        
        if (!empleado) {
            this.showNotification('Empleado no encontrado', 'error');
            return;
        }
        
        // Confirmación
        const action = newAccess ? 'habilitar' : 'deshabilitar';
        if (!confirm(`¿${action} acceso móvil para ${empleado.nombre} ${empleado.apellidos}?`)) {
            return;
        }
        
        // Deshabilitar botón
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            console.log(`📱 Enviando: empleado_id=${empleadoId}, activo_movil=${newAccess ? 1 : 0}`);
            
            const response = await fetch(`${this.baseURL}/empleados-mobile-update.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empleado_id: parseInt(empleadoId),
                    activo_movil: newAccess ? 1 : 0
                })
            });
            
            console.log(`📱 Response status: ${response.status}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Error ${response.status}:`, errorText);
                throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📱 Success response:', result);
            
            if (result.success) {
                // Actualizar datos locales
                empleado.activo_movil = newAccess ? 1 : 0;
                
                // Actualizar botón
                this.updateMobileButton(button, newAccess);
                
                // Notificación
                const statusText = newAccess ? 'habilitado' : 'deshabilitado';
                this.showNotification(
                    `✅ Acceso móvil ${statusText} para ${empleado.nombre}`, 
                    'success'
                );
                
                console.log(`✅ activo_movil actualizado: ${empleado.nombre} = ${newAccess}`);
            } else {
                throw new Error(result.message || 'Error desconocido');
            }
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.showNotification(`❌ Error: ${error.message}`, 'error');
            this.updateMobileButton(button, currentAccess); // Restaurar
        } finally {
            button.disabled = false;
        }
    }
    
    // FUNCIÓN PARA LIMPIAR DATOS DE EMPLEADOS CON PROBLEMAS
    async fixEmpleadosWithEmptyNumbers() {
        console.log('🔧 Verificando empleados con número vacío...');
        
        const problemEmployees = this.empleados.filter(emp => 
            !emp.numero_empleado || emp.numero_empleado.trim() === ''
        );
        
        if (problemEmployees.length === 0) {
            console.log('✅ Todos los empleados tienen número válido');
            return;
        }
        
        console.log(`🔧 Encontrados ${problemEmployees.length} empleados con número vacío:`, 
            problemEmployees.map(emp => `ID: ${emp.id}, Nombre: ${emp.nombre} ${emp.apellidos}`));
        
        const fix = confirm(
            `Se encontraron ${problemEmployees.length} empleados sin número válido.\n\n` +
            `¿Desea asignar números automáticamente? (formato: EMP + ID)`
        );
        
        if (!fix) return;
        
        try {
            for (const empleado of problemEmployees) {
                const newNumber = `EMP${empleado.id}`;
                console.log(`🔧 Asignando número ${newNumber} a ${empleado.nombre} ${empleado.apellidos}`);
                
                // Actualizar solo el campo numero_empleado
                const response = await fetch(`${this.baseURL}/empleados.php`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: empleado.id,
                        numero_empleado: newNumber,
                        nombre: empleado.nombre,
                        apellidos: empleado.apellidos,
                        puesto: empleado.puesto || 'Sin especificar',
                        fecha_ingreso: empleado.fecha_ingreso || new Date().toISOString().split('T')[0],
                        salario_semanal: empleado.salario_semanal || 0,
                        activo: empleado.activo || 1
                    })
                });
                
                if (response.ok) {
                    empleado.numero_empleado = newNumber;
                    console.log(`✅ Número asignado correctamente a ${empleado.nombre}`);
                } else {
                    console.error(`❌ Error asignando número a ${empleado.nombre}`);
                }
            }
            
            this.showNotification('✅ Números de empleado corregidos', 'success');
            this.updateEmpleadosTable();
            
        } catch (error) {
            console.error('❌ Error corrigiendo números:', error);
            this.showNotification('❌ Error corrigiendo números de empleado', 'error');
        }
    }
    // NUEVA FUNCIÓN: Actualizar apariencia del botón móvil
    updateMobileButton(button, hasAccess) {
        if (hasAccess) {
            button.className = 'btn btn-sm btn-success btn-mobile-toggle';
            button.title = 'Deshabilitar acceso móvil';
            button.innerHTML = '<i class="fas fa-mobile-alt"></i>';
        } else {
            button.className = 'btn btn-sm btn-secondary btn-mobile-toggle';
            button.title = 'Habilitar acceso móvil';
            button.innerHTML = '<i class="fas fa-mobile-alt"></i>';
        }
    }
    
    // FUNCIÓN DE DEBUG COMPLETO
async debugMobileToggle(empleadoId) {
    console.log('🔍 ===== DEBUG COMPLETO ACTIVO_MOVIL =====');
    
    const empleado = this.empleados.find(emp => emp.id == empleadoId);
    if (!empleado) {
        console.error('❌ Empleado no encontrado:', empleadoId);
        return;
    }
    
    console.log('📋 Datos del empleado:');
    console.table({
        id: empleado.id,
        nombre: empleado.nombre,
        apellidos: empleado.apellidos,
        activo_movil_actual: empleado.activo_movil,
        activo: empleado.activo
    });
    
    // Test 1: Verificar si el archivo PHP existe
    console.log('🧪 Test 1: Verificando archivo PHP...');
    try {
        const testResponse = await fetch(`${this.baseURL}/empleados-mobile-update.php`, {
            method: 'GET'
        });
        console.log('📁 Archivo PHP status:', testResponse.status);
        const testText = await testResponse.text();
        console.log('📁 Archivo PHP response:', testText.substring(0, 200));
    } catch (error) {
        console.error('❌ Error verificando archivo PHP:', error);
    }
    
    // Test 2: Probar consulta directa
    console.log('🧪 Test 2: Consultando empleado directamente...');
    try {
        const queryResponse = await fetch(`${this.baseURL}/empleados.php?id=${empleadoId}`);
        const queryData = await queryResponse.json();
        console.log('📊 Datos actuales del empleado desde API:', queryData);
        
        if (queryData.success && queryData.data) {
            console.log('📋 Campo activo_movil en API:', queryData.data.activo_movil, typeof queryData.data.activo_movil);
        }
    } catch (error) {
        console.error('❌ Error consultando empleado:', error);
    }
    
    // Test 3: Intentar actualización con log completo
    console.log('🧪 Test 3: Intentando actualización con debug...');
    try {
        const updateData = {
            empleado_id: parseInt(empleadoId),
            activo_movil: 1
        };
        
        console.log('📤 Datos a enviar:', updateData);
        console.log('📤 URL destino:', `${this.baseURL}/empleados-mobile-update.php`);
        
        const updateResponse = await fetch(`${this.baseURL}/empleados-mobile-update.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        console.log('📥 Response status:', updateResponse.status);
        console.log('📥 Response headers:', [...updateResponse.headers.entries()]);
        
        const updateText = await updateResponse.text();
        console.log('📥 Response text raw:', updateText);
        
        try {
            const updateResult = JSON.parse(updateText);
            console.log('📥 Response JSON:', updateResult);
        } catch (parseError) {
            console.error('❌ No se pudo parsear JSON:', parseError);
        }
        
    } catch (error) {
        console.error('❌ Error en test de actualización:', error);
    }
    
    console.log('🔍 ===== FIN DEBUG COMPLETO =====');
}

    // FUNCIÓN PARA VERIFICAR ESTADO ACTUAL EN BD
    async verifyDatabaseState(empleadoId) {
        console.log(`🔍 Verificando estado actual en BD para empleado ${empleadoId}...`);
        
        try {
            const response = await fetch(`${this.baseURL}/empleados.php?id=${empleadoId}&timestamp=${Date.now()}`);
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Estado actual en BD:', {
                    id: data.data.id,
                    nombre: data.data.nombre,
                    activo_movil: data.data.activo_movil,
                    activo: data.data.activo
                });
                return data.data;
            } else {
                console.error('❌ Error consultando BD:', data.message);
            }
        } catch (error) {
            console.error('❌ Error verificando BD:', error);
        }
        return null;
    }
    
    // FUNCIÓN PARA TEST MANUAL PASO A PASO
    async testStepByStep(empleadoId) {
        console.log('🎯 ===== TEST PASO A PASO =====');
        
        // Paso 1: Estado inicial
        console.log('📍 Paso 1: Verificando estado inicial...');
        const estadoInicial = await this.verifyDatabaseState(empleadoId);
        if (!estadoInicial) return;
        
        // Paso 2: Intentar actualización
        console.log('📍 Paso 2: Intentando actualización...');
        const nuevoValor = estadoInicial.activo_movil == 1 ? 0 : 1;
        console.log(`🔄 Cambiando activo_movil de ${estadoInicial.activo_movil} a ${nuevoValor}`);
        
        try {
            const response = await fetch(`${this.baseURL}/empleados-mobile-update.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    empleado_id: parseInt(empleadoId),
                    activo_movil: nuevoValor
                })
            });
            
            console.log('📥 Response status:', response.status);
            const responseText = await response.text();
            console.log('📥 Response:', responseText);
            
            if (response.ok) {
                const result = JSON.parse(responseText);
                console.log('✅ Respuesta del servidor:', result);
                
                // Paso 3: Verificar cambio
                console.log('📍 Paso 3: Verificando si el cambio se aplicó...');
                setTimeout(async () => {
                    const estadoFinal = await this.verifyDatabaseState(empleadoId);
                    if (estadoFinal) {
                        if (estadoFinal.activo_movil == nuevoValor) {
                            console.log('✅ ¡ÉXITO! El campo se actualizó correctamente');
                        } else {
                            console.error('❌ FALLO: El campo no se actualizó');
                            console.log(`Expected: ${nuevoValor}, Got: ${estadoFinal.activo_movil}`);
                        }
                    }
                }, 2000);
            } else {
                console.error('❌ Error en la respuesta:', response.status, responseText);
            }
            
        } catch (error) {
            console.error('❌ Error en test:', error);
        }
        
        console.log('🎯 ===== FIN TEST PASO A PASO =====');
    }
    
    
    // ===== MÉTODOS DE ESTADÍSTICAS MEJORADOS =====
    calculateEmpleadosStats() {
        console.log('=== CALCULANDO ESTADÍSTICAS DE EMPLEADOS ===');
        console.log('Total empleados cargados:', this.empleados.length);
        
        if (!this.empleados || this.empleados.length === 0) {
            console.log('No hay empleados para calcular estadísticas');
            this.updateStatsDisplay({
                total: 0,
                activos: 0,
                nuevos: 0,
                departamentos: 0
            });
            return;
        }

        // Total de empleados
        const total = this.empleados.length;
        
        // Empleados activos
        const activos = this.empleados.filter(emp => emp.activo == 1 || emp.activo === true).length;
        
        // Empleados nuevos (ingresaron en los últimos 30 días)
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 30);
        
        const nuevos = this.empleados.filter(emp => {
            if (!emp.fecha_ingreso) return false;
            const fechaIngreso = new Date(emp.fecha_ingreso);
            return fechaIngreso >= fechaLimite;
        }).length;
        
        // Departamentos únicos
        const departamentosUnicos = new Set();
        this.empleados.forEach(emp => {
            if (emp.departamento && emp.departamento.trim() !== '' && emp.departamento.toLowerCase() !== 'sin asignar') {
                departamentosUnicos.add(emp.departamento.trim().toLowerCase());
            }
        });
        const departamentos = departamentosUnicos.size;
        
        const stats = {
            total,
            activos,
            nuevos,
            departamentos
        };
        
        console.log('📊 Estadísticas calculadas:', stats);
        
        // Actualizar la visualización
        this.updateStatsDisplay(stats);
        setTimeout(() => {
            if (window.testUpdateStats) {
                window.testUpdateStats();
            }
        }, 100);
        return stats;
    }

    updateStatsDisplay(stats) {
        console.log('=== ACTUALIZANDO DISPLAY DE ESTADÍSTICAS ===');
        console.log('Stats a mostrar:', stats);
        
        let elementsFound = 0;
        
        // ESTRATEGIA 1: IDs estándar
        const standardIds = [
            { id: 'total-empleados', value: stats.total, label: 'Total Empleados' },
            { id: 'empleados-activos', value: stats.activos, label: 'Empleados Activos' },
            { id: 'empleados-nuevos', value: stats.nuevos, label: 'Empleados Nuevos' },
            { id: 'total-departamentos', value: stats.departamentos, label: 'Departamentos' }
        ];
        
        standardIds.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                console.log(`✅ ID estándar encontrado: ${stat.id} = ${stat.value}`);
                element.textContent = stat.value;
                elementsFound++;
                this.animateStatsUpdate(element);
            }
        });
        
        // ESTRATEGIA 2: IDs alternativos comunes
        if (elementsFound === 0) {
            console.log('🔍 Probando IDs alternativos...');
            const alternativeIds = [
                // Para total empleados
                ['totalEmpleados', 'total_empleados', 'empleados_total', 'count-empleados', 'empleados-count', stats.total],
                // Para empleados activos
                ['empleadosActivos', 'empleados_activos', 'activos-count', 'active-employees', 'empleados-active', stats.activos],
                // Para empleados nuevos
                ['empleadosNuevos', 'empleados_nuevos', 'nuevos-count', 'new-employees', 'empleados-new', stats.nuevos],
                // Para departamentos
                ['totalDepartamentos', 'total_departamentos', 'departamentos-count', 'departments-total', stats.departamentos]
            ];
            
            alternativeIds.forEach(([id1, id2, id3, id4, id5, value]) => {
                [id1, id2, id3, id4, id5].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        console.log(`✅ ID alternativo encontrado: ${id} = ${value}`);
                        element.textContent = value;
                        elementsFound++;
                        this.animateStatsUpdate(element);
                    }
                });
            });
        }
        
        // ESTRATEGIA 3: Búsqueda inteligente por contexto
        if (elementsFound === 0) {
            console.log('🔍 Búsqueda inteligente por contexto...');
            this.intelligentStatsSearch(stats);
        }
        
        // ESTRATEGIA 4: Actualización manual con datos específicos de debug
        if (elementsFound === 0) {
            console.log('🔍 Aplicando actualización manual basada en debug...');
            this.manualStatsUpdate(stats);
        }
        
        console.log(`📊 Total elementos de estadísticas actualizados: ${elementsFound}`);
        
        if (elementsFound === 0) {
            console.warn('⚠️ No se pudieron actualizar las estadísticas automáticamente');
            console.log('💡 Consulta los logs de debug para identificar los elementos correctos');
        }
    }

    // Búsqueda inteligente por contexto del contenido
    intelligentStatsSearch(stats) {
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            if (element.children.length === 0) { // Solo elementos hoja
                const text = element.textContent.trim();
                if (text === '0' || /^\d+$/.test(text)) { // Elementos que contienen números
                    const context = this.getParentContext(element);
                    const contextText = context.text.toLowerCase();
                    
                    // Determinar qué estadística podría ser basada en el contexto
                    if (contextText.includes('total') && contextText.includes('empleado')) {
                        console.log(`🎯 Posible total empleados encontrado: ${element.tagName} con valor "${text}"`);
                        element.textContent = stats.total;
                        this.animateStatsUpdate(element);
                    } else if (contextText.includes('activo') || contextText.includes('active')) {
                        console.log(`🎯 Posible empleados activos encontrado: ${element.tagName} con valor "${text}"`);
                        element.textContent = stats.activos;
                        this.animateStatsUpdate(element);
                    } else if (contextText.includes('nuevo') || contextText.includes('new') || contextText.includes('reciente')) {
                        console.log(`🎯 Posible empleados nuevos encontrado: ${element.tagName} con valor "${text}"`);
                        element.textContent = stats.nuevos;
                        this.animateStatsUpdate(element);
                    } else if (contextText.includes('departamento') || contextText.includes('department')) {
                        console.log(`🎯 Posible total departamentos encontrado: ${element.tagName} con valor "${text}"`);
                        element.textContent = stats.departamentos;
                        this.animateStatsUpdate(element);
                    }
                }
            }
        });
    }

    // Actualización manual basada en patrones específicos encontrados
    manualStatsUpdate(stats) {
        // Esta función se puede personalizar basada en los logs de debug
        console.log('🔧 Aplicando actualización manual...');
        
        // Intentar selecciones muy específicas
        const manualSelectors = [
            // Números dentro de tarjetas de estadísticas
            '.card .number, .card .count, .card .value, .card .stat-number',
            '.stat .number, .stat .count, .stat .value, .stat .stat-number',
            '.widget .number, .widget .count, .widget .value, .widget .stat-number',
            '.dashboard-card .number, .dashboard-card .count, .dashboard-card .value',
            // Elementos con clases específicas de números
            '.stat-value, .metric-value, .counter, .big-number',
            // Elementos H1-H6 que contengan solo números
            'h1, h2, h3, h4, h5, h6',
            // Spans y divs con números
            'span, div'
        ];
        
        manualSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element.children.length === 0 && /^\d+$/.test(element.textContent.trim())) {
                        const num = parseInt(element.textContent.trim());
                        if (num === 0) { // Solo actualizar elementos que tengan 0
                            const context = this.getParentContext(element);
                            const contextText = (context.text + ' ' + context.classes).toLowerCase();
                            
                            if (contextText.includes('total') || contextText.includes('empleado')) {
                                element.textContent = stats.total;
                                console.log(`🔧 Manual update: Total empleados = ${stats.total}`);
                            } else if (contextText.includes('activo')) {
                                element.textContent = stats.activos;
                                console.log(`🔧 Manual update: Empleados activos = ${stats.activos}`);
                            } else if (contextText.includes('nuevo')) {
                                element.textContent = stats.nuevos;
                                console.log(`🔧 Manual update: Empleados nuevos = ${stats.nuevos}`);
                            } else if (contextText.includes('departamento')) {
                                element.textContent = stats.departamentos;
                                console.log(`🔧 Manual update: Departamentos = ${stats.departamentos}`);
                            }
                        }
                    }
                });
            } catch (e) {
                // Selector inválido, continuar
            }
        });
    }

    // Animación para actualización de estadísticas
    animateStatsUpdate(element) {
        if (element) {
            element.style.transition = 'all 0.3s ease';
            element.style.transform = 'scale(1.1)';
            element.style.color = '#28a745';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
                element.style.color = '';
            }, 300);
        }
    }

    updateDepartmentStats() {
        console.log('=== ACTUALIZANDO ESTADÍSTICAS POR DEPARTAMENTO ===');
        
        if (!this.empleados || this.empleados.length === 0) {
            return;
        }
        
        // Agrupar empleados por departamento
        const departmentStats = {};
        this.empleados.forEach(emp => {
            const dept = emp.departamento || 'Sin asignar';
            if (!departmentStats[dept]) {
                departmentStats[dept] = {
                    total: 0,
                    activos: 0,
                    inactivos: 0
                };
            }
            
            departmentStats[dept].total++;
            if (emp.activo == 1 || emp.activo === true) {
                departmentStats[dept].activos++;
            } else {
                departmentStats[dept].inactivos++;
            }
        });
        
        console.log('📊 Estadísticas por departamento:', departmentStats);
        
        // Buscar tabla o contenedor de estadísticas por departamento
        const deptContainer = document.querySelector('#departamentos-stats, .departamentos-stats, #department-stats');
        if (deptContainer) {
            // Actualizar tabla de departamentos si existe
            this.updateDepartmentTable(departmentStats);
        }
        
        return departmentStats;
    }

    updateDepartmentTable(departmentStats) {
        const tableBody = document.querySelector('#departamentos-stats tbody, .departamentos-stats tbody');
        if (!tableBody) return;
        
        const html = Object.entries(departmentStats).map(([dept, stats]) => `
            <tr>
                <td>${dept}</td>
                <td class="text-center">${stats.total}</td>
                <td class="text-center text-success">${stats.activos}</td>
                <td class="text-center text-danger">${stats.inactivos}</td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = html;
        console.log('✅ Tabla de departamentos actualizada');
    }

    showTab(tabName) {
        console.log('Show tab:', tabName);
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.empleado-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`tab-${tabName}`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        const targetButton = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }
        
        this.currentTab = tabName;
    }

    mostrarModalEmpleado(empleadoId = null) {
        console.log('=== MOSTRAR MODAL EMPLEADO ===');
        console.log('Empleado ID recibido:', empleadoId, 'Type:', typeof empleadoId);
        
        const modal = document.getElementById('modal-empleado');
        const title = document.getElementById('modal-empleado-title');
        const form = document.getElementById('form-empleado');
        
        if (!modal || !title || !form) {
            console.error('❌ Modal elements not found:', {
                modal: !!modal,
                title: !!title,
                form: !!form
            });
            alert('Error: Modal de empleado no encontrado en el HTML');
            return;
        }

        this.empleadoActual = empleadoId;
        console.log('✅ empleadoActual establecido a:', this.empleadoActual);
        
        this.showTab('basicos');
        
        if (empleadoId) {
            title.textContent = 'Editar Empleado';
            console.log('🔄 Modo EDICIÓN activado');
            
            form.reset();
            this.clearAllValidations();
            
            this.cargarDatosEmpleado(empleadoId);
        } else {
            title.textContent = 'Nuevo Empleado';
            console.log('✨ Modo CREACIÓN activado');
            
            form.reset();
            this.clearAllValidations();
            
            const empleadoIdField = document.getElementById('empleado_id');
            if (empleadoIdField) {
                empleadoIdField.value = '';
            }
            
            const defaults = {
                'nacionalidad': 'Mexicana',
                'vacaciones_pendientes': '0',
                'tipo_contrato': 'indefinido',
                'dias_descanso': 'Domingo',
                'activo': '1'
            };
            
            Object.entries(defaults).forEach(([field, value]) => {
                const element = document.getElementById(field);
                if (element) {
                    element.value = value;
                    console.log(`Default set: ${field} = ${value}`);
                }
            });
        }
        
        modal.style.display = 'block';
        console.log('✅ Modal mostrado');
    }

    async cargarDatosEmpleado(empleadoId) {
        console.log('=== CARGAR DATOS EMPLEADO ===');
        console.log('Loading data for empleado ID:', empleadoId);
        
        try {
            const url = `${this.baseURL}/empleados.php?id=${empleadoId}`;
            console.log('Requesting URL:', url);
            
            const response = await fetch(url);
            console.log('API Response status:', response.status, 'OK:', response.ok);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseText = await response.text();
            console.log('API Response text:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON Parse error:', parseError);
                throw new Error('Respuesta del servidor no es JSON válido');
            }
            
            console.log('API Response data:', data);
            
            if (data.success) {
                const empleado = data.data;
                console.log('✅ Empleado data to load:', empleado);
                
                const form = document.getElementById('form-empleado');
                if (!form) {
                    throw new Error('Form not found');
                }
                
                console.log('🔄 Llenando campos del formulario...');
                let fieldsSet = 0;
                let fieldsNotFound = [];
                
                Object.keys(empleado).forEach(key => {
                    const field = form.querySelector(`[name="${key}"]`);
                    if (field) {
                        console.log(`✅ Setting field ${key}:`, empleado[key]);
                        
                        if (field.type === 'checkbox') {
                            field.checked = empleado[key] == 1;
                        } else {
                            field.value = empleado[key] || '';
                        }
                        fieldsSet++;
                    } else {
                        fieldsNotFound.push(key);
                    }
                });
                
                console.log(`✅ Fields set: ${fieldsSet}`);
                if (fieldsNotFound.length > 0) {
                    console.log('⚠️ Fields not found in form:', fieldsNotFound);
                }

                const empleadoIdField = document.getElementById('empleado_id');
                if (empleadoIdField && empleado.id) {
                    empleadoIdField.value = empleado.id;
                    console.log('✅ ID field set:', empleado.id);
                }

                if (empleado.fecha_ingreso) {
                    console.log('🔄 Calculando antigüedad...');
                    this.calculateAntiguedad(empleado.fecha_ingreso);
                }

                console.log('✅ Datos cargados correctamente en el formulario');
            } else {
                throw new Error(data.message || 'Error al cargar datos del empleado');
            }
        } catch (error) {
            console.error('❌ Error loading empleado data:', error);
            this.showNotification('Error al cargar datos del empleado: ' + error.message, 'error');
        }
    }

    async guardarEmpleado() {
        console.log('=== GUARDAR EMPLEADO ULTRA-DEBUG ===');
        console.log('Empleado actual (para edición):', this.empleadoActual);
        
        try {
            const form = document.getElementById('form-empleado');
            if (!form) {
                throw new Error('Formulario no encontrado');
            }

            const formData = new FormData(form);
            const rawData = {};
            
            // Recopilar datos raw
            for (let [key, value] of formData.entries()) {
                rawData[key] = value;
            }
            console.log('📋 DATOS RAW DEL FORMULARIO:', rawData);

            // LIMPIEZA ULTRA-ESTRICTA DE DATOS
            const data = {};
            
            // Lista de campos permitidos y sus tipos esperados
            const allowedFields = {
                // Campos de identificación
                'numero_empleado': 'string',
                'nombre': 'string',
                'apellidos': 'string',
                
                // Campos de contacto
                'email': 'string',
                'telefono': 'string',
                
                // Campos personales
                'fecha_nacimiento': 'date',
                'sexo': 'string',
                'estado_civil': 'string',
                'nacionalidad': 'string',
                'lugar_nacimiento': 'string',
                
                // Documentos
                'rfc': 'string',
                'curp': 'string',
                'numero_seguro_social': 'string',
                
                // Dirección
                'domicilio': 'string',
                'poblacion': 'string',
                'estado': 'string',
                'codigo_postal': 'string',
                
                // Salud
                'tipo_sangre': 'string',
                'alergias': 'string',
                
                // Trabajo
                'puesto': 'string',
                'departamento': 'string',
                'actividades_desempenar': 'string',
                'salario_semanal': 'number',
                'centro_trabajo': 'string',
                'tipo_contrato': 'string',
                'duracion_contrato': 'string',
                'fecha_firma_contrato': 'date',
                'fecha_ingreso': 'date',
                'dias_descanso': 'string',
                'vacaciones_pendientes': 'number',
                
                // Financiero
                'credito_infonavit': 'string',
                'tipo_retencion': 'string',
                'valor_retencion': 'number',
                'banco': 'string',
                'numero_cuenta': 'string',
                'clabe_interbancaria': 'string',
                
                // Observaciones
                'observaciones_personales': 'string',
                
                // Emergencia
                'contacto_emergencia': 'string',
                'telefono_emergencia': 'string',
                'parentesco_emergencia': 'string',
                
                // Estado
                'activo': 'number'
            };

            // Procesar solo campos permitidos
            Object.keys(allowedFields).forEach(field => {
                const expectedType = allowedFields[field];
                const rawValue = rawData[field];
                
                console.log(`🔍 Procesando campo ${field}:`, rawValue, `(esperado: ${expectedType})`);
                
                if (rawValue === undefined || rawValue === null || rawValue === '') {
                    // Manejar valores especiales para campos requeridos
                    if (['numero_empleado', 'nombre', 'apellidos', 'puesto', 'fecha_ingreso', 'salario_semanal'].includes(field)) {
                        if (field === 'salario_semanal') {
                            throw new Error(`${field} es requerido y debe ser un número válido`);
                        } else {
                            throw new Error(`${field} es requerido`);
                        }
                    }
                    
                    // Para campos opcionales, establecer null o valor por defecto
                    if (expectedType === 'number') {
                        data[field] = field === 'vacaciones_pendientes' ? 0 : null;
                    } else if (expectedType === 'date') {
                        data[field] = null;
                    } else {
                        data[field] = null;
                    }
                } else {
                    // Limpiar y convertir según el tipo esperado
                    switch (expectedType) {
                        case 'string':
                            data[field] = rawValue.toString().trim();
                            if (data[field] === '') {
                                data[field] = null;
                            }
                            break;
                            
                        case 'number':
                            const numValue = parseFloat(rawValue);
                            if (isNaN(numValue)) {
                                if (['salario_semanal'].includes(field)) {
                                    throw new Error(`${field} debe ser un número válido`);
                                }
                                data[field] = field === 'vacaciones_pendientes' ? 0 : null;
                            } else {
                                data[field] = numValue;
                            }
                            break;
                            
                        case 'date':
                            const dateValue = rawValue.toString().trim();
                            if (dateValue === '') {
                                data[field] = null;
                            } else {
                                // Validar formato de fecha
                                const dateObj = new Date(dateValue);
                                if (isNaN(dateObj.getTime())) {
                                    throw new Error(`${field} tiene un formato de fecha inválido`);
                                }
                                data[field] = dateValue;
                            }
                            break;
                    }
                }
                
                console.log(`✅ Campo ${field} procesado:`, data[field], `(tipo: ${typeof data[field]})`);
            });

            // Campo activo especial
            if (data.activo === null || data.activo === undefined) {
                data.activo = 1;
            } else {
                data.activo = parseInt(data.activo) || 1;
            }

            // Configurar petición
            const url = `${this.baseURL}/empleados.php`;
            const isEdit = this.empleadoActual && this.empleadoActual !== null;
            const method = isEdit ? 'PUT' : 'POST';
            
            if (isEdit) {
                data.id = parseInt(this.empleadoActual);
                console.log('📝 Modo EDICIÓN - ID:', data.id);
            } else {
                console.log('📝 Modo CREACIÓN');
            }

            console.log('🚀 DATOS FINALES ULTRA-LIMPIOS A ENVIAR:');
            console.table(data);

            // Validación final
            const requiredFields = ['numero_empleado', 'nombre', 'apellidos', 'puesto', 'fecha_ingreso', 'salario_semanal'];
            for (let field of requiredFields) {
                if (!data[field] || data[field] === null) {
                    throw new Error(`Campo requerido faltante: ${field}`);
                }
            }

            // Deshabilitar botón
            const submitBtn = document.querySelector('#form-empleado button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            }

            // Realizar petición con datos ultra-limpios
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data)
            });

            console.log('📡 Response status:', response.status, 'OK:', response.ok);

            if (response.status === 400) {
                const errorText = await response.text();
                console.error('❌ ERROR 400 ESPECÍFICO:', errorText);
                
                let detailedMessage = 'Error 400: ';
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.errors) {
                        const fieldErrors = Object.entries(errorData.errors).map(([field, error]) => `${field}: ${error}`);
                        detailedMessage += fieldErrors.join(', ');
                    } else if (errorData.message) {
                        detailedMessage += errorData.message;
                    } else {
                        detailedMessage += 'Datos inválidos - revisar logs de consola';
                    }
                } catch (e) {
                    detailedMessage += 'Formato de respuesta inválido - revisar logs de consola';
                }
                
                throw new Error(detailedMessage);
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server error response:', errorText);
                throw new Error(`Error del servidor (${response.status}): ${response.statusText}`);
            }

            const responseText = await response.text();
            console.log('📡 Server response:', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Could not parse JSON:', responseText);
                throw new Error('Respuesta del servidor inválida');
            }

            if (result.success) {
                console.log('✅ Empleado guardado exitosamente');
                this.showNotification(result.message || 'Empleado guardado correctamente', 'success');
                this.cerrarModalEmpleado();
                
                setTimeout(() => {
                    this.loadEmpleados();
                }, 500);
            } else {
                throw new Error(result.message || 'Error desconocido del servidor');
            }

        } catch (error) {
            console.error('❌ Error in guardarEmpleado:', error);
            this.showNotification('Error al guardar empleado: ' + error.message, 'error');
        } finally {
            const submitBtn = document.querySelector('#form-empleado button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Empleado';
            }
        }
    }

    editarEmpleado(empleadoId) {
        console.log('=== EDITAR EMPLEADO CALLED ===');
        console.log('Empleado ID:', empleadoId, 'Type:', typeof empleadoId);
        
        const empleado = this.empleados.find(emp => emp.id == empleadoId);
        console.log('Empleado encontrado:', empleado);
        
        if (!empleado) {
            this.showNotification('Error: Empleado no encontrado', 'error');
            return;
        }
        
        this.mostrarModalEmpleado(empleadoId);
    }

    async eliminarEmpleado(empleadoId) {
        const empleado = this.empleados.find(emp => emp.id === empleadoId);
        if (!empleado) return;

        if (!confirm(`¿Está seguro de eliminar al empleado ${empleado.nombre} ${empleado.apellidos}?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/empleados.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: empleadoId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.loadEmpleados();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting empleado:', error);
            this.showNotification('Error al eliminar empleado', 'error');
        }
    }

    async verDetalleEmpleado(empleadoId) {
        console.log('Ver detalle empleado:', empleadoId);
        try {
            const response = await fetch(`${this.baseURL}/empleados.php?id=${empleadoId}`);
            const data = await response.json();
            
            if (data.success) {
                this.mostrarModalDetalle(data.data);
            } else {
                this.showNotification('Error al cargar detalle del empleado', 'error');
            }
        } catch (error) {
            console.error('Error loading empleado detail:', error);
            this.showNotification('Error de conexión', 'error');
        }
    }

    mostrarModalDetalle(empleado) {
        const modalHTML = this.generateDetalleModalHTML(empleado);
        
        const existingModal = document.getElementById('modal-detalle-empleado');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById('modal-detalle-empleado');
        modal.style.display = 'block';
    }

    generateDetalleModalHTML(empleado) {
        return `
            <div id="modal-detalle-empleado" class="modal">
                <div class="modal-content empleado-detalle-modal">
                    <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                    <h2><i class="fas fa-user"></i> Detalle del Empleado</h2>
                    
                    <div class="empleado-detalle-content">
                        <div class="empleado-header-detail">
                            <div class="empleado-avatar-large">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="empleado-info-header">
                                <h3>${empleado.nombre} ${empleado.apellidos}</h3>
                                <p class="empleado-puesto">${empleado.puesto}</p>
                                <p class="empleado-numero">No. ${empleado.numero_empleado}</p>
                            </div>
                        </div>
                        
                        <div class="detalle-tabs">
                            <button class="detalle-tab-btn active" onclick="this.parentElement.parentElement.querySelector('.detalle-tab-content.active').classList.remove('active'); this.parentElement.parentElement.querySelector('#detalle-personal').classList.add('active'); this.parentElement.querySelectorAll('.detalle-tab-btn').forEach(btn => btn.classList.remove('active')); this.classList.add('active');">Personal</button>
                            <button class="detalle-tab-btn" onclick="this.parentElement.parentElement.querySelector('.detalle-tab-content.active').classList.remove('active'); this.parentElement.parentElement.querySelector('#detalle-laboral').classList.add('active'); this.parentElement.querySelectorAll('.detalle-tab-btn').forEach(btn => btn.classList.remove('active')); this.classList.add('active');">Laboral</button>
                            <button class="detalle-tab-btn" onclick="this.parentElement.parentElement.querySelector('.detalle-tab-content.active').classList.remove('active'); this.parentElement.parentElement.querySelector('#detalle-contacto').classList.add('active'); this.parentElement.querySelectorAll('.detalle-tab-btn').forEach(btn => btn.classList.remove('active')); this.classList.add('active');">Contacto</button>
                        </div>
                        
                        <div id="detalle-personal" class="detalle-tab-content active">
                            ${this.generatePersonalDetails(empleado)}
                        </div>
                        
                        <div id="detalle-laboral" class="detalle-tab-content">
                            ${this.generateLaboralDetails(empleado)}
                        </div>
                        
                        <div id="detalle-contacto" class="detalle-tab-content">
                            ${this.generateContactoDetails(empleado)}
                        </div>
                    </div>
                    
                    <div class="detalle-actions">
                        <button class="btn btn-primary" onclick="empleadosModule.editarEmpleado(${empleado.id}); this.parentElement.parentElement.parentElement.remove();">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-secondary" onclick="empleadosModule.imprimirEmpleado(${empleado.id})">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button class="btn btn-info" onclick="this.parentElement.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i> Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    generatePersonalDetails(empleado) {
        return `
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Fecha de Nacimiento:</label>
                    <span>${this.formatDate(empleado.fecha_nacimiento) || 'No especificada'}</span>
                </div>
                <div class="detail-item">
                    <label>Edad:</label>
                    <span>${empleado.fecha_nacimiento ? this.calculateAge(empleado.fecha_nacimiento) + ' años' : 'No calculada'}</span>
                </div>
                <div class="detail-item">
                    <label>Sexo:</label>
                    <span>${this.formatSexo(empleado.sexo) || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <label>Estado Civil:</label>
                    <span>${this.formatEstadoCivil(empleado.estado_civil) || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <label>Nacionalidad:</label>
                    <span>${empleado.nacionalidad || 'No especificada'}</span>
                </div>
                <div class="detail-item">
                    <label>Lugar de Nacimiento:</label>
                    <span>${empleado.lugar_nacimiento || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <label>RFC:</label>
                    <span>${empleado.rfc || 'No proporcionado'}</span>
                </div>
                <div class="detail-item">
                    <label>CURP:</label>
                    <span>${empleado.curp || 'No proporcionado'}</span>
                </div>
                <div class="detail-item">
                    <label>NSS:</label>
                    <span>${empleado.numero_seguro_social || 'No proporcionado'}</span>
                </div>
                <div class="detail-item">
                    <label>Tipo de Sangre:</label>
                    <span>${empleado.tipo_sangre || 'No especificado'}</span>
                </div>
                ${empleado.domicilio ? `
                <div class="detail-item full-width">
                    <label>Domicilio:</label>
                    <span>${empleado.domicilio}</span>
                </div>
                ` : ''}
                ${empleado.alergias ? `
                <div class="detail-item full-width">
                    <label>Alergias:</label>
                    <span>${empleado.alergias}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    generateLaboralDetails(empleado) {
        return `
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Puesto:</label>
                    <span>${empleado.puesto || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <label>Departamento:</label>
                    <span>${empleado.departamento || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <label>Salario Diario:</label>
                    <span class="detail-value-money">${this.formatMoney(empleado.salario_semanal)}</span>
                </div>
                <div class="detail-item">
                    <label>Fecha de Ingreso:</label>
                    <span class="detail-value-date">${this.formatDate(empleado.fecha_ingreso)}</span>
                </div>
                <div class="detail-item">
                    <label>Antigüedad:</label>
                    <span>${empleado.antiguedad_anos ? empleado.antiguedad_anos + ' años' : 'No calculada'}</span>
                </div>
                <div class="detail-item">
                    <label>Tipo de Contrato:</label>
                    <span>${this.formatTipoContrato(empleado.tipo_contrato) || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <label>Centro de Trabajo:</label>
                    <span>${empleado.centro_trabajo || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <label>Días de Descanso:</label>
                    <span>${empleado.dias_descanso || 'No especificados'}</span>
                </div>
                <div class="detail-item">
                    <label>Vacaciones Pendientes:</label>
                    <span>${empleado.vacaciones_pendientes || 0} días</span>
                </div>
                ${empleado.actividades_desempenar ? `
                <div class="detail-item full-width">
                    <label>Actividades a Desempeñar:</label>
                    <span>${empleado.actividades_desempenar}</span>
                </div>
                ` : ''}
                ${empleado.credito_infonavit ? `
                <div class="detail-item">
                    <label>Crédito Infonavit:</label>
                    <span>${empleado.credito_infonavit}</span>
                </div>
                ` : ''}
                <div class="detail-item">
                    <label>Estado:</label>
                    <span class="badge ${empleado.activo ? 'badge-success' : 'badge-danger'}">
                        ${empleado.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
                <div class="detail-item">
                    <label>Acceso Móvil:</label>
                    <span class="badge ${empleado.activo_movil ? 'badge-success' : 'badge-secondary'}">
                        <i class="fas fa-mobile-alt"></i>
                        ${empleado.activo_movil ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                </div>
            </div>
        `;
    }

    generateContactoDetails(empleado) {
        return `
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Email:</label>
                    <span>${empleado.email || 'No proporcionado'}</span>
                </div>
                <div class="detail-item">
                    <label>Teléfono:</label>
                    <span>${empleado.telefono || 'No proporcionado'}</span>
                </div>
                <div class="detail-item">
                    <label>Población:</label>
                    <span>${empleado.poblacion || 'No especificada'}</span>
                </div>
                <div class="detail-item">
                    <label>Estado:</label>
                    <span>${empleado.estado || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <label>Código Postal:</label>
                    <span>${empleado.codigo_postal || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <label>Banco:</label>
                    <span>${empleado.banco || 'No especificado'}</span>
                </div>
                <div class="detail-item">
                    <label>Número de Cuenta:</label>
                    <span>${empleado.numero_cuenta || 'No proporcionado'}</span>
                </div>
                <div class="detail-item">
                    <label>CLABE:</label>
                    <span>${empleado.clabe_interbancaria || 'No proporcionada'}</span>
                </div>
                <div class="detail-item">
                    <label>Contacto de Emergencia:</label>
                    <span>${empleado.contacto_emergencia || 'No especificado'}</span>
                </div>
                 <div class="detail-item">
                    <label>Teléfono de Emergencia:</label>
                    <span>${empleado.telefono_emergencia || 'No proporcionado'}</span>
                </div>
                <div class="detail-item">
                    <label>Parentesco:</label>
                    <span>${this.formatParentesco(empleado.parentesco_emergencia) || 'No especificado'}</span>
                </div>
                ${empleado.observaciones_personales ? `
                <div class="detail-item full-width">
                    <label>Observaciones:</label>
                    <span>${empleado.observaciones_personales}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    async imprimirEmpleado(empleadoId) {
        console.log('Imprimir empleado:', empleadoId);
        this.showNotification('Función de impresión en desarrollo', 'info');
    }

    cerrarModalEmpleado() {
        console.log('=== CERRAR MODAL EMPLEADO ===');
        const modal = document.getElementById('modal-empleado');
        if (modal) {
            modal.style.display = 'none';
        }
        this.empleadoActual = null;
        this.clearAllValidations();
        console.log('✅ Modal cerrado y empleadoActual limpiado');
    }

    // ===== VALIDACIONES =====
    validateCompleteForm() {
        const requiredFields = [
            'numero_empleado',
            'nombre', 
            'apellidos',
            'puesto',
            'salario_semanal',
            'fecha_ingreso'
        ];

        let isValid = true;

        requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field && !field.value.trim()) {
                this.markFieldInvalid(field, 'Campo requerido');
                isValid = false;
            }
        });

        const rfcField = document.getElementById('rfc');
        if (rfcField && rfcField.value && !this.isValidRFC(rfcField.value)) {
            this.markFieldInvalid(rfcField, 'RFC inválido');
            isValid = false;
        }

        const curpField = document.getElementById('curp');
        if (curpField && curpField.value && !this.isValidCURP(curpField.value)) {
            this.markFieldInvalid(curpField, 'CURP inválida');
            isValid = false;
        }

        const clabeField = document.getElementById('clabe_interbancaria');
        if (clabeField && clabeField.value && !this.isValidCLABE(clabeField.value)) {
            this.markFieldInvalid(clabeField, 'CLABE inválida');
            isValid = false;
        }

        return isValid;
    }

    validateRFC(input) {
        const rfc = input.value.toUpperCase();
        const rfcPattern = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
        
        if (rfc.length === 0) {
            this.clearFieldValidation(input);
            return;
        }
        
        if (rfcPattern.test(rfc)) {
            this.markFieldValid(input);
        } else {
            this.markFieldInvalid(input, 'RFC inválido. Formato: AAAA000000AAA');
        }
        
        input.value = rfc;
    }

    validateCURP(input) {
        const curp = input.value.toUpperCase();
        const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/;
        
        if (curp.length === 0) {
            this.clearFieldValidation(input);
            return;
        }
        
        if (curpPattern.test(curp)) {
            this.markFieldValid(input);
        } else {
            this.markFieldInvalid(input, 'CURP inválida. Formato: AAAA000000HAAAAA00');
        }
        
        input.value = curp;
    }

    validateCLABE(input) {
        const clabe = input.value.replace(/\D/g, '');
        
        if (clabe.length === 0) {
            this.clearFieldValidation(input);
            return;
        }
        
        if (clabe.length === 18) {
            this.markFieldValid(input);
        } else {
            this.markFieldInvalid(input, 'CLABE debe tener exactamente 18 dígitos');
        }
        
        input.value = clabe;
    }

    validateNSS(input) {
        const nss = input.value.replace(/\D/g, '');
        
        if (nss.length === 0) {
            this.clearFieldValidation(input);
            return;
        }
        
        if (nss.length === 11) {
            this.markFieldValid(input);
        } else {
            this.markFieldInvalid(input, 'NSS debe tener exactamente 11 dígitos');
        }
        
        input.value = nss;
    }

    validateCP(input) {
        const cp = input.value.replace(/\D/g, '');
        
        if (cp.length === 0) {
            this.clearFieldValidation(input);
            return;
        }
        
        if (cp.length === 5) {
            this.markFieldValid(input);
        } else {
            this.markFieldInvalid(input, 'Código postal debe tener 5 dígitos');
        }
        
        input.value = cp;
    }

    calculateAntiguedad(fechaIngreso) {
        if (!fechaIngreso) return;
        
        const ingreso = new Date(fechaIngreso);
        const hoy = new Date();
        const diffTime = Math.abs(hoy - ingreso);
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
        
        const antiguedadInput = document.getElementById('antiguedad_anos');
        if (antiguedadInput) {
            antiguedadInput.value = diffYears.toFixed(2);
        }
    }

    markFieldValid(input) {
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('error');
            formGroup.classList.add('success');
        }
        this.clearFieldError(input);
    }

    markFieldInvalid(input, message) {
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('success');
            formGroup.classList.add('error');
        }
        this.showFieldError(input, message);
    }

    clearFieldValidation(input) {
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('error', 'success');
        }
        this.clearFieldError(input);
    }

    clearAllValidations() {
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error', 'success');
        });
        document.querySelectorAll('.field-error').forEach(error => {
            error.remove();
        });
    }

    showFieldError(input, message) {
        this.clearFieldError(input);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = 'var(--danger-color)';
        errorDiv.style.fontSize = '0.85rem';
        errorDiv.style.marginTop = '5px';
        input.parentNode.appendChild(errorDiv);
    }

    clearFieldError(input) {
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    // ===== VALIDADORES =====
    isValidRFC(rfc) {
        const rfcPattern = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
        return rfcPattern.test(rfc.toUpperCase());
    }

    isValidCURP(curp) {
        const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/;
        return curpPattern.test(curp.toUpperCase());
    }

    isValidCLABE(clabe) {
        return clabe.length === 18 && /^\d{18}$/.test(clabe);
    }

    // ===== FORMATTERS =====
    formatMoney(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount || 0);
    }

    formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('es-ES');
    }

    formatSexo(sexo) {
        const sexos = {
            'masculino': 'Masculino',
            'femenino': 'Femenino'
        };
        return sexos[sexo] || sexo;
    }

    formatEstadoCivil(estado) {
        const estados = {
            'soltero': 'Soltero(a)',
            'casado': 'Casado(a)',
            'divorciado': 'Divorciado(a)',
            'viudo': 'Viudo(a)',
            'union_libre': 'Unión Libre'
        };
        return estados[estado] || estado;
    }

    formatTipoContrato(tipo) {
        const tipos = {
            'indefinido': 'Indefinido',
            'temporal': 'Temporal',
            'por_obra': 'Por Obra Determinada',
            'capacitacion': 'Capacitación Inicial',
            'eventual': 'Eventual'
        };
        return tipos[tipo] || tipo;
    }

    formatParentesco(parentesco) {
        const parentescos = {
            'esposo': 'Esposo',
            'esposa': 'Esposa',
            'padre': 'Padre',
            'madre': 'Madre',
            'hermano': 'Hermano',
            'hermana': 'Hermana',
            'hijo': 'Hijo',
            'hija': 'Hija',
            'abuelo': 'Abuelo',
            'abuela': 'Abuela',
            'tio': 'Tío',
            'tia': 'Tía',
            'primo': 'Primo',
            'prima': 'Prima',
            'amigo': 'Amigo',
            'otro': 'Otro'
        };
        return parentescos[parentesco] || parentesco;
    }

    calculateAge(birthdate) {
        if (!birthdate) return 0;
        const today = new Date();
        const birthday = new Date(birthdate);
        let age = today.getFullYear() - birthday.getFullYear();
        const monthDiff = today.getMonth() - birthday.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
            age--;
        }
        return age;
    }

    // ===== UTILIDADES =====
    showError(message) {
        console.error('Showing error:', message);
        const tbody = document.querySelector('#tabla-empleados tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${message}</td></tr>`;
        }
    }

    showNotification(message, type = 'info') {
        console.log('📢 showNotification called:', type, message);
        
        if (window.notificationSystem) {
            window.notificationSystem.show(message, type);
        } else if (window.sistemaAsistencia) {
            window.sistemaAsistencia.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
            
            let emoji = '';
            switch(type) {
                case 'success': emoji = '✅'; break;
                case 'error': emoji = '❌'; break;
                case 'warning': emoji = '⚠️'; break;
                default: emoji = 'ℹ️'; break;
            }
            
            alert(`${emoji} ${message}`);
        }
    }
}

// ===== FUNCIONES GLOBALES =====
function mostrarModalEmpleado(empleadoId = null) {
    if (window.empleadosModule) {
        window.empleadosModule.mostrarModalEmpleado(empleadoId);
    } else {
        console.error('empleadosModule not found');
        alert('Módulo de empleados no encontrado');
    }
}

function cerrarModalEmpleado() {
    if (window.empleadosModule) {
        window.empleadosModule.cerrarModalEmpleado();
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating EmpleadosModule...');
    window.empleadosModule = new EmpleadosModule();
    
    setTimeout(() => {
        console.log('Auto-testing empleados load...');
        if (window.empleadosModule) {
            window.empleadosModule.loadEmpleados();
        }
    }, 2000);
});

console.log('empleados.js loaded completely');