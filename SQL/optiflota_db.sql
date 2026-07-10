-- =========================================================================
-- OPTIFLOTA - REINICIO COMPLETO DE BASE DE DATOS
-- =========================================================================

-- Desactivar revisión de llaves foráneas temporalmente para poder borrar todo
SET FOREIGN_KEY_CHECKS = 0;

-- 0. BORRAR TABLAS EXISTENTES 
DROP TABLE IF EXISTS tickets_comentarios;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS mantenimientos;
DROP TABLE IF EXISTS cargas_combustible;
DROP TABLE IF EXISTS diagnosticos;
DROP TABLE IF EXISTS vehiculos;
DROP TABLE IF EXISTS pagos_suscripcion;
DROP TABLE IF EXISTS logs_auditoria;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS empresas;
DROP TABLE IF EXISTS planes_suscripcion;

-- Activar revisión de llaves foráneas de nuevo
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- CREACIÓN DE TABLAS
-- =========================================================================

-- 1. MÓDULO CORE Y SUSCRIPCIONES
CREATE TABLE planes_suscripcion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    limite_vehiculos INT NOT NULL,
    costo_mensual DECIMAL(10,2) NOT NULL,
    mod_vehiculos BOOLEAN DEFAULT 0,
    mod_combustible BOOLEAN DEFAULT 0,
    mod_diagnosticos BOOLEAN DEFAULT 0,
    mod_mantenimiento BOOLEAN DEFAULT 0,
    mod_tickets BOOLEAN DEFAULT 0
);

-- Inserción de los planes base
INSERT INTO planes_suscripcion 
(nombre, limite_vehiculos, costo_mensual, mod_vehiculos, mod_combustible, mod_diagnosticos, mod_mantenimiento, mod_tickets)
VALUES
('Trial',5,0,1,1,0,0,0),
('Básico',15,500,1,1,0,0,1),
('Pro',50,1500,1,1,1,1,1),
('Ilimitado',200,3000,1,1,1,1,1);

CREATE TABLE empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email_contacto VARCHAR(100) NOT NULL,
    id_plan INT NOT NULL,
    estado VARCHAR(20) DEFAULT 'Activa', -- Activa, Prueba, Suspendida, Inactiva
    fecha_vencimiento DATE NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_plan) REFERENCES planes_suscripcion(id)
);

-- 2. MÓDULO DE USUARIOS Y CONTROL DE ACCESOS
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT, -- NULL si es SuperAdmin de OptiFlota
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL,
    estado VARCHAR(20) DEFAULT 'Activo', -- Activo, Inactivo
    ultimo_acceso TIMESTAMP NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id)
);

-- 3. AUDITORÍA
CREATE TABLE logs_auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_empresa INT,
    accion VARCHAR(255) NOT NULL,
    modulo VARCHAR(50) NOT NULL, 
    direccion_ip VARCHAR(45) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_empresa) REFERENCES empresas(id)
);

-- 4. FINANZAS Y PAGOS (Estructura adaptada para MercadoPago)
CREATE TABLE pagos_suscripcion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    fecha_pago DATE NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    plan_solicitado INT NOT NULL,
    stripe_session_id VARCHAR(255) NULL, 
    stripe_payment_id VARCHAR(100) NULL,    
    estado VARCHAR(20) DEFAULT 'Pendiente', 
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (plan_solicitado) REFERENCES planes_suscripcion(id)
);

-- 5. OPERACIÓN: INVENTARIO DE FLOTILLA
CREATE TABLE vehiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    placas VARCHAR(20) NOT NULL,
    marca_modelo VARCHAR(100) NOT NULL,
    anio INT NOT NULL,
    kilometraje_inicial DECIMAL(10,2) NOT NULL,
    kilometraje_actual DECIMAL(10,2) NOT NULL,
    rendimiento_ideal DECIMAL(10,2) DEFAULT 0.00,
    estado VARCHAR(20) DEFAULT 'Activo', -- Activo, Taller, Inactivo
    creado_por INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

-- 6. OPERACIÓN: DIAGNÓSTICOS, COMBUSTIBLE Y MANTENIMIENTO
CREATE TABLE diagnosticos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_vehiculo INT NOT NULL,
    fecha DATE NOT NULL,
    evaluador VARCHAR(100) NOT NULL,
    salud_general VARCHAR(20) NOT NULL,
    observaciones TEXT,
    reporte_url VARCHAR(255) NULL,
    creado_por INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

CREATE TABLE cargas_combustible (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_vehiculo INT NOT NULL,
    fecha DATE NOT NULL,
    estacion VARCHAR(150),
    litros DECIMAL(8,2) NOT NULL,
    costo_total DECIMAL(10,2) NOT NULL,
    odometro DECIMAL(10,2) NOT NULL,
    comprobante_url VARCHAR(255),
    origen_registro VARCHAR(50) DEFAULT 'Manual', 
    creado_por INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

CREATE TABLE mantenimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_vehiculo INT NOT NULL,
    fecha DATE NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    costo_total DECIMAL(10,2) NOT NULL,
    detalle TEXT NOT NULL,
    estado VARCHAR(30) DEFAULT 'En Taller',
    factura_url VARCHAR(255),
    creado_por INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

-- 7. SOPORTE Y TICKETS
CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_folio VARCHAR(20) UNIQUE NOT NULL, 
    id_empresa INT NOT NULL,
    id_vehiculo INT NULL, 
    tipo_reporte VARCHAR(100) NOT NULL, 
    nivel_urgencia VARCHAR(20) NOT NULL DEFAULT 'Baja',
    fecha_incidente DATE NOT NULL,
    asunto_breve VARCHAR(150) NOT NULL,
    descripcion_detallada TEXT NOT NULL,
    evidencia_url VARCHAR(255) NULL, 
    estado VARCHAR(20) DEFAULT 'Pendiente', 
    creado_por INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

CREATE TABLE tickets_comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_ticket INT NOT NULL,
    id_usuario INT NOT NULL, 
    comentario TEXT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ticket) REFERENCES tickets(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);