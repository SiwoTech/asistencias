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
            handleGetEmpleados($db);
            break;
            
        case 'POST':
            handleCreateEmpleado($db, $input);
            break;
            
        case 'PUT':
            handleUpdateEmpleado($db, $input);
            break;
            
        case 'DELETE':
            handleDeleteEmpleado($db, $input);
            break;
            
        default:
            throw new Exception('Método no permitido');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    $response = [
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    echo json_encode($response);
}

function handleGetEmpleados($db) {
    $empleadoId = $_GET['id'] ?? null;
    
    if ($empleadoId) {
        // Obtener empleado específico
        $stmt = $db->prepare("
            SELECT * FROM empleados 
            WHERE id = ?
        ");
        $stmt->execute([$empleadoId]);
        $empleado = $stmt->fetch();
        
        if (!$empleado) {
            throw new Exception('Empleado no encontrado');
        }
        
        $response = [
            'success' => true,
            'data' => $empleado
        ];
        
    } else {
        // Obtener todos los empleados
        $stmt = $db->prepare("
            SELECT 
                id, numero_empleado, nombre, apellidos, email, telefono,
                puesto, departamento, salario_semanal, fecha_ingreso, 
                fecha_nacimiento, activo, created_at, updated_at
            FROM empleados 
            ORDER BY nombre, apellidos
        ");
        $stmt->execute();
        $empleados = $stmt->fetchAll();
        
        $response = [
            'success' => true,
            'data' => $empleados,
            'total' => count($empleados)
        ];
    }
    
    echo json_encode($response);
}

function handleCreateEmpleado($db, $input) {
    // Validar campos requeridos
    $required = ['numero_empleado', 'nombre', 'apellidos', 'puesto', 'salario_semanal', 'fecha_ingreso'];
    
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("El campo {$field} es requerido");
        }
    }
    
    // Validar que el número de empleado sea único
    $stmt = $db->prepare("SELECT id FROM empleados WHERE numero_empleado = ?");
    $stmt->execute([$input['numero_empleado']]);
    if ($stmt->fetch()) {
        throw new Exception('El número de empleado ya existe');
    }
    
    // Validar RFC si se proporciona
    if (!empty($input['rfc']) && !isValidRFC($input['rfc'])) {
        throw new Exception('RFC inválido');
    }
    
    // Validar CURP si se proporciona
    if (!empty($input['curp']) && !isValidCURP($input['curp'])) {
        throw new Exception('CURP inválida');
    }
    
    // Validar CLABE si se proporciona
    if (!empty($input['clabe_interbancaria']) && !isValidCLABE($input['clabe_interbancaria'])) {
        throw new Exception('CLABE interbancaria inválida');
    }
    
    // Calcular antigüedad automáticamente
    $antiguedad = 0;
    if (!empty($input['fecha_ingreso'])) {
        $antiguedad = calculateAntiguedad($input['fecha_ingreso']);
    }
    
    $db->beginTransaction();
    
    try {
        $stmt = $db->prepare("
            INSERT INTO empleados (
                numero_empleado, nombre, apellidos, email, telefono, 
                puesto, departamento, actividades_desempenar, salario_semanal, 
                fecha_ingreso, fecha_nacimiento, numero_seguro_social, estado_civil, 
                sexo, lugar_nacimiento, nacionalidad, rfc, curp, domicilio, 
                poblacion, estado, codigo_postal, credito_infonavit, tipo_retencion, 
                valor_retencion, tipo_contrato, duracion_contrato, dias_descanso, 
                fecha_firma_contrato, banco, numero_cuenta, clabe_interbancaria, 
                observaciones_personales, antiguedad_anos, vacaciones_pendientes, 
                centro_trabajo, tipo_sangre, contacto_emergencia, telefono_emergencia, 
                parentesco_emergencia, alergias, activo, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
        ");
        
        $stmt->execute([
            $input['numero_empleado'],
            $input['nombre'],
            $input['apellidos'],
            $input['email'] ?? null,
            $input['telefono'] ?? null,
            $input['puesto'],
            $input['departamento'] ?? null,
            $input['actividades_desempenar'] ?? null,
            $input['salario_semanal'],
            $input['fecha_ingreso'],
            $input['fecha_nacimiento'] ?? null,
            $input['numero_seguro_social'] ?? null,
            $input['estado_civil'] ?? null,
            $input['sexo'] ?? null,
            $input['lugar_nacimiento'] ?? null,
            $input['nacionalidad'] ?? 'Mexicana',
            $input['rfc'] ?? null,
            $input['curp'] ?? null,
            $input['domicilio'] ?? null,
            $input['poblacion'] ?? null,
            $input['estado'] ?? null,
            $input['codigo_postal'] ?? null,
            $input['credito_infonavit'] ?? null,
            $input['tipo_retencion'] ?? null,
            $input['valor_retencion'] ?? null,
            $input['tipo_contrato'] ?? null,
            $input['duracion_contrato'] ?? null,
            $input['dias_descanso'] ?? null,
            $input['fecha_firma_contrato'] ?? null,
            $input['banco'] ?? null,
            $input['numero_cuenta'] ?? null,
            $input['clabe_interbancaria'] ?? null,
            $input['observaciones_personales'] ?? null,
            round($antiguedad, 2),
            $input['vacaciones_pendientes'] ?? 0,
            $input['centro_trabajo'] ?? null,
            $input['tipo_sangre'] ?? null,
            $input['contacto_emergencia'] ?? null,
            $input['telefono_emergencia'] ?? null,
            $input['parentesco_emergencia'] ?? null,
            $input['alergias'] ?? null
        ]);
        
        $empleadoId = $db->lastInsertId();
        
        // Crear horarios por defecto para el empleado
        createDefaultSchedule($db, $empleadoId);
        
        // Crear usuario y contraseña para acceso móvil
        createMobileCredentials($db, $empleadoId, $input);
        
        $db->commit();
        
        $response = [
            'success' => true,
            'message' => 'Empleado creado exitosamente',
            'data' => ['id' => $empleadoId]
        ];
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
    echo json_encode($response);
}

function handleUpdateEmpleado($db, $input) {
    $id = $input['id'] ?? null;
    
    if (!$id) {
        throw new Exception('ID del empleado es requerido');
    }
    
    // Verificar que el empleado existe
    $stmt = $db->prepare("SELECT id FROM empleados WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        throw new Exception('Empleado no encontrado');
    }
    
    // Verificar unicidad del número de empleado (excluyendo el actual)
    if (!empty($input['numero_empleado'])) {
        $stmt = $db->prepare("SELECT id FROM empleados WHERE numero_empleado = ? AND id != ?");
        $stmt->execute([$input['numero_empleado'], $id]);
        if ($stmt->fetch()) {
            throw new Exception('El número de empleado ya existe');
        }
    }
    
    // Validaciones
    if (!empty($input['rfc']) && !isValidRFC($input['rfc'])) {
        throw new Exception('RFC inválido');
    }
    
    if (!empty($input['curp']) && !isValidCURP($input['curp'])) {
        throw new Exception('CURP inválida');
    }
    
    if (!empty($input['clabe_interbancaria']) && !isValidCLABE($input['clabe_interbancaria'])) {
        throw new Exception('CLABE interbancaria inválida');
    }
    
    // Calcular antigüedad si hay fecha de ingreso
    $antiguedad = null;
    if (!empty($input['fecha_ingreso'])) {
        $antiguedad = calculateAntiguedad($input['fecha_ingreso']);
    }
    
    $stmt = $db->prepare("
        UPDATE empleados SET 
            numero_empleado = ?, nombre = ?, apellidos = ?, email = ?, telefono = ?,
            puesto = ?, departamento = ?, actividades_desempenar = ?, salario_semanal = ?,
            fecha_ingreso = ?, fecha_nacimiento = ?, numero_seguro_social = ?, estado_civil = ?,
            sexo = ?, lugar_nacimiento = ?, nacionalidad = ?, rfc = ?, curp = ?, domicilio = ?,
            poblacion = ?, estado = ?, codigo_postal = ?, credito_infonavit = ?, tipo_retencion = ?,
            valor_retencion = ?, tipo_contrato = ?, duracion_contrato = ?, dias_descanso = ?,
            fecha_firma_contrato = ?, banco = ?, numero_cuenta = ?, clabe_interbancaria = ?,
            observaciones_personales = ?, antiguedad_anos = ?, vacaciones_pendientes = ?,
            centro_trabajo = ?, tipo_sangre = ?, contacto_emergencia = ?, telefono_emergencia = ?,
            parentesco_emergencia = ?, alergias = ?, updated_at = NOW()
        WHERE id = ?
    ");
    
    $stmt->execute([
        $input['numero_empleado'] ?? null,
        $input['nombre'] ?? null,
        $input['apellidos'] ?? null,
        $input['email'] ?? null,
        $input['telefono'] ?? null,
        $input['puesto'] ?? null,
        $input['departamento'] ?? null,
        $input['actividades_desempenar'] ?? null,
        $input['salario_semanal'] ?? null,
        $input['fecha_ingreso'] ?? null,
        $input['fecha_nacimiento'] ?? null,
        $input['numero_seguro_social'] ?? null,
        $input['estado_civil'] ?? null,
        $input['sexo'] ?? null,
        $input['lugar_nacimiento'] ?? null,
        $input['nacionalidad'] ?? null,
        $input['rfc'] ?? null,
        $input['curp'] ?? null,
        $input['domicilio'] ?? null,
        $input['poblacion'] ?? null,
        $input['estado'] ?? null,
        $input['codigo_postal'] ?? null,
        $input['credito_infonavit'] ?? null,
        $input['tipo_retencion'] ?? null,
        $input['valor_retencion'] ?? null,
        $input['tipo_contrato'] ?? null,
        $input['duracion_contrato'] ?? null,
        $input['dias_descanso'] ?? null,
        $input['fecha_firma_contrato'] ?? null,
        $input['banco'] ?? null,
        $input['numero_cuenta'] ?? null,
        $input['clabe_interbancaria'] ?? null,
        $input['observaciones_personales'] ?? null,
        $antiguedad,
        $input['vacaciones_pendientes'] ?? null,
        $input['centro_trabajo'] ?? null,
        $input['tipo_sangre'] ?? null,
        $input['contacto_emergencia'] ?? null,
        $input['telefono_emergencia'] ?? null,
        $input['parentesco_emergencia'] ?? null,
        $input['alergias'] ?? null,
        $id
    ]);
    
    $response = [
        'success' => true,
        'message' => 'Empleado actualizado exitosamente'
    ];
    
    echo json_encode($response);
}

function handleDeleteEmpleado($db, $input) {
    $id = $input['id'] ?? null;
    
    if (!$id) {
        throw new Exception('ID del empleado es requerido');
    }
    
    // Verificar que el empleado existe
    $stmt = $db->prepare("SELECT nombre, apellidos FROM empleados WHERE id = ?");
    $stmt->execute([$id]);
    $empleado = $stmt->fetch();
    
    if (!empleado) {
        throw new Exception('Empleado no encontrado');
    }
    
    // Verificar si tiene registros de asistencia
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM asistencia WHERE empleado_id = ?");
    $stmt->execute([$id]);
    $asistencias = $stmt->fetch()['total'];
    
    if ($asistencias > 0) {
        // Marcar como inactivo en lugar de eliminar
        $stmt = $db->prepare("UPDATE empleados SET activo = 0, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$id]);
        
        $response = [
            'success' => true,
            'message' => 'Empleado marcado como inactivo (tiene registros de asistencia)'
        ];
    } else {
        // Eliminar completamente si no tiene registros
        $db->beginTransaction();
        
        try {
            // Eliminar horarios
            $stmt = $db->prepare("DELETE FROM horarios WHERE empleado_id = ?");
            $stmt->execute([$id]);
            
            // Eliminar sesiones móviles
            $stmt = $db->prepare("DELETE FROM sesiones_movil WHERE empleado_id = ?");
            $stmt->execute([$id]);
            
            // Eliminar empleado
            $stmt = $db->prepare("DELETE FROM empleados WHERE id = ?");
            $stmt->execute([$id]);
            
            $db->commit();
            
            $response = [
                'success' => true,
                'message' => 'Empleado eliminado completamente'
            ];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }
    
    echo json_encode($response);
}

// Funciones auxiliares
function isValidRFC($rfc) {
    $pattern = '/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/';
    return preg_match($pattern, strtoupper($rfc));
}

function isValidCURP($curp) {
    $pattern = '/^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/';
    return preg_match($pattern, strtoupper($curp));
}

function isValidCLABE($clabe) {
    return strlen($clabe) === 18 && ctype_digit($clabe);
}

function calculateAntiguedad($fechaIngreso) {
    try {
        $ingreso = new DateTime($fechaIngreso);
        $hoy = new DateTime();
        $diff = $hoy->diff($ingreso);
        return $diff->y + ($diff->m / 12) + ($diff->d / 365);
    } catch (Exception $e) {
        return 0;
    }
}

function createDefaultSchedule($db, $empleadoId) {
    try {
        $horarios = [
            ['dia' => 'lunes', 'entrada' => '09:00:00', 'salida' => '18:00:00'],
            ['dia' => 'martes', 'entrada' => '09:00:00', 'salida' => '18:00:00'],
            ['dia' => 'miercoles', 'entrada' => '09:00:00', 'salida' => '18:00:00'],
            ['dia' => 'jueves', 'entrada' => '09:00:00', 'salida' => '18:00:00'],
            ['dia' => 'viernes', 'entrada' => '09:00:00', 'salida' => '18:00:00'],
            ['dia' => 'sabado', 'entrada' => '09:00:00', 'salida' => '14:00:00']
        ];
        
        $stmt = $db->prepare("
            INSERT INTO horarios (empleado_id, dia_semana, hora_entrada, hora_salida, activo)
            VALUES (?, ?, ?, ?, 1)
        ");
        
        foreach ($horarios as $horario) {
            $stmt->execute([
                $empleadoId,
                $horario['dia'],
                $horario['entrada'],
                $horario['salida']
            ]);
        }
    } catch (Exception $e) {
        // Ignorar errores en la creación de horarios por defecto
        error_log("Error creating default schedule: " . $e->getMessage());
    }
}

function createMobileCredentials($db, $empleadoId, $empleadoData) {
    try {
        // Generar usuario: primera letra del nombre + apellidos + numero empleado (sin espacios, minúsculas)
        $usuario = strtolower(
            substr($empleadoData['nombre'], 0, 1) . 
            str_replace(' ', '', $empleadoData['apellidos']) . 
            $empleadoData['numero_empleado']
        );
        
        // Limpiar caracteres especiales
        $usuario = preg_replace('/[^a-z0-9]/', '', $usuario);
        
        // Verificar que el usuario sea único
        $contador = 1;
        $usuarioOriginal = $usuario;
        while (true) {
            $stmt = $db->prepare("SELECT id FROM empleados WHERE usuario = ?");
            $stmt->execute([$usuario]);
            if (!$stmt->fetch()) {
                break; // Usuario disponible
            }
            $usuario = $usuarioOriginal . $contador;
            $contador++;
        }
        
        // Generar contraseña temporal
        $passwordTemp = 'temp123'; // Contraseña temporal estándar
        $hashedPassword = 'temp_' . md5($passwordTemp . $empleadoId);
        
        // Actualizar empleado con credenciales
        $stmt = $db->prepare("UPDATE empleados SET usuario = ?, password = ? WHERE id = ?");
        $stmt->execute([$usuario, $hashedPassword, $empleadoId]);
        
    } catch (Exception $e) {
        // Ignorar errores en la creación de credenciales móviles
        error_log("Error creating mobile credentials: " . $e->getMessage());
    }
}
?>