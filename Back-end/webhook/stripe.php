<?php
require_once '../../vendor/autoload.php';
require_once '../config/database.php';

// Aquí pondrás tu misma Secret Key de prueba (sk_test_...)
\Stripe\Stripe::setApiKey('sk_test_TU_CLAVE_SECRETA_AQUI');

$payload = @file_get_contents('php://input');
$event = null;

try {
    $event = \Stripe\Event::constructFrom(json_decode($payload, true));
} catch(\UnexpectedValueException $e) {
    http_response_code(400); // El JSON está mal formado
    exit();
}

// Si el evento es un pago exitoso
if ($event->type == 'checkout.session.completed') {
    $session = $event->data->object;
    
    // Recuperamos el ID que mandamos desde suscripcion.php
    $id_pago_interno = $session->client_reference_id;
    $stripe_payment_id = $session->payment_intent; // El ID de la transacción bancaria

    $database = new Database();
    $db = $database->getConnection();

    // 1. Actualizamos el pago a 'Aprobado'
    $stmt_pago = $db->prepare("UPDATE pagos_suscripcion SET estado = 'Aprobado', stripe_payment_id = ? WHERE id = ?");
    $stmt_pago->execute([$stripe_payment_id, $id_pago_interno]);

    // 2. Buscamos qué plan compraron
    $stmt_info = $db->prepare("SELECT id_empresa, plan_solicitado FROM pagos_suscripcion WHERE id = ?");
    $stmt_info->execute([$id_pago_interno]);
    $info = $stmt_info->fetch(PDO::FETCH_ASSOC);

    // 3. Activamos a la empresa y le sumamos 30 días
    if ($info) {
        $stmt_empresa = $db->prepare("UPDATE empresas SET estado = 'Activa', id_plan = ?, fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL 30 DAY) WHERE id = ?");
        $stmt_empresa->execute([$info['plan_solicitado'], $info['id_empresa']]);
    }
}

http_response_code(200);
echo "OK";
?>