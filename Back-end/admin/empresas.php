<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

// 1. Seguridad
if (!isset($_SESSION['id_admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado.']);
    exit;
}

$database = new Database();
$db = $database->getConnection();
$request_method = $_SERVER["REQUEST_METHOD"];

// === OBTENER EMPRESAS Y KPIs ===
if ($request_method === 'GET') {
    try {
        $query = "SELECT e.id, e.nombre, e.email_contacto, e.estado, e.fecha_vencimiento, 
                         p.nombre as plan,
                         (SELECT COUNT(*) FROM vehiculos v WHERE v.id_empresa = e.id AND v.estado != 'Inactivo') as total_vehiculos
                  FROM empresas e
                  JOIN planes_suscripcion p ON e.id_plan = p.id
                  ORDER BY e.creado_en DESC";
        $stmt = $db->query($query);
        $empresas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $kpis = ['activas' => 0, 'suspendidas' => 0, 'total_vehiculos' => 0];

        foreach($empresas as $emp) {
            if ($emp['estado'] === 'Activa') $kpis['activas']++;
            if ($emp['estado'] === 'Suspendida') $kpis['suspendidas']++;
            $kpis['total_vehiculos'] += $emp['total_vehiculos'];
        }

        echo json_encode([
            'success' => true, 
            'empresas' => $empresas, 
            'kpis' => $kpis,
            'admin_nombre' => $_SESSION['nombre_admin']
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error de BD.']);
    }
} 
// === EJECUTAR ACCIONES (Crear, Editar, Suspender) ===
elseif ($request_method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = $data['action'] ?? '';

    try {
        // --- 1. CREAR NUEVA EMPRESA Y SU USUARIO ---
        if ($action === 'crear_empresa') {
            $nombre = $data['nombre'];
            $email = $data['email'];
            $password = password_hash($data['password'], PASSWORD_BCRYPT);
            $plan = $data['plan'];
            $vencimiento = $data['vencimiento'];

            // Evitar correos duplicados
            $stmtCheck = $db->prepare("SELECT id FROM usuarios WHERE email = ?");
            $stmtCheck->execute([$email]);
            if ($stmtCheck->rowCount() > 0) {
                echo json_encode(['success' => false, 'message' => 'El correo del administrador ya está en uso.']);
                exit;
            }

            $db->beginTransaction();

            // Insertar empresa
            $stmtEmp = $db->prepare("INSERT INTO empresas (nombre, email_contacto, id_plan, fecha_vencimiento) VALUES (?, ?, ?, ?)");
            $stmtEmp->execute([$nombre, $email, $plan, $vencimiento]);
            $id_empresa_nueva = $db->lastInsertId();

            // Insertar su primer usuario (Administrador de esa flotilla)
            $nombreAdmin = 'Admin ' . explode(' ', trim($nombre))[0];
            $stmtUser = $db->prepare("INSERT INTO usuarios (id_empresa, nombre, email, password_hash, rol) VALUES (?, ?, ?, ?, 'Administrador')");
            $stmtUser->execute([$id_empresa_nueva, $nombreAdmin, $email, $password]);

            $db->commit();
            echo json_encode(['success' => true, 'message' => "¡Empresa creada!\nYa puedes entregarle el correo ($email) y la contraseña al cliente."]);
        }
        // --- 2. EDITAR EMPRESA EXISTENTE ---
        elseif ($action === 'editar_empresa') {
            $id_empresa = $data['id_empresa'];
            
            $db->beginTransaction();

            // Actualizar datos base de la empresa
            $stmtEmp = $db->prepare("UPDATE empresas SET nombre = ?, email_contacto = ?, id_plan = ?, fecha_vencimiento = ? WHERE id = ?");
            $stmtEmp->execute([$data['nombre'], $data['email'], $data['plan'], $data['vencimiento'], $id_empresa]);

            // Si escribiste una contraseña en el modal, se la cambiamos al usuario administrador de esa empresa
            if (!empty($data['password'])) {
                $password = password_hash($data['password'], PASSWORD_BCRYPT);
                $stmtUser = $db->prepare("UPDATE usuarios SET email = ?, password_hash = ? WHERE id_empresa = ? AND rol = 'Administrador' LIMIT 1");
                $stmtUser->execute([$data['email'], $password, $id_empresa]);
            } else {
                // Si la dejaste en blanco, solo le actualizamos el correo por si cambió
                $stmtUser = $db->prepare("UPDATE usuarios SET email = ? WHERE id_empresa = ? AND rol = 'Administrador' LIMIT 1");
                $stmtUser->execute([$data['email'], $id_empresa]);
            }

            $db->commit();
            echo json_encode(['success' => true, 'message' => 'Datos del cliente actualizados exitosamente.']);
        }
        // --- 3. SUSPENDER / REACTIVAR ---
        elseif ($action === 'cambiar_estado') {
            $stmt = $db->prepare("UPDATE empresas SET estado = ? WHERE id = ?");
            $stmt->execute([$data['estado'], $data['id_empresa']]);
            echo json_encode(['success' => true, 'message' => 'Estado actualizado.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Acción no válida.']);
        }
    } catch (PDOException $e) {
        if ($db->inTransaction()) $db->rollBack();
        echo json_encode(['success' => false, 'message' => 'Error al procesar la acción en BD.']);
    }
}
?>