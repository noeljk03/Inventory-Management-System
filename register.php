<?php
session_start();

// If already logged in, go straight to the app
if (isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit();
}

require_once 'db.php';

$error   = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $email    = trim($_POST['email']);
    $password = $_POST['password'];
    $confirm  = $_POST['confirm_password'];

    // Basic validation
    if (!$username || !$email || !$password) {
        $error = 'All fields are required.';
    } elseif ($password !== $confirm) {
        $error = 'Passwords do not match.';
    } elseif (strlen($password) < 6) {
        $error = 'Password must be at least 6 characters.';
    } else {
        // Hash the password — NEVER store plain text
        $hashed = password_hash($password, PASSWORD_DEFAULT);

        $u = mysqli_real_escape_string($conn, $username);
        $e = mysqli_real_escape_string($conn, $email);

        $sql = "INSERT INTO users (username, email, password)
                VALUES ('$u', '$e', '$hashed')";

        if (mysqli_query($conn, $sql)) {
            $success = 'Account created! You can now log in.';
        } else {
            // Check if username/email already taken
            $error = 'Username or email already exists.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register — IMS</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="auth-page">
    <div class="auth-card">
        <h1 class="auth-title">IMS</h1>
        <p class="auth-subtitle">Create your account</p>

        <?php if ($error): ?>
            <div class="auth-error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <?php if ($success): ?>
            <div class="auth-success"><?= htmlspecialchars($success) ?></div>
        <?php endif; ?>

        <form method="POST" class="auth-form">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required placeholder="e.g. john_doe">
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="e.g. john@example.com">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Min. 6 characters">
            </div>
            <div class="form-group">
                <label for="confirm_password">Confirm Password</label>
                <input type="password" id="confirm_password" name="confirm_password" required>
            </div>
            <button type="submit" class="add-btn" style="width:100%">Create Account</button>
        </form>
        <p class="auth-link">Already have an account? <a href="login.php">Log in</a></p>
    </div>
</body>
</html>
