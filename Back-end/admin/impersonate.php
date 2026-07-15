<?php
session_start();

if (!isset($_GET['empresa_id'])) {
    die("ID de empresa no proporcionado.");
}
$empresa_id_objetivo = (int)$_GET['empresa_id'];

// Respaldamos TODA la sesión del administrador
if (!isset($_SESSION['admin_backup'])) {
    $_SESSION['admin_backup'] = $_SESSION; 
}

// Limpiamos todo
session_unset();

// 
// Simulamos todos los datos que los archivos de PHP del cliente exigen
$_SESSION['id_empresa'] = $empresa_id_objetivo;
$_SESSION['id_usuario'] = 999999; // ID falso para evitar errores al guardar "creado_por"
$_SESSION['rol'] = 'Administrador'; // Rol de los clientes
// Mantenemos vivo el respaldo
$_SESSION['admin_backup'] = true; 

// Lo redirigimos
header("Location: /Front-end/Cliente/index.html");
exit();
?>