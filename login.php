<?php
session_start();

if (isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit();
}

require_once 'db.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = $_POST['password'];

    if (!$username || !$password) {
        $error = 'Please enter your username and password.';
    } else {
        $u   = mysqli_real_escape_string($conn, $username);
        $sql = "SELECT * FROM users WHERE username = '$u' LIMIT 1";
        $result = mysqli_query($conn, $sql);
        $user   = mysqli_fetch_assoc($result);

        if ($user && password_verify($password, $user['password'])) {
            // Credentials correct — start the session
            $_SESSION['user_id']  = $user['id'];
            $_SESSION['username'] = $user['username'];
            header('Location: index.php');
            exit();
        } else {
            $error = 'Invalid username or password.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login — IMS</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="auth-page">
    <div class="auth-card">
        <h1 class="auth-title">IMS</h1>
        <p class="auth-subtitle">Sign in to your account</p>

        <?php if ($error): ?>
            <div class="auth-error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <form method="POST" class="auth-form">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required placeholder="Your username">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Your password">
            </div>
            <button type="submit" class="add-btn" style="width:100%">Sign In</button>
        </form>
        <p class="auth-link">Don't have an account? <a href="register.php">Register</a></p>
    </div>
</body>
</html>
