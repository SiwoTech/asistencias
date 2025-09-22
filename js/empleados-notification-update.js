// REEMPLAZAR el método showNotification en la clase EmpleadosModule:

showNotification(message, type) {
    console.log('📢 showNotification called:', type, message);
    
    // Usar el sistema de notificaciones mejorado
    if (window.notificationSystem) {
        window.notificationSystem.show(message, type);
    } else if (window.sistemaAsistencia) {
        window.sistemaAsistencia.showNotification(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Determinar emoji basado en tipo
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