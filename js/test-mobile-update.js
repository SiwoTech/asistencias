// FUNCIÓN TEMPORAL: Test manual de actualización móvil
async testMobileUpdate(empleadoId) {
    console.log(`🧪 Testing mobile update for empleado ${empleadoId}...`);
    
    const empleado = this.empleados.find(emp => emp.id == empleadoId);
    if (!empleado) {
        console.error('❌ Empleado no encontrado');
        return;
    }
    
    // Test 1: Solo campo acceso_movil
    console.log('🧪 Test 1: Solo campo acceso_movil...');
    try {
        const response1 = await fetch(`${this.baseURL}/empleados.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: parseInt(empleadoId),
                acceso_movil: 1
            })
        });
        
        const result1 = await response1.text();
        console.log('📱 Test 1 Response:', response1.status, result1);
    } catch (error) {
        console.error('❌ Test 1 Error:', error);
    }
    
    // Test 2: Campos mínimos requeridos + acceso_movil
    console.log('🧪 Test 2: Campos mínimos + acceso_movil...');
    try {
        const response2 = await fetch(`${this.baseURL}/empleados.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: parseInt(empleadoId),
                numero_empleado: empleado.numero_empleado,
                nombre: empleado.nombre,
                apellidos: empleado.apellidos,
                puesto: empleado.puesto,
                fecha_ingreso: empleado.fecha_ingreso,
                salario_semanal: empleado.salario_semanal,
                activo: empleado.activo,
                acceso_movil: 0
            })
        });
        
        const result2 = await response2.text();
        console.log('📱 Test 2 Response:', response2.status, result2);
    } catch (error) {
        console.error('❌ Test 2 Error:', error);
    }
}