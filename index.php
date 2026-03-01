<?php require_once 'auth.php'; ?>


<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IMS - Inventory Management System</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>

<body>
    <div class="app-container">



        <aside class="sidebar">
            <div class="brand">
                <h1 class="app-title">IMS</h1>
            </div>
            <nav class="sidebar-nav">
                <ul class="nav-list">
                    <li class="nav-item">
                        <a href="#dashboard" class="nav-link active">
                            <span class="nav-icon"></span>
                            <span class="nav-text">Dashboard</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#inventory" class="nav-link">
                            <span class="nav-icon"></span>
                            <span class="nav-text">Inventory</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#add-item" class="nav-link">
                            <span class="nav-icon"></span>
                            <span class="nav-text">Add Item</span>
                        </a>
                    </li>
                    <li class="nav-item">
    <a href="#history" class="nav-link">
        <span class="nav-icon"></span>
        <span class="nav-text">History</span>
    </a>
</li>

                </ul>
            </nav>  
        </aside>

        <main class="main-content">
            <header class="topbar">
    <h1 class="page-title" id="page-title">Dashboard</h1>
    <div class="topbar-right">
        <span class="date" id="current-date"></span>
        <span class="logged-in-user">👤 <?= htmlspecialchars($_SESSION['username']) ?></span>
        <a href="logout.php" class="logout-btn">Logout</a>
    </div>
</header>


            <section class="dashboard-section page-section visible" id="dashboard">

                <div class="stats-cards">
                    <div class="stat-card">
                        <span class="stat-label">Total Items</span>
                        <span class="stat-value" id="stat-total-items">0</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Total Value</span>
                        <span class="stat-value" id="stat-total-value">$0.00</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Low Stock</span>
                        <span class="stat-value" id="stat-low-stock">0</span>
                    </div>
                </div>

                <div class="charts-row">
                    <div class="chart-card">
                        <h3 class="chart-title">Stock by Category</h3>
                        <canvas id="chart-category"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3 class="chart-title">Stock Health</h3>
                        <canvas id="chart-stock"></canvas>
                    </div>
                </div>

            </section>


            <section class="inventory-section page-section" id="inventory">
                <div class="inventory-header">
                    <h2 class="section-title">Inventory List</h2>
                    <div class="inventory-actions">
                        <input type="text" id="search-input" class="search-input" placeholder="Search items...">
                        <select id="category-filter" class="category-filter">
                            <option value="">All Categories</option>
                        </select>
                        <button id="export-btn" class="export-btn">Export CSV</button>
                    </div>
                </div>

                <table class="inventory-table">
                    <thead>
                        <tr>
                            <th data-sort="name">Item Name <span class="sort-icon">↕</span></th>
                            <th data-sort="sku">SKU <span class="sort-icon">↕</span></th>
                            <th data-sort="category">Category <span class="sort-icon">↕</span></th>
                            <th data-sort="quantity">Quantity <span class="sort-icon">↕</span></th>
                            <th data-sort="price">Price <span class="sort-icon">↕</span></th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
                <div class="pagination" id="pagination"></div>
            </section>

            <section class="add-item-section page-section" id="add-item">
                <form class="add-item-form">
                    <h2 class="section-title">Add New Item</h2>
                    <div class="form-group">
                        <label for="item-name">Item Name</label>
                        <input type="text" id="item-name" name="item-name" placeholder="e.g., Laptop">
                    </div>
                    <div class="form-group">
                        <label for="sku">SKU</label>
                        <input type="text" id="sku" name="sku" placeholder="e.g., SKU12345">
                    </div>
                    <div class="form-group">
                        <label for="category">Category</label>
                        <select id="category" name="category">
                            <option value="">-- Select Category --</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Clothing">Clothing</option>
                            <option value="Food">Food</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="quantity">Quantity</label>
                        <input type="number" id="quantity" name="quantity" placeholder="e.g., 10">
                    </div>
                    <div class="form-group">
                        <label for="price">Price</label>
                        <input type="number" id="price" name="price" step="0.01" placeholder="e.g., 5.99">
                    </div>
                    <button type="submit" class="add-btn">Add Item</button>
                </form>
            </section>

            <section class="history-section page-section" id="history">
    <h2 class="section-title">Activity Log</h2>
    <table class="inventory-table">
        <thead>
            <tr>
                <th>Item</th>
                <th>Action</th>
                <th>Qty Change</th>
                <th>Qty After</th>
                <th>Date &amp; Time</th>
            </tr>
        </thead>

        <tbody id="history-body">
        </tbody>
    </table>

</section>


        </main>
    </div>
    <div class="modal-overlay" id="modal-overlay">
    <div class="modal-card">
        <div class="modal-header">
            <h2 class="modal-title" id="modal-title">Item Detail</h2>
            <button class="modal-close" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
            <div class="detail-grid" id="detail-grid"></div>
            <h3 class="modal-section-title">Transaction History</h3>
            <table class="inventory-table" id="modal-history-table">
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Qty Change</th>
                        <th>Qty After</th>
                        <th>Date &amp; Time</th>
                    </tr>
                </thead>
                <tbody id="modal-history-body"></tbody>
            </table>
        </div>
    </div>
</div>

    <script src="app.js"></script>
</body>

</html>
