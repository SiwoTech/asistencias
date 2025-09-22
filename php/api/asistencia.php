<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
date_default_timezone_set('America/Cancun');

// Log received parameters for debugging
error_log("Parámetros recibidos: " . json_encode($_GET));

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit(0);

// Helper function to send JSON responses
function sendJson($response, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($response);
    exit;
}

// Helper function to calculate distance between two coordinates
function isInsideFence_Distancia($lat, $lng, $officeLat, $officeLng) {
    $earthRadius = 6371000; // Radius of Earth in meters
    $dLat = deg2rad($lat - $officeLat);
    $dLng = deg2rad($lng - $officeLng);
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad($officeLat)) * cos(deg2rad($lat)) *
         sin($dLng / 2) * sin($dLng / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthRadius * $c;
}

// Helper function to determine if a point is within a radius
function isInsideFence($lat, $lng, $officeLat, $officeLng, $radiusMeters = 100) {
    $distance = isInsideFence_Distancia($lat, $lng, $officeLat, $officeLng);
    return $distance <= $radiusMeters;
}

try {
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        sendJson(['success' => false, 'message' => 'Error de conexión a la base de datos'], 500);
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $inputRaw = file_get_contents('php://input');
    $input = json_decode($inputRaw, true);

    if (in_array($method, ['POST', 'PUT', 'DELETE']) && $input === null) {
        sendJson(['success' => false, 'message' => 'No se recibió JSON válido', 'input_raw' => $inputRaw], 400);
    }

    switch ($method) {
        case 'GET':
            handleGetAsistencia($db);
            break;
        case 'POST':
            handleCreateAsistencia($db, $input);
            break;
        case 'PUT':
            handleUpdateAsistencia($db, $input);
            break;
        case 'DELETE':
            handleDeleteAsistencia($db, $input);
            break;
        default:
            sendJson(['success' => false, 'message' => 'Método no permitido'], 405);
    }
} catch (Exception $e) {
    sendJson(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
}

// Handler for GET requests
function handleGetAsistencia($db) {
    $fecha = $_GET['fecha'] ?? date('Y-m-d');
    $empleadoId = $_GET['empleado_id'] ?? null;
    $fechaInicio = $_GET['fecha_inicio'] ?? null;
    $fechaFin = $_GET['fecha_fin'] ?? null;

    $whereConditions = [];
    $params = [];

    if ($empleadoId) {
        $whereConditions[] = "a.empleado_id = ?";
        $params[] = $empleadoId;
    }

    if ($fechaInicio && $fechaFin) {
        $whereConditions[] = "a.fecha BETWEEN ? AND ?";
        $params[] = $fechaInicio;
        $params[] = $fechaFin;
    } elseif ($fecha) {
        $whereConditions[] = "DATE(a.fecha) = ?";
        $params[] = $fecha;
    }

    $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

    $stmt = $db->prepare("
        SELECT 
            a.*,
            e.nombre,
            e.apellidos,
            e.numero_empleado,
            CONCAT(e.nombre, ' ', e.apellidos) as empleado_nombre
        FROM asistencia a
        INNER JOIN empleados e ON a.empleado_id = e.id
        {$whereClause}
        ORDER BY a.fecha DESC, a.hora_entrada ASC
    ");

    $stmt->execute($params);
    $asistencias = $stmt->fetchAll();

    sendJson([
        'success' => true,
        'data' => $asistencias,
        'total' => count($asistencias)
    ]);
}

// Additional handlers for POST, PUT, DELETE (unchanged)
function handleCreateAsistencia($db, $input) {
    if (empty($input['empleado_id'])) {
        sendJson(['success' => false, 'message' => 'ID del empleado es requerido'], 400);
    }

    $empleadoId = $input['empleado_id'];
    $fecha = $input['fecha'] ?? date('Y-m-d');
    $tipo = $input['tipo'] ?? null; // 'entrada', 'salida'
    $lat = $input['latitud'] ?? null;
    $lng = $input['longitud'] ?? null;

    // Busca zona
    $zona = getZonaChequeo($db, $empleadoId);
    if (!$zona) sendJson(['success' => false, 'message' => 'No tienes zona de chequeo configurada.'], 403);

    // --- DEPURACIÓN ---
    file_put_contents('debug.log',
        "Lat: $lat, Lng: $lng, ZonaLat: {$zona['latitud']}, ZonaLng: {$zona['longitud']}, Radio: {$zona['radio']}\n",
        FILE_APPEND
    );

    if ($lat && $lng) {
        $distance = isInsideFence_Distancia($lat, $lng, $zona['latitud'], $zona['longitud']);
        file_put_contents('debug.log', "Distancia calculada: $distance\n", FILE_APPEND);

        if (!isInsideFence($lat, $lng, $zona['latitud'], $zona['longitud'], $zona['radio'])) {
            sendJson([
                'success' => false,
                'message' => "Fuera de la zona autorizada. Distancia: $distance metros",
                'distance' => $distance,
                'zona' => $zona
            ], 403);
        }
    } else {
        sendJson(['success' => false, 'message' => 'No se obtuvo ubicación GPS.'], 400);
    }

    // Verificar que el empleado existe
    $stmt = $db->prepare("SELECT id, nombre, apellidos FROM empleados WHERE id = ? AND activo = 1");
    $stmt->execute([$empleadoId]);
    $empleado = $stmt->fetch();
    if (!$empleado) sendJson(['success' => false, 'message' => 'Empleado no encontrado o inactivo'], 404);

    // Obtener configuración
    $stmt = $db->prepare("SELECT clave, valor FROM configuracion WHERE clave IN ('tolerancia_retardo', 'hora_entrada_standar')");
    $stmt->execute();
    $config = [];
    while ($row = $stmt->fetch()) $config[$row['clave']] = $row['valor'];

    $toleranciaRetardo = (int)($config['tolerancia_retardo'] ?? 15);
    $horaEntradaStandar = $config['hora_entrada_standar'] ?? '09:00:00';

    $ahora = new DateTime();
    $horaActual = $ahora->format('H:i:s');

    // Verificar si ya existe registro para hoy
    $stmt = $db->prepare("SELECT * FROM asistencia WHERE empleado_id = ? AND DATE(fecha) = ?");
    $stmt->execute([$empleadoId, $fecha]);
    $asistenciaExistente = $stmt->fetch();

    if ($tipo === 'entrada') {
        if ($asistenciaExistente && $asistenciaExistente['hora_entrada']) {
            sendJson(['success' => false, 'message' => 'Ya se registró la entrada para hoy'], 409);
        }

        $horaEntradaObj = DateTime::createFromFormat('H:i:s', $horaEntradaStandar);
        if (!$horaEntradaObj) $horaEntradaObj = new DateTime('09:00:00');
        $horaEntradaObj->add(new DateInterval('PT' . $toleranciaRetardo . 'M'));
        $horaLimite = $horaEntradaObj->format('H:i:s');
        $esRetardo = $horaActual > $horaLimite;

        // Si es retardo, y NO autorizado, se envía solicitud de autorización
        if ($esRetardo) {
            // Enviar correo (ajusta el correo del admin)
            mail(
                'admin@tuempresa.com', // Cambia aquí el correo del admin
                'Solicitud de autorización de chequeo fuera de tolerancia',
                "El empleado {$empleado['nombre']} {$empleado['apellidos']} checó fuera de tolerancia el {$fecha} a las {$horaActual}."
            );
            // Registrar la asistencia como pendiente de autorización
            $stmt = $db->prepare("
                INSERT INTO asistencia (empleado_id, fecha, hora_entrada, retardo, tipo_dia, autorizado, justificacion)
                VALUES (?, ?, ?, ?, 'normal', 0, NULL)
            ");
            $stmt->execute([
                $empleadoId,
                $fecha,
                $ahora->format('Y-m-d H:i:s'),
                1 // retardo
            ]);
            sendJson([
                'success' => false,
                'message' => 'Checaste fuera de tolerancia. Se ha enviado una solicitud de autorización al administrador.'
            ], 403);
        }

        // Registrar entrada normal
        $stmt = $db->prepare("
            INSERT INTO asistencia (empleado_id, fecha, hora_entrada, retardo, tipo_dia, autorizado, justificacion)
            VALUES (?, ?, ?, ?, 'normal', 1, NULL)
        ");
        $stmt->execute([
            $empleadoId,
            $fecha,
            $ahora->format('Y-m-d H:i:s'),
            0 // retardo
        ]);
        sendJson([
            'success' => true,
            'message' => 'Entrada registrada correctamente',
            'data' => [
                'hora' => $ahora->format('H:i:s'),
                'empleado' => $empleado['nombre'] . ' ' . $empleado['apellidos']
            ]
        ]);
    }

    if ($tipo === 'salida') {
        if (!$asistenciaExistente || !$asistenciaExistente['hora_entrada']) {
            sendJson(['success' => false, 'message' => 'Debe registrar la entrada primero'], 409);
        }
        if ($asistenciaExistente['hora_salida']) {
            sendJson(['success' => false, 'message' => 'Ya se registró la salida para hoy'], 409);
        }

        $stmt = $db->prepare("
            UPDATE asistencia 
            SET hora_salida = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $ahora->format('Y-m-d H:i:s'),
            $asistenciaExistente['id']
        ]);
        sendJson([
            'success' => true,
            'message' => 'Salida registrada correctamente'
        ]);
    }
}

function handleUpdateAsistencia($db, $input) {
    if (empty($input['id'])) {
        sendJson(['success' => false, 'message' => 'ID del registro es requerido'], 400);
    }

    $stmt = $db->prepare("SELECT * FROM asistencia WHERE id = ?");
    $stmt->execute([$input['id']]);
    $asistencia = $stmt->fetch();
    if (!$asistencia) {
        sendJson(['success' => false, 'message' => 'Registro de asistencia no encontrado'], 404);
    }

    $updateFields = [];
    $updateValues = [];

    // El admin puede autorizar y poner justificación
    $allowedFields = ['autorizado', 'justificacion', 'hora_entrada', 'hora_salida', 'tipo_dia', 'retardo', 'observaciones'];
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updateFields[] = "{$field} = ?";
            $updateValues[] = $input[$field];
        }
    }

    if (empty($updateFields)) {
        sendJson(['success' => false, 'message' => 'No hay campos para actualizar'], 400);
    }

    $updateValues[] = $input['id'];

    $stmt = $db->prepare("
        UPDATE asistencia 
        SET " . implode(', ', $updateFields) . " 
        WHERE id = ?
    ");

    $stmt->execute($updateValues);

    sendJson(['success' => true, 'message' => 'Registro actualizado correctamente']);
}

function handleDeleteAsistencia($db, $input) {
    if (empty($input['id'])) {
        sendJson(['success' => false, 'message' => 'ID del registro es requerido'], 400);
    }

    $stmt = $db->prepare("SELECT id FROM asistencia WHERE id = ?");
    $stmt->execute([$input['id']]);
    if (!$stmt->fetch()) {
        sendJson(['success' => false, 'message' => 'Registro de asistencia no encontrado'], 404);
    }

    $stmt = $db->prepare("DELETE FROM asistencia WHERE id = ?");
    $stmt->execute([$input['id']]);

    sendJson(['success' => true, 'message' => 'Registro eliminado correctamente']);
}
?>