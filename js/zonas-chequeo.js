// Incluye este archivo en tu index.html: <script src="js/zonas-chequeo.js"></script>

function llenarSelectsZona() {
    fetch('php/api/empleados.php')
        .then(r => r.json())
        .then(resp => {
            if (resp.success) {
                let select = document.getElementById('zona-empleado');
                select.innerHTML = '<option value="">Sin asignar</option>';
                resp.data.forEach(e => {
                    select.innerHTML += `<option value="${e.id}">${e.nombre} ${e.apellidos}</option>`;
                });
            } else {
                console.error('Error al cargar empleados:', resp.message);
            }
        })
        .catch(err => {
            console.error('Error al cargar empleados:', err);
        });
}

function formatoCentroTrabajo(valor) {
    // Devuelve el valor formateado, por ejemplo, capitalizado y con icono
    if (!valor) return "";
    return `<span class="centro-trabajo-format"><i class="fas fa-building"></i> ${valor}</span>`;
}

document.addEventListener('DOMContentLoaded', function() {
    const zonaEmpleadoSelect = document.getElementById('zona-empleado');
    const zonaCentro = document.getElementById('zona-centro');
    
    if (zonaEmpleadoSelect && zonaCentro) {
        zonaEmpleadoSelect.addEventListener('change', function() {
            const empleadoId = this.value;
            const zonaCentro = document.getElementById('zona-centro');
            // Indicador de carga visual
            zonaCentro.classList.add('loading');
            zonaCentro.value = "";
            zonaCentro.placeholder = "Cargando centro de trabajo...";
            
            if (empleadoId && empleadoId !== '') {
                fetch('php/api/get_empleado.php?id=' + empleadoId)
                    .then(r => r.json())
                    .then(resp => {
                        zonaCentro.classList.remove('loading');
                        zonaCentro.placeholder = "Se asigna automáticamente según el empleado";
                        if (resp.success && resp.data.centro_trabajo) {
                            zonaCentro.value = resp.data.centro_trabajo;
                            zonaCentro.classList.add('field-filled');
                            setTimeout(() => {
                                zonaCentro.classList.remove('field-filled');
                            }, 600);
                        } else {
                            zonaCentro.value = '';
                            mostrarNotificacion('El empleado no tiene centro de trabajo asignado', 'warning');
                        }
                    })
                    .catch(err => {
                        zonaCentro.classList.remove('loading');
                        zonaCentro.value = '';
                        zonaCentro.placeholder = "Se asigna automáticamente según el empleado";
                        mostrarNotificacion('Error al obtener información del empleado', 'error');
                    });
            } else {
                zonaCentro.classList.remove('loading');
                zonaCentro.value = '';
                zonaCentro.placeholder = "Se asigna automáticamente según el empleado";
            }
        });
    }
});

function mostrarModalZona(zona = null) {
    const modal = document.getElementById('modal-zona-chequeo');
    const form = document.getElementById('form-zona-chequeo');
    const empleadoSelect = document.getElementById('zona-empleado');
    const empleadoNombreInput = document.getElementById('zona-empleado-nombre');
    const zonaCentroInput = document.getElementById('zona-centro');

    modal.style.display = 'block';

    if (zona) {
        // Modo edición
        document.getElementById('modal-zona-title').textContent = "Editar Zona";
        document.getElementById('zona-nombre').value = zona.nombre || '';
        document.getElementById('zona-latitud').value = zona.latitud || '';
        document.getElementById('zona-longitud').value = zona.longitud || '';
        document.getElementById('zona-radio').value = zona.radio || '100';
        document.getElementById('zona-activo').value = zona.activo || '1';
        document.getElementById('zona-id').value = zona.id || "";

        // Empleado solo lectura: muestra nombre, envía id
        empleadoSelect.style.display = 'none';
        empleadoNombreInput.style.display = '';
        empleadoNombreInput.value = zona.empleado_nombre || 'Sin asignar';
        empleadoNombreInput.disabled = true;

        // Guardar el id real en el atributo data-id (no en el value)
        empleadoNombreInput.setAttribute("data-id", zona.empleado_id || '');

        // Centro de trabajo solo lectura
        zonaCentroInput.value = zona.centro_trabajo || '';
        zonaCentroInput.readOnly = true;
		zonaCentroInput.disabled = false; // Esto es clave
		
    } else {
        // Modo crear
        document.getElementById('modal-zona-title').textContent = "Nueva Zona de Chequeo";
        form.reset();
        document.getElementById('zona-id').value = "";
        document.getElementById('zona-radio').value = "100";
        document.getElementById('zona-activo').value = "1";

        empleadoSelect.style.display = '';
        empleadoNombreInput.style.display = 'none';
        empleadoSelect.setAttribute("name", "empleado_id");
        empleadoNombreInput.disabled = false;
        empleadoNombreInput.removeAttribute("data-id");

        zonaCentroInput.value = '';
        zonaCentroInput.disabled = false;

        llenarSelectsZona();
    }
}


function cerrarModalZona() {
    const modal = document.getElementById('modal-zona-chequeo');
    if (modal) {
        modal.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-zona-chequeo');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Guardando...';
            submitBtn.disabled = true;
            const formData = new FormData(e.target);
			console.log(formData.get('centro_trabajo')); // Debe mostrar el valor correcto
            const data = Object.fromEntries(formData.entries());

            // Si está en modo edición, toma el empleado_id del atributo data-id
            const empleadoNombreInput = document.getElementById('zona-empleado-nombre');
            if (empleadoNombreInput && empleadoNombreInput.style.display !== 'none') {
                data.empleado_id = empleadoNombreInput.getAttribute("data-id") || '';
            }

            fetch('php/api/zonas_chequeo.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(resp => {
                if (resp.success) {
                    mostrarNotificacion(resp.message, 'success');
                    cerrarModalZona();
                    cargarZonas();
                } else {
                    mostrarNotificacion(resp.message + (resp.error ? '\n' + JSON.stringify(resp.error) : ''), 'error');
                }
            })
            .catch(err => {
                mostrarNotificacion('Error al guardar zona: ' + err.message, 'error');
            })
            .finally(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
        });
    }
});
function cargarZonas() {
    const tbody = document.querySelector('#tabla-zonas-chequeo tbody');
    if (!tbody) {
        console.error('Tabla de zonas no encontrada');
        return;
    }
    tbody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fas fa-spinner fa-spin"></i> Cargando zonas...</td></tr>';
    fetch('php/api/zonas_chequeo.php')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(resp => {
            if (resp.success) {
                tbody.innerHTML = "";
                if (resp.data && resp.data.length > 0) {
                    resp.data.forEach(z => {
                        tbody.innerHTML += `
                            <tr>
                                <td>${z.nombre || ''}</td>
                                <td>${z.latitud || ''}</td>
                                <td>${z.longitud || ''}</td>
                                <td>${z.radio || ''}</td>
                                <td>${z.empleado_nombre || 'Sin asignar'}</td>
                                <td>${formatoCentroTrabajo(z.centro_trabajo)}</td>
                                <td>${z.activo == '1' ? 'Sí' : 'No'}</td>
                                <td>
                                    <button class="btn btn-sm btn-info" onclick='mostrarModalZona(${JSON.stringify(z).replace(/'/g, "&apos;")})'>
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="eliminarZona(${z.id})">
                                        <i class="fas fa-trash"></i> Eliminar
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay zonas registradas</td></tr>';
                }
            } else {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar datos: ' + (resp.message || 'Error desconocido') + '</td></tr>';
            }
        })
        .catch(err => {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar datos: ' + err.message + '</td></tr>';
        });
}

function eliminarZona(id) {
    if (confirm('¿Está seguro de que desea eliminar esta zona?')) {
        fetch('php/api/zonas_chequeo.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        })
        .then(response => response.json())
        .then(resp => {
            if (resp.success) {
                mostrarNotificacion(resp.message, 'success');
                cargarZonas();
            } else {
                mostrarNotificacion(resp.message, 'error');
            }
        })
        .catch(err => {
            mostrarNotificacion('Error al eliminar zona: ' + err.message, 'error');
        });
    }
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(mensaje, tipo);
    } else {
        alert(mensaje);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const zonasSection = document.getElementById('zonas-chequeo');
    if (zonasSection) {
        llenarSelectsZona();
        cargarZonas();
    }
});

window.mostrarModalZona = mostrarModalZona;
window.cerrarModalZona = cerrarModalZona;
window.eliminarZona = eliminarZona;

// Validación de coordenadas
function validarCoordenadas() {
    const latitud = document.getElementById('zona-latitud').value;
    const longitud = document.getElementById('zona-longitud').value;
    if (latitud && (latitud < -90 || latitud > 90)) {
        mostrarNotificacion('La latitud debe estar entre -90 y 90 grados', 'error');
        return false;
    }
    if (longitud && (longitud < -180 || longitud > 180)) {
        mostrarNotificacion('La longitud debe estar entre -180 y 180 grados', 'error');
        return false;
    }
    return true;
}

// Botón opcional para obtener ubicación
function obtenerUbicacionActual() {
    if (navigator.geolocation) {
        const latitudInput = document.getElementById('zona-latitud');
        const longitudInput = document.getElementById('zona-longitud');
        latitudInput.placeholder = "Obteniendo ubicación...";
        longitudInput.placeholder = "Obteniendo ubicación...";
        navigator.geolocation.getCurrentPosition(
            function(position) {
                latitudInput.value = position.coords.latitude.toFixed(6);
                longitudInput.value = position.coords.longitude.toFixed(6);
                latitudInput.placeholder = "19.432608";
                longitudInput.placeholder = "-99.133209";
                mostrarNotificacion('Ubicación obtenida correctamente', 'success');
            },
            function(error) {
                latitudInput.placeholder = "19.432608";
                longitudInput.placeholder = "-99.133209";
                mostrarNotificacion('No se pudo obtener la ubicación: ' + error.message, 'error');
            }
        );
    } else {
        mostrarNotificacion('La geolocalización no es soportada por este navegador', 'error');
    }
}