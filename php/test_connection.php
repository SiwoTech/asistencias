<?php
require_once 'config/database.php';

header('Content-Type: application/json');

try {
    $database = new Database();
    $connection = $database->getConnection();
    
    if ($connection) {
        // Probar una consulta simple
        $stmt = $connection->query("SELECT 1 as test");
        $result = $stmt->fetch();
        
        if ($result) {
            echo json_encode([
                'success' => true,
                'message' => 'Conexión exitosa a la base de datos',
                'database' => 'u826340212_asistencia',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Conexión establecida pero no se pudo ejecutar consulta',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'No se pudo establecer conexión con la base de datos',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>