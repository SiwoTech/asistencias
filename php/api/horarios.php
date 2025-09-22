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
            handleGetHorarios($db);
            break;
            
        case 'POST':
            handleCreateHorarios($db, $input);
            break;
            
        case 'PUT':
            handleUpdateHorarios($db, $input);
            break;
            
        case 'DELETE':
            handleDeleteHorarios($db, $input);
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

function handleGetHorarios($db) {
    $empleadoId = $_GET['empleado_id'] ?? null;
    $dia = $_GET['dia'] ?? null;
    
    try {
        if ($empleadoId) {
            // Obtener horarios de un empleado específico
            $stmt = $db->prepare("
                SELECT h.*, e.nombre, e.apellidos, 
                       CONCAT(e.nombre, ' ', e.apellidos) as empleado_nombre
                FROM horarios h
                INNER JOIN empleados e ON h.empleado_id = e.id
                WHERE h.empleado_id = ?
                ORDER BY 
                    CASE h.dia_semana 
                        WHEN 'lunes' THEN 1
                        WHEN 'martes' THEN 2
                        WHEN 'miercoles' THEN 3
                        WHEN 'jueves' THEN 4
                        WHEN 'viernes' THEN 5
                        WHEN 'sabado' THEN 6
                        WHEN 'domingo' THEN 7
                    END
            ");
            $stmt->execute([$empleadoId]);
            
        } else {
            // Obtener todos los horarios
            $whereConditions = [];
            $params = [];
            
            if ($dia) {
                $whereConditions[] = "h.dia_semana = ?";
                $params[] = $dia;
            }
            
            $whereClause = '';
            if (!empty($whereConditions)) {
                $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
            }
            
            $stmt = $db->prepare("
                SELECT h.*, e.nombre, e.apellidos, e.numero_empleado,
                       CONCAT(e.nombre, ' ', e.apellidos) as empleado_nombre
                FROM horarios h
                INNER JOIN empleados e ON h.empleado_id = e.id
                {$whereClause}
                ORDER BY e.nombre, e.apellidos,
                    CASE h.dia_semana 
                        WHEN 'lunes' THEN 1
                        WHEN 'martes' THEN 2
                        WHEN 'miercoles' THEN 3
                        WHEN 'jueves' THEN 4
                        WHEN 'viernes' THEN 5
                        WHEN 'sabado' THEN 6
                        WHEN 'domingo' THEN 7
                    END
            ");
            $stmt->execute($params);
        }
        
        $horarios = $stmt->fetchAll();
        
        // Agrupar por empleado para vista organizada
        $horariosPorEmpleado = [];
        foreach ($horarios as $horario) {
            $empId = $horario['empleado_id'];
            
            if (!isset($horariosPorEmpleado[$empId])) {
                $horariosPorEmpleado[$empId] = [
                    'empleado_id' => $empId,
                    'empleado_nombre' => $horario['empleado_nombre'],
                    'numero_empleado' => $horario['numero_empleado'],
                    'horarios' => []
                ];
            }
            
            $horariosPorEmpleado[$empId]['horarios'][$horario['dia_semana']] = [
                'id' => $horario['id'],
                'hora_entrada' => $horario['hora_entrada'],
                'hora_salida' => $horario['hora_salida'],
                'activo' => $horario['activo']
            ];
        }
        
        $response = [
            'success' => true,
            'data' => [
                'horarios' => $horarios,
                'horarios_por_empleado' => array_values($horariosPorEmpleado)
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception('Error al obtener horarios: ' . $e->getMessage());
    }
    
    echo json_encode($response);
}

function handleCreateHorarios($db, $input) {
    $empleadoId = $input['empleado_id'] ?? null;
    
    if (!$empleadoId) {
        throw new Exception('ID del empleado es requerido');
    }
    
    // Verificar que el empleado existe
    $stmt = $db->prepare("SELECT id FROM empleados WHERE id = ? AND activo = 1");
    $stmt->execute([$empleadoId]);
    if (!$stmt->fetch()) {
        throw new Exception('Empleado no encontrado o inactivo');
    }
    
    $dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    $db->beginTransaction();
    
    try {
        // Eliminar horarios existentes del empleado
        $stmt = $db->prepare("DELETE FROM horarios WHERE empleado_id = ?");
        $stmt->execute([$empleadoId]);
        
        $horariosCreados = 0;
        
        foreach ($dias as $dia) {
            $activo = isset($input[$dia . '_activo']) && $input[$dia . '_activo'];
            
            if ($activo) {
                $entrada = $input[$dia . '_entrada'] ?? null;
                $salida = $input[$dia . '_salida'] ?? null;
                
                if ($entrada && $salida) {
                    $stmt = $db->prepare("
                        INSERT INTO horarios (empleado_id, dia_semana, hora_entrada, hora_salida, activo)
                        VALUES (?, ?, ?, ?, 1)
                    ");
                    $stmt->execute([$empleadoId, $dia, $entrada, $salida]);
                    $horariosCreados++;
                }
            }
        }
        
        $db->commit();
        
        $response = [
            'success' => true,
            'message' => "Horarios asignados correctamente ({$horariosCreados} días configurados)",
            'data' => ['empleado_id' => $empleadoId, 'horarios_creados' => $horariosCreados]
        ];
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
    echo json_encode($response);
}

function handleUpdateHorarios($db, $input) {
    $empleadoId = $input['empleado_id'] ?? null;
    
    if (!$empleadoId) {
        throw new Exception('ID del empleado es requerido');
    }
    
    $dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    $db->beginTransaction();
    
    try {
        // Eliminar horarios existentes del empleado
        $stmt = $db->prepare("DELETE FROM horarios WHERE empleado_id = ?");
        $stmt->execute([$empleadoId]);
        
        $horariosActualizados = 0;
        
        foreach ($dias as $dia) {
            $activo = isset($input[$dia . '_activo']) && $input[$dia . '_activo'];
            
            if ($activo) {
                $entrada = $input[$dia . '_entrada'] ?? null;
                $salida = $input[$dia . '_salida'] ?? null;
                
                if ($entrada && $salida) {
                    $stmt = $db->prepare("
                        INSERT INTO horarios (empleado_id, dia_semana, hora_entrada, hora_salida, activo)
                        VALUES (?, ?, ?, ?, 1)
                    ");
                    $stmt->execute([$empleadoId, $dia, $entrada, $salida]);
                    $horariosActualizados++;
                }
            }
        }
        
        $db->commit();
        
        $response = [
            'success' => true,
            'message' => "Horarios actualizados correctamente ({$horariosActualizados} días configurados)",
            'data' => ['empleado_id' => $empleadoId, 'horarios_actualizados' => $horariosActualizados]
        ];
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
    echo json_encode($response);
}

function handleDeleteHorarios($db, $input) {
    $empleadoId = $input['empleado_id'] ?? null;
    $dia = $input['dia'] ?? null;
    
    if (!$empleadoId) {
        throw new Exception('ID del empleado es requerido');
    }
    
    if ($dia) {
        // Eliminar horario de un día específico
        $stmt = $db->prepare("DELETE FROM horarios WHERE empleado_id = ? AND dia_semana = ?");
        $stmt->execute([$empleadoId, $dia]);
        $message = "Horario del {$dia} eliminado";
    } else {
        // Eliminar todos los horarios del empleado
        $stmt = $db->prepare("DELETE FROM horarios WHERE empleado_id = ?");
        $stmt->execute([$empleadoId]);
        $message = "Todos los horarios del empleado eliminados";
    }
    
    $response = [
        'success' => true,
        'message' => $message,
        'registros_eliminados' => $stmt->rowCount()
    ];
    
    echo json_encode($response);
}
?>