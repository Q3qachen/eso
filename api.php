<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';

switch ($action) {

    // ── 读取所有数据 ──────────────────────────────────────────────
    case 'get_all':
        $tags = [];
        foreach ($pdo->query('SELECT name FROM potion_tags ORDER BY id ASC') as $row) {
            $tags[] = $row['name'];
        }

        $items = [];
        foreach ($pdo->query('SELECT id, name, type, image, tags FROM potion_items ORDER BY id ASC') as $row) {
            $row['id']   = (int)$row['id'];
            $row['tags'] = json_decode($row['tags'], true) ?: [];
            $items[]     = $row;
        }

        echo json_encode(['items' => $items, 'tags' => $tags], JSON_UNESCAPED_UNICODE);
        break;

    // ── 新建 / 编辑条目 ───────────────────────────────────────────
    case 'save_item':
        $data  = json_decode(file_get_contents('php://input'), true) ?: [];
        $id    = (int)($data['id'] ?? 0);
        $name  = trim($data['name'] ?? '');
        $type  = trim($data['type'] ?? '食物');
        $image = trim($data['image'] ?? '');
        $tags  = json_encode($data['tags'] ?? [], JSON_UNESCAPED_UNICODE);

        if ($name === '') {
            echo json_encode(['error' => '名称不能为空']);
            break;
        }

        if ($id > 0) {
            $stmt = $pdo->prepare(
                'UPDATE potion_items SET name=?, type=?, image=?, tags=? WHERE id=?'
            );
            $stmt->execute([$name, $type, $image, $tags, $id]);
            echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO potion_items (name, type, image, tags) VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([$name, $type, $image, $tags]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ── 删除条目 ──────────────────────────────────────────────────
    case 'delete_item':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id   = (int)($data['id'] ?? 0);
        if ($id > 0) {
            $stmt = $pdo->prepare('DELETE FROM potion_items WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => '无效ID']);
        }
        break;

    // ── 新增标签 ──────────────────────────────────────────────────
    case 'save_tag':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $name = trim($data['name'] ?? '');
        if ($name === '') {
            echo json_encode(['error' => '标签名不能为空']);
            break;
        }
        $stmt = $pdo->prepare('INSERT IGNORE INTO potion_tags (name) VALUES (?)');
        $stmt->execute([$name]);
        echo json_encode(['success' => true]);
        break;

    // ── 删除标签（同时从所有条目中移除）─────────────────────────
    case 'delete_tag':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $name = trim($data['name'] ?? '');
        if ($name === '') {
            echo json_encode(['error' => '标签名不能为空']);
            break;
        }

        $stmt = $pdo->prepare('DELETE FROM potion_tags WHERE name=?');
        $stmt->execute([$name]);

        $rows = $pdo->query('SELECT id, tags FROM potion_items')->fetchAll();
        foreach ($rows as $row) {
            $tags = json_decode($row['tags'], true) ?: [];
            $tags = array_values(array_filter($tags, fn($t) => $t !== $name));
            $upd  = $pdo->prepare('UPDATE potion_items SET tags=? WHERE id=?');
            $upd->execute([json_encode($tags, JSON_UNESCAPED_UNICODE), $row['id']]);
        }

        echo json_encode(['success' => true]);
        break;

    // ── 读取所有装备 ──────────────────────────────────────────
    case 'get_equipment':
        $items = [];
        foreach ($pdo->query('SELECT id, name, role, image FROM equipment_items ORDER BY id ASC') as $row) {
            $row['id'] = (int)$row['id'];
            $items[]   = $row;
        }
        echo json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
        break;

    // ── 新建 / 编辑装备 ───────────────────────────────────────
    case 'save_equipment':
        $data  = json_decode(file_get_contents('php://input'), true) ?: [];
        $id    = (int)($data['id'] ?? 0);
        $name  = trim($data['name'] ?? '');
        $role  = in_array($data['role'] ?? '', ['输出', '坦克', '奶妈']) ? $data['role'] : '输出';
        $image = trim($data['image'] ?? '');

        if ($name === '') {
            echo json_encode(['error' => '名称不能为空']);
            break;
        }

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE equipment_items SET name=?, role=?, image=? WHERE id=?');
            $stmt->execute([$name, $role, $image, $id]);
            echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
        } else {
            $stmt = $pdo->prepare('INSERT INTO equipment_items (name, role, image) VALUES (?, ?, ?)');
            $stmt->execute([$name, $role, $image]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ── 删除装备 ──────────────────────────────────────────────
    case 'delete_equipment':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id   = (int)($data['id'] ?? 0);
        if ($id > 0) {
            $stmt = $pdo->prepare('DELETE FROM equipment_items WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => '无效ID']);
        }
        break;

    // ── 读取所有笔记 ──────────────────────────────────────────
    case 'get_tips':
        $items = [];
        foreach ($pdo->query('SELECT id, category, content FROM tip_items ORDER BY id DESC') as $row) {
            $row['id'] = (int)$row['id'];
            $items[]   = $row;
        }
        echo json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
        break;

    // ── 新建 / 编辑笔记 ───────────────────────────────────────
    case 'save_tip':
        $data     = json_decode(file_get_contents('php://input'), true) ?: [];
        $id       = (int)($data['id'] ?? 0);
        $category = trim($data['category'] ?? '其他');
        $content  = trim($data['content']  ?? '');

        if ($category === '') $category = '其他';
        if ($content === '') {
            echo json_encode(['error' => '内容不能为空']);
            break;
        }

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE tip_items SET category=?, content=? WHERE id=?');
            $stmt->execute([$category, $content, $id]);
            echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
        } else {
            $stmt = $pdo->prepare('INSERT INTO tip_items (category, content) VALUES (?, ?)');
            $stmt->execute([$category, $content]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ── 删除笔记 ──────────────────────────────────────────────
    case 'delete_tip':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id   = (int)($data['id'] ?? 0);
        if ($id > 0) {
            $stmt = $pdo->prepare('DELETE FROM tip_items WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => '无效ID']);
        }
        break;

    // ── 读取所有构筑 ──────────────────────────────────────────
    case 'get_builds':
        $items = [];
        foreach ($pdo->query('SELECT id, name, role, image FROM build_items ORDER BY id ASC') as $row) {
            $row['id'] = (int)$row['id'];
            $items[]   = $row;
        }
        echo json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
        break;

    // ── 新建 / 编辑构筑 ───────────────────────────────────────
    case 'save_build':
        $data  = json_decode(file_get_contents('php://input'), true) ?: [];
        $id    = (int)($data['id'] ?? 0);
        $name  = trim($data['name'] ?? '');
        $role  = in_array($data['role'] ?? '', ['输出', '坦克', '奶妈']) ? $data['role'] : '输出';
        $image = trim($data['image'] ?? '');

        if ($name === '') {
            echo json_encode(['error' => '名称不能为空']);
            break;
        }

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE build_items SET name=?, role=?, image=? WHERE id=?');
            $stmt->execute([$name, $role, $image, $id]);
            echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
        } else {
            $stmt = $pdo->prepare('INSERT INTO build_items (name, role, image) VALUES (?, ?, ?)');
            $stmt->execute([$name, $role, $image]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ── 删除构筑 ──────────────────────────────────────────────
    case 'delete_build':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id   = (int)($data['id'] ?? 0);
        if ($id > 0) {
            $stmt = $pdo->prepare('DELETE FROM build_items WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => '无效ID']);
        }
        break;

    default:
        echo json_encode(['error' => '未知操作']);
        // 做存档

}
