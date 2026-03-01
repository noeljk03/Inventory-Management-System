<?php
session_start(); // start or resume the session

// If the user is NOT logged in, send them to login page
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit(); // stop executing the rest of the page
}
?>
