<?php
session_start();
require_once '../config/database.php';
require_once '../../vendor/autoload.php'; // Cargamos Stripe

header('Content-Type: application/json');

if (!isset($_SESSION['id_empresa'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado.']);
    exit;
}

$database = new Database();
$db = $database->getConnection();
$id_empresa = $_SESSION['id_empresa'];
$request_method = $_SERVER["REQUEST_METHOD"];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($request_method) {
    case 'GET':
        if ($action == 'get_mi_plan') {
            try {
                $query = "SELECT e.estado, e.fecha_vencimiento, p.nombre as plan, p.limite_vehiculos,
                                 (SELECT COUNT(*) FROM vehiculos WHERE id_empresa = e.id AND estado != 'Inactivo') as total_vehiculos
                          FROM empresas e
                          JOIN planes_suscripcion p ON e.id_plan = p.id
                          WHERE e.id = :id_empresa";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);
                $stmt->execute();
                echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
            } catch (PDOException $e) {
                echo json_encode(['error' => $e->getMessage()]);
            }
            exit;
        }

        if ($action == 'get_planes') {
            try {
                $query = "SELECT id, nombre, limite_vehiculos, costo_mensual, mod_vehiculos, mod_combustible, mod_diagnosticos, mod_mantenimiento, mod_tickets FROM planes_suscripcion ORDER BY costo_mensual ASC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            } catch (PDOException $e) {
                echo json_encode(['error' => $e->getMessage()]);
            }
            exit;
        }
        break;

    case 'POST':
        if (!isset($_POST['id_plan']) || !isset($_POST['monto'])) {
            echo json_encode(['success' => false, 'message' => 'Datos de plan inválidos.']);
            exit;
        }
        try {
            // 1. Guardar pago Pendiente en BD
            $query = "INSERT INTO pagos_suscripcion (id_empresa, fecha_pago, monto, plan_solicitado, estado) 
                      VALUES (:id_empresa, CURDATE(), :monto, :plan_solicitado, 'Pendiente')";
            $stmt = $db->prepare($query);
            $stmt->execute([
                ':id_empresa' => $id_empresa, 
                ':monto' => $_POST['monto'],
                ':plan_solicitado' => $_POST['id_plan']
            ]);
            $id_pago = $db->lastInsertId();

            // 2. Configurar Stripe
            // REEMPLAZAR POR EL REAL ESTE ES EL DE PRUEBA
            // Aquí pondrás tu Secret Key de prueba (empieza con sk_test_...)
            \Stripe\Stripe::setApiKey('sk_test_51TrepOGz0qKL4xBEVqKrIBXd4tsdQmNLT7iNTTktNg3jE6H1yRb73nPFmH1207bSXyxKxo8XcMJMq7Ty6VlMRQPu00U6hJ0A27');

            // 3. Crear la sesión de pago (Checkout)
            $checkout_session = \Stripe\Checkout\Session::create([
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price_data' => [
                        'currency' => 'mxn',
                        'product_data' => [
                            'name' => 'Suscripción OptiFlota',
                        ],
                        'unit_amount' => (int)($_POST['monto'] * 100), // Stripe pide el valor en centavos
                    ],
                    'quantity' => 1,
                ]],
                'mode' => 'payment',
                // Enviamos nuestro ID interno para reconocerlo cuando paguen
                'client_reference_id' => (string)$id_pago,
                // A dónde regresan tras pagar o cancelar
                'success_url' => 'http://localhost:9090/Front-end/Cliente/suscripcion/suscripcion.html',
                'cancel_url' => 'http://localhost:9090/Front-end/Cliente/suscripcion/suscripcion.html',
            ]);

            // 4. Actualizamos la BD con el ID de la sesión de Stripe
            $db->prepare("UPDATE pagos_suscripcion SET stripe_session_id = ? WHERE id = ?")
               ->execute([$checkout_session->id, $id_pago]);

            // 5. Devolvemos la URL al JS para redirigir
            echo json_encode(['success' => true, 'init_point' => $checkout_session->url]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Error con Stripe: ' . $e->getMessage()]);
        }
        break;
}
?>