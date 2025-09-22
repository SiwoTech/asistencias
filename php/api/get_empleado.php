<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$id = $_GET['id'] ?? '';

if (empty($id)) {
    echo json_encode(['success' => false, 'message' => 'ID de empleado requerido']);
    exit;
}

try {
    $stmt = $db->prepare("SELECT * FROM empleados WHERE id = ?");
    $stmt->execute([$id]);
    $empleado = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($empleado) {
        echo json_encode(['success' => true, 'data' => $empleado]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Empleado no encontrado']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error al obtener empleado', 'error' => $e->getMessage()]);
}
?>