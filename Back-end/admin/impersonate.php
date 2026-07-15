<?php
session_start();

// Recibimos la empresa a la que queremos entrar
if (!isset($_GET['empresa_id'])) {
    die("ID de empresa no proporcionado.");
}
$empresa_id_objetivo = (int)$_GET['empresa_id'];

// Respaldamos TODA la sesión actual del administrador en una variable
// Esto evita que tengamos que adivinar si las variables de admin se llaman "id_admin" o "rol"
if (!isset($_SESSION['admin_backup'])) {
    $_SESSION['admin_backup'] = $_SESSION; 
}

// Ahora limpiamos las variables actuales e inyectamos unicamente las que el Cliente necesita
$_SESSION['id_empresa'] = $empresa_id_objetivo;

// Lo aventamos directo a la vista del cliente
header("Location: /Front-end/Cliente/index.html");
exit();
?>