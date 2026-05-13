<?php
$dsn  = 'mysql:host=localhost;dbname=achensanqi_com;charset=utf8mb4';
$user = 'achensanqi_com';
$pass = 'a7m85mpaFtdjX876';

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => '数据库连接失败']);
    exit;
}
