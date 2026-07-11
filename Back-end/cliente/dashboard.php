<?php
session_start();
require_once '../config/database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['id_empresa'])) {
    echo json_encode(['success' => false]);
    exit;
}

$db = (new Database())->getConnection();
$id_empresa = $_SESSION['id_empresa'];
$mes_filtro = isset($_GET['mes']) && !empty($_GET['mes']) ? $_GET['mes'] : date('Y-m');

try {
    // 1. Vehiculos Activos
    $qVehiculos = "SELECT COUNT(*) FROM vehiculos WHERE id_empresa = :id AND estado != 'Inactivo'";
    $stmtV = $db->prepare($qVehiculos);
    $stmtV->execute([':id' => $id_empresa]);
    $total_vehiculos = $stmtV->fetchColumn();

    // 2. Gasto Combustible filtrado por mes
    $qGas = "SELECT SUM(costo_total) FROM cargas_combustible WHERE id_empresa = :id AND DATE_FORMAT(fecha, '%Y-%m') = :mes";
    $stmtG = $db->prepare($qGas);
    $stmtG->execute([':id' => $id_empresa, ':mes' => $mes_filtro]);
    $gasto_combustible = $stmtG->fetchColumn() ?: 0;

    // 3. CORRECCIÓN: Vehículos actualmente en Taller
    $qMant = "SELECT COUNT(*) FROM vehiculos WHERE id_empresa = :id AND LOWER(estado) IN ('en taller', 'taller')";
    $stmtM = $db->prepare($qMant);
    $stmtM->execute([':id' => $id_empresa]);
    $mantenimientos = $stmtM->fetchColumn();

    // 4. Datos para Grafica
    $qEstado = "SELECT estado, COUNT(*) as cantidad FROM vehiculos WHERE id_empresa = :id GROUP BY estado";
    $stmtE = $db->prepare($qEstado);
    $stmtE->execute([':id' => $id_empresa]);
    $estados = $stmtE->fetchAll(PDO::FETCH_ASSOC);
    
    $activos = 0; $taller = 0; $inactivos = 0;
    foreach($estados as $e) {
        if(strtolower($e['estado']) == 'activo') $activos = $e['cantidad'];
        if(strtolower($e['estado']) == 'en taller' || strtolower($e['estado']) == 'taller') $taller = $e['cantidad'];
        if(strtolower($e['estado']) == 'inactivo') $inactivos = $e['cantidad'];
    }

    // 5. Últimos 5 movimientos combinados (Combustible)
    $qUltimos = "SELECT c.fecha, c.costo_total, v.placas FROM cargas_combustible c JOIN vehiculos v ON c.id_vehiculo = v.id WHERE c.id_empresa = :id ORDER BY c.fecha DESC LIMIT 5";
    $stmtU = $db->prepare($qUltimos);
    $stmtU->execute([':id' => $id_empresa]);
    $ultimos = $stmtU->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'kpis' => ['vehiculos' => $total_vehiculos, 'gasto' => $gasto_combustible, 'mantenimientos' => $mantenimientos],
        'grafica' => [$activos, $taller, $inactivos],
        'movimientos' => $ultimos
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false]);
}
?>