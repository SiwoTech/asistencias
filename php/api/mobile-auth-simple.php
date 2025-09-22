<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);


if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Test simple
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'success' => true,
        'message' => 'Mobile Auth Simple Test',
        'method' => 'GET',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit(0);
}

try {
    // Verificar si existe el archivo config
    $config_path = __DIR__ . '/../config/database.php';
    if (!file_exists($config_path)) {
        throw new Exception("Config file not found: $config_path");
    }
    
    require_once $config_path;
    
    if (!class_exists('Database')) {
        throw new Exception('Database class not found');
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Leer input
    $input_raw = file_get_contents('php://input');
    if (!$input_raw) {
        throw new Exception('No input data received');
    }
    
    $input = json_decode($input_raw, true);
    if (!$input) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    $action = $input['action'] ?? null;
    if (!$action) {
        throw new Exception('No action specified');
    }
    
    // Solo manejar login por ahora
    if ($action === 'login') {
        $usuario = trim($input['usuario'] ?? '');
        $password = $input['password'] ?? '';
        
        if (empty($usuario) || empty($password)) {
            throw new Exception('Usuario y contraseña son requeridos');
        }
        
        // Verificar que la tabla empleados existe
        $stmt = $db->query("SHOW TABLES LIKE 'empleados'");
        if (!$stmt->fetch()) {
            throw new Exception('Tabla empleados no existe');
        }
        
        // Buscar empleado (query simple)
        $stmt = $db->prepare("SELECT id, usuario, password, nombre, apellidos, activo, activo_movil FROM empleados WHERE usuario = ? AND activo = 1");
        $stmt->execute([$usuario]);
        $empleado = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$empleado) {
            throw new Exception('Usuario no encontrado o inactivo');
        }
        
        if (!$empleado['activo_movil']) {
            throw new Exception('Acceso móvil deshabilitado');
        }
        
        // Verificar contraseña (simple)
        $password_ok = false;
        if (password_verify($password, $empleado['password'])) {
            $password_ok = true;
        } elseif ($password === $empleado['password']) {
            $password_ok = true; // Para contraseñas en texto plano (temporal)
        }
        
        if (!$password_ok) {
            throw new Exception('Contraseña incorrecta');
        }
        
        // Login exitoso
        $token = bin2hex(random_bytes(32));
        
        echo json_encode([
            'success' => true,
            'message' => 'Login exitoso (modo simple)',
            'data' => [
                'primer_login' => false,
                'token' => $token,
                'empleado' => [
                    'id' => (int)$empleado['id'],
                    'nombre' => $empleado['nombre'],
                    'apellidos' => $empleado['apellidos'],
                    'numero_empleado' => $empleado['id'] // Temporal
                ]
            ],
            'debug' => [
                'usuario_buscado' => $usuario,
                'empleado_encontrado' => (bool)$empleado,
                'acceso_movil' => (bool)$empleado['activo_movil']
            ]
        ]);
        
    } else {
        throw new Exception("Acción '$action' no implementada en modo simple");
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage(),
        'error_code' => 'DB_ERROR',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'GENERAL_ERROR',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>