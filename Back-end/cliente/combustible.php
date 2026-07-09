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
        // --- SECUENCIA EXTRA: Obtener vehículos para el select ---
        if (isset($_GET['action']) && $_GET['action'] == 'get_vehiculos') {
            $query = "SELECT id as id_vehiculo, placas, marca_modelo FROM vehiculos WHERE id_empresa = :id_empresa AND estado != 'Inactivo'";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }

        // --- LEER CARGAS DE COMBUSTIBLE ---
        try {
            $query = "SELECT c.id, c.id_vehiculo, c.fecha, c.estacion, c.litros, c.costo_total, c.odometro, c.comprobante_url, v.placas 
                      FROM cargas_combustible c 
                      JOIN vehiculos v ON c.id_vehiculo = v.id 
                      WHERE c.id_empresa = :id_empresa 
                      ORDER BY c.fecha DESC, c.id DESC";
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
        // --- CREAR CARGA DE COMBUSTIBLE (Usa $_POST y $_FILES por el envío del ticket) ---
        if (!isset($_POST['id_vehiculo']) || !isset($_POST['fecha']) || !isset($_POST['litros']) || !isset($_POST['costo_total']) || !isset($_POST['odometro'])) {
            echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios.']);
            exit;
        }

        try {
            $db->beginTransaction(); // Iniciamos transacción (si falla la carga o el km, se deshace todo)

            // 1. Manejo del archivo (Comprobante)
            $comprobante_url = null;
            if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] == 0) {
                // Asegurarse de que la carpeta existe
                $upload_dir = '../../uploads/';
                if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
                
                // Nombre único para evitar sobreescritura
                $file_name = time() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "", basename($_FILES['comprobante']['name']));
                $target_file = $upload_dir . $file_name;
                
                if (move_uploaded_file($_FILES['comprobante']['tmp_name'], $target_file)) {
                    $comprobante_url = '/uploads/' . $file_name; // Ruta relativa para el src del HTML
                }
            }

            // 2. Insertar en la tabla cargas_combustible
            $query = "INSERT INTO cargas_combustible (id_empresa, id_vehiculo, fecha, estacion, litros, costo_total, odometro, comprobante_url, creado_por) 
                      VALUES (:id_empresa, :id_vehiculo, :fecha, :estacion, :litros, :costo_total, :odometro, :comprobante_url, :creado_por)";
            $stmt = $db->prepare($query);
            
            $estacion = isset($_POST['estacion']) ? $_POST['estacion'] : 'No especificada';

            $stmt->bindParam(':id_empresa', $id_empresa);
            $stmt->bindParam(':id_vehiculo', $_POST['id_vehiculo']);
            $stmt->bindParam(':fecha', $_POST['fecha']);
            $stmt->bindParam(':estacion', $estacion);
            $stmt->bindParam(':litros', $_POST['litros']);
            $stmt->bindParam(':costo_total', $_POST['costo_total']);
            $stmt->bindParam(':odometro', $_POST['odometro']);
            $stmt->bindParam(':comprobante_url', $comprobante_url);
            $stmt->bindParam(':creado_por', $id_usuario);
            $stmt->execute();

            // 3. Magia: Actualizar el kilometraje del vehículo si el odómetro nuevo es mayor al anterior
            $update_km = "UPDATE vehiculos SET kilometraje_actual = :odometro WHERE id = :id_vehiculo AND kilometraje_actual < :odometro";
            $stmtKm = $db->prepare($update_km);
            $stmtKm->execute([
                ':odometro' => $_POST['odometro'],
                ':id_vehiculo' => $_POST['id_vehiculo']
            ]);

            $db->commit(); // Confirmar transacción
            echo json_encode(['success' => true, 'message' => 'Carga registrada y kilometraje actualizado.']);

        } catch (PDOException $e) {
            $db->rollBack();
            echo json_encode(['success' => false, 'message' => 'Error al guardar la carga.']);
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
            $query = "DELETE FROM cargas_combustible WHERE id = :id AND id_empresa = :id_empresa";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $data->id);
            $stmt->bindParam(':id_empresa', $id_empresa);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Registro eliminado.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el registro.']);
        }
        break;
}
?>