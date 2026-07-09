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
        // --- LEER VEHÍCULOS ---
        try {
            
            $query = "SELECT id as id_vehiculo, placas, marca_modelo, anio, kilometraje_actual, estado 
                      FROM vehiculos 
                      WHERE id_empresa = :id_empresa AND estado != 'Inactivo' 
                      ORDER BY id DESC";
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
        // --- CREAR VEHÍCULO ---
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->placas) || !isset($data->marca_modelo) || !isset($data->anio) || !isset($data->kilometraje_inicial)) {
            echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
            exit;
        }
        try {
            $query = "INSERT INTO vehiculos (id_empresa, placas, marca_modelo, anio, kilometraje_inicial, kilometraje_actual, estado, creado_por) 
                      VALUES (:id_empresa, :placas, :marca_modelo, :anio, :km_inicial, :km_actual, :estado, :creado_por)";
            $stmt = $db->prepare($query);
            
            $stmt->bindParam(':id_empresa', $id_empresa);
            $stmt->bindParam(':placas', $data->placas);
            $stmt->bindParam(':marca_modelo', $data->marca_modelo);
            $stmt->bindParam(':anio', $data->anio);
            $stmt->bindParam(':km_inicial', $data->kilometraje_inicial);
            $stmt->bindParam(':km_actual', $data->kilometraje_inicial);
            $stmt->bindParam(':estado', $data->estado);
            $stmt->bindParam(':creado_por', $id_usuario);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Vehículo registrado.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al guardar. Verifica que las placas no estén duplicadas.']);
        }
        break;

    case 'PUT':
        // --- EDITAR VEHÍCULO ---
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id_vehiculo) || !isset($data->placas) || !isset($data->marca_modelo) || !isset($data->anio) || !isset($data->estado)) {
            echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
            exit;
        }
        try {
            $query = "UPDATE vehiculos SET placas = :placas, marca_modelo = :marca_modelo, anio = :anio, estado = :estado 
                      WHERE id = :id_vehiculo AND id_empresa = :id_empresa";
            $stmt = $db->prepare($query);
            
            $stmt->bindParam(':placas', $data->placas);
            $stmt->bindParam(':marca_modelo', $data->marca_modelo);
            $stmt->bindParam(':anio', $data->anio);
            $stmt->bindParam(':estado', $data->estado);
            $stmt->bindParam(':id_vehiculo', $data->id_vehiculo);
            $stmt->bindParam(':id_empresa', $id_empresa);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Vehículo actualizado.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al actualizar.']);
        }
        break;

    case 'DELETE':
        // --- ELIMINAR VEHÍCULO (Baja lógica) ---
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id_vehiculo)) {
            echo json_encode(['success' => false, 'message' => 'ID no proporcionado.']);
            exit;
        }
        try {
            // No lo borramos físicamente, lo marcamos como 'Inactivo'
            $query = "UPDATE vehiculos SET estado = 'Inactivo' WHERE id = :id_vehiculo AND id_empresa = :id_empresa";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id_vehiculo', $data->id_vehiculo);
            $stmt->bindParam(':id_empresa', $id_empresa);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Vehículo dado de baja.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar.']);
        }
        break;
}
?>