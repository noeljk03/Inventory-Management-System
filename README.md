# 📦 Inventory Management System (IMS)

A full-stack, single-page Inventory Management System built with **PHP**, **MySQL**, and **Vanilla JavaScript**. Designed for small to medium businesses to manage stock, track transactions, and visualise inventory data in real time.

---

## ✨ Features

### 🗃️ Inventory Management
- Add, edit, and delete inventory items
- 11 fields per item: Name, SKU, Category, Color, Size, Quantity, Price, Location, Reorder Point, Last Restock Date, Status
- Status badges: `In Stock`, `Reserved`, `Damaged`, `Obsolete`
- Low-stock row highlighting when quantity falls at or below the reorder point

### 📊 Dashboard
- **Stat Cards** — Total Items, Total Inventory Value, Low Stock Count
- **Bar Chart** — Stock by category with drill-down into individual items (click any bar)
- **Doughnut Chart** — Healthy vs low-stock split; switches between item count, quantity, and total value
- **Recently Updated** — Last 7 items added or modified
- **Alerts** — All items at or below their reorder point, with out-of-stock highlight
- **By Category** — Item count per category with proportional progress bars

### 💱 Live Currency Conversion
- Base currency: **INR (₹)**
- Select from INR, USD ($), EUR (€), GBP (£), JPY (¥), KRW (₩)
- Live exchange rates fetched from [frankfurter.app](https://www.frankfurter.app) on page load
- Preference saved in `localStorage` — persists across sessions

### 📜 Transaction History & Point-in-Time Snapshot
- Full audit log for every stock change, addition, deletion, and update
- Filter history by a custom date range (From / To)
- **Snapshot** — Reconstruct the complete inventory state as of any historical date (quantity, price, status, and all fields as they were on that day)

### 🔍 Search, Filter & Sort
- Live search by name, SKU, or category
- Category filter dropdown
- Click any column header to sort (ascending/descending toggle)
- 10 items per page with Prev / 1 2 3 … / Next pagination controls

### 📁 CSV Import & Export
- **Import** — Upload a CSV to bulk-add or update items
  - Required columns: `name`, `sku`, `category`, `quantity`, `price`
  - Optional columns: `color`, `size`, `location`, `reorder_point`, `last_restock_date`, `status`
- **Export** — Download your current inventory as a `.csv` file

### 🔐 Authentication
- User registration and login
- Session-based authentication (PHP sessions)
- All data is isolated per user — no cross-user data leakage

---

## 🛠️ Tech Stack

| Layer    | Technology           |
|----------|----------------------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Charts   | [Chart.js](https://www.chartjs.org/) |
| Backend  | PHP 8+               |
| Database | MySQL (via MySQLi)   |
| Server   | Apache (XAMPP)       |
| Currency | [frankfurter.app](https://www.frankfurter.app) API |

---

## 🚀 Getting Started

### Prerequisites
- [XAMPP](https://www.apachefriends.org/) (or any Apache + PHP + MySQL stack)
- PHP 8.0+
- MySQL 5.7+

### Installation

1. **Clone the repository** into your XAMPP `htdocs` folder:
   ```bash
   git clone https://github.com/noeljk03/Inventory-Management-System.git C:/xampp/htdocs/ims
   ```

2. **Start Apache and MySQL** in the XAMPP Control Panel.

3. **Create the database:**
   - Open [phpMyAdmin](http://localhost/phpmyadmin)
   - Create a new database called `ims`
   - Import the provided `ims.sql` file (or run the schema below)

4. **Configure the database connection** in `db.php`:
   ```php
   $conn = mysqli_connect('localhost', 'root', '', 'ims');
   ```

5. **Open the app** in your browser:
   ```
   http://localhost/ims/
   ```

6. **Register** a new account and start adding inventory.

---

## 📂 Project Structure

```
ims/
├── index.php              # Main SPA shell (HTML structure)
├── app.js                 # All frontend logic (20 documented sections)
├── style.css              # All styles (dark-themed, responsive)
├── db.php                 # Database connection
├── login.php              # Login page
├── register.php           # Registration page
├── logout.php             # Session destroy + redirect
└── api/
    ├── items.php          # GET / POST / PUT / DELETE inventory items
    ├── transactions.php   # History log + point-in-time snapshot
    └── import.php         # CSV bulk import handler
```

---

## 📸 Screenshots

> Dashboard with charts, stat cards, and widgets

---

## 📋 Database Schema (Key Tables)

### `inventory`
| Column             | Type         | Notes                          |
|--------------------|--------------|--------------------------------|
| `id`               | INT PK       | Auto-increment                 |
| `user_id`          | INT FK       | Isolates data per user         |
| `name`             | VARCHAR(255) | Item name                      |
| `sku`              | VARCHAR(100) | Unique per user                |
| `category`         | VARCHAR(100) |                                |
| `quantity`         | INT          |                                |
| `price`            | DECIMAL      | Stored in INR                  |
| `color`            | VARCHAR(50)  | Optional                       |
| `size`             | VARCHAR(50)  | Optional                       |
| `location`         | VARCHAR(100) | Shelf / warehouse location     |
| `reorder_point`    | INT          | Alert threshold                |
| `last_restock_date`| DATE         | Optional                       |
| `status`           | ENUM         | In Stock / Reserved / Damaged / Obsolete |
| `created_at`       | TIMESTAMP    | Auto-set on insert             |

### `transactions`
Stores a full snapshot of the item state at the time of every action — enables point-in-time inventory reconstruction.

---

## 📄 CSV Import Format

| Column             | Required | Example              |
|--------------------|----------|----------------------|
| `name`             | ✅       | Apple iPhone 15 Pro  |
| `sku`              | ✅       | ELEC-001             |
| `category`         | ✅       | Electronics          |
| `quantity`         | ✅       | 45                   |
| `price`            | ✅       | 134999               |
| `color`            | ❌       | Titanium Black       |
| `size`             | ❌       | 256GB                |
| `location`         | ❌       | Shelf A1             |
| `reorder_point`    | ❌       | 10                   |
| `last_restock_date`| ❌       | 2026-02-15           |
| `status`           | ❌       | In Stock             |

---

## 📝 License

This project is for educational purposes.

---

*Built with ❤️ using PHP, MySQL, and Vanilla JavaScript.*
