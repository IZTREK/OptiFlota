<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

// 1. Validar que sea administrador
if (!isset($_SESSION['id_admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado.']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    // 1. Total Clientes Activos
    $stmtEmp = $db->query("SELECT COUNT(*) FROM empresas WHERE estado = 'Activa'");
    $clientesActivos = $stmtEmp->fetchColumn();

    // 2. Total de Vehículos en Plataforma (Sumando los de todas las empresas)
    $stmtVeh = $db->query("SELECT COUNT(*) FROM vehiculos WHERE estado != 'Inactivo'");
    $vehiculosGestionados = $stmtVeh->fetchColumn();

    // 3. Tickets de Soporte Abiertos (Todo lo que no esté resuelto)
    $stmtTk = $db->query("SELECT COUNT(*) FROM tickets WHERE estado != 'Resuelto'");
    $ticketsAbiertos = $stmtTk->fetchColumn();

    // 4. Próximos a Vencer (Empresas cuyo plan expira en los próximos 7 días)
    $stmtVencer = $db->query("SELECT COUNT(*) FROM empresas WHERE fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)");
    $proximosVencer = $stmtVencer->fetchColumn();

    // 5. Datos para la Tabla: Próximos Vencimientos (Listamos las 5 más urgentes)
    $stmtTablaVenc = $db->query("SELECT nombre, DATE_FORMAT(fecha_vencimiento, '%d %b') as fecha_corte FROM empresas WHERE estado = 'Activa' ORDER BY fecha_vencimiento ASC LIMIT 5");
    $listaVencimientos = $stmtTablaVenc->fetchAll(PDO::FETCH_ASSOC);

    // 6. Datos para la Tabla: Soporte Técnico (Últimos 5 tickets pendientes)
    $stmtTablaTk = $db->query("SELECT e.nombre as empresa, t.asunto_breve as asunto FROM tickets t JOIN empresas e ON t.id_empresa = e.id WHERE t.estado != 'Resuelto' ORDER BY t.creado_en DESC LIMIT 5");
    $listaTickets = $stmtTablaTk->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
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