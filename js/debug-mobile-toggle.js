// FUNCIÓN DE DEBUG: Para probar la actualización móvil
debugMobileToggle(empleadoId) {
    console.log('🔍 ===== DEBUG MOBILE TOGGLE =====');
    
    const empleado = this.empleados.find(emp => emp.id == empleadoId);
    if (!empleado) {
        console.error('❌ Empleado no encontrado:', empleadoId);
        return;
    }
    
    console.log('📋 Datos del empleado encontrado:');
    console.table({
        id: empleado.id,
        nombre: empleado.nombre,
        apellidos: empleado.apellidos,
        acceso_movil_actual: empleado.acceso_movil,
        puesto: empleado.puesto,
        activo: empleado.activo
    });
    
    console.log('📋 TODOS los campos del empleado:');
    Object.keys(empleado).forEach(key => {
        console.log(`  ${key}: ${empleado[key]} (${typeof empleado[key]})`);
    });
    
    console.log('🔍 ===== FIN DEBUG MOBILE TOGGLE =====');
}