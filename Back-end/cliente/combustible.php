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
$db =$database->getConnection();
$id_empresa =$_SESSION['id_empresa'];
$id_usuario =$_SESSION['id_usuario'];
$request_method =$_SERVER["REQUEST_METHOD"];

switch ($request_method) {
    case 'GET':
        if (isset($_GET['action']) && $_GET['action'] == 'get_vehiculos') {$query = "SELECT id as id_vehiculo, placas, marca_modelo FROM vehiculos WHERE id_empresa = :id_empresa AND estado != 'Inactivo'";
            $stmt =$db->prepare($query);$stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);$stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }

        //  "Hoja Dinámica" (Vista de Análisis)
        if (isset($_GET['action']) &&$_GET['action'] == 'get_analisis') {
            try {
                $query = "SELECT * FROM vista_analisis_combustible WHERE id_empresa = :id_empresa ORDER BY Fecha_Carga DESC";
                $stmt =$db->prepare($query);$stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);$stmt->execute();
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
            }
            exit;
        }

        try {
            $query = "SELECT c.id, c.id_vehiculo, c.fecha, c.estacion, c.litros, c.costo_total, c.odometro, c.comprobante_url, c.origen_registro, v.placas 
                      FROM cargas_combustible c 
                      JOIN vehiculos v ON c.id_vehiculo = v.id 
                      WHERE c.id_empresa = :id_empresa 
                      ORDER BY c.fecha DESC, c.id DESC";
            $stmt =$db->prepare($query);$stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);$stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        }
        break;

    case 'POST':
        // ---IMPORTACIÓN MASIVA DESDE EXCEL ---
        if (isset($_GET['action']) && $_GET['action'] == 'importar') {$registros = json_decode(file_get_contents("php://input"));
            
            if (!is_array($registros)) {
                echo json_encode(['success' => false, 'message' => 'Formato de datos inválido.']);
                exit;
            }

            // Obtener vehículos y su info actual para cálculos matemáticos
            $qVehiculos = "SELECT id, placas, kilometraje_actual, rendimiento_ideal FROM vehiculos WHERE id_empresa = :id_empresa AND estado != 'Inactivo'";
            $stmtV =$db->prepare($qVehiculos);$stmtV->execute([':id_empresa' => $id_empresa]);$vehiculosDB = $stmtV->fetchAll(PDO::FETCH_ASSOC);$mapaVehiculos = [];
            foreach ($vehiculosDB as$v) {
                $placaLimpia = preg_replace('/[^A-Z0-9]/', '', strtoupper($v['placas']));
                $mapaVehiculos[$placaLimpia] = [
                    'id' => $v['id'],
                    'km_actual' => $v['kilometraje_actual'],
                    'rendimiento_ideal' => $v['rendimiento_ideal']
                ];
            }

            $exitos = 0; $duplicados = 0; $errores = [];

            // Preparar consultas
            $qInsert = "INSERT INTO cargas_combustible (id_empresa, id_vehiculo, fecha, estacion, litros, costo_total, kilometraje_anterior, odometro, distancia_recorrida, rendimiento_real, diferencia_rendimiento, confiabilidad, origen_registro, creado_por) 
                        VALUES (:id_empresa, :id_vehiculo, :fecha, 'Importación Excel', :litros, :costo_total, :km_anterior, :odometro, :distancia, :rend_real, :diferencia, :confiabilidad, 'Importacion_Excel', :creado_por)";
            $stmtInsert = $db->prepare($qInsert);

            $qCheck = "SELECT id FROM cargas_combustible WHERE id_vehiculo = :id_vehiculo AND fecha = :fecha AND costo_total = :costo_total";
            $stmtCheck = $db->prepare($qCheck);

            $update_km = "UPDATE vehiculos SET kilometraje_actual = :odometro WHERE id = :id_vehiculo AND kilometraje_actual < :odometro";
            $stmtKm = $db->prepare($update_km);

            foreach ($registros as$row) {
                $placaExcelLimpia = preg_replace('/[^A-Z0-9]/', '', strtoupper($row->placas));
                
                if (!isset($mapaVehiculos[$placaExcelLimpia])) {
                    $errores[] =$row->placas; 
                    continue;
                }

                $vehiculoData = $mapaVehiculos[$placaExcelLimpia];
                $id_vehiculo =$vehiculoData['id'];
                $fecha =$row->fecha;
                $costo_total = floatval(preg_replace('/[^0-9.]/', '',$row->costo_total));
                $litros = floatval(preg_replace('/[^0-9.]/', '',$row->litros));
                $odometro = floatval(preg_replace('/[^0-9.]/', '',$row->odometro));

                $stmtCheck->execute([':id_vehiculo' =>$id_vehiculo, ':fecha' => $fecha, ':costo_total' =>$costo_total]);
                if ($stmtCheck->rowCount() > 0) {$duplicados++; continue; }

                // --- CÁLCULOS MATEMÁTICOS DE RENDIMIENTO ---
                $km_anterior = $vehiculoData['km_actual'];$distancia = ($odometro >$km_anterior) ? ($odometro -$km_anterior) : 0;
                $rend_real = ($litros > 0 &&$distancia > 0) ? ($distancia / $litros) : 0;
                
                $confiabilidad = 'OK';$diferencia_porcentual = 0;
                $rend_ideal =$vehiculoData['rendimiento_ideal'];

                if ($rend_ideal > 0 &&$rend_real > 0) {
                    $diferencia_porcentual = abs($rend_real - $rend_ideal) /$rend_ideal;
                    if ($diferencia_porcentual > 0.21) {$confiabilidad = 'Error / Sospechoso (>21%)';
                    }
                } elseif ($rend_real <= 0) {$confiabilidad = 'Error en km';
                }

                try {
                    $stmtInsert->execute([
                        ':id_empresa' => $id_empresa, ':id_vehiculo' => $id_vehiculo, ':fecha' =>$fecha,
                        ':litros' => $litros, ':costo_total' => $costo_total, ':km_anterior' =>$km_anterior, 
                        ':odometro' => $odometro, ':distancia' => $distancia, ':rend_real' =>$rend_real, 
                        ':diferencia' => $diferencia_porcentual, ':confiabilidad' => $confiabilidad, ':creado_por' =>$id_usuario
                    ]);

                    if ($odometro > $km_anterior) {$stmtKm->execute([':odometro' => $odometro, ':id_vehiculo' =>$id_vehiculo]);
                        // Actualizar en memoria para el siguiente loop
                        $mapaVehiculos[$placaExcelLimpia]['km_actual'] =$odometro;
                    }
                    $exitos++;
                } catch (Exception $e) {
                    $errores[] = "Error SQL: " . $row->placas;
                }
            }

            echo json_encode(['success' => true, 'exitos' => $exitos, 'duplicados' => $duplicados, 'errores' =>$errores]);
            exit;
        }

        // --- REGISTRO MANUAL TRADICIONAL ---
       if (!isset($_POST['id_vehiculo']) || !isset($_POST['fecha']) || !isset($_POST['litros']) || !isset($_POST['costo_total'])) {
            echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios.']);
            exit;
        }

        try {
            $db->beginTransaction(); 

            // Obtener el KM anterior y rendimiento ideal
            $stmtV =$db->prepare("SELECT kilometraje_actual, rendimiento_ideal FROM vehiculos WHERE id = ?");
            $stmtV->execute([$_POST['id_vehiculo']]);
            $vehData =$stmtV->fetch(PDO::FETCH_ASSOC);

            $km_anterior =$vehData['kilometraje_actual'] ?? 0;
            $rend_ideal =$vehData['rendimiento_ideal'] ?? 0;

            $comprobante_url = null;
            if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] == 0) {$upload_dir = '../../uploads/';
                if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
                $file_name = time() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "", basename($_FILES['comprobante']['name']));
                if (move_uploaded_file($_FILES['comprobante']['tmp_name'], $upload_dir .$file_name)) {
                    $comprobante_url = '/uploads/' .$file_name; 
                }
            }

            $estacion = isset($_POST['estacion']) ? $_POST['estacion'] : 'No especificada';$odometro = isset($_POST['odometro']) ? (float)$_POST['odometro'] : 0;
            $litros = (float)$_POST['litros'];
            $costo_total = (float)$_POST['costo_total'];

            // --- CÁLCULOS MATEMÁTICOS DE RENDIMIENTO ---
            $distancia = ($odometro >$km_anterior) ? ($odometro -$km_anterior) : 0;
            $rend_real = ($litros > 0 &&$distancia > 0) ? ($distancia / $litros) : 0;
            
            $confiabilidad = 'OK';$diferencia_porcentual = 0;

            if ($rend_ideal > 0 &&$rend_real > 0) {
                $diferencia_porcentual = abs($rend_real - $rend_ideal) /$rend_ideal;
                if ($diferencia_porcentual > 0.21) {$confiabilidad = 'Error / Sospechoso (>21%)';
                }
            } elseif ($rend_real <= 0) {$confiabilidad = 'Error en km';
            }

            $query = "INSERT INTO cargas_combustible (id_empresa, id_vehiculo, fecha, estacion, litros, costo_total, kilometraje_anterior, odometro, distancia_recorrida, rendimiento_real, diferencia_rendimiento, confiabilidad, comprobante_url, creado_por) 
                      VALUES (:id_empresa, :id_vehiculo, :fecha, :estacion, :litros, :costo_total, :km_anterior, :odometro, :distancia, :rend_real, :diferencia, :confiabilidad, :comprobante_url, :creado_por)";
            $stmt = $db->prepare($query);

            $stmt->execute([
                ':id_empresa' => $id_empresa, ':id_vehiculo' => $_POST['id_vehiculo'], ':fecha' =>$_POST['fecha'],
                ':estacion' => $estacion, ':litros' => $litros, ':costo_total' =>$costo_total,
                ':km_anterior' => $km_anterior, ':odometro' => $odometro, ':distancia' =>$distancia, 
                ':rend_real' => $rend_real, ':diferencia' => $diferencia_porcentual, ':confiabilidad' =>$confiabilidad,
                ':comprobante_url' => $comprobante_url, ':creado_por' =>$id_usuario
            ]);

            if($odometro > $km_anterior) {$db->prepare("UPDATE vehiculos SET kilometraje_actual = :od WHERE id = :id_v AND kilometraje_actual < :od")
                   ->execute([':od' => $odometro, ':id_v' =>$_POST['id_vehiculo']]);
            }

            $db->commit(); 
            echo json_encode(['success' => true, 'message' => 'Carga y análisis registrados correctamente.']);

        } catch (PDOException $e) {$db->rollBack();
            echo json_encode(['success' => false, 'message' => 'Error al guardar la carga: ' . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id)) { echo json_encode(['success' => false, 'message' => 'ID no proporcionado.']); exit; }
        try {
            $stmt =$db->prepare("DELETE FROM cargas_combustible WHERE id = :id AND id_empresa = :id_empresa");
            if ($stmt->execute([':id' => $data->id, ':id_empresa' =>$id_empresa])) {
                echo json_encode(['success' => true, 'message' => 'Registro eliminado.']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el registro.']);
        }
        break;
}
?>