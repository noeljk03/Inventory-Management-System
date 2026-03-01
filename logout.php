<?php
session_start();
session_destroy(); // wipes all session data
header('Location: login.php');
exit();
?>
