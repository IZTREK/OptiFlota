<?php
session_start();
header('Content-Type: application/json');
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->email) || !isset($data->password)) {
    echo json_encode(["success" => false, "message" => "Por favor, ingresa correo y contraseña."]);
    exit;
}

try {
    $query = "SELECT u.id as id_usuario, u.password_hash, u.nombre, 
                     e.id as id_empresa, e.nombre as empresa, e.fecha_vencimiento,
                     p.nombre as plan, p.mod_vehiculos, p.mod_diagnosticos, 
                     p.mod_combustible, p.mod_mantenimiento, p.mod_tickets
              FROM usuarios u
              JOIN empresas e ON u.id_empresa = e.id
              JOIN planes_suscripcion p ON e.id_plan = p.id
              WHERE u.email = :email AND u.estado = 'Activo'";
              
    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $data->email);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (password_verify($data->password, $row['password_hash'])) {
            $_SESSION['id_usuario'] = $row['id_usuario'];
            $_SESSION['id_empresa'] = $row['id_empresa'];
            $_SESSION['nombre'] = $row['nombre']; 
            $_SESSION['empresa_nombre'] = $row['empresa'];
            $_SESSION['plan'] = $row['plan'];
            $_SESSION['fecha_vencimiento'] = $row['fecha_vencimiento']; 
            
            $_SESSION['permisos'] = [
                'mod_vehiculos' => $row['mod_vehiculos'],
                'mod_combustible' => $row['mod_combustible'],
                'mod_diagnosticos' => $row['mod_diagnosticos'],
                'mod_mantenimiento' => $row['mod_mantenimiento'],
                'mod_tickets' => $row['mod_tickets'],
                'mod_dashboard' => 1,
                'mod_suscripcion' => 1
            ];

            echo json_encode(["success" => true, "message" => "¡Bienvenido!"]);
        } else {
            echo json_encode(["success" => false, "message" => "Contraseña incorrecta."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "El usuario no existe."]);
    }
} catch(PDOException $e) {
    echo json_encode(["success" => false, "message" => "Error interno."]);
}
?>