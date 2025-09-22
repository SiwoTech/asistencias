function pedirUbicacionYRegistrar() {
    // Recupera el ID del empleado desde localStorage
    window.empleadoId = localStorage.getItem('empleadoId');

    // Validación extra: si no hay ID, muestra advertencia
    if (!window.empleadoId) {
        alert('No se encontró el ID del empleado. Debes iniciar sesión.');
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                console.log('Tu ubicación actual:', position.coords.latitude, position.coords.longitude);
                fetch('https://siwo-net.com/asistencias/php/api/asistencia.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        empleado_id: window.empleadoId, // Ahora sí, seguro tiene valor
                        tipo: 'entrada',
                        latitud: position.coords.latitude,
                        longitud: position.coords.longitude
                    })
                })
                .then(resp => resp.text())
                .then(text => {
                    try {
                        const data = JSON.parse(text);

                        // SI ESTÁ FUERA DEL RANGO GPS, MUESTRA EL MODAL DE JUSTIFICACIÓN
                        if (
                            data &&
                            typeof data.message === "string" &&
                            (
                                data.message.toLowerCase().includes('fuera de rango') ||
                                data.message.toLowerCase().includes('fuera del rango gps')
                            )
                        ) {
                            mostrarModalAutorizacionGPS();
                        } else {
                            alert(data.message);
                        }
                    } catch (e) {
                        console.log('Respuesta no JSON:', text);
                        alert('Error al registrar entrada: respuesta inesperada del servidor.');
                    }
                })
                .catch(err => {
                    alert('Error al registrar entrada: ' + err.message);
                });
            },
            function(error) {
                let mensaje = 'No se pudo obtener la ubicación.';
                switch (error.code) {
                    case 1: mensaje += ' Permiso denegado.'; break;
                    case 2: mensaje += ' Posición no disponible.'; break;
                    case 3: mensaje += ' Tiempo de espera agotado.'; break;
                    default: mensaje += ' Error desconocido.'; break;
                }
                mensaje += ' ' + error.message;
                alert(mensaje);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0
            }
        );
    } else {
        alert("Tu navegador no soporta geolocalización.");
    }
}

// --- FUNCIONES PARA EL MODAL DE AUTORIZACIÓN GPS ---
function mostrarModalAutorizacionGPS() {
    document.getElementById('modal-autorizacion-gps').classList.remove('hidden');
}
function cerrarModalAutorizacionGPS() {
    document.getElementById('modal-autorizacion-gps').classList.add('hidden');
    document.getElementById('justificacion-gps').value = '';
}

function enviarAutorizacionGPS() {
    const justificacion = document.getElementById('justificacion-gps').value.trim();
    if (!justificacion) {
        alert("Escribe una justificación para solicitar la autorización.");
        return;
    }
    fetch('php/api/solicitar_autorizacion.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            empleado_id: window.empleadoId,
            tipo: 'fuera_rango_gps',
            justificacion: justificacion
        })
    })
    .then(r => r.json())
    .then(resp => {
        alert(resp.message || 'Solicitud enviada correctamente');
        cerrarModalAutorizacionGPS();
    })
    .catch(() => {
        alert("Error al enviar la solicitud.");
    });
}