<?php
// Back-end/config/database.php

class Database {
    // Usamos 'db' como host porque es el nombre del servicio en docker-compose.yml
    private $host = "db"; 
    private $db_name = "optiflota_db";
    private $username = "optiflota_user";
    private $password = "password123";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            // Configurar PDO para que lance excepciones ante cualquier error
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Asegurar la codificación de caracteres
            $this->conn->exec("set names utf8");
        } catch(PDOException $exception) {
            echo "Error de conexión: " . $exception->getMessage();
        }
        return $this->conn;
    }
}
?>