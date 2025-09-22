// Script de debug específico para Error 400
// Agrega este script temporalmente para identificar el problema

// Interceptar fetch para empleados y hacer debug completo
const originalFetch = window.fetch;
window.fetch = async function(url, options) {
    if (url.includes('empleados.php') && options && options.method === 'PUT') {
        console.log('🔍 INTERCEPTANDO PUT A EMPLEADOS.PHP');
        console.log('📡 URL:', url);
        console.log('📡 Method:', options.method);
        console.log('📡 Headers:', options.headers);
        
        // Parsear el body para ver los datos exactos
        let bodyData = null;
        if (options.body) {
            try {
                bodyData = JSON.parse(options.body);
                console.log('📦 DATOS ENVIADOS AL SERVIDOR:');
                console.table(bodyData);
                
                // Verificar cada campo individualmente
                console.log('🔍 ANÁLISIS DETALLADO DE CAMPOS:');
                Object.entries(bodyData).forEach(([key, value]) => {
                    console.log(`  ${key}:`, {
                        value: value,
                        type: typeof value,
                        length: value ? value.toString().length : 0,
                        isNull: value === null,
                        isUndefined: value === undefined,
                        isEmpty: value === '',
                        isValid: value !== null && value !== undefined && value !== ''
                    });
                });
                
                // Verificar campos problemáticos comunes
                const problematicFields = ['fecha_nacimiento', 'fecha_firma_contrato', 'valor_retencion', 'vacaciones_pendientes'];
                console.log('⚠️ VERIFICANDO CAMPOS PROBLEMÁTICOS:');
                problematicFields.forEach(field => {
                    if (bodyData.hasOwnProperty(field)) {
                        console.log(`  ${field}:`, bodyData[field], 'Type:', typeof bodyData[field]);
                    }
                });
                
            } catch (e) {
                console.error('❌ Error parseando body:', e);
            }
        }
        
        // Realizar la petición original
        try {
            const response = await originalFetch(url, options);
            
            console.log('📡 RESPUESTA DEL SERVIDOR:');
            console.log('Status:', response.status);
            console.log('StatusText:', response.statusText);
            console.log('OK:', response.ok);
            
            // Si es error 400, obtener detalles específicos
            if (response.status === 400) {
                const clonedResponse = response.clone();
                const errorText = await clonedResponse.text();
                console.error('❌ ERROR 400 DETALLES:');
                console.error('Response Text:', errorText);
                
                try {
                    const errorJson = JSON.parse(errorText);
                    console.error('Error JSON:', errorJson);
                    
                    // Si hay errores específicos de validación, mostrarlos
                    if (errorJson.errors) {
                        console.error('🚨 ERRORES DE VALIDACIÓN ESPECÍFICOS:');
                        Object.entries(errorJson.errors).forEach(([field, error]) => {
                            console.error(`  ❌ ${field}: ${error}`);
                        });
                    }
                    
                    if (errorJson.message) {
                        console.error('📝 Mensaje del servidor:', errorJson.message);
                    }
                } catch (parseErr) {
                    console.error('No se pudo parsear error como JSON');
                }
            }
            
            return response;
        } catch (fetchError) {
            console.error('❌ ERROR EN FETCH:', fetchError);
            throw fetchError;
        }
    }
    
    return originalFetch(url, options);
};

// También interceptar el método guardarEmpleado para debug adicional
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.empleadosModule) {
            const originalGuardar = window.empleadosModule.guardarEmpleado;
            
            window.empleadosModule.guardarEmpleado = async function() {
                console.log('🔍 DEBUG GUARDAR EMPLEADO - INICIO');
                
                // Verificar estado del formulario antes de procesar
                const form = document.getElementById('form-empleado');
                if (form) {
                    console.log('📋 ESTADO DEL FORMULARIO:');
                    
                    const formData = new FormData(form);
                    const allFields = {};
                    
                    for (let [key, value] of formData.entries()) {
                        allFields[key] = value;
                    }
                    
                    console.table(allFields);
                    
                    // Verificar campos específicos que pueden causar problemas
                    const fieldsToCheck = [
                        'id', 'empleado_id', 'numero_empleado', 'nombre', 'apellidos',
                        'fecha_nacimiento', 'fecha_ingreso', 'fecha_firma_contrato',
                        'salario_semanal', 'valor_retencion', 'vacaciones_pendientes',
                        'activo'
                    ];
                    
                    console.log('🔍 CAMPOS ESPECÍFICOS:');
                    fieldsToCheck.forEach(field => {
                        const element = document.getElementById(field) || document.querySelector(`[name="${field}"]`);
                        if (element) {
                            console.log(`  ${field}:`, {
                                value: element.value,
                                type: element.type,
                                required: element.required,
                                disabled: element.disabled,
                                readonly: element.readOnly
                            });
                        } else {
                            console.log(`  ${field}: ELEMENTO NO ENCONTRADO`);
                        }
                    });
                }
                
                // Llamar método original
                return await originalGuardar.call(this);
            };
        }
    }, 3000);
});

console.log('🔍 Debug Error 400 cargado');