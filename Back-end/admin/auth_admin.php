<?php
session_start();
require_once '../config/database.php';
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $email = trim($data['email'] ?? '');
    $password = trim($data['password'] ?? '');

    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Por favor, llena todos los campos.']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    try {
        // Buscamos estrictamente a un SuperAdmin
        $stmt = $db->prepare("SELECT id, nombre, password_hash, rol FROM usuarios WHERE email = ? AND rol = 'SuperAdmin' LIMIT 1");
        $stmt->execute([$email]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($admin && password_verify($password, $admin['password_hash'])) {
            // Limpiar basura de la sesión
            session_unset();

            // Creamos la sesión real
            $_SESSION['id_admin'] = $admin['id'];
            $_SESSION['nombre_admin'] = $admin['nombre'];
            $_SESSION['rol'] = $admin['rol'];
            echo json_encode(['success' => true, 'message' => 'Bienvenido']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas o acceso denegado.']);
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error de conexión a la BD.']);
    }
}
?>