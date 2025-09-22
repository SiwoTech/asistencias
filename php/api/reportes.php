<?php
require_once '../config/database.php';

// Enable error reporting for debugging
ini_set('log_errors', 1);
ini_set('error_log', '/path/to/php-error.log'); // Replace with the actual path to your error log
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

try {
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Error de conexión a la base de datos');
    }

    $tipo = $_GET['tipo'] ?? null;

    if (!$tipo) {
        throw new Exception('Tipo de reporte es requerido');
    }

    switch ($tipo) {
        case 'asistencia':
            handleReporteAsistencia($db);
            break;

        case 'nomina':
            handleReporteNomina($db);
            break;

        case 'faltas':
            handleReporteFaltas($db);
            break;

        case 'detalle_empleado':
            handleDetalleEmpleado($db);
            break;

        default:
            throw new Exception('Tipo de reporte no válido');
    }
} catch (Exception $e) {
    error_log("Error in reportes.php: " . $e->getMessage());
    $response = [
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    echo json_encode($response);
}

function handleReporteAsistencia($db) {
    $fechaInicio = $_GET['fecha_inicio'] ?? null;
    $fechaFin = $_GET['fecha_fin'] ?? null;
    $empleadoId = $_GET['empleado_id'] ?? null;

    if (!$fechaInicio || !$fechaFin) {
        throw new Exception('Fechas de inicio y fin son requeridas');
    }

    try {
        // Build the query filters
        $whereConditions = ["a.fecha BETWEEN ? AND ?"];
        $params = [$fechaInicio, $fechaFin];

        if ($empleadoId) {
            $whereConditions[] = "e.id = ?";
            $params[] = $empleadoId;
        }

        $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);

        // Fetch attendance data per employee
        $stmt = $db->prepare("
            SELECT 
                e.id AS empleado_id,
                e.nombre,
                e.apellidos,
                e.numero_empleado,
                CONCAT(e.nombre, ' ', e.apellidos) AS empleado_nombre,
                COUNT(CASE WHEN a.tipo_dia = 'normal' AND a.hora_entrada IS NOT NULL THEN 1 END) AS dias_trabajados,
                COUNT(CASE WHEN a.tipo_dia = 'falta' THEN 1 END) AS faltas,
                COUNT(CASE WHEN a.retardo = 1 THEN 1 END) AS retardos,
                COUNT(CASE WHEN a.tipo_dia = 'vacaciones' THEN 1 END) AS dias_vacaciones
            FROM empleados e
            LEFT JOIN asistencia a ON e.id = a.empleado_id AND a.fecha BETWEEN ? AND ?
            WHERE e.activo = 1 " . ($empleadoId ? "AND e.id = ?" : "") . "
            GROUP BY e.id, e.nombre, e.apellidos, e.numero_empleado
            ORDER BY e.nombre, e.apellidos
        ");

        if ($empleadoId) {
            $stmt->execute([$fechaInicio, $fechaFin, $empleadoId]);
        } else {
            $stmt->execute([$fechaInicio, $fechaFin]);
        }

        $empleados = $stmt->fetchAll();

        // Calculate summary
        $totalEmpleados = count($empleados);
        $totalPresencias = array_sum(array_column($empleados, 'dias_trabajados'));
        $totalFaltas = array_sum(array_column($empleados, 'faltas'));
        $totalRetardos = array_sum(array_column($empleados, 'retardos'));
        $diasLaborales = calculateWorkingDays($fechaInicio, $fechaFin);

        $resumen = [
            'total_empleados' => $totalEmpleados,
            'total_presencias' => $totalPresencias,
            'total_faltas' => $totalFaltas,
            'total_retardos' => $totalRetardos,
            'dias_laborales_periodo' => $diasLaborales,
            'porcentaje_asistencia' => $diasLaborales > 0 ? round((($totalPresencias + array_sum(array_column($empleados, 'dias_vacaciones'))) / ($totalEmpleados * $diasLaborales)) * 100, 1) : 0
        ];

        $response = [
            'success' => true,
            'data' => [
                'resumen' => $resumen,
                'detalle' => $empleados,
                'periodo' => [
                    'fecha_inicio' => $fechaInicio,
                    'fecha_fin' => $fechaFin
                ]
            ]
        ];

        echo json_encode($response);
    } catch (Exception $e) {
        error_log("Error in handleReporteAsistencia: " . $e->getMessage());
        throw new Exception("Error al generar el reporte de asistencia");
    }
}


function handleDetalleEmpleado($db) {
    $empleadoId = $_GET['empleado_id'] ?? null;
    $fechaInicio = $_GET['fecha_inicio'] ?? null;
    $fechaFin = $_GET['fecha_fin'] ?? null;

    if (!$empleadoId || !$fechaInicio || !$fechaFin) {
        throw new Exception('ID del empleado y fechas son requeridos');
    }
    
    // Construir filtros
    $whereConditions = ["n.fecha_generacion BETWEEN ? AND ?"];
    $params = [$fechaInicio, $fechaFin];
    
    if ($empleadoId) {
        $whereConditions[] = "e.id = ?";
        $params[] = $empleadoId;
    }
    
    $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
    
    // Obtener datos de nómina
    $stmt = $db->prepare("
        SELECT 
            n.*,
            e.nombre,
            e.apellidos,
            e.numero_empleado,
            CONCAT(e.nombre, ' ', e.apellidos) as empleado_nombre,
            n.salario_base,
            n.comisiones,
            n.descuento_faltas as descuentos,
            n.total_nomina,
            n.pagado
        FROM nomina n
        INNER JOIN empleados e ON n.empleado_id = e.id
        {$whereClause}
        ORDER BY n.periodo DESC, e.nombre, e.apellidos
    ");
    
    $stmt->execute($params);
    $nominas = $stmt->fetchAll();
    
    // Calcular resumen
    $totalEmpleados = count($nominas);
    $totalSalarios = array_sum(array_column($nominas, 'salario_base'));
    $totalComisiones = array_sum(array_column($nominas, 'comisiones'));
    $totalDescuentos = array_sum(array_column($nominas, 'descuentos'));
    $totalNomina = array_sum(array_column($nominas, 'total_nomina'));
    $empleadosPagados = count(array_filter($nominas, function($n) { return $n['pagado']; }));
    $empleadosPendientes = $totalEmpleados - $empleadosPagados;
    
    $resumen = [
        'total_empleados' => $totalEmpleados,
        'total_salarios' => $totalSalarios,
        'total_comisiones' => $totalComisiones,
        'total_descuentos' => $totalDescuentos,
        'total_nomina' => $totalNomina,
        'empleados_pagados' => $empleadosPagados,
        'empleados_pendientes' => $empleadosPendientes
    ];
    
    $response = [
        'success' => true,
        'data' => [
            'resumen' => $resumen,
            'detalle' => $nominas,
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin
            ]
        ]
    ];
    
    echo json_encode($response);
}

function handleReporteFaltas($db) {
    $fechaInicio = $_GET['fecha_inicio'] ?? null;
    $fechaFin = $_GET['fecha_fin'] ?? null;
    $empleadoId = $_GET['empleado_id'] ?? null;
    
    if (!$fechaInicio || !$fechaFin) {
        throw new Exception('Fechas de inicio y fin son requeridas');
    }
    
    // Obtener configuración
    $stmt = $db->prepare("SELECT clave, valor FROM configuracion WHERE clave IN ('retardos_por_falta', 'descuento_por_falta', 'dias_laborales')");
    $stmt->execute();
    $config = [];
    while ($row = $stmt->fetch()) {
        $config[$row['clave']] = $row['valor'];
    }
    
    $retardosPorFalta = (int)($config['retardos_por_falta'] ?? 3);
    $descuentoPorFalta = (float)($config['descuento_por_falta'] ?? 100);
    $diasLaborales = (int)($config['dias_laborales'] ?? 6);
    
    // Construir filtros
    $whereConditions = ["a.fecha BETWEEN ? AND ?"];
    $params = [$fechaInicio, $fechaFin];
    
    if ($empleadoId) {
        $whereConditions[] = "e.id = ?";
        $params[] = $empleadoId;
    }
    
    $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
    
    // Obtener datos de faltas y retardos por empleado
    $stmt = $db->prepare("
        SELECT 
            e.id as empleado_id,
            e.nombre,
            e.apellidos,
            e.numero_empleado,
            e.salario_semanal,
            CONCAT(e.nombre, ' ', e.apellidos) as empleado_nombre,
            COUNT(CASE WHEN a.tipo_dia = 'falta' THEN 1 END) as faltas,
            COUNT(CASE WHEN a.retardo = 1 THEN 1 END) as retardos
        FROM empleados e
        LEFT JOIN asistencia a ON e.id = a.empleado_id AND a.fecha BETWEEN ? AND ?
        WHERE e.activo = 1 " . ($empleadoId ? "AND e.id = ?" : "") . "
        GROUP BY e.id, e.nombre, e.apellidos, e.numero_empleado, e.salario_semanal
        ORDER BY e.nombre, e.apellidos
    ");
    
    if ($empleadoId) {
        $stmt->execute([$fechaInicio, $fechaFin, $empleadoId]);
    } else {
        $stmt->execute([$fechaInicio, $fechaFin]);
    }
    
    $empleados = $stmt->fetchAll();
    
    // Calcular faltas por retardos y descuentos
    foreach ($empleados as &$empleado) {
        $faltasPorRetardos = floor($empleado['retardos'] / $retardosPorFalta);
        $totalFaltas = $empleado['faltas'] + $faltasPorRetardos;
        
        // Calcular descuento (basado en salario diario)
        $salarioDiario = $empleado['salario_semanal'] / $diasLaborales;
        $descuento = $totalFaltas * $salarioDiario * ($descuentoPorFalta / 100);
        
        $empleado['faltas_por_retardos'] = $faltasPorRetardos;
        $empleado['total_faltas'] = $totalFaltas;
        $empleado['descuento'] = $descuento;
    }
    
    // Calcular resumen general
    $totalFaltas = array_sum(array_column($empleados, 'faltas'));
    $totalRetardos = array_sum(array_column($empleados, 'retardos'));
    $empleadosConFaltas = count(array_filter($empleados, function($e) { return $e['total_faltas'] > 0; }));
    $montoDescontado = array_sum(array_column($empleados, 'descuento'));
    
    $resumen = [
        'total_faltas' => $totalFaltas,
        'total_retardos' => $totalRetardos,
        'empleados_con_faltas' => $empleadosConFaltas,
        'monto_descontado' => $montoDescontado,
        'retardos_por_falta' => $retardosPorFalta,
        'porcentaje_descuento' => $descuentoPorFalta
    ];
    
    $response = [
        'success' => true,
        'data' => [
            'resumen' => $resumen,
            'detalle' => $empleados,
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin
            ]
        ]
    ];
    
    echo json_encode($response);
}

function handleDetalleEmpleado($db) {
    $empleadoId = $_GET['empleado_id'] ?? null;
    $fechaInicio = $_GET['fecha_inicio'] ?? null;
    $fechaFin = $_GET['fecha_fin'] ?? null;
    
    if (!$empleadoId || !$fechaInicio || !$fechaFin) {
        throw new Exception('ID del empleado y fechas son requeridos');
    }
    
    // Obtener información del empleado
    $stmt = $db->prepare("
        SELECT e.*, CONCAT(e.nombre, ' ', e.apellidos) as empleado_nombre
        FROM empleados e 
        WHERE e.id = ?
    ");
    $stmt->execute([$empleadoId]);
    $empleado = $stmt->fetch();
    
    if (!$empleado) {
        throw new Exception('Empleado no encontrado');
    }
    
    // Obtener todas las asistencias del período
    $stmt = $db->prepare("
        SELECT a.*, 
               DAYNAME(a.fecha) as dia_semana_en,
               CASE 
                   WHEN a.tipo_dia = 'falta' THEN 'Falta'
                   WHEN a.tipo_dia = 'vacaciones' THEN 'Vacaciones'
                   WHEN a.tipo_dia = 'permiso' THEN 'Permiso'
                   WHEN a.hora_entrada IS NULL THEN 'Sin registro'
                   WHEN a.retardo = 1 THEN 'Retardo'
                   ELSE 'Normal'
               END as estado_descripcion
        FROM asistencia a
        WHERE a.empleado_id = ? 
        AND a.fecha BETWEEN ? AND ?
        ORDER BY a.fecha
    ");
    $stmt->execute([$empleadoId, $fechaInicio, $fechaFin]);
    $asistencias = $stmt->fetchAll();
    
    // Crear registro completo de días (incluyendo días sin registro)
    $fechaActual = new DateTime($fechaInicio);
    $fechaFinal = new DateTime($fechaFin);
    $asistenciasCompletas = [];
    $asistenciasPorFecha = [];
    
    // Indexar asistencias por fecha
    foreach ($asistencias as $asistencia) {
        $asistenciasPorFecha[$asistencia['fecha']] = $asistencia;
    }
    
    while ($fechaActual <= $fechaFinal) {
        $fechaStr = $fechaActual->format('Y-m-d');
        $diaSemana = $fechaActual->format('w'); // 0 = domingo
        
        if ($diaSemana != 0) { // Excluir domingos
            if (isset($asistenciasPorFecha[$fechaStr])) {
                $asistenciasCompletas[] = $asistenciasPorFecha[$fechaStr];
            } else {
                // Crear registro vacío para días sin asistencia
                $asistenciasCompletas[] = [
                    'fecha' => $fechaStr,
                    'hora_entrada' => null,
                    'hora_salida' => null,
                    'tipo_dia' => 'normal',
                    'retardo' => 0,
                    'estado_descripcion' => 'Sin registro',
                    'observaciones' => null
                ];
            }
        }
        
        $fechaActual->add(new DateInterval('P1D'));
    }
    
    // Calcular estadísticas del empleado
    $totalDias = count($asistenciasCompletas);
    $diasTrabajados = count(array_filter($asistenciasCompletas, function($a) {
        return $a['hora_entrada'] !== null || $a['tipo_dia'] === 'vacaciones';
    }));
    $faltas = count(array_filter($asistenciasCompletas, function($a) {
        return $a['tipo_dia'] === 'falta' || ($a['tipo_dia'] === 'normal' && $a['hora_entrada'] === null);
    }));
    $retardos = count(array_filter($asistenciasCompletas, function($a) {
        return $a['retardo'] == 1;
    }));
    $vacaciones = count(array_filter($asistenciasCompletas, function($a) {
        return $a['tipo_dia'] === 'vacaciones';
    }));
    
    $estadisticas = [
        'total_dias' => $totalDias,
        'dias_trabajados' => $diasTrabajados,
        'faltas' => $faltas,
        'retardos' => $retardos,
        'vacaciones' => $vacaciones,
        'porcentaje_asistencia' => $totalDias > 0 ? round(($diasTrabajados / $totalDias) * 100, 1) : 0
    ];
    
    $response = [
        'success' => true,
        'data' => [
            'empleado' => $empleado,
            'asistencias' => $asistenciasCompletas,
            'estadisticas' => $estadisticas,
            'periodo' => [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin
            ]
        ]
    ];
    
    echo json_encode($response);
}
?>