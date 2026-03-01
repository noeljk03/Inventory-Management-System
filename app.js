const API = 'http://localhost/ims/api/items.php';
const TRANSACTIONS_API = 'http://localhost/ims/api/transactions.php';
const PAGE_SIZE = 10;  // items shown per page
let currentPage = 1;   // which page we're on
let activeCategory = '';  // '' = all categories



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

        // Load history data when switching to History tab
        if (targetId === 'history') loadHistory();
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
let sortColumn = null;   // which column is active ('name', 'quantity', etc.)
let sortDirection = 'asc';  // 'asc' or 'desc'

const form = document.querySelector('.add-item-form');
const tableBody = document.querySelector('.inventory-table tbody');

// ── Fetch all items from PHP API ──────────────────────────
function loadInventory() {
    fetch(API)
        .then(function (res) { return res.json(); })
        .then(function (items) {
            inventory = items;
            populateCategoryFilter(); // ← add this
            renderTable();
        });
}

function populateCategoryFilter() {
    const select = document.getElementById('category-filter');
    const current = select.value; // remember selection

    // Get unique categories from inventory
    const categories = [...new Set(inventory.map(function (i) { return i.category; }))].sort();

    select.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(function (cat) {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === current) opt.selected = true;
        select.appendChild(opt);
    });
}


function renderTable(items) {
    let list = items ? [...items] : [...inventory];
    tableBody.innerHTML = '';

    // Sort if a column is active
    if (sortColumn) {
        list.sort(function (a, b) {
            let valA = a[sortColumn];
            let valB = b[sortColumn];
            if (sortColumn === 'quantity' || sortColumn === 'price') {
                return sortDirection === 'asc'
                    ? parseFloat(valA) - parseFloat(valB)
                    : parseFloat(valB) - parseFloat(valA);
            }
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

    }
    // Apply category filter
    if (activeCategory) {
        list = list.filter(function (item) { return item.category === activeCategory; });
    }


    // ── Pagination slice ──────────────────────────────────
    const totalPages = Math.ceil(list.length / PAGE_SIZE);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    pageItems.forEach(function (item) {
        const row = document.createElement('tr');
        if (parseInt(item.quantity) <= 5) row.classList.add('low-stock-row');
        row.innerHTML = `
            <td>${item.name}</td>
            <td><span class="sku-link" data-id="${item.id}">${item.sku}</span></td>
            <td>${item.category}</td>
            <td>${item.quantity}</td>
            <td>$${parseFloat(item.price).toFixed(2)}</td>
            <td>
                <button class="action-btn stock-add-btn" data-id="${item.id}" data-qty="${item.quantity}">+ Stock</button>
                <button class="action-btn stock-sub-btn" data-id="${item.id}" data-qty="${item.quantity}">− Stock</button>
                <button class="action-btn edit-btn"      data-id="${item.id}">Edit</button>
                <button class="action-btn delete-btn"    data-id="${item.id}">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    renderPagination(totalPages);
    updateStats();
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    if (totalPages <= 1) return; // no controls needed for 1 page

    // Previous button
    const prev = document.createElement('button');
    prev.textContent = '← Prev';
    prev.className = 'page-btn';
    prev.disabled = currentPage === 1;
    prev.addEventListener('click', function () { currentPage--; renderTable(); });
    container.appendChild(prev);

    // Page number buttons
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        btn.addEventListener('click', function () { currentPage = i; renderTable(); });
        container.appendChild(btn);
    }

    // Next button
    const next = document.createElement('button');
    next.textContent = 'Next →';
    next.className = 'page-btn';
    next.disabled = currentPage === totalPages;
    next.addEventListener('click', function () { currentPage++; renderTable(); });
    container.appendChild(next);
}

function loadHistory() {
    fetch(TRANSACTIONS_API)
        .then(function (res) { return res.json(); })
        .then(function (logs) {
            const tbody = document.getElementById('history-body');
            tbody.innerHTML = '';
            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8">No activity yet.</td></tr>';
                return;
            }
            logs.forEach(function (log) {
                const row = document.createElement('tr');
                const date = new Date(log.created_at).toLocaleString('en-GB');
                const actionColors = {
                    added: '#22c55e',
                    stock_in: '#6366f1',
                    stock_out: '#f97316',
                    updated: '#64748b',
                    deleted: '#ef4444'
                };
                const color = actionColors[log.action] || '#64748b';
                row.innerHTML = `
                    <td>${log.item_name}</td>
                    <td><span style="color:${color};font-weight:600">${log.action.replace('_', ' ')}</span></td>
                    <td>${log.quantity_change > 0 ? '+' + log.quantity_change : log.quantity_change}</td>
                    <td>${log.quantity_after}</td>
                    <td>${date}</td>
                `;
                tbody.appendChild(row);
            });
        });
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

    updateCharts();
}

// ── Charts ────────────────────────────────────────────────
let categoryChart = null;  // keep reference so we can destroy & redraw
let stockChart = null;

function updateCharts() {
    // ── Bar chart: count items per category ───
    const categoryCounts = {};
    inventory.forEach(function (item) {
        const cat = item.category;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categoryLabels = Object.keys(categoryCounts);
    const categoryData = Object.values(categoryCounts);

    if (categoryChart) categoryChart.destroy(); // destroy old chart before redrawing
    categoryChart = new Chart(document.getElementById('chart-category'), {
        type: 'bar',
        data: {
            labels: categoryLabels,
            datasets: [{
                label: 'Items',
                data: categoryData,
                backgroundColor: '#6366f1',
                borderRadius: 6
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });

    // ── Doughnut chart: in stock vs low stock ─
    const lowStock = inventory.filter(function (i) { return parseInt(i.quantity) <= 5; }).length;
    const inStock = inventory.length - lowStock;

    if (stockChart) stockChart.destroy();
    stockChart = new Chart(document.getElementById('chart-stock'), {
        type: 'doughnut',
        data: {
            labels: ['In Stock', 'Low Stock'],
            datasets: [{
                data: [inStock, lowStock],
                backgroundColor: ['#22c55e', '#f97316'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom' } },
            cutout: '65%'
        }
    });
}


// ── Search ────────────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', function () {
    currentPage = 1; // reset to first page on every search
    const query = this.value.toLowerCase().trim();
    if (query === '') { renderTable(); return; }
    const filtered = inventory.filter(function (item) {
        return item.name.toLowerCase().includes(query) ||
            item.sku.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query);
    });
    renderTable(filtered);
});
document.getElementById('category-filter').addEventListener('change', function () {
    activeCategory = this.value;
    currentPage = 1;
    renderTable();
});

// ── Column Sorting ────────────────────────────────────────
document.querySelector('.inventory-table thead').addEventListener('click', function (event) {
    const th = event.target.closest('th');
    if (!th || !th.dataset.sort) return; // ignore clicks on Actions column

    const column = th.dataset.sort;

    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'; // toggle
    } else {
        sortColumn = column;
        sortDirection = 'asc'; // new column always starts ascending
    }

    // Update arrow icons on all headers
    document.querySelectorAll('.inventory-table th[data-sort]').forEach(function (el) {
        el.querySelector('.sort-icon').textContent = '↕';
    });
    th.querySelector('.sort-icon').textContent = sortDirection === 'asc' ? '↑' : '↓';

    renderTable();
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
    else if (event.target.classList.contains('stock-add-btn')) {
        const id = parseInt(event.target.getAttribute('data-id'));
        const qty = parseInt(event.target.getAttribute('data-qty'));

        const amount = parseInt(prompt('How many units to add?'));
        if (isNaN(amount) || amount <= 0) return; // cancelled or invalid

        const newQty = qty + amount;
        adjustStock(id, newQty);
    }

    else if (event.target.classList.contains('stock-sub-btn')) {
        const id = parseInt(event.target.getAttribute('data-id'));
        const qty = parseInt(event.target.getAttribute('data-qty'));

        const amount = parseInt(prompt('How many units to remove?'));
        if (isNaN(amount) || amount <= 0) return;

        const newQty = Math.max(0, qty - amount); // never go below 0
        adjustStock(id, newQty);
    }

});
function adjustStock(id, newQuantity) {
    // Find the full item so we keep all its other fields
    const item = inventory.find(function (i) { return parseInt(i.id) === id; });
    if (!item) return;

    fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: id,
            name: item.name,
            sku: item.sku,
            category: item.category,
            quantity: newQuantity,
            price: item.price
        })
    })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.success) loadInventory();
        });
}


// ── Form submit (Add or Edit) ─────────────────────────────
form.addEventListener('submit', function (event) {
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
// ── SKU Detail Modal ──────────────────────────────────────
const overlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');

modalClose.addEventListener('click', function () { overlay.classList.remove('open'); });
overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.classList.remove('open'); // click outside = close
});

tableBody.addEventListener('click', function (event) {
    if (!event.target.classList.contains('sku-link')) return;
    const id = parseInt(event.target.getAttribute('data-id'));
    const item = inventory.find(function (i) { return parseInt(i.id) === id; });
    if (!item) return;

    // Populate detail grid
    document.getElementById('modal-title').textContent = item.name;
    document.getElementById('detail-grid').innerHTML = `
        <div class="detail-item"><label>SKU</label><span>${item.sku}</span></div>
        <div class="detail-item"><label>Category</label><span>${item.category}</span></div>
        <div class="detail-item"><label>Quantity</label><span>${item.quantity}</span></div>
        <div class="detail-item"><label>Unit Price</label><span>$${parseFloat(item.price).toFixed(2)}</span></div>
        <div class="detail-item"><label>Total Value</label><span>$${(item.quantity * item.price).toFixed(2)}</span></div>
        <div class="detail-item"><label>Stock Status</label><span style="color:${parseInt(item.quantity) <= 5 ? '#f97316' : '#22c55e'}">${parseInt(item.quantity) <= 5 ? 'Low Stock' : 'In Stock'}</span></div>
    `;

    // Load this item's transaction history
    fetch(TRANSACTIONS_API)
        .then(function (res) { return res.json(); })
        .then(function (logs) {
            const itemLogs = logs.filter(function (l) { return parseInt(l.item_id) === id; });
            const tbody = document.getElementById('modal-history-body');
            tbody.innerHTML = '';

            if (itemLogs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8">No history.</td></tr>';
            } else {
                const actionColors = { added: '#22c55e', stock_in: '#6366f1', stock_out: '#f97316', updated: '#64748b', deleted: '#ef4444' };
                itemLogs.forEach(function (log) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><span style="color:${actionColors[log.action] || '#64748b'};font-weight:600">${log.action.replace('_', ' ')}</span></td>
                        <td>${log.quantity_change > 0 ? '+' + log.quantity_change : log.quantity_change}</td>
                        <td>${log.quantity_after}</td>
                        <td>${new Date(log.created_at).toLocaleString('en-GB')}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
            overlay.classList.add('open'); // show modal after data loads
        });
}, true); // ← 'true' = capture phase, so this fires even though tableBody has another click listener
