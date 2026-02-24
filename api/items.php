<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: fetch all items ──────────────────────────────────
if ($method === 'GET') {
    $result = mysqli_query($conn, 'SELECT * FROM inventory ORDER BY created_at DESC');
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $items[] = $row;
    }
    echo json_encode($items);
}

// ── POST: insert a new item ───────────────────────────────
elseif ($method === 'POST') {
    // PHP reads JSON body like this:
    $data = json_decode(file_get_contents('php://input'), true);

    $name     = mysqli_real_escape_string($conn, $data['name']);
    $sku      = mysqli_real_escape_string($conn, $data['sku']);
    $category = mysqli_real_escape_string($conn, $data['category']);
    $quantity = (int) $data['quantity'];
    $price    = (float) $data['price'];

    $sql = "INSERT INTO inventory (name, sku, category, quantity, price)
            VALUES ('$name', '$sku', '$category', $quantity, $price)";

    if (mysqli_query($conn, $sql)) {
        echo json_encode(['success' => true, 'id' => mysqli_insert_id($conn)]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
}

// ── PUT: update an existing item ─────────────────────────
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);

    $id       = (int) $data['id'];
    $name     = mysqli_real_escape_string($conn, $data['name']);
    $sku      = mysqli_real_escape_string($conn, $data['sku']);
    $category = mysqli_real_escape_string($conn, $data['category']);
    $quantity = (int) $data['quantity'];
    $price    = (float) $data['price'];

    $sql = "UPDATE inventory
            SET name='$name', sku='$sku', category='$category',
                quantity=$quantity, price=$price
            WHERE id=$id";

    if (mysqli_query($conn, $sql)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
}

// ── DELETE: remove an item ────────────────────────────────
elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int) $data['id'];

    $sql = "DELETE FROM inventory WHERE id=$id";

    if (mysqli_query($conn, $sql)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
}
?>
