<?php
// Back-end/config/database.php
class Database {
    private $host = "db"; 
    private $db_name = "optiflota_db";
    private $username = "optiflota_user";
    private $password = "password123";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
        } catch(PDOException $exception) {
           die("Error de conexión: " . $exception->getMessage());
        }
        
        return $this->conn;
    }
}
?>