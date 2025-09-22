// Script temporal para debug - agregar al final del index.html

console.log('=== DEBUG MODULE LOADER ===');

// Verificar cuando se cargan los módulos
const moduleChecker = setInterval(() => {
    console.log('Checking modules...', {
        sistemaAsistencia: !!window.sistemaAsistencia,
        empleadosModule: !!window.empleadosModule,
        horariosModule: !!window.horariosModule,
        asistenciaModule: !!window.asistenciaModule
    });
    
    // Si todos los módulos están cargados, parar el checker
    if (window.sistemaAsistencia && window.empleadosModule) {
        console.log('All main modules loaded!');
        clearInterval(moduleChecker);
        
        // Test de carga de empleados
        setTimeout(() => {
            console.log('Testing empleados load...');
            if (window.empleadosModule) {
                window.empleadosModule.loadEmpleados();
            }
        }, 500);
    }
}, 1000);

// Parar el checker después de 30 segundos
setTimeout(() => {
    clearInterval(moduleChecker);
    console.log('Module checker stopped');
}, 30000);

// Test de API directo
async function testAPIs() {
    console.log('=== TESTING APIs DIRECTLY ===');
    
    try {
        console.log('Testing empleados API...');
        const empResponse = await fetch('/asistencias/php/api/empleados.php');
        console.log('Empleados response:', empResponse.status, empResponse.ok);
        
        if (empResponse.ok) {
            const empText = await empResponse.text();
            console.log('Empleados raw:', empText.substring(0, 200) + '...');
            
            try {
                const empData = JSON.parse(empText);
                console.log('Empleados parsed:', empData);
            } catch (e) {
                console.error('Empleados JSON error:', e);
            }
        }
    } catch (error) {
        console.error('Empleados fetch error:', error);
    }
    
    try {
        console.log('Testing horarios API...');
        const horResponse = await fetch('/asistencias/php/api/horarios.php');
        console.log('Horarios response:', horResponse.status, horResponse.ok);
        
        if (horResponse.ok) {
            const horText = await horResponse.text();
            console.log('Horarios raw:', horText.substring(0, 200) + '...');
        }
    } catch (error) {
        console.error('Horarios fetch error:', error);
    }
}

// Ejecutar test de APIs después de 3 segundos
setTimeout(testAPIs, 3000);