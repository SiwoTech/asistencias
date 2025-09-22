<?php
require_once '../config/database.php';



if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    $today = date('Y-m-d');
    $currentMonth = date('n'); // Mes actual sin ceros iniciales
    $currentDay = date('j');   // Día actual sin ceros iniciales
    
    // Total empleados activos
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM empleados WHERE activo = 1");
    $stmt->execute();
    $totalEmpleados = $stmt->fetch()['total'];
    
    // Presentes hoy (con entrada registrada)
    $stmt = $db->prepare("
        SELECT COUNT(DISTINCT a.empleado_id) as total 
        FROM asistencia a 
        WHERE DATE(a.fecha) = ? 
        AND a.hora_entrada IS NOT NULL 
        AND a.tipo_dia = 'normal'
    ");
    $stmt->execute([$today]);
    $presentesHoy = $stmt->fetch()['total'];
    
    // Faltas hoy
    $stmt = $db->prepare("
        SELECT COUNT(*) as total 
        FROM asistencia a 
        WHERE DATE(a.fecha) = ? 
        AND a.tipo_dia = 'falta'
    ");
    $stmt->execute([$today]);
    $faltasHoy = $stmt->fetch()['total'];
    
    // Retardos hoy
    $stmt = $db->prepare("
        SELECT COUNT(*) as total 
        FROM asistencia a 
        WHERE DATE(a.fecha) = ? 
        AND a.retardo = 1
    ");
    $stmt->execute([$today]);
    $retardosHoy = $stmt->fetch()['total'];
    
    // Cumpleaños de hoy
    $stmt = $db->prepare("
        SELECT COUNT(*) as total
        FROM empleados 
        WHERE activo = 1 
        AND MONTH(fecha_nacimiento) = ? 
        AND DAY(fecha_nacimiento) = ?
    ");
    $stmt->execute([$currentMonth, $currentDay]);
    $cumpleanosHoy = $stmt->fetch()['total'];
    
    // Obtener cumpleañeros del mes
    $stmt = $db->prepare("
        SELECT 
            id,
            nombre,
            apellidos,
            CONCAT(nombre, ' ', apellidos) as nombre_completo,
            numero_empleado,
            puesto,
            fecha_nacimiento,
            DAY(fecha_nacimiento) as dia_cumple,
            MONTH(fecha_nacimiento) as mes_cumple,
            YEAR(CURDATE()) - YEAR(fecha_nacimiento) - 
            (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(fecha_nacimiento, '%m%d')) as edad_cumple,
            CASE 
                WHEN MONTH(fecha_nacimiento) = ? AND DAY(fecha_nacimiento) = ? THEN 'hoy'
                WHEN MONTH(fecha_nacimiento) = ? AND DAY(fecha_nacimiento) > ? THEN 'este_mes'
                ELSE 'otro_mes'
            END as when_cumple,
            CASE 
                WHEN MONTH(fecha_nacimiento) = ? AND DAY(fecha_nacimiento) = ? THEN 0
                WHEN MONTH(fecha_nacimiento) = ? AND DAY(fecha_nacimiento) > ? 
                THEN DAY(fecha_nacimiento) - ?
                ELSE 999
            END as dias_para_cumple
        FROM empleados 
        WHERE activo = 1 
        AND fecha_nacimiento IS NOT NULL
        AND MONTH(fecha_nacimiento) = ?
        ORDER BY 
            CASE 
                WHEN MONTH(fecha_nacimiento) = ? AND DAY(fecha_nacimiento) = ? THEN 0
                ELSE DAY(fecha_nacimiento)
            END ASC
    ");
    $stmt->execute([
        $currentMonth, $currentDay, // Para 'hoy'
        $currentMonth, $currentDay, // Para 'este_mes'
        $currentMonth, $currentDay, // Para dias_para_cumple (hoy)
        $currentMonth, $currentDay, $currentDay, // Para dias_para_cumple (resto del mes)
        $currentMonth, // WHERE clause
        $currentMonth, $currentDay // ORDER BY
    ]);
    $cumpleanosDelMes = $stmt->fetchAll();
    
    // Próximos cumpleaños (siguiente mes si ya pasó todo el mes actual)
    $nextMonth = $currentMonth == 12 ? 1 : $currentMonth + 1;
    $stmt = $db->prepare("
        SELECT 
            id,
            nombre,
            apellidos,
            CONCAT(nombre, ' ', apellidos) as nombre_completo,
            numero_empleado,
            puesto,
            fecha_nacimiento,
            DAY(fecha_nacimiento) as dia_cumple,
            MONTH(fecha_nacimiento) as mes_cumple,
            YEAR(CURDATE()) - YEAR(fecha_nacimiento) - 
            (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(fecha_nacimiento, '%m%d')) as edad_cumple
        FROM empleados 
        WHERE activo = 1 
        AND fecha_nacimiento IS NOT NULL
        AND MONTH(fecha_nacimiento) = ?
        ORDER BY DAY(fecha_nacimiento) ASC
        LIMIT 3
    ");
    $stmt->execute([$nextMonth]);
    $proximosCumpleanos = $stmt->fetchAll();
    
    // Actividad reciente (últimos 10 registros)
    $stmt = $db->prepare("
        SELECT 
            a.*, 
            e.nombre, 
            e.apellidos,
            CONCAT(e.nombre, ' ', e.apellidos) as empleado_nombre,
            CASE 
                WHEN a.tipo_dia = 'falta' THEN 'falta'
                WHEN a.tipo_dia = 'vacaciones' THEN 'vacaciones'
                WHEN a.hora_salida IS NOT NULL THEN 'salida'
                WHEN a.hora_entrada IS NOT NULL AND a.retardo = 1 THEN 'retardo'
                WHEN a.hora_entrada IS NOT NULL THEN 'entrada'
                ELSE 'pendiente'
            END as tipo_actividad,
            CASE 
                WHEN a.tipo_dia = 'falta' THEN 'Marcó falta'
                WHEN a.tipo_dia = 'vacaciones' THEN 'Está de vacaciones'
                WHEN a.hora_salida IS NOT NULL THEN CONCAT('Salida: ', TIME(a.hora_salida))
                WHEN a.hora_entrada IS NOT NULL AND a.retardo = 1 THEN CONCAT('Entrada con retardo: ', TIME(a.hora_entrada))
                WHEN a.hora_entrada IS NOT NULL THEN CONCAT('Entrada: ', TIME(a.hora_entrada))
                ELSE 'Sin actividad'
            END as descripcion
        FROM asistencia a
        INNER JOIN empleados e ON a.empleado_id = e.id
        WHERE DATE(a.fecha) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ORDER BY a.updated_at DESC
        LIMIT 10
    ");
    $stmt->execute();
    $recentActivity = $stmt->fetchAll();
    
    // Formatear actividad reciente
    foreach ($recentActivity as &$activity) {
        $activity['type'] = $activity['tipo_actividad'];
        $activity['fecha'] = $activity['updated_at'];
    }
    
    // Formatear cumpleaños
    foreach ($cumpleanosDelMes as &$cumple) {
        $cumple['fecha_formateada'] = formatBirthdayDate($cumple['fecha_nacimiento']);
        $cumple['edad_actual'] = calculateAge($cumple['fecha_nacimiento']);
    }
    
    foreach ($proximosCumpleanos as &$cumple) {
        $cumple['fecha_formateada'] = formatBirthdayDate($cumple['fecha_nacimiento']);
        $cumple['edad_actual'] = calculateAge($cumple['fecha_nacimiento']);
    }
    
    $response = [
        'success' => true,
        'data' => [
            'total_empleados' => (int)$totalEmpleados,
            'presentes_hoy' => (int)$presentesHoy,
            'faltas_hoy' => (int)$faltasHoy,
            'retardos_hoy' => (int)$retardosHoy,
            'cumpleanos_hoy' => (int)$cumpleanosHoy,
            'cumpleanos_del_mes' => $cumpleanosDelMes,
            'proximos_cumpleanos' => $proximosCumpleanos,
            'recent_activity' => $recentActivity,
            'mes_actual' => [
                'numero' => $currentMonth,
                'nombre' => getMonthName($currentMonth),
                'año' => date('Y')
            ]
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

echo json_encode($response);

// Funciones auxiliares
function formatBirthdayDate($date) {
    if (!$date) return '';
    $timestamp = strtotime($date);
    return date('d \d\e F', $timestamp);
}

function calculateAge($birthdate) {
    if (!$birthdate) return 0;
    $today = new DateTime();
    $birthday = new DateTime($birthdate);
    return $today->diff($birthday)->y;
}

function getMonthName($month) {
    $months = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];
    return $months[$month] ?? '';
}
?>