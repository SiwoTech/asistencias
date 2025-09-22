<?php
class Database {
    private $host = 'localhost';
    private $db_name = 'u826340212_asistencia'; // Base de datos actualizada
    private $username = 'u826340212_asistencia'; // Cambiar por tu usuario de cPanel/hosting
    private $password = 'Cwo9982061148.';     // Cambiar por tu contraseña de cPanel/hosting
    private $port = '3306';
    public $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
        } catch(PDOException $exception) {
            error_log("Error de conexión a la base de datos: " . $exception->getMessage());
            // En producción, no mostrar detalles del error
            if (getenv('APP_ENV') === 'development') {
                echo "Error de conexión: " . $exception->getMessage();
            } else {
                echo "Error de conexión a la base de datos";
            }
        }
        
        return $this->conn;
    }

    public function testConnection() {
        $conn = $this->getConnection();
        if ($conn) {
            try {
                $stmt = $conn->query("SELECT 1");
                return true;
            } catch (PDOException $e) {
                return false;
            }
        }
        return false;
    }
}

// Funciones auxiliares
function getCurrentWeek() {
    return date('Y') . '-' . sprintf('%02d', date('W'));
}

function formatMoney($amount) {
    return '$' . number_format($amount, 2);
}

function formatDate($date) {
    return date('d/m/Y', strtotime($date));
}

function formatDateTime($datetime) {
    return date('d/m/Y H:i', strtotime($datetime));
}

function calculateWorkingDays($startDate, $endDate) {
    $start = new DateTime($startDate);
    $end = new DateTime($endDate);
    $workingDays = 0;
    
    while ($start <= $end) {
        // Contar todos los días excepto domingo (0)
        if ($start->format('w') != 0) {
            $workingDays++;
        }
        $start->add(new DateInterval('P1D'));
    }
    
    return $workingDays;
}

function getWeekDates($year, $week) {
    $date = new DateTime();
    $date->setISODate($year, $week);
    $startDate = $date->format('Y-m-d'); // Lunes
    
    $date->add(new DateInterval('P6D'));
    $endDate = $date->format('Y-m-d'); // Domingo
    
    return ['start' => $startDate, 'end' => $endDate];
}

// Log de errores personalizado
function logError($message, $context = []) {
    $logMessage = date('Y-m-d H:i:s') . " - " . $message;
    if (!empty($context)) {
        $logMessage .= " - Context: " . json_encode($context);
    }
    error_log($logMessage . PHP_EOL, 3, __DIR__ . '/../../logs/app.log');
}
?>