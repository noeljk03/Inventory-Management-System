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
$quantity = (int)   $data['quantity'];
$price    = (float) $data['price'];
$color    = mysqli_real_escape_string($conn, $data['color']    ?? '');
$size     = mysqli_real_escape_string($conn, $data['size']     ?? '');
$location = mysqli_real_escape_string($conn, $data['location'] ?? '');
$reorder  = (int)   ($data['reorder_point'] ?? 0);
$restock  = mysqli_real_escape_string($conn, $data['last_restock_date'] ?? '');
$status   = mysqli_real_escape_string($conn, $data['status']   ?? 'In Stock');

$restock_val = $restock ? "'$restock'" : 'NULL';

$sql = "INSERT INTO inventory (name, sku, category, quantity, price, color, size, location, reorder_point, last_restock_date, status, user_id)
        VALUES ('$name','$sku','$category',$quantity,$price,'$color','$size','$location',$reorder,$restock_val,'$status',$user_id)";


    if (mysqli_query($conn, $sql)) {
        $new_id = mysqli_insert_id($conn);
        logTransaction($conn, $user_id, $new_id, $name, 'added', $quantity, $quantity, [
            'sku'          => $sku,
            'category'     => $category,
            'price'        => $price,
            'color'        => $color,
            'size'         => $size,
            'location'     => $location,
            'reorder_point'=> $reorder,
            'status'       => $status
        ]);
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
$quantity = (int)   $data['quantity'];
$price    = (float) $data['price'];
$color    = mysqli_real_escape_string($conn, $data['color']    ?? '');
$size     = mysqli_real_escape_string($conn, $data['size']     ?? '');
$location = mysqli_real_escape_string($conn, $data['location'] ?? '');
$reorder  = (int)   ($data['reorder_point'] ?? 0);
$restock  = mysqli_real_escape_string($conn, $data['last_restock_date'] ?? '');
$status   = mysqli_real_escape_string($conn, $data['status']   ?? 'In Stock');
$restock_val = $restock ? "'$restock'" : 'NULL';

   $sql = "UPDATE inventory
        SET name='$name', sku='$sku', category='$category',
            quantity=$quantity, price=$price,
            color='$color', size='$size', location='$location',
            reorder_point=$reorder, last_restock_date=$restock_val,
            status='$status'
        WHERE id=$id AND user_id=$user_id";

    if (mysqli_query($conn, $sql)) {
        logTransaction($conn, $user_id, $id, $name, 'updated', $quantity, $quantity, [
            'sku'          => $sku,
            'category'     => $category,
            'price'        => $price,
            'color'        => $color,
            'size'         => $size,
            'location'     => $location,
            'reorder_point'=> $reorder,
            'status'       => $status
        ]);
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
// $snapshot = array of item fields at the moment of the change
function logTransaction($conn, $user_id, $item_id, $item_name, $action, $qty_change = 0, $qty_after = 0, $snapshot = []) {
    $item_name = mysqli_real_escape_string($conn, $item_name);
    $sku       = mysqli_real_escape_string($conn, $snapshot['sku']            ?? '');
    $category  = mysqli_real_escape_string($conn, $snapshot['category']       ?? '');
    $price     = (float)                         ($snapshot['price']          ?? 0);
    $color     = mysqli_real_escape_string($conn, $snapshot['color']          ?? '');
    $size      = mysqli_real_escape_string($conn, $snapshot['size']           ?? '');
    $location  = mysqli_real_escape_string($conn, $snapshot['location']       ?? '');
    $reorder   = (int)                           ($snapshot['reorder_point']  ?? 0);
    $status    = mysqli_real_escape_string($conn, $snapshot['status']         ?? 'In Stock');

    $id_val = $item_id ? $item_id : 'NULL';
    $sql = "INSERT INTO transactions
                (user_id, item_id, item_name, action,
                 quantity_change, quantity_after,
                 sku, category, price, color, size, location, reorder_point, status)
            VALUES
                ($user_id, $id_val, '$item_name', '$action',
                 $qty_change, $qty_after,
                 '$sku', '$category', $price, '$color', '$size', '$location', $reorder, '$status')";
    mysqli_query($conn, $sql);
}

?>
