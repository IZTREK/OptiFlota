<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

// 1. Validar que sea administrador
if (!isset($_SESSION['id_admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado.']);
    exit;
}

$database = new Database();
$db = $database->getConnection();
$request_method = $_SERVER["REQUEST_METHOD"];

// === OBTENER CHAT DE UN TICKET ESPECÍFICO ===
if ($request_method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_chat') {
    try {
        $id_ticket = $_GET['id_ticket'];
        $stmt = $db->prepare("
            SELECT c.comentario, c.creado_en, u.rol, u.nombre 
            FROM tickets_comentarios c 
            LEFT JOIN usuarios u ON c.id_usuario = u.id 
            WHERE c.id_ticket = ? 
            ORDER BY c.creado_en ASC
        ");
        $stmt->execute([$id_ticket]);
        echo json_encode(['success' => true, 'chat' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error al cargar chat.']);
    }
    exit;
}

// === OBTENER TICKETS Y KPIs ===
if ($request_method === 'GET') {
    try {
        // AQUI agregamos tipo_reporte y el LEFT JOIN para obtener el vehículo
        $query = "SELECT t.id, t.ticket_folio, t.fecha_incidente, e.nombre as empresa, 
                         t.asunto_breve, t.descripcion_detallada, t.estado, t.nivel_urgencia,
                         t.tipo_reporte, v.marca_modelo, v.placas
                  FROM tickets t
                  JOIN empresas e ON t.id_empresa = e.id
                  LEFT JOIN vehiculos v ON t.id_vehiculo = v.id
                  ORDER BY t.creado_en DESC";
        $stmt = $db->query($query);
        $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Contar KPIs
        $kpis = ['pendientes' => 0, 'proceso' => 0];
        foreach($tickets as $t) {
            $estado = strtolower(trim($t['estado']));
            if ($estado === 'pendiente') $kpis['pendientes']++;
            if ($estado === 'en proceso') $kpis['proceso']++;
        }

        echo json_encode([
            'success' => true, 
            'tickets' => $tickets, 
            'kpis' => $kpis,
            'admin_nombre' => $_SESSION['nombre_admin']
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error de BD.']);
    }
} 
// === ATENDER Y ACTUALIZAR TICKET ===
elseif ($request_method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (isset($data['action']) && $data['action'] === 'responder_ticket') {
        $id_ticket = $data['id_ticket'];
        $respuesta = $data['respuesta'];
        $nuevo_estado = $data['estado'];
        
        try {
            $db->beginTransaction();

            $stmtStatus = $db->prepare("UPDATE tickets SET estado = ? WHERE id = ?");
            $stmtStatus->execute([$nuevo_estado, $id_ticket]);

            if (!empty(trim($respuesta))) {
                $stmtComment = $db->prepare("INSERT INTO tickets_comentarios (id_ticket, id_usuario, comentario) VALUES (?, ?, ?)");
                $stmtComment->execute([$id_ticket, $_SESSION['id_admin'], $respuesta]);
            }

            $db->commit();
            echo json_encode(['success' => true, 'message' => 'Ticket actualizado y respuesta guardada.']);
        } catch (PDOException $e) {
            $db->rollBack();
            $stmtFallback = $db->prepare("UPDATE tickets SET estado = ? WHERE id = ?");
            $stmtFallback->execute([$nuevo_estado, $id_ticket]);
            echo json_encode(['success' => true, 'message' => 'Estado actualizado.']);
        }
    }
}
?>