<?php
session_start();

// 1. Verificar si estamos en modo "impersonación"
if (isset($_SESSION['id_admin'])) {
    
    // 2. Restaurar el rol y el ID original del Administrador
    $_SESSION['rol'] = 'admin';
    // NOTA: Usa la misma variable que en el archivo anterior
    $_SESSION['usuario_id'] = $_SESSION['id_admin']; 
    
    // 3. Limpiar el rastro del cliente y el compartimento secreto
    unset($_SESSION['empresa_id']);
    unset($_SESSION['id_admin']);
    
    // 4. Regresar al panel de Administrador
    header("Location: ../../Front-end/Admin/admin_dashboard.html");
    exit();
} else {
    // Seguridad adicional si alguien entra aquí por error
    header("Location: ../../Front-end/Admin/login_admin.html");
    exit();
}
?>