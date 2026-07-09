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
        // --- SECUENCIA EXTRA: Obtener vehículos para llenar el select del modal ---
        if (isset($_GET['action']) && $_GET['action'] == 'get_vehiculos') {
            $query = "SELECT id as id_vehiculo, placas, marca_modelo FROM vehiculos WHERE id_empresa = :id_empresa AND estado != 'Inactivo'";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }

        // --- LEER DIAGNÓSTICOS (Con JOIN a vehículos) ---
        try {
            $query = "SELECT d.id, d.id_vehiculo, d.fecha, d.evaluador, d.salud_general, d.observaciones, v.placas, v.marca_modelo 
                      FROM diagnosticos d 
                      JOIN vehiculos v ON d.id_vehiculo = v.id 
                      WHERE d.id_empresa = :id_empresa 
                      ORDER BY d.fecha DESC, d.id DESC";
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
        // --- CREAR EVALUACIÓN ---
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id_vehiculo) || !isset($data->fecha) || !isset($data->evaluador) || !isset($data->salud_general)) {
            echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
            exit;
        }
        try {
            $query = "INSERT INTO diagnosticos (id_empresa, id_vehiculo, fecha, evaluador, salud_general, observaciones, creado_por) 
                      VALUES (:id_empresa, :id_vehiculo, :fecha, :evaluador, :salud_general, :observaciones, :creado_por)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id_empresa', $id_empresa);
            $stmt->bindParam(':id_vehiculo', $data->id_vehiculo);
            $stmt->bindParam(':fecha', $data->fecha);
            $stmt->bindParam(':evaluador', $data->evaluador);
            $stmt->bindParam(':salud_general', $data->salud_general);
            $stmt->bindParam(':observaciones', $data->observaciones);
            $stmt->bindParam(':creado_por', $id_usuario);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Evaluación registrada exitosamente.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al guardar.']);
        }
        break;

    case 'PUT':
        // --- EDITAR EVALUACIÓN (Solo para corregir errores de captura) ---
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id) || !isset($data->fecha) || !isset($data->evaluador) || !isset($data->salud_general)) {
            echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
            exit;
        }
        try {
            // Nota: No permitimos cambiar el id_vehiculo una vez creado por seguridad
            $query = "UPDATE diagnosticos SET fecha = :fecha, evaluador = :evaluador, salud_general = :salud_general, observaciones = :observaciones 
                      WHERE id = :id AND id_empresa = :id_empresa";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':fecha', $data->fecha);
            $stmt->bindParam(':evaluador', $data->evaluador);
            $stmt->bindParam(':salud_general', $data->salud_general);
            $stmt->bindParam(':observaciones', $data->observaciones);
            $stmt->bindParam(':id', $data->id);
            $stmt->bindParam(':id_empresa', $id_empresa);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Evaluación corregida.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al actualizar.']);
        }
        break;

    case 'DELETE':
        // --- BORRAR EVALUACIÓN FÍSICAMENTE (Al no ser tabla padre, podemos usar DELETE) ---
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id)) {
            echo json_encode(['success' => false, 'message' => 'ID no proporcionado.']);
            exit;
        }
        try {
            $query = "DELETE FROM diagnosticos WHERE id = :id AND id_empresa = :id_empresa";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $data->id);
            $stmt->bindParam(':id_empresa', $id_empresa);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Registro de diagnóstico eliminado.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el registro.']);
        }
        break;
}
?>