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
    
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($method) {
        case 'GET':
            handleGetNomina($db);
            break;
            
        case 'POST':
            handleGenerateNomina($db, $input);
            break;
            
        case 'PUT':
            handleUpdateNomina($db, $input);
            break;
            
        case 'DELETE':
            handleDeleteNomina($db, $input);
            break;
            
        default:
            throw new Exception('Método no permitido');
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    echo json_encode($response);
}

function handleGetNomina($db) {
    $periodo = $_GET['periodo'] ?? null;
    $id = $_GET['id'] ?? null;
    $detalle = $_GET['detalle'] ?? false;
    
    if ($id && $detalle) {
        // Obtener detalle específico de nómina
        $stmt = $db->prepare("
            SELECT 
                n.*,
                e.nombre,
                e.apellidos,
                e.numero_empleado,
                CONCAT(e.nombre, ' ', e.apellidos) as empleado_nombre
            FROM nomina n
            INNER JOIN empleados e ON n.empleado_id = e.id
            WHERE n.id = ?
        ");
        $stmt->execute([$id]);
        $nomina = $stmt->fetch();
        
        if ($nomina) {
            // Obtener asistencias del período
            $weekDates = getWeekDates(
                (int)substr($nomina['periodo'], 0, 4),
                (int)substr($nomina['periodo'], 5, 2)
            );
            
            $stmt = $db->prepare("
                SELECT * FROM asistencia 
                WHERE empleado_id = ? 
                AND fecha BETWEEN ? AND ?
                ORDER BY fecha
            ");
            $stmt->execute([
                $nomina['empleado_id'],
                $weekDates['start'],
                $weekDates['end']
            ]);
            $nomina['asistencias'] = $stmt->fetchAll();
            
            // Obtener comisiones del período
            $stmt = $db->prepare("
                SELECT * FROM comisiones 
                WHERE empleado_id = ? AND periodo = ?
            ");
            $stmt->execute([$nomina['empleado_id'], $nomina['periodo']]);
            $nomina['comisiones_detalle'] = $stmt->fetchAll();
        }
        
        $response = [
            'success' => $nomina ? true : false,
            'data' => $nomina,
            'message' => $nomina ? 'Detalle obtenido correctamente' : 'Nómina no encontrada'
        ];
        
    } elseif ($periodo) {
        // Obtener nómina por período
        $stmt = $db->prepare("
            SELECT 
                n.*,
                e.nombre,
                e.apellidos,
                e.numero_empleado,
                CONCAT(e.nombre, ' ', e.apellidos) as empleado_nombre
            FROM nomina n
            INNER JOIN empleados e ON n.empleado_id = e.id
            WHERE n.periodo = ?
            ORDER BY e.nombre, e.apellidos
        ");
        $stmt->execute([$periodo]);
        $nominas = $stmt->fetchAll();
        
        // Calcular resumen
        $resumen = [
            'total_empleados' => count($nominas),
            'total_salarios' => array_sum(array_column($nominas, 'salario_base')),
            'total_comisiones' => array_sum(array_column($nominas, 'comisiones')),
            'total_descuentos' => array_sum(array_column($nominas, 'descuento_faltas')),
            'total_nomina' => array_sum(array_column($nominas, 'total_nomina')),
            'empleados_pagados' => count(array_filter($nominas, function($n) { return $n['pagado']; })),
            'empleados_pendientes' => count(array_filter($nominas, function($n) { return !$n['pagado']; }))
        ];
        
        $response = [
            'success' => true,
            'data' => [
                'nomina' => $nominas,
                'resumen' => $resumen,
                'periodo' => $periodo
            ]
        ];
        
    } else {
        // Obtener períodos disponibles
        $stmt = $db->prepare("
            SELECT DISTINCT periodo, 
                   COUNT(*) as empleados,
                   SUM(total_nomina) as total,
                   MIN(fecha_generacion) as fecha_generacion
            FROM nomina 
            GROUP BY periodo 
            ORDER BY periodo DESC
        ");
        $stmt->execute();
        $periodos = $stmt->fetchAll();
        
        $response = [
            'success' => true,
            'data' => $periodos
        ];
    }
    
    echo json_encode($response);
}

function handleGenerateNomina($db, $input) {
    if (empty($input['periodo'])) {
        throw new Exception('El período es requerido');
    }
    
    $periodo = $input['periodo'];
    $accion = $input['accion'] ?? 'generar';
    
    if ($accion !== 'generar') {
        throw new Exception('Acción no válida');
    }
    
    // Verificar si ya existe nómina para este período
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM nomina WHERE periodo = ?");
    $stmt->execute([$periodo]);
    $exists = $stmt->fetch()['total'] > 0;
    
    if ($exists && !isset($input['regenerar'])) {
        throw new Exception('Ya existe nómina para este período. Use regenerar=true para sobrescribir.');
    }
    
    // Obtener configuración
    $stmt = $db->prepare("SELECT clave, valor FROM configuracion");
    $stmt->execute();
    $config = [];
    while ($row = $stmt->fetch()) {
        $config[$row['clave']] = $row['valor'];
    }
    
    $retardosPorFalta = (int)($config['retardos_por_falta'] ?? 3);
    $diasLaborales = (int)($config['dias_laborales'] ?? 6);
    $descuentoPorFalta = (float)($config['descuento_por_falta'] ?? 100);
    
    // Obtener fechas del período
    $year = (int)substr($periodo, 0, 4);
    $week = (int)substr($periodo, 5, 2);
    $weekDates = getWeekDates($year, $week);
    
    // Obtener empleados activos
    $stmt = $db->prepare("SELECT * FROM empleados WHERE activo = 1");
    $stmt->execute();
    $empleados = $stmt->fetchAll();
    
    $db->beginTransaction();
    
    try {
        // Eliminar nómina existente si se va a regenerar
        if ($exists) {
            $stmt = $db->prepare("DELETE FROM nomina WHERE periodo = ?");
            $stmt->execute([$periodo]);
        }
        
        $empleadosProcessed = 0;
        
        foreach ($empleados as $empleado) {
            $empleadoId = $empleado['id'];
            $salarioSemanal = (float)$empleado['salario_semanal'];
            $salarioDiario = $salarioSemanal / $diasLaborales;
            
            // Obtener asistencias del período
            $stmt = $db->prepare("
                SELECT * FROM asistencia 
                WHERE empleado_id = ? 
                AND fecha BETWEEN ? AND ?
                ORDER BY fecha
            ");
            $stmt->execute([$empleadoId, $weekDates['start'], $weekDates['end']]);
            $asistencias = $stmt->fetchAll();
            
            // Calcular días trabajados, faltas y retardos
            $diasTrabajados = 0;
            $faltas = 0;
            $retardos = 0;
            $diasVacaciones = 0;
            
            // Crear un array de todos los días laborales del período
            $diasLaboralesPeriodo = [];
            $currentDate = new DateTime($weekDates['start']);
            $endDate = new DateTime($weekDates['end']);
            
            while ($currentDate <= $endDate) {
                // Excluir domingos (0)
                if ($currentDate->format('w') != 0) {
                    $diasLaboralesPeriodo[] = $currentDate->format('Y-m-d');
                }
                $currentDate->add(new DateInterval('P1D'));
            }
            
            $asistenciasPorFecha = [];
            foreach ($asistencias as $asistencia) {
                $asistenciasPorFecha[$asistencia['fecha']] = $asistencia;
            }
            
            foreach ($diasLaboralesPeriodo as $fecha) {
                if (isset($asistenciasPorFecha[$fecha])) {
                    $asistencia = $asistenciasPorFecha[$fecha];
                    
                    switch ($asistencia['tipo_dia']) {
                        case 'falta':
                            $faltas++;
                            break;
                        case 'vacaciones':
                            $diasVacaciones++;
                            $diasTrabajados++; // Las vacaciones se pagan
                            break;
                        case 'normal':
                            if ($asistencia['hora_entrada']) {
                                $diasTrabajados++;
                                if ($asistencia['retardo']) {
                                    $retardos++;
                                }
                            } else {
                                $faltas++; // No marcó entrada = falta
                            }
                            break;
                    }
                } else {
                    // No hay registro para este día = falta
                    $faltas++;
                }
            }
            
            // Calcular faltas por retardos
            $faltasPorRetardos = floor($retardos / $retardosPorFalta);
            $faltasTotales = $faltas + $faltasPorRetardos;
            
            // Calcular descuentos
            $descuentoFaltas = $faltasTotales * $salarioDiario * ($descuentoPorFalta / 100);
            
            // Obtener comisiones del período
            $stmt = $db->prepare("
                SELECT COALESCE(SUM(monto), 0) as total_comisiones 
                FROM comisiones 
                WHERE empleado_id = ? AND periodo = ?
            ");
            $stmt->execute([$empleadoId, $periodo]);
            $comisiones = (float)$stmt->fetch()['total_comisiones'];
            
            // Calcular total
            $totalNomina = $salarioSemanal + $comisiones - $descuentoFaltas;
            
            // Insertar registro de nómina
            $stmt = $db->prepare("
                INSERT INTO nomina (
                    empleado_id, periodo, salario_base, dias_trabajados, 
                    faltas, retardos, descuento_faltas, comisiones, 
                    total_nomina, fecha_generacion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $empleadoId,
                $periodo,
                $salarioSemanal,
                $diasTrabajados,
                $faltasTotales,
                $retardos,
                $descuentoFaltas,
                $comisiones,
                $totalNomina,
                date('Y-m-d')
            ]);
            
            $empleadosProcessed++;
        }
        
        $db->commit();
        
        $response = [
            'success' => true,
            'message' => "Nómina generada correctamente para {$empleadosProcessed} empleados",
            'data' => [
                'periodo' => $periodo,
                'empleados_procesados' => $empleadosProcessed,
                'fecha_generacion' => date('Y-m-d H:i:s')
            ]
        ];
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
    echo json_encode($response);
}

function handleUpdateNomina($db, $input) {
    if (empty($input['id'])) {
        throw new Exception('ID de nómina es requerido');
    }
    
    // Verificar que la nómina existe
    $stmt = $db->prepare("SELECT * FROM nomina WHERE id = ?");
    $stmt->execute([$input['id']]);
    $nomina = $stmt->fetch();
    if (!$nomina) {
        throw new Exception('Nómina no encontrada');
    }
    
    // Construir query de actualización dinámicamente
    $updateFields = [];
    $updateValues = [];
    
    $allowedFields = ['pagado', 'observaciones'];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updateFields[] = "{$field} = ?";
            $updateValues[] = $input[$field];
        }
    }
    
    if (empty($updateFields)) {
        throw new Exception('No hay campos para actualizar');
    }
    
    $updateValues[] = $input['id'];
    
    $stmt = $db->prepare("
        UPDATE nomina 
        SET " . implode(', ', $updateFields) . " 
        WHERE id = ?
    ");
    
    $stmt->execute($updateValues);
    
    $response = [
        'success' => true,
        'message' => 'Nómina actualizada correctamente'
    ];
    
    echo json_encode($response);
}

function handleDeleteNomina($db, $input) {
    if (empty($input['periodo'])) {
        throw new Exception('Período es requerido');
    }
    
    // Verificar que la nómina no esté pagada
    $stmt = $db->prepare("SELECT COUNT(*) as pagados FROM nomina WHERE periodo = ? AND pagado = 1");
    $stmt->execute([$input['periodo']]);
    $pagados = $stmt->fetch()['pagados'];
    
    if ($pagados > 0) {
        throw new Exception('No se puede eliminar una nómina que ya tiene empleados pagados');
    }
    
    // Eliminar nómina del período
    $stmt = $db->prepare("DELETE FROM nomina WHERE periodo = ?");
    $stmt->execute([$input['periodo']]);
    
    $response = [
        'success' => true,
        'message' => 'Nómina eliminada correctamente',
        'registros_eliminados' => $stmt->rowCount()
    ];
    
    echo json_encode($response);
}
?>