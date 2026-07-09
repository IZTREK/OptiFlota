<?php
require_once __DIR__ . '/../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    // 1. Crear un Plan (Pro con todos los permisos)
    $db->exec("INSERT IGNORE INTO planes_suscripcion (id, nombre, limite_vehiculos, costo_mensual, mod_vehiculos, mod_combustible, mod_diagnosticos, mod_mantenimiento, mod_tickets) 
               VALUES (1, 'Pro', 50, 1500, 1, 1, 1, 1, 1)");

    // 2. Crear una Empresa de prueba (Con fecha de vencimiento a futuro)
    $db->exec("INSERT IGNORE INTO empresas (id, nombre, email_contacto, id_plan, fecha_vencimiento, estado) 
               VALUES (1, 'Transportes García', 'admin@garcia.com', 1, '2027-12-31', 'Activo')");

    // 3. Crear el Usuario (Contraseña: 123456)
    $hash = password_hash('123456', PASSWORD_DEFAULT);
    $query = "INSERT IGNORE INTO usuarios (id_empresa, nombre, email, password_hash, rol, estado) 
              VALUES (1, 'Admin Garcia', 'admin@garcia.com', '$hash', 'Admin', 'Activo')";
    $db->exec($query);

    echo "¡Éxito! Base de datos lista. <br><br>";
    echo "<b>Usuario:</b> admin@garcia.com<br>";
    echo "<b>Contraseña:</b> 123456";

} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>