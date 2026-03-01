<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

// Reject unauthenticated API calls
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once '../db.php';

$method  = $_SERVER['REQUEST_METHOD'];
$user_id = (int) $_SESSION['user_id']; // always an integer from the session

// ── GET: fetch items belonging to this user only ──────────
if ($method === 'GET') {
    $result = mysqli_query($conn,
        "SELECT * FROM inventory WHERE user_id = $user_id ORDER BY created_at DESC"
    );
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $items[] = $row;
    }
    echo json_encode($items);
}

// ── POST: insert a new item for this user ─────────────────
elseif ($method === 'POST') {
    $data     = json_decode(file_get_contents('php://input'), true);
    $name     = mysqli_real_escape_string($conn, $data['name']);
    $sku      = mysqli_real_escape_string($conn, $data['sku']);
    $category = mysqli_real_escape_string($conn, $data['category']);
    $quantity = (int) $data['quantity'];
    $price    = (float) $data['price'];

    $sql = "INSERT INTO inventory (name, sku, category, quantity, price, user_id)
            VALUES ('$name', '$sku', '$category', $quantity, $price, $user_id)";

    if (mysqli_query($conn, $sql)) {
        echo json_encode(['success' => true, 'id' => mysqli_insert_id($conn)]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
}

// ── PUT: update an item — only if it belongs to this user ─
elseif ($method === 'PUT') {
    $data     = json_decode(file_get_contents('php://input'), true);
    $id       = (int) $data['id'];
    $name     = mysqli_real_escape_string($conn, $data['name']);
    $sku      = mysqli_real_escape_string($conn, $data['sku']);
    $category = mysqli_real_escape_string($conn, $data['category']);
    $quantity = (int) $data['quantity'];
    $price    = (float) $data['price'];

    // WHERE user_id = $user_id prevents editing another user's items
    $sql = "UPDATE inventory
            SET name='$name', sku='$sku', category='$category',
                quantity=$quantity, price=$price
            WHERE id=$id AND user_id=$user_id";

    if (mysqli_query($conn, $sql)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
}

// ── DELETE: remove an item — only if it belongs to this user
elseif ($method === 'DELETE') {
    $data    = json_decode(file_get_contents('php://input'), true);
    $id      = (int) $data['id'];

    // WHERE user_id = $user_id prevents deleting another user's items
    $sql = "DELETE FROM inventory WHERE id=$id AND user_id=$user_id";

    if (mysqli_query($conn, $sql)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
}
?>
