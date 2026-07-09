<?php
// /Back-end/cliente/logout.php
session_start();
session_unset();
session_destroy();
echo json_encode(["success" => true, "message" => "Sesion cerrada"]);
?>