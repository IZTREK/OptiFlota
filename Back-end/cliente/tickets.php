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

// Leer parámetros de acción
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

switch ($request_method) {
    case 'GET':
        // --- 1. OBTENER VEHÍCULOS PARA EL SELECT ---
        if ($action == 'get_vehiculos') {
            $query = "SELECT id as id_vehiculo, placas, marca_modelo FROM vehiculos WHERE id_empresa = :id_empresa AND estado != 'Inactivo'";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id_empresa', $id_empresa, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }

        // --- 2. OBTENER COMENTARIOS DE UN TICKET (CHAT) ---
        if ($action == 'get_comentarios') {
            $id_ticket = isset($_GET['id_ticket']) ? $_GET['id_ticket'] : 0;
            // Traemos los comentarios y el rol del usuario que comentó (para saber si es Admin o Cliente)
            $query = "SELECT c.comentario, c.creado_en, u.nombre, u.rol 
                      FROM tickets_comentarios c
                      JOIN usuarios u ON c.id_usuario = u.id
                      WHERE c.id_ticket = :id_ticket 
                      ORDER BY c.creado_en ASC";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id_ticket', $id_ticket, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            exit;
        }

        // --- 3. LEER TODOS LOS TICKETS ---
        try {
            // Hacemos LEFT JOIN porque el id_vehiculo puede ser NULL si es un ticket de soporte del sistema
            $query = "SELECT t.id, t.ticket_folio, t.fecha_incidente, t.tipo_reporte, t.asunto_breve, t.descripcion_detallada, t.estado, v.placas 
                      FROM tickets t 
                      LEFT JOIN vehiculos v ON t.id_vehiculo = v.id 
                      WHERE t.id_empresa = :id_empresa 
                      ORDER BY t.creado_en DESC";
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
        // --- 4. RESPONDER A UN TICKET EXISTENTE ---
        if ($action == 'reply') {
            $id_ticket = $_POST['id_ticket'];
            $comentario = $_POST['comentario'];

            try {
                $db->beginTransaction();

                // Insertar el nuevo mensaje
                $qComentario = "INSERT INTO tickets_comentarios (id_ticket, id_usuario, comentario) VALUES (:id_ticket, :id_usuario, :comentario)";
                $stmtC = $db->prepare($qComentario);
                $stmtC->execute([':id_ticket' => $id_ticket, ':id_usuario' => $id_usuario, ':comentario' => $comentario]);

                // Cambiar el estado del ticket a 'Pendiente' para que el Admin lo vea
                $qUpdate = "UPDATE tickets SET estado = 'Pendiente' WHERE id = :id_ticket";
                $stmtU = $db->prepare($qUpdate);
                $stmtU->execute([':id_ticket' => $id_ticket]);

                $db->commit();
                echo json_encode(['success' => true, 'message' => 'Respuesta enviada.']);
            } catch (PDOException $e) {
                $db->rollBack();
                echo json_encode(['success' => false, 'message' => 'Error al enviar respuesta.']);
            }
            exit;
        }

        // --- 5. CREAR UN NUEVO TICKET ---
        try {
            // Generar un folio único (Ej. TK-8492)
            $folio = 'TK-' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT);
            $id_vehiculo = (isset($_POST['id_vehiculo']) && $_POST['id_vehiculo'] != 'NA') ? $_POST['id_vehiculo'] : null;

            // Archivo opcional (Evidencia del choque/falla)
            $evidencia_url = null;
            if (isset($_FILES['evidencia']) && $_FILES['evidencia']['error'] == 0) {
                $upload_dir = '../../uploads/';
                if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
                $file_name = time() . '_tk_' . preg_replace("/[^a-zA-Z0-9.]/", "", basename($_FILES['evidencia']['name']));
                if (move_uploaded_file($_FILES['evidencia']['tmp_name'], $upload_dir . $file_name)) {
                    $evidencia_url = '/uploads/' . $file_name;
                }
            }

            $query = "INSERT INTO tickets (ticket_folio, id_empresa, id_vehiculo, tipo_reporte, nivel_urgencia, fecha_incidente, asunto_breve, descripcion_detallada, evidencia_url, creado_por) 
                      VALUES (:folio, :id_empresa, :id_vehiculo, :tipo_reporte, :nivel_urgencia, :fecha_incidente, :asunto_breve, :descripcion, :evidencia, :creado_por)";
            $stmt = $db->prepare($query);
            
            $stmt->execute([
                ':folio' => $folio,
                ':id_empresa' => $id_empresa,
                ':id_vehiculo' => $id_vehiculo,
                ':tipo_reporte' => $_POST['tipo_reporte'],
                ':nivel_urgencia' => $_POST['nivel_urgencia'],
                ':fecha_incidente' => $_POST['fecha_incidente'],
                ':asunto_breve' => $_POST['asunto_breve'],
                ':descripcion' => $_POST['descripcion_detallada'],
                ':evidencia' => $evidencia_url,
                ':creado_por' => $id_usuario
            ]);

            echo json_encode(['success' => true, 'message' => "Ticket $folio creado exitosamente."]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Error al crear el ticket.']);
        }
        break;
}
?>