<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Obtener todas las zonas
    try {
        $stmt = $db->prepare("SELECT z.*, CONCAT(e.nombre, ' ', e.apellidos) as empleado_nombre 
                             FROM zonas_chequeo z 
                             LEFT JOIN empleados e ON z.empleado_id = e.id 
                             ORDER BY z.nombre");
        $stmt->execute();
        $zonas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $zonas]);
    } catch (Exception $e) {
        error_log("Error al obtener zonas: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Error al obtener zonas', 'error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $nombre = $input['nombre'] ?? '';
    $latitud = $input['latitud'] ?? '';
    $longitud = $input['longitud'] ?? '';
    $radio = $input['radio'] ?? '100';
    $empleado_id = $input['empleado_id'] ?? null;
    $activo = $input['activo'] ?? '1';
    $id = $input['id'] ?? '';
    $centro_trabajo = $input['centro_trabajo'] ?? '';

    // Validaciones básicas
    if (empty($nombre) || empty($latitud) || empty($longitud)) {
        echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios: nombre, latitud y longitud']);
        exit;
    }

    // En ambos casos, toma el centro_trabajo del input (NO lo busques en la BD)
    if (!$empleado_id) $empleado_id = null;

    error_log("Datos a guardar: nombre=$nombre, latitud=$latitud, longitud=$longitud, radio=$radio, empleado_id=$empleado_id, centro_trabajo=$centro_trabajo, activo=$activo, id=$id");

    try {
        if ($id && $id !== '') {
            // Actualizar zona existente
            $stmt = $db->prepare("UPDATE zonas_chequeo SET 
                nombre=?,
                latitud=?,
                longitud=?,
                radio=?,
                empleado_id=?,
                centro_trabajo=?,
                activo=?
                WHERE id=?");
            $success = $stmt->execute([$nombre, $latitud, $longitud, $radio, $empleado_id, $centro_trabajo, $activo, $id]);
            
            if ($success) {
                echo json_encode(['success' => true, 'message' => 'Zona actualizada correctamente']);
            } else {
                $error = $stmt->errorInfo();
                error_log("Error al actualizar zona: " . implode(" | ", $error));
                echo json_encode(['success' => false, 'message' => 'Error al actualizar zona', 'error' => $error]);
            }
        } else {
            // Crear nueva zona
            $stmt = $db->prepare("INSERT INTO zonas_chequeo (nombre, latitud, longitud, radio, empleado_id, centro_trabajo, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?)");
            $success = $stmt->execute([$nombre, $latitud, $longitud, $radio, $empleado_id, $centro_trabajo, $activo]);
            
            if ($success) {
                echo json_encode(['success' => true, 'message' => 'Zona creada correctamente']);
            } else {
                $error = $stmt->errorInfo();
                error_log("Error al crear zona: " . implode(" | ", $error));
                echo json_encode(['success' => false, 'message' => 'Error al crear zona', 'error' => $error]);
            }
        }
    } catch (Exception $e) {
        error_log("Error en operación de zona: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Error en la operación', 'error' => $e->getMessage()]);
    }
    exit;
}

// Si no es GET ni POST
echo json_encode(['success' => false, 'message' => 'Método no permitido']);
?>