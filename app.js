const API = 'http://localhost/ims/api/items.php';
const TRANSACTIONS_API = 'http://localhost/ims/api/transactions.php';
const PAGE_SIZE = 10;  // items shown per page
let currentPage = 1;   // which page we're on
let activeCategory = '';  // '' = all categories
let chartMetric = 'count'; // 'count' | 'quantity' | 'value'
let chartDrillCategory = null;    // null = category view, string = drilled-in category
const IMPORT_API = 'http://localhost/ims/api/import.php';
// ── (payload is built inside the form submit listener below) ─

// ── Currency (base = INR, live rates from frankfurter.app) ─
let currencySymbol = localStorage.getItem('currencySymbol') || '₹';
let conversionRate = 1; // INR → selected currency multiplier
let liveRates = {};     // populated on page load

fetch('https://api.frankfurter.app/latest?from=INR')
    .then(function (res) { return res.json(); })
    .then(function (data) {
        liveRates = data.rates;       // { USD: 0.012, EUR: 0.011, ... }
        liveRates['INR'] = 1;         // add INR itself
        const saved = localStorage.getItem('currencySymbol') || '₹';
        const savedCode = localStorage.getItem('currencyCode') || 'INR';
        conversionRate = liveRates[savedCode] || 1;
        currencySymbol = saved;
        updateStats(); // re-render with live rate
    });



// ── Date with weekday in topbar ───────────────────────────
(function setDate() {
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    const text = DAYS[now.getDay()] + ', ' + MONTHS[now.getMonth()] +
        ' ' + now.getDate() + ', ' + now.getFullYear();
    document.getElementById('current-date').textContent = text;
}());



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
    <td>${item.color || '—'}</td>
    <td>${item.size || '—'}</td>
    <td>${item.quantity}</td>
    <td>${currencySymbol}${(parseFloat(item.price) * conversionRate).toFixed(2)}</td>
    <td>${item.location || '—'}</td>
    <td>${item.reorder_point || 0}</td>
    <td><span class="status-badge status-${(item.status || 'In Stock').toLowerCase().replace(' ', '-')}">${item.status || 'In Stock'}</span></td>
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
    const from = document.getElementById('history-from').value;
    const to = document.getElementById('history-to').value;

    let url = TRANSACTIONS_API + '?mode=history';
    if (from) url += '&from=' + from;
    if (to) url += '&to=' + to;

    fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (logs) {
            const tbody = document.getElementById('history-body');
            tbody.innerHTML = '';
            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8">No transactions found.</td></tr>';
                return;
            }
            const actionColors = { added: '#22c55e', stock_in: '#6366f1', stock_out: '#f97316', updated: '#64748b', deleted: '#ef4444' };
            logs.forEach(function (log) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${log.item_name}</td>
                    <td><span style="color:${actionColors[log.action] || '#64748b'};font-weight:600">${log.action.replace('_', ' ')}</span></td>
                    <td>${log.quantity_change > 0 ? '+' + log.quantity_change : log.quantity_change}</td>
                    <td>${log.quantity_after}</td>
                    <td>${new Date(log.created_at).toLocaleString('en-GB')}</td>
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
    document.getElementById('stat-total-value').textContent = currencySymbol + (totalValue * conversionRate).toFixed(2);
    document.getElementById('stat-low-stock').textContent = lowStock;

    updateCharts();
    updateWidgets();
}

// ── Charts ────────────────────────────────────────────────
let categoryChart = null;  // keep reference so we can destroy & redraw
let stockChart = null;

function updateCharts() {
    const metricLabel = { count: 'Items', quantity: 'Units in Stock', value: 'Total Value ($)' }[chartMetric];

    // ── Compute bar chart data ────────────────────────────
    let barLabels, barData;

    if (chartDrillCategory === null) {
        // ROLL-UP: group all items by category
        const grouped = {};
        inventory.forEach(function (item) {
            const cat = item.category;
            if (!grouped[cat]) grouped[cat] = { count: 0, quantity: 0, value: 0 };
            grouped[cat].count += 1;
            grouped[cat].quantity += parseInt(item.quantity);
            grouped[cat].value += parseFloat(item.price) * parseInt(item.quantity);
        });
        barLabels = Object.keys(grouped);
        barData = barLabels.map(function (cat) { return grouped[cat][chartMetric]; });
        document.getElementById('chart-category-title').textContent = 'Stock by Category';
        document.getElementById('drill-back-btn').style.display = 'none';
    } else {
        // DRILL-DOWN: show individual items inside the clicked category
        const items = inventory.filter(function (i) { return i.category === chartDrillCategory; });
        barLabels = items.map(function (i) { return i.name; });
        barData = items.map(function (i) {
            if (chartMetric === 'count') return 1;
            if (chartMetric === 'quantity') return parseInt(i.quantity);
            return parseFloat(i.price) * parseInt(i.quantity);
        });
        document.getElementById('chart-category-title').textContent = chartDrillCategory + ' — Items';
        document.getElementById('drill-back-btn').style.display = 'block';
    }

    // ── Bar chart ─────────────────────────────────────────
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(document.getElementById('chart-category'), {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [{
                label: metricLabel,
                data: barData,
                backgroundColor: chartDrillCategory ? '#818cf8' : '#6366f1',
                borderRadius: 6
            }]
        },
        options: {
            onClick: function (event, elements) {
                // Only drill down if we're at top level and user clicked a bar
                if (elements.length > 0 && chartDrillCategory === null) {
                    chartDrillCategory = barLabels[elements[0].index];
                    updateCharts();
                }
            },
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: chartMetric === 'value' ? 2 : 0,
                        callback: chartMetric === 'value'
                            ? function (v) { return '$' + v.toFixed(2); }
                            : undefined
                    }
                }
            }
        }
    });

    // ── Doughnut chart (responds to metric PIVOT) ─────────
    const relevant = chartDrillCategory
        ? inventory.filter(function (i) { return i.category === chartDrillCategory; })
        : inventory;

    const lowItems = relevant.filter(function (i) { return parseInt(i.quantity) <= 5; });
    const highItems = relevant.filter(function (i) { return parseInt(i.quantity) > 5; });

    let donutIn, donutLow;
    if (chartMetric === 'count') {
        donutIn = highItems.length;
        donutLow = lowItems.length;
    } else if (chartMetric === 'quantity') {
        donutIn = highItems.reduce(function (s, i) { return s + parseInt(i.quantity); }, 0);
        donutLow = lowItems.reduce(function (s, i) { return s + parseInt(i.quantity); }, 0);
    } else {
        donutIn = highItems.reduce(function (s, i) { return s + parseFloat(i.price) * parseInt(i.quantity); }, 0);
        donutLow = lowItems.reduce(function (s, i) { return s + parseFloat(i.price) * parseInt(i.quantity); }, 0);
    }

    if (stockChart) stockChart.destroy();
    stockChart = new Chart(document.getElementById('chart-stock'), {
        type: 'doughnut',
        data: {
            labels: ['Healthy Stock', 'Low Stock'],
            datasets: [{
                data: [donutIn, donutLow],
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
// ── Chart metric selector ─────────────────────────────────
document.querySelectorAll('.metric-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.metric-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        chartMetric = this.dataset.metric;
        updateCharts(); // SLICE: same data, different measurement
    });
});

// ── Drill-back button ─────────────────────────────────────
document.getElementById('drill-back-btn').addEventListener('click', function () {
    chartDrillCategory = null; // return to roll-up view
    updateCharts();
});



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
        document.getElementById('color').value = item.color || '';
        document.getElementById('size').value = item.size || '';
        document.getElementById('location').value = item.location || '';
        document.getElementById('reorder-point').value = item.reorder_point || '';
        document.getElementById('last-restock-date').value = item.last_restock_date || '';
        document.getElementById('status').value = item.status || 'In Stock';

        editingId = id;
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
            price: item.price,
            color: item.color || '',
            size: item.size || '',
            location: item.location || '',
            reorder_point: item.reorder_point || 0,
            last_restock_date: item.last_restock_date || '',
            status: item.status || 'In Stock'
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
        price: parseFloat(document.getElementById('price').value),
        color: document.getElementById('color').value.trim(),
        size: document.getElementById('size').value.trim(),
        location: document.getElementById('location').value.trim(),
        reorder_point: parseInt(document.getElementById('reorder-point').value) || 0,
        last_restock_date: document.getElementById('last-restock-date').value,
        status: document.getElementById('status').value
    };

    if (!payload.name || !payload.sku || !payload.category || !payload.quantity || !payload.price) {
        alert('Please fill in Name, SKU, Category, Quantity and Price!');
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
        <div class="detail-item"><label>Color</label><span>${item.color || '—'}</span></div>
        <div class="detail-item"><label>Size</label><span>${item.size || '—'}</span></div>
        <div class="detail-item"><label>Quantity</label><span>${item.quantity}</span></div>
        <div class="detail-item"><label>Reorder Point</label><span>${item.reorder_point || 0}</span></div>
        <div class="detail-item"><label>Unit Price</label><span>${currencySymbol}${(parseFloat(item.price) * conversionRate).toFixed(2)}</span></div>
        <div class="detail-item"><label>Total Value</label><span>${currencySymbol}${(item.quantity * item.price * conversionRate).toFixed(2)}</span></div>
        <div class="detail-item"><label>Location</label><span>${item.location || '—'}</span></div>
        <div class="detail-item"><label>Last Restock</label><span>${item.last_restock_date || '—'}</span></div>
        <div class="detail-item"><label>Status</label>
            <span class="status-badge status-${(item.status || 'In Stock').toLowerCase().replace(' ', '-')}">
                ${item.status || 'In Stock'}
            </span>
        </div>
        <div class="detail-item"><label>Stock Health</label>
            <span style="color:${parseInt(item.quantity) <= item.reorder_point ? '#f97316' : '#22c55e'}">
                ${parseInt(item.quantity) <= item.reorder_point ? '⚠ Below Reorder Point' : '✓ Healthy'}
            </span>
        </div>
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
// ── CSV Import ────────────────────────────────────────────
document.getElementById('import-file-input').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    this.value = ''; // reset so same file can be re-imported

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const result = parseCSV(text);

        if (result.error) {
            showImportResult(false, result.error, []);
            return;
        }

        fetch(IMPORT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: result.rows })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                showImportResult(true, data.imported + ' items imported', data.skipped);
                loadInventory(); // refresh table + charts
            });
    };
    reader.readAsText(file);
});

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { error: 'CSV file is empty or has only a header row.' };

    // Normalise header: lowercase, strip whitespace
    const headers = lines[0].split(',').map(function (h) { return h.trim().toLowerCase(); });

    const required = ['name', 'sku', 'category', 'quantity', 'price'];
    const missing = required.filter(function (r) { return !headers.includes(r); });

    if (missing.length > 0) {
        return {
            error: 'Missing required columns: ' + missing.join(', ') +
                '.\n\nExpected header row:\nname,sku,category,quantity,price'
        };
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // skip blank lines
        const values = lines[i].split(',');
        const row = {};
        headers.forEach(function (header, idx) {
            row[header] = (values[idx] || '').trim();
        });
        rows.push(row);
    }
    return { rows: rows };
}

function showImportResult(success, message, skipped) {
    let html = success
        ? '<p style="color:#22c55e;font-weight:600">✅ ' + message + '</p>'
        : '<p style="color:#ef4444;font-weight:600">❌ ' + message + '</p>';

    if (skipped && skipped.length > 0) {
        html += '<p style="margin-top:0.5rem;font-weight:600;color:#f97316">' + skipped.length + ' row(s) skipped:</p>';
        html += '<ul style="margin-top:0.25rem;font-size:0.8rem;color:#64748b">';
        skipped.forEach(function (err) { html += '<li>' + err + '</li>'; });
        html += '</ul>';
    }

    const toast = document.getElementById('import-toast');
    toast.innerHTML = html;
    toast.style.display = 'block';
    setTimeout(function () { toast.style.display = 'none'; }, 8000); // auto-hide after 8s
}
// ── History date filter ───────────────────────────────────
document.getElementById('history-filter-btn').addEventListener('click', loadHistory);
document.getElementById('history-clear-btn').addEventListener('click', function () {
    document.getElementById('history-from').value = '';
    document.getElementById('history-to').value = '';
    loadHistory();
});

// ── Point-in-Time Snapshot ────────────────────────────────
const snapshotOverlay = document.getElementById('snapshot-overlay');
document.getElementById('snapshot-close').addEventListener('click', function () {
    snapshotOverlay.classList.remove('open');
});
snapshotOverlay.addEventListener('click', function (e) {
    if (e.target === snapshotOverlay) snapshotOverlay.classList.remove('open');
});

document.getElementById('snapshot-btn').addEventListener('click', function () {
    const date = document.getElementById('history-from').value;
    if (!date) {
        alert('Please select a "From" date to view the snapshot for that day.');
        return;
    }

    document.getElementById('snapshot-title').textContent = 'Inventory Snapshot — ' + date;
    document.getElementById('snapshot-body').innerHTML = '<tr><td colspan="10" style="text-align:center;color:#94a3b8">Loading...</td></tr>';
    snapshotOverlay.classList.add('open');

    fetch(TRANSACTIONS_API + '?mode=snapshot&date=' + date)
        .then(function (res) { return res.json(); })
        .then(function (rows) {
            const tbody = document.getElementById('snapshot-body');
            tbody.innerHTML = '';
            if (rows.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#94a3b8">No inventory data for this date.</td></tr>';
                return;
            }
            rows.forEach(function (item) {
                const val = (parseFloat(item.price) * parseInt(item.quantity_after)).toFixed(2);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.item_name}</td>
                    <td>${item.sku || '—'}</td>
                    <td>${item.category || '—'}</td>
                    <td>${item.color || '—'}</td>
                    <td>${item.size || '—'}</td>
                    <td>${item.quantity_after}</td>
                    <td>${currencySymbol}${parseFloat(item.price).toFixed(2)}</td>
                    <td>${currencySymbol}${val}</td>
                    <td>${item.location || '—'}</td>
                    <td><span class="status-badge status-${(item.status || 'In Stock').toLowerCase().replace(' ', '-')}">${item.status || 'In Stock'}</span></td>
                `;
                tbody.appendChild(row);
            });
        });
});

// ── Currency picker ────────────────────────────────────────
(function initCurrencyPicker() {
    const sel = document.getElementById('currency-select');
    sel.value = localStorage.getItem('currencySymbol') || '₹';
    sel.addEventListener('change', function () {
        const opt = this.options[this.selectedIndex];
        currencySymbol = opt.value;
        const code = opt.getAttribute('data-code');
        conversionRate = liveRates[code] || 1;
        localStorage.setItem('currencySymbol', currencySymbol);
        localStorage.setItem('currencyCode', code);
        updateStats();
    });
}());


// ── Dashboard Widgets ──────────────────────────────────────
function updateWidgets() {
    // ── Recently Updated (last 7 items by array order = newest first) ──
    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = '';
    const recent = inventory.slice(0, 7);
    if (recent.length === 0) {
        recentList.innerHTML = '<li class="recent-empty">No items yet.</li>';
    } else {
        recent.forEach(function (item) {
            const isLow = parseInt(item.quantity) <= parseInt(item.reorder_point || 0);
            const badgeClass = isLow ? 'status-badge status-damaged' : 'status-badge status-in-stock';
            const badgeText = isLow ? 'Low Stock' : 'In Stock';
            const li = document.createElement('li');
            li.className = 'recent-item';
            li.innerHTML = `
                <div class="recent-icon">📦</div>
                <div class="recent-info">
                    <span class="recent-name">${item.name}</span>
                    <span class="recent-meta">SKU: ${item.sku} · ${item.category}</span>
                </div>
                <div class="recent-right">
                    <span class="recent-qty">${item.quantity} pcs</span>
                    <span class="${badgeClass}">${badgeText}</span>
                </div>
            `;
            recentList.appendChild(li);
        });
    }

    // ── Alerts (items at or below reorder point) ───────────
    const alertList = document.getElementById('alert-list');
    const alertCount = document.getElementById('alert-count');
    const alerts = inventory.filter(function (item) {
        return parseInt(item.quantity) <= parseInt(item.reorder_point || 5);
    });
    alertCount.textContent = alerts.length;
    alertList.innerHTML = '';
    if (alerts.length === 0) {
        alertList.innerHTML = '<li class="alert-empty">✓ All stock levels healthy</li>';
    } else {
        alerts.forEach(function (item) {
            const out = parseInt(item.quantity) === 0;
            const li = document.createElement('li');
            li.className = 'alert-item';
            li.innerHTML = `
                <span class="alert-dot" style="background:${out ? '#ef4444' : '#f97316'}"></span>
                <div class="alert-info">
                    <span class="alert-name">${item.name}</span>
                    <span class="alert-meta">${item.quantity} remaining</span>
                </div>
                <span class="status-badge ${out ? 'status-damaged' : 'status-reserved'}">${out ? 'Out of Stock' : 'Low Stock'}</span>
            `;
            alertList.appendChild(li);
        });
    }

    // ── By Category ────────────────────────────────────────
    const catList = document.getElementById('category-list');
    catList.innerHTML = '';
    const catMap = {};
    inventory.forEach(function (item) {
        catMap[item.category] = (catMap[item.category] || 0) + 1;
    });
    const maxCount = Math.max(...Object.values(catMap), 1);
    Object.entries(catMap).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (entry) {
        const pct = Math.round((entry[1] / maxCount) * 100);
        const li = document.createElement('li');
        li.className = 'cat-item';
        li.innerHTML = `
            <div class="cat-label">
                <span class="cat-name">${entry[0]}</span>
                <span class="cat-count">${entry[1]} item${entry[1] !== 1 ? 's' : ''}</span>
            </div>
            <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%"></div></div>
        `;
        catList.appendChild(li);
    });
}
