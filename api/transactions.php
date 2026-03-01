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

$result = mysqli_query($conn,
    "SELECT * FROM transactions WHERE user_id = $user_id ORDER BY created_at DESC LIMIT 100"
);

$logs = [];
while ($row = mysqli_fetch_assoc($result)) {
    $logs[] = $row;
}
echo json_encode($logs);
?>
