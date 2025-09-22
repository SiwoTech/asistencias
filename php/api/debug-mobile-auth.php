<?php
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$input_raw = file_get_contents('php://input');
$input = json_decode($input_raw, true);

// Responde lo recibido y el error de JSON
echo json_encode([
    "raw_input" => $input_raw,
    "json_error" => json_last_error_msg(),
    "parsed_input" => $input
]);
exit;
?>