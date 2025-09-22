// Script final para verificar que todo funcione
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== FINAL VERIFICATION ===');
    
    // Verificar CSS cargado
    const cssFiles = [
        'empleados-extended.css',
        'empleados-detalle.css', 
        'horarios.css',
        'birthday-styles.css',
        'auto-checkout.css'
    ];
    
    cssFiles.forEach(cssFile => {
        const found = Array.from(document.styleSheets).some(sheet => 
            sheet.href && sheet.href.includes(cssFile)
        );
        console.log(`CSS ${cssFile}:`, found ? '✅' : '❌');
    });
    
    // Verificar módulos
    setTimeout(() => {
        console.log('Modules check:');
        console.log('- sistemaAsistencia:', !!window.sistemaAsistencia);
        console.log('- empleadosModule:', !!window.empleadosModule);
        console.log('- horariosModule:', !!window.horariosModule);
        console.log('- birthdayManager:', !!window.birthdayManager);
        console.log('- autoCheckoutManager:', !!window.autoCheckoutManager);
        
        // Test de empleados
        if (window.empleadosModule) {
            console.log('Testing empleados module...');
            window.empleadosModule.loadEmpleados();
        }
        
        // Test de horarios
        if (window.horariosModule) {
            console.log('Testing horarios module...');
            window.horariosModule.loadEmpleados();
        }
    }, 2000);
});