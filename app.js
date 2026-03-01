const API = 'http://localhost/ims/api/items.php';

// ── Navigation ────────────────────────────────────────────
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.page-section');

navLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
        event.preventDefault();
        navLinks.forEach(function (l) { l.classList.remove('active'); });
        this.classList.add('active');
        document.getElementById('page-title').textContent = this.querySelector('.nav-text').innerText;
        const targetId = this.getAttribute('href').replace('#', '');
        sections.forEach(function (s) { s.classList.remove('visible'); });
        document.getElementById(targetId).classList.add('visible');
    });
});

// ── Dynamic Date ──────────────────────────────────────────
const today = new Date();
document.getElementById('current-date').textContent = today.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
});

// ── Core State ────────────────────────────────────────────
let inventory = [];       // will be filled from the database
let editingId = null;    // stores the DATABASE id of item being edited (not array index!)

const form = document.querySelector('.add-item-form');
console.log('form element:', form);
const tableBody = document.querySelector('.inventory-table tbody');

// ── Fetch all items from PHP API ──────────────────────────
function loadInventory() {
    fetch(API)
        .then(function (res) { return res.json(); })
        .then(function (items) {
            inventory = items;    // replace local array with database data
            renderTable();
        });
}

// ── Render table from inventory array ────────────────────
function renderTable(items) {
    const list = items || inventory;
    tableBody.innerHTML = '';

    list.forEach(function (item) {
        const row = document.createElement('tr');
        if (parseInt(item.quantity) <= 5) row.classList.add('low-stock-row');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.sku}</td>
            <td>${item.category}</td>
            <td>${item.quantity}</td>
            <td>$${parseFloat(item.price).toFixed(2)}</td>
            <td>
                <button class="action-btn edit-btn"   data-id="${item.id}">Edit</button>
                <button class="action-btn delete-btn" data-id="${item.id}">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    updateStats();
}

// ── Stats ─────────────────────────────────────────────────
function updateStats() {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce(function (sum, item) {
        return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);
    const lowStock = inventory.filter(function (item) {
        return parseInt(item.quantity) <= 5;
    }).length;

    document.getElementById('stat-total-items').textContent = totalItems;
    document.getElementById('stat-total-value').textContent = '$' + totalValue.toFixed(2);
    document.getElementById('stat-low-stock').textContent = lowStock;
}

// ── Search ────────────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();
    if (query === '') { renderTable(); return; }
    const filtered = inventory.filter(function (item) {
        return item.name.toLowerCase().includes(query) ||
            item.sku.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query);
    });
    renderTable(filtered);
});

// ── Table click (Edit / Delete) ───────────────────────────
tableBody.addEventListener('click', function (event) {
    const id = parseInt(event.target.getAttribute('data-id'));

    if (event.target.classList.contains('delete-btn')) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        fetch(API, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.success) loadInventory(); // refresh from DB
            });
    }

    else if (event.target.classList.contains('edit-btn')) {
        const item = inventory.find(function (i) { return parseInt(i.id) === id; });

        document.getElementById('item-name').value = item.name;
        document.getElementById('sku').value = item.sku;
        document.getElementById('category').value = item.category;
        document.getElementById('quantity').value = item.quantity;
        document.getElementById('price').value = item.price;

        editingId = id;   // store the DB id, not array index
        document.querySelector('.add-btn').textContent = 'Update Item';
        document.querySelector('a[href="#add-item"]').click();
    }
});

// ── Form submit (Add or Edit) ─────────────────────────────
form.addEventListener('submit', function (event) {
    console.log('form submitted!');
    event.preventDefault();

    const payload = {
        name: document.getElementById('item-name').value.trim(),
        sku: document.getElementById('sku').value.trim(),
        category: document.getElementById('category').value,
        quantity: parseInt(document.getElementById('quantity').value),
        price: parseFloat(document.getElementById('price').value)
    };

    if (!payload.name || !payload.sku || !payload.category || !payload.quantity || !payload.price) {
        alert('Please fill in all fields!');
        return;
    }

    if (editingId !== null) {
        payload.id = editingId;
        fetch(API, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.success) {
                    editingId = null;
                    document.querySelector('.add-btn').textContent = 'Add Item';
                    form.reset();
                    loadInventory();
                    document.querySelector('a[href="#inventory"]').click();
                }
            });
    } else {
        fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.success) {
                    form.reset();
                    loadInventory();
                    document.querySelector('a[href="#inventory"]').click();
                }
            });
    }
});

// ── Export CSV ────────────────────────────────────────────
function exportToCSV() {
    const headers = ['Item Name', 'SKU', 'Category', 'Quantity', 'Price'];
    const rows = inventory.map(function (item) {
        return [`"${item.name}"`, `"${item.sku}"`, `"${item.category}"`, item.quantity, item.price].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
}
document.getElementById('export-btn').addEventListener('click', exportToCSV);

// ── Boot ──────────────────────────────────────────────────
loadInventory();   // load data from database on page start
