<?php
date_default_timezone_set('America/Cancun');
require_once '../config/database.php';


if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $db->query("SET time_zone = 'America/Cancun'");
    
    if (!$db) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    $action = $_GET['action'] ?? $_POST['action'] ?? 'process';
    
    switch ($action) {
        case 'process':
            processAutoCheckout($db);
            break;
            
        case 'status':
            getAutoCheckoutStatus($db);
            break;
            
        case 'manual':
            processManualCheckout($db);
            break;
            
        default:
            throw new Exception('Acción no válida');
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    echo json_encode($response);
}

function processAutoCheckout($db) {
    // Obtener configuración
    $stmt = $db->prepare("SELECT clave, valor FROM configuracion WHERE clave IN ('salida_automatica_activa', 'salida_automatica_tolerancia', 'salida_automatica_solo_entrada')");
    $stmt->execute();
    $config = [];
    while ($row = $stmt->fetch()) {
        $config[$row['clave']] = $row['valor'];
    }
    
    if (!$config['salida_automatica_activa']) {
        echo json_encode([
            'success' => false,
            'message' => 'Salida automática desactivada'
        ]);
        return;
    }
    
    $toleranciaMinutos = (int)($config['salida_automatica_tolerancia'] ?? 30);
    $soloConEntrada = (bool)($config['salida_automatica_solo_entrada'] ?? true);
    
    $today = date('Y-m-d');
    $currentTime = date('H:i:s');
    $currentDateTime = date('Y-m-d H:i:s');
    
    // Obtener empleados que necesitan salida automática
    $query = "
        SELECT DISTINCT
            e.id as empleado_id,
            e.nombre,
            e.apellidos,
            CONCAT(e.nombre, ' ', e.apellidos) as nombre_completo,
            e.numero_empleado,
            h.hora_salida,
            a.id as asistencia_id,
            a.hora_entrada,
            a.hora_salida as salida_actual
        FROM empleados e
        INNER JOIN horarios h ON e.id = h.empleado_id AND h.activo = 1
        LEFT JOIN asistencia a ON e.id = a.empleado_id AND DATE(a.fecha) = ?
        WHERE e.activo = 1
        AND h.dia_semana = ?
        AND h.hora_salida IS NOT NULL
        AND TIME(?) >= TIME(h.hora_salida)
        AND TIME(?) <= ADDTIME(h.hora_salida, SEC_TO_TIME(? * 60))
    ";
    
    $params = [
        $today,
        getDayNameInSpanish(date('w')),
        $currentTime,
        $currentTime,
        $toleranciaMinutos
    ];
    
    if ($soloConEntrada) {
        $query .= " AND a.hora_entrada IS NOT NULL AND a.hora_salida IS NULL";
    } else {
        $query .= " AND (a.hora_salida IS NULL OR a.hora_salida = '0000-00-00 00:00:00')";
    }
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $empleadosParaSalida = $stmt->fetchAll();
    
    $procesados = 0;
    $errores = [];
    
    $db->beginTransaction();
    
    try {
        foreach ($empleadosParaSalida as $empleado) {
            // Verificar si ya se procesó salida automática hoy
            $stmt = $db->prepare("
                SELECT id FROM salidas_automaticas 
                WHERE empleado_id = ? AND fecha = ? AND motivo = 'salida_automatica'
            ");
            $stmt->execute([$empleado['empleado_id'], $today]);
            
            if ($stmt->fetch()) {
                continue; // Ya se procesó hoy
            }
            
            if ($empleado['asistencia_id']) {
                // Actualizar asistencia existente
                $stmt = $db->prepare("
                    UPDATE asistencia 
                    SET hora_salida = ?, observaciones = CONCAT(COALESCE(observaciones, ''), ' [Salida automática]')
                    WHERE id = ?
                ");
                $stmt->execute([$currentDateTime, $empleado['asistencia_id']]);
            } else {
                // Crear nuevo registro de asistencia (caso sin entrada previa)
                if (!$soloConEntrada) {
                    $stmt = $db->prepare("
                        INSERT INTO asistencia (empleado_id, fecha, hora_salida, tipo_dia, observaciones)
                        VALUES (?, ?, ?, 'normal', 'Salida automática sin entrada registrada')
                    ");
                    $stmt->execute([$empleado['empleado_id'], $today, $currentDateTime]);
                    $empleado['asistencia_id'] = $db->lastInsertId();
                }
            }
            
            // Registrar en log de salidas automáticas
            $stmt = $db->prepare("
                INSERT INTO salidas_automaticas (empleado_id, fecha, hora_salida_programada, hora_salida_registrada, motivo)
                VALUES (?, ?, ?, ?, 'salida_automatica')
            ");
            $stmt->execute([
                $empleado['empleado_id'],
                $today,
                $empleado['hora_salida'],
                $currentDateTime
            ]);
            
            $procesados++;
        }
        
        $db->commit();
        
        $response = [
            'success' => true,
            'message' => "Procesadas {$procesados} salidas automáticas",
            'data' => [
                'procesados' => $procesados,
                'empleados' => array_slice($empleadosParaSalida, 0, $procesados),
                'timestamp' => $currentDateTime
            ]
        ];
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
    echo json_encode($response);
}

function getAutoCheckoutStatus($db) {
    $today = date('Y-m-d');
    
    // Obtener estadísticas del día
    $stmt = $db->prepare("
        SELECT 
            COUNT(*) as total_salidas_auto,
            COUNT(CASE WHEN motivo = 'salida_automatica' THEN 1 END) as automaticas,
            COUNT(CASE WHEN motivo = 'manual_checkout' THEN 1 END) as manuales,
            MIN(hora_salida_registrada) as primera_salida,
            MAX(hora_salida_registrada) as ultima_salida
        FROM salidas_automaticas 
        WHERE fecha = ?
    ");
    $stmt->execute([$today]);
    $stats = $stmt->fetch();
    
    // Empleados pendientes de salida
    $currentTime = date('H:i:s');
    $stmt = $db->prepare("
        SELECT 
            e.id,
            e.nombre,
            e.apellidos,
            CONCAT(e.nombre, ' ', e.apellidos) as nombre_completo,
            h.hora_salida,
            a.hora_entrada,
            CASE 
                WHEN TIME(?) >= h.hora_salida THEN 'vencida'
                WHEN TIME(?) >= SUBTIME(h.hora_salida, '00:15:00') THEN 'proximo'
                ELSE 'pendiente'
            END as estado_salida
        FROM empleados e
        INNER JOIN horarios h ON e.id = h.empleado_id AND h.activo = 1
        INNER JOIN asistencia a ON e.id = a.empleado_id AND DATE(a.fecha) = ?
        WHERE e.activo = 1
        AND h.dia_semana = ?
        AND a.hora_entrada IS NOT NULL
        AND a.hora_salida IS NULL
        ORDER BY h.hora_salida ASC
    ");
    $stmt->execute([
        $currentTime,
        $currentTime,
        $today,
        getDayNameInSpanish(date('w'))
    ]);
    $pendientes = $stmt->fetchAll();
    
    $response = [
        'success' => true,
        'data' => [
            'stats' => $stats,
            'pendientes' => $pendientes,
            'current_time' => date('H:i:s'),
            'current_date' => $today
        ]
    ];
    
    echo json_encode($response);
}

function processManualCheckout($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    $empleadoId = $input['empleado_id'] ?? null;
    
    if (!$empleadoId) {
        throw new Exception('ID del empleado es requerido');
    }
    
    $today = date('Y-m-d');
    $currentDateTime = date('Y-m-d H:i:s');
    
    // Verificar que el empleado tiene entrada sin salida
    $stmt = $db->prepare("
        SELECT id, hora_entrada 
        FROM asistencia 
        WHERE empleado_id = ? AND DATE(fecha) = ? AND hora_entrada IS NOT NULL AND hora_salida IS NULL
    ");
    $stmt->execute([$empleadoId, $today]);
    $asistencia = $stmt->fetch();
    
    if (!$asistencia) {
        throw new Exception('No hay entrada registrada o ya se registró la salida');
    }
    
    $db->beginTransaction();
    
    try {
        // Actualizar asistencia
        $stmt = $db->prepare("
            UPDATE asistencia 
            SET hora_salida = ?, observaciones = CONCAT(COALESCE(observaciones, ''), ' [Salida manual automática]')
            WHERE id = ?
        ");
        $stmt->execute([$currentDateTime, $asistencia['id']]);
        
        // Obtener hora de salida programada
        $stmt = $db->prepare("
            SELECT hora_salida FROM horarios 
            WHERE empleado_id = ? AND dia_semana = ? AND activo = 1
        ");
        $stmt->execute([$empleadoId, getDayNameInSpanish(date('w'))]);
        $horario = $stmt->fetch();
        
        // Registrar en log
        $stmt = $db->prepare("
            INSERT INTO salidas_automaticas (empleado_id, fecha, hora_salida_programada, hora_salida_registrada, motivo, procesado_por)
            VALUES (?, ?, ?, ?, 'manual_checkout', 'manual')
        ");
        $stmt->execute([
            $empleadoId,
            $today,
            $horario['hora_salida'] ?? '18:00:00',
            $currentDateTime
        ]);
        
        $db->commit();
        
        $response = [
            'success' => true,
            'message' => 'Salida registrada manualmente',
            'data' => ['hora_salida' => date('H:i:s')]
        ];
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
    echo json_encode($response);
}

function getDayNameInSpanish($dayNumber) {
    $days = [
        0 => 'domingo',
        1 => 'lunes',
        2 => 'martes',
        3 => 'miercoles',
        4 => 'jueves',
        5 => 'viernes',
        6 => 'sabado'
    ];
    return $days[$dayNumber] ?? 'lunes';
}
?>