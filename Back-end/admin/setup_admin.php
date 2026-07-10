<?php
session_start();
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

// Buscamos al usuario SuperAdmin real en la base de datos
$stmt = $db->prepare("SELECT id, nombre, rol FROM usuarios WHERE rol = 'SuperAdmin' LIMIT 1");
$stmt->execute();
$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if ($admin) {
    // Si existe, iniciamos sesión con sus datos REALES de la BD
    $_SESSION['id_admin'] = $admin['id'];
    $_SESSION['nombre_admin'] = $admin['nombre'];
    $_SESSION['rol'] = $admin['rol'];

    echo "<h1>Sesión de Admin iniciada correctamente</h1>";
    echo "<p>Usuario: " . $admin['nombre'] . " (ID: " . $admin['id'] . ")</p>";
    echo "<a href='/Front-end/Admin/admin_dashboard.html'>Ir al Dashboard Admin</a>";
} else {
    echo "<h1>Error: No se encontró el usuario 'SuperAdmin' en la tabla 'usuarios'.</h1>";
    echo "<p>Ejecuta primero el comando SQL que te proporcioné.</p>";
}
?>