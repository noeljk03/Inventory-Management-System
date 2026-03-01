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
        // Log the import as a transaction
        $action = $new_id > 0 ? 'added' : 'updated';
        $log_name = mysqli_real_escape_string($conn, $name);
        $log_sku  = mysqli_real_escape_string($conn, $sku);
        mysqli_query($conn, "INSERT INTO transactions (user_id, item_id, item_name, action, quantity_change, quantity_after)
            VALUES ($user_id, " . ($new_id ?: 'NULL') . ", '$log_name ($log_sku)', '$action', $quantity, $quantity)");
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
