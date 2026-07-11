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
        if (isset($_GET['action']) && $_GET['action'] == 'get_vehiculos') {
            $query = "SELECT id as id_vehiculo, placas, marca_modelo FROM vehiculos WHERE id_empresa = :id_empresa AND estado != 'Inactivo'";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }

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
        // Validación ultra-segura sin usar símbolos || para evitar corrupciones de texto
        $campos_obligatorios = ['id_vehiculo', 'fecha', 'tipo', 'costo_total', 'detalle', 'estado'];
        $faltan_datos = false;

        foreach ($campos_obligatorios as $campo) {
            if (!isset($_POST[$campo])) {
                $faltan_datos = true;
                break;
            }
        }

        if ($faltan_datos) {
            echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios.']);
            exit;
        }

        try {
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

            $id_mantenimiento = isset($_POST['id_mantenimiento']) && !empty($_POST['id_mantenimiento']) ? $_POST['id_mantenimiento'] : null;
            $est_mant = strtolower(trim($_POST['estado']));

            if ($id_mantenimiento) {
                $query = "UPDATE mantenimientos SET id_vehiculo = :id_vehiculo, fecha = :fecha, tipo = :tipo, costo_total = :costo_total, detalle = :detalle, estado = :estado";
                if ($factura_url) { $query .= ", factura_url = :factura_url"; }
                $query .= " WHERE id = :id AND id_empresa = :id_empresa";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(':id', $id_mantenimiento);
                $stmt->bindParam(':id_empresa', $id_empresa);
                if ($factura_url) { $stmt->bindParam(':factura_url', $factura_url); }
            } else {
                $query = "INSERT INTO mantenimientos (id_empresa, id_vehiculo, fecha, tipo, costo_total, detalle, estado, factura_url, creado_por) 
                          VALUES (:id_empresa, :id_vehiculo, :fecha, :tipo, :costo_total, :detalle, :estado, :factura_url, :creado_por)";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':id_empresa', $id_empresa);
                $stmt->bindParam(':factura_url', $factura_url);
                $stmt->bindParam(':creado_por', $id_usuario);
            }

            $stmt->bindParam(':id_vehiculo', $_POST['id_vehiculo']);
            $stmt->bindParam(':fecha', $_POST['fecha']);
            $stmt->bindParam(':tipo', $_POST['tipo']);
            $stmt->bindParam(':costo_total', $_POST['costo_total']);
            $stmt->bindParam(':detalle', $_POST['detalle']);
            $stmt->bindParam(':estado', $_POST['estado']);

            if ($stmt->execute()) {
                if ($est_mant == 'en taller' || $est_mant == 'taller' || $est_mant == 'pendiente' || $est_mant == 'en proceso') {
                    $db->prepare("UPDATE vehiculos SET estado = 'En Taller' WHERE id = ? AND estado != 'Inactivo'")->execute([$_POST['id_vehiculo']]);
                } elseif ($est_mant == 'completado' || $est_mant == 'finalizado' || $est_mant == 'listo' || $est_mant == 'terminado') {
                    $db->prepare("UPDATE vehiculos SET estado = 'Activo' WHERE id = ? AND estado != 'Inactivo'")->execute([$_POST['id_vehiculo']]);
                }
                
                $mensajeFinal = $id_mantenimiento ? 'Servicio actualizado correctamente.' : 'Servicio registrado correctamente.';
                echo json_encode(['success' => true, 'message' => $mensajeFinal]);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al procesar la solicitud.']);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id) || !isset($data->estado)) { echo json_encode(['success' => false, 'message' => 'Datos incompletos.']); exit; }

        try {
            $stmt_info = $db->prepare("SELECT id_vehiculo FROM mantenimientos WHERE id = ? AND id_empresa = ?");
            $stmt_info->execute([$data->id, $id_empresa]);
            $info = $stmt_info->fetch(PDO::FETCH_ASSOC);

            if ($info) {
                $id_vehiculo = $info['id_vehiculo'];
                $db->prepare("UPDATE mantenimientos SET estado = ? WHERE id = ?")->execute([$data->estado, $data->id]);
                if (strtolower($data->estado) === 'completado') {
                    $db->prepare("UPDATE vehiculos SET estado = 'Activo' WHERE id = ? AND estado != 'Inactivo'")->execute([$id_vehiculo]);
                }
                echo json_encode(['success' => true, 'message' => '¡Servicio completado! El vehículo vuelve a estar Activo.']);
            } else { echo json_encode(['success' => false, 'message' => 'Registro no encontrado.']); }
        } catch (PDOException $e) { echo json_encode(['success' => false, 'message' => 'Error al actualizar el estado.']); }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id)) { echo json_encode(['success' => false, 'message' => 'ID no proporcionado.']); exit; }
        try {
            $stmt_info = $db->prepare("SELECT id_vehiculo FROM mantenimientos WHERE id = ? AND id_empresa = ?");
            $stmt_info->execute([$data->id, $id_empresa]);
            $info = $stmt_info->fetch(PDO::FETCH_ASSOC);

            $stmt = $db->prepare("DELETE FROM mantenimientos WHERE id = :id AND id_empresa = :id_empresa");
            if ($stmt->execute([':id' => $data->id, ':id_empresa' => $id_empresa])) {
                if ($info) { $db->prepare("UPDATE vehiculos SET estado = 'Activo' WHERE id = ? AND estado != 'Inactivo'")->execute([$info['id_vehiculo']]); }
                echo json_encode(['success' => true, 'message' => 'Servicio eliminado.']);
            }
        } catch (PDOException $e) { echo json_encode(['success' => false, 'message' => 'Error al eliminar.']); }
        break;
}
?>