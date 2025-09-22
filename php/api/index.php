<?php


// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Respuesta de bienvenida a la API
$response = [
    'success' => true,
    'message' => 'API del Sistema de Asistencia y Nómina',
    'version' => '1.0.0',
    'endpoints' => [
        'GET /dashboard.php' => 'Datos del dashboard',
        'GET /empleados.php' => 'Lista de empleados',
        'POST /empleados.php' => 'Crear empleado',
        'PUT /empleados.php' => 'Actualizar empleado',
        'DELETE /empleados.php' => 'Eliminar empleado',
        'GET /asistencia.php' => 'Registros de asistencia',
        'POST /asistencia.php' => 'Registrar asistencia',
        'GET /nomina.php' => 'Datos de nómina',
        'POST /nomina.php' => 'Generar nómina',
        'GET /reportes.php' => 'Generar reportes'
    ],
    'timestamp' => date('Y-m-d H:i:s')
];

echo json_encode($response, JSON_PRETTY_PRINT);
?>