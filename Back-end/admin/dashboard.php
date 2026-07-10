<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['id_admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. No hay sesión.']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    // Usamos TRIM y LOWER para asegurar que cuente sin importar espacios o mayúsculas
    $stmtEmp = $db->query("SELECT COUNT(*) FROM empresas WHERE TRIM(LOWER(estado)) = 'activa'");
    $clientesActivos = $stmtEmp->fetchColumn();

    $stmtVeh = $db->query("SELECT COUNT(*) FROM vehiculos WHERE TRIM(LOWER(estado)) != 'inactivo'");
    $vehiculosGestionados = $stmtVeh->fetchColumn();

    $stmtTk = $db->query("SELECT COUNT(*) FROM tickets WHERE TRIM(LOWER(estado)) != 'resuelto'");
    $ticketsAbiertos = $stmtTk->fetchColumn();

    $stmtVencer = $db->query("SELECT COUNT(*) FROM empresas WHERE fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)");
    $proximosVencer = $stmtVencer->fetchColumn();

    $stmtTablaVenc = $db->query("SELECT nombre, DATE_FORMAT(fecha_vencimiento, '%d %b') as fecha_corte FROM empresas WHERE TRIM(LOWER(estado)) = 'activa' ORDER BY fecha_vencimiento ASC LIMIT 5");
    $listaVencimientos = $stmtTablaVenc->fetchAll(PDO::FETCH_ASSOC);

    $stmtTablaTk = $db->query("SELECT e.nombre as empresa, t.asunto_breve as asunto FROM tickets t JOIN empresas e ON t.id_empresa = e.id WHERE TRIM(LOWER(t.estado)) != 'resuelto' ORDER BY t.creado_en DESC LIMIT 5");
    $listaTickets = $stmtTablaTk->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'admin_nombre' => $_SESSION['nombre_admin'] ?? 'SuperAdministrador',
        'kpis' => [
            'clientes_activos' => $clientesActivos,
            'vehiculos_gestionados' => $vehiculosGestionados,
            'tickets_abiertos' => $ticketsAbiertos,
            'proximos_vencer' => $proximosVencer
        ],
        'tablas' => [
            'vencimientos' => $listaVencimientos,
            'soporte' => $listaTickets
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de BD: ' . $e->getMessage()]);
}
?>