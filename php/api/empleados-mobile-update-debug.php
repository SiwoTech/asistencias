<?php
// Debug headers
error_reporting(E_ALL);
ini_set('display_errors', 1);


// Log de debug
$debug_log = [];
$debug_log[] = "Script iniciado: " . date('Y-m-d H:i:s');
$debug_log[] = "Método: " . $_SERVER['REQUEST_METHOD'];

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'OK',
        'message' => 'Archivo PHP funcionando correctamente',
        'timestamp' => date('Y-m-d H:i:s'),
        'file' => basename(__FILE__)
    ]);
    exit(0);
}

try {
    // Verificar configuración de base de datos
    $config_path = '../config/database.php';
    $debug_log[] = "Buscando config en: " . realpath($config_path);
    
    if (!file_exists($config_path)) {
        throw new Exception("Archivo de configuración no encontrado: $config_path");
    }
    
    require_once $config_path;
    $debug_log[] = "Configuración cargada correctamente";
    
    // Verificar conexión PDO
    if (!isset($pdo)) {
        throw new Exception("Variable \$pdo no está definida");
    }
    
    $debug_log[] = "Conexión PDO verificada";
    
    // Leer input
    $input_raw = file_get_contents('php://input');
    $debug_log[] = "Input raw: " . $input_raw;
    
    $input = json_decode($input_raw, true);
    $debug_log[] = "Input parseado: " . json_encode($input);
    
    if (!$input) {
        throw new Exception("No se pudo parsear JSON del input");
    }
    
    if (!isset($input['empleado_id']) || !isset($input['activo_movil'])) {
        throw new Exception("Datos insuficientes: empleado_id y activo_movil son requeridos");
    }
    
    $empleado_id = (int)$input['empleado_id'];
    $activo_movil = (int)$input['activo_movil'];
    
    $debug_log[] = "Parámetros: empleado_id=$empleado_id, activo_movil=$activo_movil";
    
    if (!$empleado_id) {
        throw new Exception("ID de empleado inválido");
    }
    
    // Verificar que el empleado existe
    $debug_log[] = "Verificando si empleado existe...";
    $stmt = $pdo->prepare("SELECT id, nombre, apellidos, activo_movil FROM empleados WHERE id = ?");
    $stmt->execute([$empleado_id]);
    $empleado = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$empleado) {
        throw new Exception("Empleado no encontrado con ID: $empleado_id");
    }
    
    $debug_log[] = "Empleado encontrado: " . json_encode($empleado);
    $estado_anterior = (int)$empleado['activo_movil'];
    
    // Verificar si la columna activo_movil existe
    $debug_log[] = "Verificando estructura de tabla...";
    $stmt = $pdo->query("DESCRIBE empleados");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $activo_movil_exists = false;
    
    foreach ($columns as $column) {
        if ($column['Field'] === 'activo_movil') {
            $activo_movil_exists = true;
            $debug_log[] = "Columna activo_movil encontrada: " . json_encode($column);
            break;
        }
    }
    
    if (!$activo_movil_exists) {
        throw new Exception("La columna 'activo_movil' no existe en la tabla empleados");
    }
    
    // Actualizar el campo
    $debug_log[] = "Ejecutando UPDATE...";
    $sql = "UPDATE empleados SET activo_movil = ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([$activo_movil, $empleado_id]);
    
    $debug_log[] = "Resultado UPDATE: " . ($result ? 'true' : 'false');
    $debug_log[] = "Filas afectadas: " . $stmt->rowCount();
    
    if ($result) {
        // Verificar el cambio
        $debug_log[] = "Verificando cambio...";
        $stmt = $pdo->prepare("SELECT activo_movil FROM empleados WHERE id = ?");
        $stmt->execute([$empleado_id]);
        $updated = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $estado_nuevo = (int)$updated['activo_movil'];
        $debug_log[] = "Estado nuevo verificado: $estado_nuevo";
        
        echo json_encode([
            'success' => true,
            'message' => 'Campo activo_movil actualizado correctamente',
            'data' => [
                'empleado_id' => $empleado_id,
                'empleado' => $empleado['nombre'] . ' ' . $empleado['apellidos'],
                'estado_anterior' => $estado_anterior,
                'estado_nuevo' => $estado_nuevo,
                'actualizado' => $estado_anterior !== $estado_nuevo,
                'filas_afectadas' => $stmt->rowCount()
            ],
            'debug' => $debug_log,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        throw new Exception("No se pudo ejecutar la actualización");
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => $debug_log,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>