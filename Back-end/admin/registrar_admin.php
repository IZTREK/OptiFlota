<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido. Utiliza POST.']);
    exit;
}

$data = json_decode(file_get_contents("php://input"));

// Capturamos el input del formulario
$nombre = $_POST['nombre'] ?? ($data->nombre ?? '');
$correo = $_POST['correo'] ?? ($data->correo ?? '');
$password = $_POST['password'] ?? ($data->password ?? '');

if (empty($nombre) || empty($correo) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos los campos son obligatorios.']);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // 1. Verificar si el correo ya existe en la tabla de USUARIOS
    $stmtCheck = $db->prepare("SELECT id FROM usuarios WHERE email = :correo");
    $stmtCheck->execute([':correo' => $correo]);
    
    if ($stmtCheck->rowCount() > 0) {
        echo json_encode(['success' => false, 'message' => 'Ese correo ya está registrado en el sistema.']);
        exit;
    }

    // 2. Encriptar la contraseña de forma segura
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // 3. Insertar el nuevo administrador en la tabla de usuarios
    // Se envía id_empresa como NULL y rol como 'SuperAdmin' por defecto
    $query = "INSERT INTO usuarios (id_empresa, nombre, email, password_hash, rol, estado) 
              VALUES (NULL, :nombre, :email, :password_hash, 'SuperAdmin', 'Activo')";
    
    $stmt = $db->prepare($query);
    $stmt->execute([
        ':nombre' => htmlspecialchars(strip_tags($nombre)),
        ':email' => htmlspecialchars(strip_tags($correo)),
        ':password_hash' => $passwordHash
    ]);

    http_response_code(201);
    echo json_encode(['success' => true, 'message' => 'Administrador registrado correctamente.']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en el servidor: ' . $e->getMessage()]);
}
?>