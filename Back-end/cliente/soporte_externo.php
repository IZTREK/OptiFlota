<?php
session_start();
require_once '../config/database.php';
header('Content-Type: application/json');

$request_method = $_SERVER["REQUEST_METHOD"];
if ($request_method !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Recibir los datos del formulario de manera segura
$email = $_POST['email'] ?? '';
$asunto = !empty($_POST['asunto']) ? $_POST['asunto'] : 'Problema de acceso / Contacto externo';
$mensaje = $_POST['mensaje'] ?? '';

if (empty($email) || empty($mensaje)) {
    echo json_encode(['success' => false, 'message' => 'El correo y el mensaje son obligatorios.']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $db->beginTransaction();

    // 1. Buscar si el correo pertenece a un cliente real bloqueado
    $stmtUser = $db->prepare("SELECT id, id_empresa FROM usuarios WHERE email = ? LIMIT 1");
    $stmtUser->execute([$email]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if ($user && $user['id_empresa']) {
        $id_empresa = $user['id_empresa'];
        $id_usuario = $user['id'];
    } else {
        // 2. Si es un desconocido, buscamos o creamos la empresa contenedora
        $stmtEmp = $db->prepare("SELECT id FROM empresas WHERE nombre = 'Prospectos / Externos' LIMIT 1");
        $stmtEmp->execute();
        $empresa = $stmtEmp->fetch(PDO::FETCH_ASSOC);

        if ($empresa) {
            $id_empresa = $empresa['id'];
            $stmtU = $db->prepare("SELECT id FROM usuarios WHERE id_empresa = ? LIMIT 1");
            $stmtU->execute([$id_empresa]);
            $id_usuario = $stmtU->fetchColumn();
        } else {
            // Se crea la empresa "Fantasma" para alojar los tickets externos
            $db->query("INSERT INTO empresas (nombre, email_contacto, id_plan, fecha_vencimiento, estado) VALUES ('Prospectos / Externos', 'externos@optiflota.com', 1, '2099-12-31', 'Activa')");
            $id_empresa = $db->lastInsertId();
            
            // Se crea el usuario contenedor
            $db->query("INSERT INTO usuarios (id_empresa, nombre, email, password_hash, rol) VALUES ($id_empresa, 'Usuario Externo', 'externo@optiflota.com', '12345', 'Externo')");
            $id_usuario = $db->lastInsertId();
        }
    }

    // 3. Crear el Ticket y poner el correo real dentro de la descripción para que puedas responderle
    $folio = 'LOG-' . strtoupper(substr(uniqid(), -5));
    $fecha = date('Y-m-d');
    $detalle = "CORREO DE CONTACTO REAL: $email\n\nMensaje Original:\n$mensaje";

    $stmtTicket = $db->prepare("INSERT INTO tickets (ticket_folio, id_empresa, tipo_reporte, fecha_incidente, asunto_breve, descripcion_detallada, creado_por) VALUES (?, ?, 'Soporte Externo', ?, ?, ?, ?)");
    $stmtTicket->execute([$folio, $id_empresa, $fecha, $asunto, $detalle, $id_usuario]);

    $db->commit();
    echo json_encode(['success' => true, 'message' => '¡Tu mensaje ha sido enviado a Soporte Técnico exitosamente!']);

} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(['success' => false, 'message' => 'Error interno. Intenta más tarde.']);
}
?>