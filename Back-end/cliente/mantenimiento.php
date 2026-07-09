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
$id_usuario = $_SESSION['id_usuario'];
$request_method = $_SERVER["REQUEST_METHOD"];

switch ($request_method) {
    case 'GET':
        // --- OBTENER VEHÍCULOS PARA EL SELECT ---
        if (isset($_GET['action']) && $_GET['action'] == 'get_vehiculos') {
            $query = "SELECT id as id_vehiculo, placas, marca_modelo FROM vehiculos WHERE id_empresa = :id_empresa AND estado != 'Inactivo'";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }

        // --- LEER MANTENIMIENTOS ---
        try {
            $query = "SELECT m.id, m.id_vehiculo, m.fecha, m.tipo, m.costo_total, m.detalle, m.estado, m.factura_url, v.placas, v.marca_modelo 
                      FROM mantenimientos m 
                      JOIN vehiculos v ON m.id_vehiculo = v.id 
                      WHERE m.id_empresa = :id_empresa 
                      ORDER BY m.fecha DESC, m.id DESC";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        }
        break;

    case 'POST':
        // --- REGISTRAR MANTENIMIENTO CON FACTURA ---
        if (!isset($_POST['id_vehiculo']) || !isset($_POST['fecha']) || !isset($_POST['tipo']) || !isset($_POST['costo_total']) || !isset($_POST['detalle']) || !isset($_POST['estado'])) {
            echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios.']);
            exit;
        }

        try {
            // Manejo del archivo (Factura)
            $factura_url = null;
            if (isset($_FILES['factura']) && $_FILES['factura']['error'] == 0) {
                $upload_dir = '../../uploads/';
                if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
                
                $file_name = time() . '_mant_' . preg_replace("/[^a-zA-Z0-9.]/", "", basename($_FILES['factura']['name']));
                $target_file = $upload_dir . $file_name;
                
                if (move_uploaded_file($_FILES['factura']['tmp_name'], $target_file)) {
                    $factura_url = '/uploads/' . $file_name;
                }
            }

            // Insertar en la BD
            $query = "INSERT INTO mantenimientos (id_empresa, id_vehiculo, fecha, tipo, costo_total, detalle, estado, factura_url, creado_por) 
                      VALUES (:id_empresa, :id_vehiculo, :fecha, :tipo, :costo_total, :detalle, :estado, :factura_url, :creado_por)";
            $stmt = $db->prepare($query);
            
            $stmt->bindParam(':id_empresa', $id_empresa);
            $stmt->bindParam(':id_vehiculo', $_POST['id_vehiculo']);
            $stmt->bindParam(':fecha', $_POST['fecha']);
            $stmt->bindParam(':tipo', $_POST['tipo']);
            $stmt->bindParam(':costo_total', $_POST['costo_total']);
            $stmt->bindParam(':detalle', $_POST['detalle']);
            $stmt->bindParam(':estado', $_POST['estado']);
            $stmt->bindParam(':factura_url', $factura_url);
            $stmt->bindParam(':creado_por', $id_usuario);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Servicio registrado correctamente.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al guardar el servicio.']);
        }
        break;

    case 'DELETE':
        // --- BORRAR REGISTRO ---
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id)) {
            echo json_encode(['success' => false, 'message' => 'ID no proporcionado.']);
            exit;
        }
        try {
            $query = "DELETE FROM mantenimientos WHERE id = :id AND id_empresa = :id_empresa";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $data->id);
            $stmt->bindParam(':id_empresa', $id_empresa);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Servicio eliminado del historial.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el registro.']);
        }
        break;
}
?>