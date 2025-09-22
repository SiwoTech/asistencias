<?php

// Manejo de preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Test GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'OK',
        'message' => 'Archivo funcionando',
        'method' => 'GET',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit(0);
}

// Solo procesar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit(0);
}

try {
    // USAR LA CLASE DATABASE
    require_once __DIR__ . '/../config/database.php';
    
    // Crear instancia de la clase Database
    $database = new Database();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception('No se pudo establecer conexión con la base de datos');
    }
    
    // Test conexión
    $pdo->query('SELECT 1');
    
    // Leer datos POST
    $input_raw = file_get_contents('php://input');
    $input = json_decode($input_raw, true);
    
    if (!$input) {
        throw new Exception('Datos JSON inválidos');
    }
    
    if (!isset($input['empleado_id']) || !isset($input['activo_movil'])) {
        throw new Exception('Parámetros requeridos: empleado_id, activo_movil');
    }
    
    $empleado_id = (int)$input['empleado_id'];
    $activo_movil = (int)$input['activo_movil'];
    
    if ($empleado_id <= 0) {
        throw new Exception('ID de empleado inválido: ' . $empleado_id);
    }
    
    // Verificar que el empleado existe y obtener estado actual
    $stmt = $pdo->prepare("SELECT id, nombre, apellidos, activo_movil FROM empleados WHERE id = ?");
    $stmt->execute([$empleado_id]);
    $empleado = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$empleado) {
        throw new Exception("Empleado no encontrado con ID: $empleado_id");
    }
    
    $activo_movil_anterior = (int)$empleado['activo_movil'];
    
    // Actualizar campo activo_movil
    $sql = "UPDATE empleados SET activo_movil = ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $success = $stmt->execute([$activo_movil, $empleado_id]);
    
    if (!$success) {
        $error_info = $stmt->errorInfo();
        throw new Exception('Error ejecutando UPDATE: ' . implode(' - ', $error_info));
    }
    
    $rows_affected = $stmt->rowCount();
    
    // Verificar el cambio
    $stmt = $pdo->prepare("SELECT activo_movil FROM empleados WHERE id = ?");
    $stmt->execute([$empleado_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $activo_movil_nuevo = (int)$result['activo_movil'];
    
    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'message' => 'Campo activo_movil actualizado correctamente',
        'data' => [
            'empleado_id' => $empleado_id,
            'empleado' => $empleado['nombre'] . ' ' . $empleado['apellidos'],
            'activo_movil_anterior' => $activo_movil_anterior,
            'activo_movil_nuevo' => $activo_movil_nuevo,
            'rows_affected' => $rows_affected,
            'cambio_exitoso' => $activo_movil_anterior !== $activo_movil_nuevo,
            'sql_ejecutado' => $sql
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage(),
        'error_code' => $e->getCode(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'file' => basename(__FILE__),
        'line' => $e->getLine(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>