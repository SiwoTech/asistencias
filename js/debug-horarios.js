// Debug específico para modal de horarios
window.debugHorarios = function() {
    console.log('🔍 ===== DEBUG MODAL HORARIOS =====');
    
    // 1. Buscar el modal
    console.log('1. Buscando modal de horarios...');
    const modals = document.querySelectorAll('.modal, [id*="modal"], [id*="Modal"]');
    const horariosModals = [];
    
    modals.forEach((modal, index) => {
        const modalText = modal.textContent.toLowerCase();
        if (modalText.includes('horario') || modalText.includes('asignar') || modal.id.toLowerCase().includes('horario')) {
            horariosModals.push({
                index: index,
                id: modal.id,
                classes: Array.from(modal.classList).join(' '),
                visible: modal.style.display !== 'none',
                text: modal.textContent.substring(0, 100)
            });
        }
    });
    
    console.log('Modales de horario encontrados:', horariosModals);
    
    // 2. Buscar selects de empleados
    console.log('2. Buscando selects de empleados...');
    const selects = document.querySelectorAll('select');
    const empleadoSelects = [];
    
    selects.forEach((select, index) => {
        const id = select.id;
        const name = select.name;
        const text = select.parentElement ? select.parentElement.textContent.toLowerCase() : '';
        
        if (id.includes('empleado') || name.includes('empleado') || text.includes('empleado')) {
            empleadoSelects.push({
                index: index,
                id: id,
                name: name,
                options: select.options.length,
                parentText: text.substring(0, 50),
                value: select.value
            });
        }
    });
    
    console.log('Selects de empleados encontrados:', empleadoSelects);
    
    // 3. Verificar datos de empleados disponibles
    console.log('3. Verificando datos de empleados...');
    console.log('empleadosModule:', !!window.empleadosModule);
    if (window.empleadosModule) {
        console.log('empleadosModule.empleados:', window.empleadosModule.empleados ? window.empleadosModule.empleados.length : 'undefined');
    }
    console.log('empleadosCache:', window.empleadosCache ? window.empleadosCache.length : 'undefined');
    
    // 4. Buscar botones de asignar horario
    console.log('4. Buscando botones de asignar horario...');
    const buttons = document.querySelectorAll('button, .btn, [onclick]');
    const horarioButtons = [];
    
    buttons.forEach((btn, index) => {
        const text = btn.textContent.toLowerCase();
        const onclick = btn.getAttribute('onclick') || '';
        
        if (text.includes('horario') || text.includes('asignar') || onclick.includes('horario')) {
            horarioButtons.push({
                index: index,
                id: btn.id,
                text: btn.textContent.trim(),
                onclick: onclick,
                classes: Array.from(btn.classList).join(' ')
            });
        }
    });
    
    console.log('Botones de horario encontrados:', horarioButtons);
    
    console.log('🔍 ===== FIN DEBUG HORARIOS =====');
};

// Auto-ejecutar debug después de cargar
setTimeout(() => {
    debugHorarios();
}, 3000);