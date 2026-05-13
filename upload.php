<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['image'])) {
    echo json_encode(['error' => '无效请求']);
    exit;
}

$dir = __DIR__ . '/img/potions/';
if (!is_dir($dir)) {
    if (!mkdir($dir, 0777, true) && !is_dir($dir)) {
        echo json_encode(['error' => '目录创建失败，请检查服务器写入权限']);
        exit;
    }
}

$file = $_FILES['image'];

$info = @getimagesize($file['tmp_name']);
if (!$info) {
    echo json_encode(['error' => '不是有效的图片文件']);
    exit;
}

$extMap = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG  => 'png',
    IMAGETYPE_GIF  => 'gif',
    IMAGETYPE_WEBP => 'webp',
];
$ext = $extMap[$info[2]] ?? null;
if (!$ext) {
    echo json_encode(['error' => '不支持的图片格式']);
    exit;
}

$filename = 'potion_' . uniqid('', true) . '.' . $ext;
$dest     = $dir . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    echo json_encode(['error' => '文件保存失败']);
    exit;
}

echo json_encode(['path' => 'img/potions/' . $filename]);
