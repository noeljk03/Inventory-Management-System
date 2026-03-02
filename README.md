# Inventory Management System (IMS)

A full-stack, single-page Inventory Management System built with PHP, MySQL, and Vanilla JavaScript.

---

## Features

- **Inventory CRUD** — Add, edit, delete items with 11 fields (Name, SKU, Category, Color, Size, Quantity, Price, Location, Reorder Point, Last Restock Date, Status)
- **Dashboard** — Stat cards, interactive bar and doughnut charts with category drill-down, and three live widgets (Recently Updated, Alerts, By Category)
- **Live Currency Conversion** — Base INR; switch to USD, EUR, GBP, JPY, KRW with real-time exchange rates via [frankfurter.app](https://www.frankfurter.app)
- **Transaction History** — Full audit log of every change, filterable by date range
- **Point-in-Time Snapshot** — Reconstruct the exact inventory state as of any past date
- **CSV Import / Export** — Bulk import with 5 required + 6 optional columns; export current inventory
- **Search, Filter & Sort** — Live search, category filter, sortable columns, paginated table (10/page)
- **Authentication** — Per-user data isolation via PHP sessions

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | HTML, CSS, Vanilla JS |
| Charts   | Chart.js |
| Backend  | PHP 8+ |
| Database | MySQL (MySQLi) |
| Server   | Apache (XAMPP) |

---

## Setup

1. Clone into your XAMPP `htdocs` folder:
   ```bash
   git clone https://github.com/noeljk03/Inventory-Management-System.git C:/xampp/htdocs/ims
   ```

2. Start Apache and MySQL in XAMPP Control Panel.

3. Create the `ims` database in [phpMyAdmin](http://localhost/phpmyadmin) and import `ims.sql`.

4. Configure `db.php` with your database credentials:
   ```php
   $conn = mysqli_connect('localhost', 'root', '', 'ims');
   ```

5. Open `http://localhost/ims/` and register an account.

---

## Project Structure

```
ims/
├── index.php              # Main SPA shell
├── app.js                 # All frontend logic
├── style.css              # Styles
├── db.php                 # Database connection
├── login.php / register.php / logout.php
└── api/
    ├── items.php          # Inventory CRUD (GET/POST/PUT/DELETE)
    ├── transactions.php   # History log + point-in-time snapshot
    └── import.php         # CSV bulk import
```

---

## CSV Import Format

| Column             | Required |
|--------------------|----------|
| `name`             | ✅ |
| `sku`              | ✅ |
| `category`         | ✅ |
| `quantity`         | ✅ |
| `price`            | ✅ |
| `color`            | ❌ |
| `size`             | ❌ |
| `location`         | ❌ |
| `reorder_point`    | ❌ |
| `last_restock_date`| ❌ |
| `status`           | ❌ |
