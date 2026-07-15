<?php
require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Apagamos el Modo Estricto para evitar errores 1364 de campos residuales
    $db->query("SET SESSION sql_mode = ''");
    
    echo "<h2 style='color: #1e3a8a; font-family: sans-serif;'>OptiFlota - Instalador de Pruebas (Plan PRO)</h2>";
    
    $nombre_empresa = 'Logística Apex';
    $email_demo = 'admin@logisticaapex.com';
    $password_demo = password_hash('12345', PASSWORD_BCRYPT); 
    
    $stmt = $db->prepare("SELECT id FROM empresas WHERE nombre = ? LIMIT 1");
    $stmt->execute([$nombre_empresa]);
    $empresa = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($empresa) {
        $id_empresa = $empresa['id'];
        $db->prepare("UPDATE empresas SET id_plan = 3, fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL 1 YEAR) WHERE id = ?")
           ->execute([$id_empresa]);
        echo "<p>✅ Empresa '<strong>$nombre_empresa</strong>' actualizada al <strong>Plan PRO (Full Access)</strong>.</p>";
    } else {
        // INSERCIÓN EXACTA respetando únicamente los apartados originales de la tabla
        $db->prepare("INSERT INTO empresas (nombre, id_plan, fecha_vencimiento, estado) VALUES (?, 3, DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'Activo')")
           ->execute([$nombre_empresa]);
        $id_empresa = $db->lastInsertId();
        echo "<p>✅ Empresa '<strong>$nombre_empresa</strong>' creada con <strong>Plan PRO</strong>.</p>";
    }
    
    $stmtU = $db->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
    $stmtU->execute([$email_demo]);
    $usuario = $stmtU->fetch(PDO::FETCH_ASSOC);
    
    if ($usuario) {
        $db->prepare("UPDATE usuarios SET password_hash = ?, id_empresa = ? WHERE id = ?")
           ->execute([$password_demo, $id_empresa, $usuario['id']]);
        echo "<p>✅ Usuario demo actualizado correctamente.</p>";
    } else {
        // INSERCIÓN EXACTA respetando únicamente los apartados originales de la tabla de usuarios
        $db->prepare("INSERT INTO usuarios (id_empresa, nombre, email, password_hash, rol, estado) 
                      VALUES (?, 'Admin Apex', ?, ?, 'Administrador', 'Activo')")
           ->execute([$id_empresa, $email_demo, $password_demo]);
        echo "<p>✅ Usuario demo creado correctamente.</p>";
    }
    
    echo "<div style='background-color: #f3f4f6; padding: 15px; border-radius: 8px; display: inline-block; margin-top: 20px;'>";
    echo "<h3 style='margin-top: 0;'>Credenciales Listas:</h3>";
    echo "Correo: <b>$email_demo</b><br>";
    echo "Contraseña: <b>12345</b><br>";
    echo "</div>";
    
    echo "<br><br><a href='../../Front-end/Cliente/login.html' style='padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; font-family: sans-serif;'>Ir al Login</a>";

} catch(PDOException $e) {
    echo "<p style='color: red;'>Error en la base de datos: " . $e->getMessage() . "</p>";
}
?>