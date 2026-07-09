<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(["success" => false, "message" => "No autorizado"]);
    exit;
}

// Saber si ya se venció el plan
$hoy = date('Y-m-d');
$vencimiento = $_SESSION['fecha_vencimiento'];
$cuenta_expirada = ($hoy > $vencimiento); 

echo json_encode([
    "success" => true,
    "data" => [
        "usuario" => $_SESSION['nombre'],
        "empresa" => $_SESSION['empresa_nombre'],
        "permisos" => $_SESSION['permisos'],
        "expirada" => $cuenta_expirada // True si ya no tiene tiempo
    ]
]);
?>