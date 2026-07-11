<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

// 1. Si la sesión expiró o no existe, bloqueamos el acceso
if (!isset($_SESSION['id_empresa'])) {
    echo json_encode(['success' => false]);
    exit;
}

$id_empresa = $_SESSION['id_empresa'];
$database = new Database();
$db = $database->getConnection();

try {
    // 2. Consultamos EN TIEMPO REAL el plan y los permisos de la empresa
    $query = "SELECT e.nombre as empresa, e.estado, e.fecha_vencimiento, 
                     p.mod_vehiculos, p.mod_combustible, p.mod_diagnosticos, 
                     p.mod_mantenimiento, p.mod_tickets 
              FROM empresas e
              JOIN planes_suscripcion p ON e.id_plan = p.id
              WHERE e.id = ?";
    
    $stmt = $db->prepare($query);
    $stmt->execute([$id_empresa]);
    $empresa_data = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($empresa_data) {
        $hoy = date('Y-m-d');
        // Validamos si la fecha ya pasó o si un administrador suspendió la cuenta
        $expirada = ($hoy > $empresa_data['fecha_vencimiento'] || $empresa_data['estado'] === 'Suspendida');

        // 3. Enviamos los datos al JS (global.js leerá esto para ocultar el menú lateral)
        echo json_encode([
            'success' => true,
            'data' => [
                'empresa' => $empresa_data['empresa'],
                'expirada' => $expirada,
                'permisos' => [
                    'mod_dashboard' => 1, // El Dashboard siempre debe verse
                    'mod_vehiculos' => $empresa_data['mod_vehiculos'],
                    'mod_combustible' => $empresa_data['mod_combustible'],
                    'mod_diagnosticos' => $empresa_data['mod_diagnosticos'],
                    'mod_mantenimiento' => $empresa_data['mod_mantenimiento'],
                    'mod_tickets' => $empresa_data['mod_tickets'],
                    'mod_suscripcion' => 1 // La suscripción siempre se ve para poder cambiar de plan
                ]
            ]
        ]);
    } else {
        echo json_encode(['success' => false]);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false]);
}
?>