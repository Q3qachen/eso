<?php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['image'])) {
    echo json_encode(array('error' => '无效请求'));
    exit;
}

$dir = __DIR__ . '/img/potions/';
if (!is_dir($dir)) {
    if (!@mkdir($dir, 0777, true) && !is_dir($dir)) {
        echo json_encode(array('error' => '目录创建失败，请在宝塔文件管理中手动建立 img/potions 文件夹并设置权限755'));
        exit;
    }
}

if (!is_writable($dir)) {
    echo json_encode(array('error' => 'img/potions 目录不可写，请在宝塔中将该目录权限设为755'));
    exit;
}

$file = $_FILES['image'];

$info = @getimagesize($file['tmp_name']);
if (!$info) {
    echo json_encode(array('error' => '不是有效的图片文件'));
    exit;
}

$extMap = array(
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG  => 'png',
    IMAGETYPE_GIF  => 'gif',
    IMAGETYPE_WEBP => 'webp',
);
$ext = isset($extMap[$info[2]]) ? $extMap[$info[2]] : null;
if (!$ext) {
    echo json_encode(array('error' => '不支持的图片格式，请使用 jpg/png/gif/webp'));
    exit;
}

$filename = 'potion_' . uniqid('', true) . '.' . $ext;
$dest     = $dir . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    echo json_encode(array('error' => '文件移动失败，请检查 PHP upload_tmp_dir 配置'));
    exit;
}

echo json_encode(array('path' => 'img/potions/' . $filename));
