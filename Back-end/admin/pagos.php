<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

// 1. Seguridad: Verificar que solo entre el administrador
if (!isset($_SESSION['id_admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. No eres administrador.']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

if ($_SERVER["REQUEST_METHOD"] === 'GET') {
    try {
        // 1. Obtener historial completo de pagos y a qué empresa pertenecen
        $query = "SELECT ps.id, ps.fecha_pago, e.nombre as empresa, ps.monto, ps.stripe_payment_id, ps.estado, ps.creado_en 
                  FROM pagos_suscripcion ps
                  JOIN empresas e ON ps.id_empresa = e.id
                  ORDER BY ps.creado_en DESC";
        $stmt = $db->query($query);
        $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. Calcular Ingresos del Mes Actual (Solo los aprobados por Stripe)
        $mesActual = date('Y-m');
        $queryKpi = "SELECT SUM(monto) as total_mes FROM pagos_suscripcion WHERE estado = 'Aprobado' AND DATE_FORMAT(fecha_pago, '%Y-%m') = :mes";
        $stmtKpi = $db->prepare($queryKpi);
        $stmtKpi->execute([':mes' => $mesActual]);
        $kpiMes = $stmtKpi->fetch(PDO::FETCH_ASSOC);
        $cobradoMes = $kpiMes['total_mes'] ? $kpiMes['total_mes'] : 0;

        // 3. Contar el número de ventas exitosas totales
        $queryTx = "SELECT COUNT(*) FROM pagos_suscripcion WHERE estado = 'Aprobado'";
        $stmtTx = $db->query($queryTx);
        $txExitosas = $stmtTx->fetchColumn();

        // 4. Enviar datos y el nombre del admin
        echo json_encode([
            'success' => true,
            'pagos' => $pagos,
            'kpis' => [
                'cobrado_mes' => $cobradoMes,
                'tx_exitosas' => $txExitosas
            ],
            'admin_nombre' => $_SESSION['nombre_admin']
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error de conexión a BD.']);
    }
}
?>