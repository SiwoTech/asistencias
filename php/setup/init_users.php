<?php
require_once '../config/database.php';

/**
 * Script para inicializar usuarios y contraseñas de empleados
 * Ejecutar una sola vez después de crear la base de datos
 */

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    echo "Inicializando usuarios para empleados...\n";
    
    // Obtener empleados sin usuario
    $stmt = $db->prepare("SELECT id, nombre, apellidos, numero_empleado FROM empleados WHERE usuario IS NULL OR usuario = ''");
    $stmt->execute();
    $empleados = $stmt->fetchAll();
    
    $usuariosCreados = 0;
    
    foreach ($empleados as $empleado) {
        // Generar usuario: primera letra del nombre + apellidos + numero empleado (sin espacios, minúsculas)
        $usuario = strtolower(
            substr($empleado['nombre'], 0, 1) . 
            str_replace(' ', '', $empleado['apellidos']) . 
            $empleado['numero_empleado']
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
        $hashedPassword = 'temp_' . md5($passwordTemp . $empleado['id']);
        
        // Actualizar empleado
        $stmt = $db->prepare("UPDATE empleados SET usuario = ?, password = ? WHERE id = ?");
        $stmt->execute([$usuario, $hashedPassword, $empleado['id']]);
        
        echo "Usuario creado: {$usuario} | Empleado: {$empleado['nombre']} {$empleado['apellidos']} | Contraseña temporal: {$passwordTemp}\n";
        $usuariosCreados++;
    }
    
    echo "\n=== RESUMEN ===\n";
    echo "Usuarios creados: {$usuariosCreados}\n";
    echo "Contraseña temporal para todos: temp123\n";
    echo "Los empleados deberán cambiar su contraseña en el primer login.\n";
    
    // Crear usuario administrador si no existe
    $stmt = $db->prepare("SELECT id FROM empleados WHERE usuario = 'admin'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        $adminPassword = password_hash('admin123', PASSWORD_DEFAULT);
        $stmt = $db->prepare("
            INSERT INTO empleados (numero_empleado, nombre, apellidos, usuario, password, puesto, salario_semanal, fecha_ingreso, activo, activo_movil)
            VALUES ('ADMIN', 'Administrador', 'Sistema', 'admin', ?, 'Administrador', 0, CURDATE(), 1, 0)
        ");
        $stmt->execute([$adminPassword]);
        echo "\nUsuario administrador creado: admin | Contraseña: admin123\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>