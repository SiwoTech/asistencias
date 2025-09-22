// Debug para errores de guardado de empleados
console.log('Debug empleado save loaded');

// Interceptar el método original de guardar
if (window.empleadosModule) {
    const originalGuardarEmpleado = window.empleadosModule.guardarEmpleado.bind(window.empleadosModule);
    
    window.empleadosModule.guardarEmpleado = async function() {
        console.log('=== DEBUG GUARDAR EMPLEADO ===');
        
        try {
            // Capturar datos del formulario antes de enviar
            const form = document.getElementById('form-empleado');
            if (form) {
                const formData = new FormData(form);
                const data = {};
                
                console.log('Form found, collecting data...');
                
                for (let [key, value] of formData.entries()) {
                    data[key] = value || null;
                    console.log(`Field ${key}:`, value);
                }
                
                console.log('Complete form data:', data);
                console.log('Employee ID (edit mode):', this.empleadoActual);
                
                // Validar campos requeridos
                const requiredFields = ['numero_empleado', 'nombre', 'apellidos', 'puesto', 'salario_semanal', 'fecha_ingreso'];
                const missingFields = [];
                
                requiredFields.forEach(field => {
                    if (!data[field] || data[field].trim() === '') {
                        missingFields.push(field);
                    }
                });
                
                if (missingFields.length > 0) {
                    console.error('Missing required fields:', missingFields);
                    alert('Campos requeridos faltantes: ' + missingFields.join(', '));
                    return;
                }
                
                console.log('All required fields present, proceeding with save...');
            } else {
                console.error('Form not found!');
                alert('Error: Formulario no encontrado');
                return;
            }
            
            // Llamar al método original
            await originalGuardarEmpleado();
            
        } catch (error) {
            console.error('=== ERROR EN GUARDAR EMPLEADO ===');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            // Mostrar error específico al usuario
            let userMessage = 'Error al guardar empleado: ';
            
            if (error.message.includes('fetch')) {
                userMessage += 'Error de conexión con el servidor';
            } else if (error.message.includes('JSON')) {
                userMessage += 'Error en el formato de respuesta del servidor';
            } else if (error.message.includes('validation')) {
                userMessage += 'Error de validación en los datos';
            } else {
                userMessage += error.message;
            }
            
            alert(userMessage);
            
            // Log adicional
            console.log('Current URL:', window.location.href);
            console.log('Base URL:', this.baseURL);
            console.log('Form element:', document.getElementById('form-empleado'));
        }
    };
} else {
    console.error('empleadosModule not found for debugging');
}

// Debug del envío del formulario
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const form = document.getElementById('form-empleado');
        if (form) {
            console.log('Form found for event listener');
            
            form.addEventListener('submit', (e) => {
                console.log('=== FORM SUBMIT EVENT ===');
                console.log('Event prevented:', e.defaultPrevented);
                console.log('Form valid:', form.checkValidity());
                
                // Log todos los campos
                const formData = new FormData(form);
                console.log('Form data on submit:');
                for (let [key, value] of formData.entries()) {
                    console.log(`  ${key}: ${value}`);
                }
            });
        } else {
            console.log('Form not found for event listener');
        }
    }, 3000);
});

// Debug de la respuesta del servidor
const originalFetch = window.fetch;
window.fetch = async function(url, options) {
    if (url.includes('empleados.php')) {
        console.log('=== FETCH TO EMPLEADOS API ===');
        console.log('URL:', url);
        console.log('Method:', options?.method || 'GET');
        console.log('Headers:', options?.headers);
        console.log('Body:', options?.body);
        
        try {
            const response = await originalFetch(url, options);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            // Clonar response para poder leer el body
            const clonedResponse = response.clone();
            const responseText = await clonedResponse.text();
            console.log('Response body:', responseText);
            
            return response;
        } catch (fetchError) {
            console.error('=== FETCH ERROR ===');
            console.error('Fetch error:', fetchError);
            throw fetchError;
        }
    }
    
    return originalFetch(url, options);
};