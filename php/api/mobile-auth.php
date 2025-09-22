<?php
// Configuración de errores
error_reporting(E_ALL);
ini_set('display_errors', 0); // Cambiar a 0 para producción
ini_set('log_errors', 1);

// Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejo de preflight
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Test GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'success' => true,
        'message' => 'Mobile Auth API funcionando',
        'method' => 'GET',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit(0);
}

try {
    require_once '../config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? null;
    
    if (!$action) {
        throw new Exception('Acción no especificada');
    }
    
    switch ($action) {
        case 'login':
            handleLogin($db, $input);
            break;
            
        case 'verify_session':
            handleVerifySession($db);
            break;
            
        case 'change_password':
            handleChangePassword($db, $input);
            break;
            
        case 'logout':
            handleLogout($db);
            break;
            
        default:
            throw new Exception('Acción no válida');
    }
    
} catch (Exception $e) {
    error_log("Mobile Auth Error: " . $e->getMessage());
    http_response_code(400);
    $response = [
        'success' => false,
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    echo json_encode($response);
}

function handleLogin($db, $input) {
    $usuario = trim($input['usuario'] ?? '');
    $password = $input['password'] ?? '';
    $recordar = $input['recordar'] ?? false;
    $dispositivoInfo = $input['dispositivo_info'] ?? [];
    
    if (empty($usuario) || empty($password)) {
        throw new Exception('Usuario y contraseña son requeridos');
    }
    
    // Obtener configuración con valores por defecto
    $config = getConfig($db);
    $intentosMaximos = (int)($config['intentos_maximos'] ?? 3);
    $bloqueoDuracion = (int)($config['bloqueo_duracion'] ?? 15);
    $primerLoginCambio = (bool)($config['primer_login_cambio'] ?? true);
    
    // Buscar empleado por usuario
    $stmt = $db->prepare("
        SELECT id, usuario, password, nombre, apellidos, numero_empleado, email, 
               activo, activo_movil, ultimo_acceso,
               CASE WHEN password LIKE 'temp_%' OR ultimo_acceso IS NULL THEN 1 ELSE 0 END as es_primer_login
        FROM empleados 
        WHERE usuario = ? AND activo = 1
    ");
    $stmt->execute([$usuario]);
    $empleado = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$empleado) {
        // Log intento fallido
        logFailedAttempt($db, $usuario, $_SERVER['REMOTE_ADDR'], 'usuario_inexistente');
        throw new Exception('Usuario o contraseña incorrectos');
    }
    
    if (!$empleado['activo_movil']) {
        throw new Exception('Acceso móvil deshabilitado para este empleado');
    }
    
    // Verificar intentos fallidos recientes
    $intentosFallidos = getFailedAttempts($db, $usuario, $_SERVER['REMOTE_ADDR'], $bloqueoDuracion);
    
    if ($intentosFallidos >= $intentosMaximos) {
        throw new Exception("Demasiados intentos fallidos. Intente nuevamente en {$bloqueoDuracion} minutos");
    }
    
    // Verificar contraseña
    $passwordValida = verifyPassword($password, $empleado);
    
    if (!$passwordValida) {
        // Log intento fallido
        logFailedAttempt($db, $usuario, $_SERVER['REMOTE_ADDR'], 'password_incorrecto');
        throw new Exception('Usuario o contraseña incorrectos');
    }
    
    // Login exitoso - limpiar intentos fallidos
    $stmt = $db->prepare("DELETE FROM intentos_login WHERE usuario = ? OR ip_address = ?");
    $stmt->execute([$usuario, $_SERVER['REMOTE_ADDR']]);
    
    // Verificar si es primer login
    $esPrimerLogin = $empleado['es_primer_login'] || $primerLoginCambio;
    
    if ($esPrimerLogin) {
        // Generar token temporal para cambio de contraseña
        $tempToken = generateSecureToken();
        
        // Crear sesión temporal
        createSession($db, $empleado['id'], $tempToken, $dispositivoInfo, 30); // 30 minutos
        
        // Log login exitoso
        logSuccessfulAttempt($db, $usuario, $_SERVER['REMOTE_ADDR'], 'primer_login');
        
        $response = [
            'success' => true,
            'message' => 'Primer login - cambio de contraseña requerido',
            'data' => [
                'primer_login' => true,
                'temp_token' => $tempToken,
                'empleado' => [
                    'id' => (int)$empleado['id'],
                    'nombre' => $empleado['nombre'],
                    'apellidos' => $empleado['apellidos'],
                    'numero_empleado' => $empleado['numero_empleado']
                ]
            ]
        ];
    } else {
        // Login normal - generar token de sesión
        $duracionDias = $recordar ? 30 : 1;
        $token = generateSecureToken();
        
        // Crear sesión
        createSession($db, $empleado['id'], $token, $dispositivoInfo, $duracionDias * 24 * 60); // en minutos
        
        // Actualizar último acceso
        $stmt = $db->prepare("UPDATE empleados SET ultimo_acceso = NOW() WHERE id = ?");
        $stmt->execute([$empleado['id']]);
        
        // Log login exitoso
        logSuccessfulAttempt($db, $usuario, $_SERVER['REMOTE_ADDR'], 'login_normal');
        
        $response = [
            'success' => true,
            'message' => 'Login exitoso',
            'data' => [
                'primer_login' => false,
                'token' => $token,
                'empleado' => [
                    'id' => (int)$empleado['id'],
                    'nombre' => $empleado['nombre'],
                    'apellidos' => $empleado['apellidos'],
                    'numero_empleado' => $empleado['numero_empleado'],
                    'email' => $empleado['email']
                ]
            ]
        ];
    }
    
    echo json_encode($response);
}

function handleVerifySession($db) {
    $token = getBearerToken();
    
    if (!$token) {
        throw new Exception('Token no proporcionado');
    }
    
    // Verificar sesión activa
    $stmt = $db->prepare("
        SELECT s.*, e.id, e.nombre, e.apellidos, e.numero_empleado, e.email, e.activo, e.activo_movil
        FROM sesiones_movil s
        INNER JOIN empleados e ON s.empleado_id = e.id
        WHERE s.token = ? AND s.activo = 1 AND s.fecha_expira > NOW()
        AND e.activo = 1 AND e.activo_movil = 1
    ");
    $stmt->execute([$token]);
    $sesion = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$sesion) {
        throw new Exception('Sesión inválida o expirada');
    }
    
    // Actualizar última actividad
    $stmt = $db->prepare("UPDATE sesiones_movil SET fecha_inicio = NOW() WHERE token = ?");
    $stmt->execute([$token]);
    
    $response = [
        'success' => true,
        'message' => 'Sesión válida',
        'data' => [
            'id' => (int)$sesion['id'],
            'nombre' => $sesion['nombre'],
            'apellidos' => $sesion['apellidos'],
            'numero_empleado' => $sesion['numero_empleado'],
            'email' => $sesion['email']
        ]
    ];
    
    echo json_encode($response);
}

function handleChangePassword($db, $input) {
    $token = getBearerToken();
    $newPassword = $input['new_password'] ?? '';
    
    if (!$token) {
        throw new Exception('Token no proporcionado');
    }
    
    if (empty($newPassword) || strlen($newPassword) < 6) {
        throw new Exception('La nueva contraseña debe tener al menos 6 caracteres');
    }
    
    // Verificar token temporal o sesión válida
    $stmt = $db->prepare("
        SELECT s.*, e.id, e.nombre, e.apellidos, e.numero_empleado, e.email
        FROM sesiones_movil s
        INNER JOIN empleados e ON s.empleado_id = e.id
        WHERE s.token = ? AND s.activo = 1 AND s.fecha_expira > NOW()
    ");
    $stmt->execute([$token]);
    $sesion = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$sesion) {
        throw new Exception('Token inválido o expirado');
    }
    
    $db->beginTransaction();
    
    try {
        // Actualizar contraseña
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $db->prepare("
            UPDATE empleados 
            SET password = ?, ultimo_acceso = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$hashedPassword, $sesion['empleado_id']]);
        
        // Invalidar todas las sesiones anteriores del empleado
        $stmt = $db->prepare("UPDATE sesiones_movil SET activo = 0 WHERE empleado_id = ?");
        $stmt->execute([$sesion['empleado_id']]);
        
        // Crear nueva sesión permanente
        $newToken = generateSecureToken();
        createSession($db, $sesion['empleado_id'], $newToken, json_decode($sesion['dispositivo_info'], true), 30 * 24 * 60);
        
        $db->commit();
        
        // Log cambio de contraseña
        logPasswordChange($db, $sesion['empleado_id']);
        
        $response = [
            'success' => true,
            'message' => 'Contraseña cambiada exitosamente',
            'data' => [
                'token' => $newToken,
                'empleado' => [
                    'id' => (int)$sesion['id'],
                    'nombre' => $sesion['nombre'],
                    'apellidos' => $sesion['apellidos'],
                    'numero_empleado' => $sesion['numero_empleado'],
                    'email' => $sesion['email']
                ]
            ]
        ];
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
    echo json_encode($response);
}

function handleLogout($db) {
    $token = getBearerToken();
    
    if (!$token) {
        throw new Exception('Token no proporcionado');
    }
    
    // Invalidar sesión
    $stmt = $db->prepare("UPDATE sesiones_movil SET activo = 0 WHERE token = ?");
    $stmt->execute([$token]);
    
    $response = [
        'success' => true,
        'message' => 'Sesión cerrada correctamente'
    ];
    
    echo json_encode($response);
}

// Funciones auxiliares mejoradas
function getConfig($db) {
    $config = [];
    try {
        $stmt = $db->query("SELECT clave, valor FROM configuracion");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $config[$row['clave']] = $row['valor'];
        }
    } catch (Exception $e) {
        // Si no existe la tabla, usar valores por defecto
    }
    return $config;
}

function getFailedAttempts($db, $usuario, $ip, $bloqueoDuracion) {
    try {
        $stmt = $db->prepare("
            SELECT COUNT(*) as intentos 
            FROM intentos_login 
            WHERE (usuario = ? OR ip_address = ?) 
            AND fecha_intento > DATE_SUB(NOW(), INTERVAL ? MINUTE)
            AND exitoso = 0
        ");
        $stmt->execute([$usuario, $ip, $bloqueoDuracion]);
        return (int)$stmt->fetch(PDO::FETCH_ASSOC)['intentos'];
    } catch (Exception $e) {
        return 0;
    }
}

function verifyPassword($password, $empleado, $db = null) {
    // 1. Contraseña temporal (MD5 con formato temp_)
    if (strpos($empleado['password'], 'temp_') === 0) {
        return $empleado['password'] === 'temp_' . md5($password . $empleado['id']);
    }

    // 2. Contraseña normal (bcrypt)
    if (password_verify($password, $empleado['password'])) {
        return true;
    }

    // 3. Contraseña legacy MD5
    if (md5($password) === $empleado['password']) {
        // Migrar a bcrypt si hay acceso a la base de datos
        if ($db && isset($empleado['id'])) {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE empleados SET password = ? WHERE id = ?");
            $stmt->execute([$hashedPassword, $empleado['id']]);
        }
        return true;
    }

    // 4. Contraseña copiada en texto plano
    if ($password === $empleado['password']) {
        // Migrar a bcrypt si hay acceso a la base de datos
        if ($db && isset($empleado['id'])) {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE empleados SET password = ? WHERE id = ?");
            $stmt->execute([$hashedPassword, $empleado['id']]);
        }
        return true;
    }

    return false;
}

function createSession($db, $empleadoId, $token, $dispositivoInfo, $minutos) {
    $stmt = $db->prepare("
        INSERT INTO sesiones_movil (empleado_id, token, dispositivo_info, ip_address, user_agent, fecha_expira, activo)
        VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 1)
    ");
    $stmt->execute([
        $empleadoId,
        $token,
        json_encode($dispositivoInfo),
        $_SERVER['REMOTE_ADDR'],
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        $minutos
    ]);
}

function getBearerToken() {
    $headers = getallheaders();
    if (!$headers) {
        // Fallback para servidores que no soportan getallheaders()
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $header = str_replace('_', '-', substr($key, 5));
                $headers[$header] = $value;
            }
        }
    }
    
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return $matches[1];
    }
    
    return null;
}

function generateSecureToken() {
    return bin2hex(random_bytes(32));
}

function logFailedAttempt($db, $usuario, $ip, $razon) {
    try {
        $stmt = $db->prepare("
            INSERT INTO intentos_login (usuario, ip_address, user_agent, razon, exitoso, fecha_intento)
            VALUES (?, ?, ?, ?, 0, NOW())
        ");
        $stmt->execute([
            $usuario,
            $ip,
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $razon
        ]);
    } catch (Exception $e) {
        // Si falla, ignorar para no bloquear el login
        error_log("Error logging failed attempt: " . $e->getMessage());
    }
}

function logSuccessfulAttempt($db, $usuario, $ip, $tipo) {
    try {
        $stmt = $db->prepare("
            INSERT INTO intentos_login (usuario, ip_address, user_agent, razon, exitoso, fecha_intento)
            VALUES (?, ?, ?, ?, 1, NOW())
        ");
        $stmt->execute([
            $usuario,
            $ip,
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $tipo
        ]);
    } catch (Exception $e) {
        error_log("Error logging successful attempt: " . $e->getMessage());
    }
}

function logPasswordChange($db, $empleadoId) {
    try {
        $stmt = $db->prepare("
            INSERT INTO intentos_login (usuario, ip_address, user_agent, razon, exitoso, fecha_intento)
            VALUES (?, ?, ?, 'cambio_password', 1, NOW())
        ");
        $stmt->execute([
            "empleado_id_$empleadoId",
            $_SERVER['REMOTE_ADDR'],
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
    } catch (Exception $e) {
        // Ignorar si no se puede registrar
    }
}
?>