<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

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
        try {
            $query = "SELECT id as id_vehiculo, placas, marca_modelo, anio, kilometraje_actual, rendimiento_ideal, estado 
                      FROM vehiculos WHERE id_empresa = :id_empresa ORDER BY id DESC";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            http_response_code(500); echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        }
        break;

    case 'POST':
        if (isset($_GET['action']) && $_GET['action'] == 'importar') {
            $registros = json_decode(file_get_contents("php://input"));
            if (!is_array($registros)) { echo json_encode(['success' => false, 'message' => 'Formato inválido.']); exit; }

            $qLimite = "SELECT p.limite_vehiculos, (SELECT COUNT(*) FROM vehiculos WHERE id_empresa = :id1 AND estado != 'Inactivo') as total 
                        FROM empresas e JOIN planes_suscripcion p ON e.id_plan = p.id WHERE e.id = :id2";
            $stmtLimite = $db->prepare($qLimite);
            $stmtLimite->execute([':id1' => $id_empresa, ':id2' => $id_empresa]);
            $limiteData = $stmtLimite->fetch(PDO::FETCH_ASSOC);

            $espacio_disponible = $limiteData['limite_vehiculos'] - $limiteData['total'];
            
            if (count($registros) > $espacio_disponible) {
                echo json_encode(['success' => false, 'message' => "¡Límite excedido! Tienes espacio para $espacio_disponible vehículo(s) más, pero tu Excel contiene " . count($registros) . "."]);
                exit;
            }

            $qExistentes = "SELECT placas FROM vehiculos WHERE id_empresa = :id_empresa AND estado != 'Inactivo'";
            $stmtE = $db->prepare($qExistentes);
            $stmtE->execute([':id_empresa' => $id_empresa]);
            $placas_bd = $stmtE->fetchAll(PDO::FETCH_COLUMN);
            $mapaExistentes = array_map(function($p) { return preg_replace('/[^A-Z0-9]/', '', strtoupper($p)); }, $placas_bd);

            $exitos = 0; $duplicados = 0; $errores = [];
            
            $qInsert = "INSERT INTO vehiculos (id_empresa, placas, marca_modelo, anio, kilometraje_inicial, kilometraje_actual, estado, creado_por) 
                        VALUES (:id_empresa, :placas, :marca, :anio, :km, :km, :estado, :creado_por)";
            $stmtInsert = $db->prepare($qInsert);

            foreach ($registros as $row) {
                $placaLimpia = preg_replace('/[^A-Z0-9]/', '', strtoupper($row->placas));
                if (in_array($placaLimpia, $mapaExistentes)) { $duplicados++; continue; }

                $estado = strtolower($row->estado ?? 'activo');
                if($estado != 'activo' && $estado != 'en taller' && $estado != 'inactivo') $estado = 'activo';

                try {
                    $stmtInsert->execute([
                        ':id_empresa' => $id_empresa, ':placas' => htmlspecialchars(strip_tags($row->placas)),
                        ':marca' => htmlspecialchars(strip_tags($row->marca_modelo)), ':anio' => intval($row->anio),
                        ':km' => floatval($row->kilometraje ?? 0), ':estado' => ucfirst($estado), ':creado_por' => $id_usuario
                    ]);
                    $mapaExistentes[] = $placaLimpia;
                    $exitos++;
                } catch (Exception $e) { $errores[] = $row->placas; }
            }
            echo json_encode(['success' => true, 'exitos' => $exitos, 'duplicados' => $duplicados, 'errores' => $errores]);
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));
        
        // Validación limpia que soluciona el problema de las barras (||)
        if (!isset($data->placas, $data->marca_modelo, $data->anio, $data->kilometraje_inicial, $data->rendimiento_ideal)) {
            http_response_code(400); 
            echo json_encode(['success' => false, 'message' => 'Datos incompletos para el registro.']); 
            exit;
        }

        try {
            $qLimite = "SELECT p.limite_vehiculos, (SELECT COUNT(*) FROM vehiculos WHERE id_empresa = :id1 AND estado != 'Inactivo') as total FROM empresas e JOIN planes_suscripcion p ON e.id_plan = p.id WHERE e.id = :id2";
            $stmtLimite = $db->prepare($qLimite);
            $stmtLimite->execute([':id1' => $id_empresa, ':id2' => $id_empresa]);
            $limiteData = $stmtLimite->fetch(PDO::FETCH_ASSOC);

            if ($limiteData['total'] >= $limiteData['limite_vehiculos']) {
                echo json_encode(['success' => false, 'message' => 'Límite alcanzado. Tu plan permite un máximo de ' . $limiteData['limite_vehiculos'] . ' vehículos. ¡Actualiza tu suscripción!']);
                exit;
            }

            $query = "INSERT INTO vehiculos (id_empresa, placas, marca_modelo, anio, kilometraje_inicial, kilometraje_actual, rendimiento_ideal, estado, creado_por) VALUES (:id_empresa, :placas, :marca, :anio, :km, :km, :rendimiento, :estado, :creado_por)";
            $stmt = $db->prepare($query);
            $stmt->execute([
                ':id_empresa' => $id_empresa, 
                ':placas' => htmlspecialchars(strip_tags($data->placas)),
                ':marca' => htmlspecialchars(strip_tags($data->marca_modelo)), 
                ':anio' => intval($data->anio),
                ':km' => floatval($data->kilometraje_inicial), 
                ':rendimiento' => floatval($data->rendimiento_ideal),
                ':estado' => htmlspecialchars(strip_tags($data->estado ?? 'Activo')), 
                ':creado_por' => $id_usuario
            ]);
            http_response_code(201); echo json_encode(['success' => true, 'message' => 'Vehículo registrado con éxito.']);
        } catch (PDOException $e) {
            http_response_code(500); 
            if ($e->getCode() == 23000) echo json_encode(['success' => false, 'message' => 'Las placas ingresadas ya existen.']);
            else echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));
        
        // Asignación ultra-segura
        $placas = $data->placas ?? '';
        $marca = $data->marca_modelo ?? '';
        $anio = $data->anio ?? 0;
        $rendimiento = floatval($data->rendimiento_ideal ?? 0);
        $estado = $data->estado ?? 'Activo';
        $id_veh_actual = $data->id_vehiculo ?? 0;

        if (empty($id_veh_actual)) {
            echo json_encode(['success' => false, 'message' => 'No se recibió el ID del vehículo a editar.']);
            exit;
        }

        try {
            $query = "UPDATE vehiculos SET placas = :placas, marca_modelo = :marca, anio = :anio, rendimiento_ideal = :rendimiento, estado = :estado WHERE id = :id_vehiculo AND id_empresa = :id_empresa";
            $stmt = $db->prepare($query);
            $stmt->execute([
                ':placas' => $placas, 
                ':marca' => $marca, 
                ':anio' => $anio,
                ':rendimiento' => $rendimiento,
                ':estado' => $estado, 
                ':id_vehiculo' => $id_veh_actual, 
                ':id_empresa' => $id_empresa
            ]);
            echo json_encode(['success' => true, 'message' => 'Vehículo actualizado con éxito.']);
        } catch (PDOException $e) { 
            if ($e->getCode() == 23000) {
                echo json_encode(['success' => false, 'message' => 'No se pudo actualizar: Las placas ingresadas ya pertenecen a otro vehículo.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]); 
            }
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));
        try {
            $stmt = $db->prepare("UPDATE vehiculos SET estado = 'Inactivo' WHERE id = :id_vehiculo AND id_empresa = :id_empresa");
            $stmt->execute([':id_vehiculo' => $data->id_vehiculo, ':id_empresa' => $id_empresa]);
            echo json_encode(['success' => true, 'message' => 'Vehículo dado de baja.']);
        } catch (PDOException $e) { echo json_encode(['success' => false, 'message' => 'Error al eliminar.']); }
        break;
}
?>