<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

session_start();
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once '../db.php';
$user_id = (int) $_SESSION['user_id'];

$mode = $_GET['mode'] ?? 'history'; // 'history' | 'snapshot'

// ── History mode: return transactions, optionally filtered by date range ──
if ($mode === 'history') {
    $from = $_GET['from'] ?? '';
    $to   = $_GET['to']   ?? '';

    $where = "WHERE user_id = $user_id";
    if ($from) $where .= " AND DATE(created_at) >= '" . mysqli_real_escape_string($conn, $from) . "'";
    if ($to)   $where .= " AND DATE(created_at) <= '" . mysqli_real_escape_string($conn, $to)   . "'";

    $result = mysqli_query($conn,
        "SELECT * FROM transactions $where ORDER BY created_at DESC LIMIT 500"
    );
    $logs = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $logs[] = $row;
    }
    echo json_encode($logs);

// ── Snapshot mode: reconstruct inventory state as of a given date ─────────
} elseif ($mode === 'snapshot') {
    $date = $_GET['date'] ?? date('Y-m-d'); // default = today

    // For each item that ever existed for this user, get the LAST transaction
    // on or before the snapshot date — that row IS the item's state at that date.
    $safe_date = mysqli_real_escape_string($conn, $date);

    $sql = "
        SELECT t.*
        FROM transactions t
        INNER JOIN (
            SELECT item_id, MAX(created_at) AS latest
            FROM transactions
            WHERE user_id = $user_id
              AND item_id IS NOT NULL
              AND DATE(created_at) <= '$safe_date'
            GROUP BY item_id
        ) latest ON t.item_id = latest.item_id AND t.created_at = latest.latest
        WHERE t.user_id = $user_id
          AND t.action != 'deleted'
        ORDER BY t.item_name ASC
    ";

    $result = mysqli_query($conn, $sql);
    $snapshot = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $snapshot[] = $row;
    }
    echo json_encode($snapshot);
}
?>
