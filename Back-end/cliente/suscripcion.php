<?php
session_start();
require_once '../config/database.php';

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
        // --- 1. OBTENER INFORMACIÓN DEL PLAN ACTUAL ---
        if ($action == 'get_mi_plan') {
            try {
                // Traemos los datos de la empresa, su plan y contamos cuántos vehículos activos tiene
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

        // --- 2. OBTENER LA LISTA DE PLANES DISPONIBLES ---
        if ($action == 'get_planes') {
            try {
                $query = "SELECT id, nombre, limite_vehiculos, costo_mensual FROM planes_suscripcion ORDER BY costo_mensual ASC";
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
        // --- 3. SUBIR COMPROBANTE DE PAGO ---
        if (!isset($_POST['id_plan']) || !isset($_POST['monto'])) {
            echo json_encode(['success' => false, 'message' => 'Datos de plan inválidos.']);
            exit;
        }

        try {
            // Manejo del archivo del comprobante
            $comprobante_url = null;
            if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] == 0) {
                $upload_dir = '../../uploads/pagos/';
                if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
                
                $file_name = time() . '_pago_' . preg_replace("/[^a-zA-Z0-9.]/", "", basename($_FILES['comprobante']['name']));
                $target_file = $upload_dir . $file_name;
                
                if (move_uploaded_file($_FILES['comprobante']['tmp_name'], $target_file)) {
                    $comprobante_url = '/uploads/pagos/' . $file_name;
                }
            } else {
                echo json_encode(['success' => false, 'message' => 'El archivo del comprobante es obligatorio.']);
                exit;
            }

            // Insertar el pago como "Pendiente" para que el Admin lo apruebe
            $query = "INSERT INTO pagos_suscripcion (id_empresa, fecha_pago, monto, plan_solicitado, comprobante_url, estado) 
                      VALUES (:id_empresa, CURDATE(), :monto, :plan_solicitado, :comprobante_url, 'Pendiente')";
            $stmt = $db->prepare($query);
            $stmt->execute([
                ':id_empresa' => $id_empresa,
                ':monto' => $_POST['monto'],
                ':plan_solicitado' => $_POST['id_plan'],
                ':comprobante_url' => $comprobante_url
            ]);

            echo json_encode(['success' => true, 'message' => '¡Comprobante enviado con éxito! El administrador validará tu pago a la brevedad.']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al procesar el pago en el servidor.']);
        }
        break;
}
?>