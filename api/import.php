<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

session_start();
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once '../db.php';
$user_id = (int) $_SESSION['user_id'];

function logTransaction($conn, $user_id, $item_id, $item_name, $action, $qty_change = 0, $qty_after = 0, $snapshot = []) {
    $item_name = mysqli_real_escape_string($conn, $item_name);
    $sku       = mysqli_real_escape_string($conn, $snapshot['sku']           ?? '');
    $category  = mysqli_real_escape_string($conn, $snapshot['category']      ?? '');
    $price     = (float)                         ($snapshot['price']         ?? 0);
    $color     = mysqli_real_escape_string($conn, $snapshot['color']         ?? '');
    $size      = mysqli_real_escape_string($conn, $snapshot['size']          ?? '');
    $location  = mysqli_real_escape_string($conn, $snapshot['location']      ?? '');
    $reorder   = (int)                           ($snapshot['reorder_point'] ?? 0);
    $status    = mysqli_real_escape_string($conn, $snapshot['status']        ?? 'In Stock');
    $id_val    = $item_id ? $item_id : 'NULL';
    mysqli_query($conn, "INSERT INTO transactions
        (user_id, item_id, item_name, action, quantity_change, quantity_after,
         sku, category, price, color, size, location, reorder_point, status)
        VALUES ($user_id, $id_val, '$item_name', '$action', $qty_change, $qty_after,
         '$sku', '$category', $price, '$color', '$size', '$location', $reorder, '$status')");
}


$data = json_decode(file_get_contents('php://input'), true);
$rows = $data['rows'] ?? [];

if (empty($rows)) {
    echo json_encode(['success' => false, 'message' => 'No data received']);
    exit();
}

$imported = 0;
$skipped  = [];

foreach ($rows as $index => $row) {
    $rowNum = $index + 2; // +2 because row 1 is the header

    // ── Validate required fields ──────────────────────────
    $name     = trim($row['name']     ?? '');
    $sku      = trim($row['sku']      ?? '');
    $category = trim($row['category'] ?? '');
    $quantity = $row['quantity']       ?? '';
    $price    = $row['price']          ?? '';

    if ($name === '') {
        $skipped[] = "Row $rowNum: 'name' is missing";
        continue;
    }
    if ($sku === '') {
        $skipped[] = "Row $rowNum: 'sku' is missing";
        continue;
    }
    if ($category === '') {
        $skipped[] = "Row $rowNum: 'category' is missing";
        continue;
    }
    if (!is_numeric($quantity) || (int)$quantity < 0) {
        $skipped[] = "Row $rowNum: 'quantity' must be a non-negative number (got: '$quantity')";
        continue;
    }
    if (!is_numeric($price) || (float)$price < 0) {
        $skipped[] = "Row $rowNum: 'price' must be a non-negative number (got: '$price')";
        continue;
    }

    // ── Sanitise and insert ───────────────────────────────
    $name     = mysqli_real_escape_string($conn, $name);
    $sku      = mysqli_real_escape_string($conn, $sku);
    $category = mysqli_real_escape_string($conn, $category);
    $quantity = (int)   $quantity;
    $price    = (float) $price;

    $sql = "INSERT INTO inventory (name, sku, category, quantity, price, user_id)
            VALUES ('$name', '$sku', '$category', $quantity, $price, $user_id)
            ON DUPLICATE KEY UPDATE
                quantity = VALUES(quantity),
                price    = VALUES(price),
                category = VALUES(category),
                name     = VALUES(name)";

    if (mysqli_query($conn, $sql)) {
        $new_id = mysqli_insert_id($conn);
        $action = $new_id > 0 ? 'added' : 'updated';
        logTransaction($conn, $user_id, ($new_id ?: null), "$name ($sku)", $action, $quantity, $quantity, [
            'sku'           => $sku,
            'category'      => $category,
            'price'         => $price,
            'color'         => '',
            'size'          => '',
            'location'      => '',
            'reorder_point' => 0,
            'status'        => 'In Stock'
        ]);
        $imported++;
    } else {
        $skipped[] = "Row $rowNum: Database error — " . mysqli_error($conn);
    }
}

echo json_encode([
    'success'  => true,
    'imported' => $imported,
    'skipped'  => $skipped
]);
?>
