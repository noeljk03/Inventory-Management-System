<?php

// These are the credentials XAMPP sets by default
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');          // XAMPP's default MySQL password is empty
define('DB_NAME', 'ims_db');

// Create the connection
$conn = mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Check if the connection failed
if (!$conn) {
    die(json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . mysqli_connect_error()
    ]));
}
?>
