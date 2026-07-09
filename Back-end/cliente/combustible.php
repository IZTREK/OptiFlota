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
            $query = "SELECT c.id, c.id_vehiculo, c.fecha, c.estacion, c.litros, c.costo_total, c.odometro, c.comprobante_url, c.origen_registro, v.placas 
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
        // ---IMPORTACIÓN MASIVA DESDE EXCEL ---
        if (isset($_GET['action']) && $_GET['action'] == 'importar') {
            $registros = json_decode(file_get_contents("php://input"));
            
            if (!is_array($registros)) {
                echo json_encode(['success' => false, 'message' => 'Formato de datos inválido.']);
                exit;
            }

            // 1. Obtener vehículos de la base de datos y "Normalizarlos"
            $qVehiculos = "SELECT id, placas FROM vehiculos WHERE id_empresa = :id_empresa AND estado != 'Inactivo'";
            $stmtV = $db->prepare($qVehiculos);
            $stmtV->execute([':id_empresa' => $id_empresa]);
            $vehiculosDB = $stmtV->fetchAll(PDO::FETCH_ASSOC);
            
            $mapaVehiculos = [];
            foreach ($vehiculosDB as $v) {
                // Quitamos espacios, guiones y forzamos mayúsculas (Ej: "Nissan 123" -> "NISSAN123")
                $placaLimpia = preg_replace('/[^A-Z0-9]/', '', strtoupper($v['placas']));
                $mapaVehiculos[$placaLimpia] = $v['id'];
            }

            $exitos = 0; $duplicados = 0; $errores = [];

            // Preparar consultas
            $qInsert = "INSERT INTO cargas_combustible (id_empresa, id_vehiculo, fecha, estacion, litros, costo_total, odometro, origen_registro, creado_por) 
                        VALUES (:id_empresa, :id_vehiculo, :fecha, 'Importación Edenred/CSV', :litros, :costo_total, :odometro, 'Importacion_Excel', :creado_por)";
            $stmtInsert = $db->prepare($qInsert);

            // Consulta para la Firma Única (Anti-Duplicados)
            $qCheck = "SELECT id FROM cargas_combustible WHERE id_vehiculo = :id_vehiculo AND fecha = :fecha AND costo_total = :costo_total";
            $stmtCheck = $db->prepare($qCheck);

            $update_km = "UPDATE vehiculos SET kilometraje_actual = :odometro WHERE id = :id_vehiculo AND kilometraje_actual < :odometro";
            $stmtKm = $db->prepare($update_km);

            foreach ($registros as $row) {
                $placaExcelLimpia = preg_replace('/[^A-Z0-9]/', '', strtoupper($row->placas));
                
                // 2. Comprobar si el vehículo existe
                if (!isset($mapaVehiculos[$placaExcelLimpia])) {
                    $errores[] = $row->placas; // No existe en la BD
                    continue;
                }

                $id_vehiculo = $mapaVehiculos[$placaExcelLimpia];
                $fecha = $row->fecha;
                // Limpiar símbolos de moneda o comas de los números
                $costo_total = floatval(preg_replace('/[^0-9.]/', '', $row->costo_total));
                $litros = floatval(preg_replace('/[^0-9.]/', '', $row->litros));
                $odometro = floatval(preg_replace('/[^0-9.]/', '', $row->odometro));

                // 3. Comprobar Duplicados (Vehículo + Fecha + Costo = Identificador Único)
                $stmtCheck->execute([':id_vehiculo' => $id_vehiculo, ':fecha' => $fecha, ':costo_total' => $costo_total]);
                if ($stmtCheck->rowCount() > 0) {
                    $duplicados++;
                    continue; 
                }

                // 4. Insertar y actualizar Odómetro
                try {
                    $stmtInsert->execute([
                        ':id_empresa' => $id_empresa, ':id_vehiculo' => $id_vehiculo, ':fecha' => $fecha,
                        ':litros' => $litros, ':costo_total' => $costo_total, ':odometro' => $odometro, ':creado_por' => $id_usuario
                    ]);

                    if ($odometro > 0) {
                        $stmtKm->execute([':odometro' => $odometro, ':id_vehiculo' => $id_vehiculo]);
                    }
                    $exitos++;
                } catch (Exception $e) {
                    $errores[] = "Error SQL: " . $row->placas;
                }
            }

            echo json_encode(['success' => true, 'exitos' => $exitos, 'duplicados' => $duplicados, 'errores' => $errores]);
            exit;
        }

        // --- REGISTRO MANUAL TRADICIONAL ---
        if (!isset($_POST['id_vehiculo']) || !isset($_POST['fecha']) || !isset($_POST['litros']) || !isset($_POST['costo_total'])) {
            echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios.']);
            exit;
        }

        try {
            $db->beginTransaction(); 
            $comprobante_url = null;
            if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] == 0) {
                $upload_dir = '../../uploads/';
                if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
                $file_name = time() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "", basename($_FILES['comprobante']['name']));
                if (move_uploaded_file($_FILES['comprobante']['tmp_name'], $upload_dir . $file_name)) {
                    $comprobante_url = '/uploads/' . $file_name; 
                }
            }

            $query = "INSERT INTO cargas_combustible (id_empresa, id_vehiculo, fecha, estacion, litros, costo_total, odometro, comprobante_url, creado_por) 
                      VALUES (:id_empresa, :id_vehiculo, :fecha, :estacion, :litros, :costo_total, :odometro, :comprobante_url, :creado_por)";
            $stmt = $db->prepare($query);
            $estacion = isset($_POST['estacion']) ? $_POST['estacion'] : 'No especificada';
            $odometro = isset($_POST['odometro']) ? $_POST['odometro'] : 0;

            $stmt->execute([
                ':id_empresa' => $id_empresa, ':id_vehiculo' => $_POST['id_vehiculo'], ':fecha' => $_POST['fecha'],
                ':estacion' => $estacion, ':litros' => $_POST['litros'], ':costo_total' => $_POST['costo_total'],
                ':odometro' => $odometro, ':comprobante_url' => $comprobante_url, ':creado_por' => $id_usuario
            ]);

            if($odometro > 0) {
                $db->prepare("UPDATE vehiculos SET kilometraje_actual = :od WHERE id = :id_v AND kilometraje_actual < :od")
                   ->execute([':od' => $odometro, ':id_v' => $_POST['id_vehiculo']]);
            }

            $db->commit(); 
            echo json_encode(['success' => true, 'message' => 'Carga registrada correctamente.']);

        } catch (PDOException $e) {
            $db->rollBack();
            echo json_encode(['success' => false, 'message' => 'Error al guardar la carga.']);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id)) { echo json_encode(['success' => false, 'message' => 'ID no proporcionado.']); exit; }
        try {
            $stmt = $db->prepare("DELETE FROM cargas_combustible WHERE id = :id AND id_empresa = :id_empresa");
            if ($stmt->execute([':id' => $data->id, ':id_empresa' => $id_empresa])) {
                echo json_encode(['success' => true, 'message' => 'Registro eliminado.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el registro.']);
        }
        break;
}
?>