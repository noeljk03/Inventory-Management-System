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
        $new_id = mysqli_insert_id($conn);
        logTransaction($conn, $user_id, $new_id, $name, 'added', $quantity, $quantity);
        echo json_encode(['success' => true, 'id' => $new_id]);
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

    $sql = "UPDATE inventory
            SET name='$name', sku='$sku', category='$category',
                quantity=$quantity, price=$price
            WHERE id=$id AND user_id=$user_id";

    if (mysqli_query($conn, $sql)) {
        logTransaction($conn, $user_id, $id, $name, 'updated', $quantity, $quantity);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
}

// ── DELETE: remove an item — only if it belongs to this user
elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int) $data['id'];

    // Fetch name BEFORE deleting so we can log it
    $item_row = mysqli_fetch_assoc(mysqli_query($conn,
        "SELECT name FROM inventory WHERE id=$id AND user_id=$user_id"
    ));

    $sql = "DELETE FROM inventory WHERE id=$id AND user_id=$user_id";
    if (mysqli_query($conn, $sql)) {
        if ($item_row) {
            logTransaction($conn, $user_id, $id, $item_row['name'], 'deleted');
        }
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
}
// ── Logging helper ───────────────────────────────────────
function logTransaction($conn, $user_id, $item_id, $item_name, $action, $qty_change = 0, $qty_after = 0) {
    $item_name = mysqli_real_escape_string($conn, $item_name);
    $sql = "INSERT INTO transactions (user_id, item_id, item_name, action, quantity_change, quantity_after)
            VALUES ($user_id, " . ($item_id ? $item_id : 'NULL') . ", '$item_name', '$action', $qty_change, $qty_after)";
    mysqli_query($conn, $sql);
}

?>
