const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.page-section');
// Set dynamic date
const today = new Date();
const formatted = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
});
document.getElementById('current-date').textContent = formatted;

navLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
        event.preventDefault();



        navLinks.forEach(function (l) {
            l.classList.remove('active');
        });
        this.classList.add('active');

        // After this.classList.add('active');
        document.getElementById('page-title').textContent = this.querySelector('.nav-text').innerText;


        const targetId = this.getAttribute('href').replace('#', '');

        sections.forEach(function (section) {
            section.classList.remove('visible');
        });

        // Show only the matching section
        document.getElementById(targetId).classList.add('visible');
    });
});

// Our data store - starts with one sample item
let inventory = [
    { name: 'USB Cable', sku: 'USB-001', category: 'Electronics', quantity: 50, price: 5.99 }
];

let editingIndex = null;

// Grab key elements we'll need repeatedly
const form = document.querySelector('.add-item-form');
const tableBody = document.querySelector('.inventory-table tbody');
// Change renderTable to accept an optional list to render
function renderTable(items) {
    // If no list is passed in, use the full inventory
    const list = items || inventory;

    tableBody.innerHTML = '';


    list.forEach(function (item, index) {
        const row = document.createElement('tr');
        if (item.quantity <= 5) row.classList.add('low-stock-row');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.sku}</td>
            <td>${item.category}</td>
            <td>${item.quantity}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>
                <button class="action-btn edit-btn" data-index="${index}">Edit</button>
                <button class="action-btn delete-btn" data-index="${index}">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    updateStats();
}

// Search listener — runs every time the user types a character
document.getElementById('search-input').addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();

    if (query === '') {
        renderTable(); // if search is empty, show everything
        return;
    }

    const filtered = inventory.filter(function (item) {
        return (
            item.name.toLowerCase().includes(query) ||
            item.sku.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)
        );
    });

    renderTable(filtered);
});


// ONE listener on the whole table body — handles all delete buttons
tableBody.addEventListener('click', function (event) {
    if (event.target.classList.contains('delete-btn')) {
        const index = parseInt(event.target.getAttribute('data-index'));

        // Ask the user to confirm before deleting
        const confirmed = confirm('Are you sure you want to delete this item?');
        if (!confirmed) return; // if they click Cancel, stop here

        inventory.splice(index, 1);
        renderTable();
    }

    else if (event.target.classList.contains('edit-btn')) {
        const index = parseInt(event.target.getAttribute('data-index'));
        const item = inventory[index]; // grab the item object

        // Pre-fill the form with this item's data
        document.getElementById('item-name').value = item.name;
        document.getElementById('sku').value = item.sku;
        document.getElementById('category').value = item.category;
        document.getElementById('quantity').value = item.quantity;
        document.getElementById('price').value = item.price;

        // Remember which item we're editing
        editingIndex = index;

        // Change button text and switch view
        document.querySelector('.add-btn').textContent = 'Update Item';
        document.querySelector('a[href="#add-item"]').click();
    }
});


function updateStats() {
    const totalItems = inventory.length;

    const totalValue = inventory.reduce(function (sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);

    const lowStockCount = inventory.filter(function (item) {
        return item.quantity <= 5;
    }).length;

    document.getElementById('stat-total-items').textContent = totalItems;
    document.getElementById('stat-total-value').textContent = '$' + totalValue.toFixed(2);
    document.getElementById('stat-low-stock').textContent = lowStockCount;
}



// Listen for the form being submitted
form.addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('item-name').value.trim();
    const sku = document.getElementById('sku').value.trim();
    const category = document.getElementById('category').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const price = parseFloat(document.getElementById('price').value);

    if (!name || !sku || !category || !quantity || !price) {
        alert('Please fill in all fields!');
        return;
    }

    if (editingIndex !== null) {
        // UPDATE existing item in place
        inventory[editingIndex] = { name, sku, category, quantity, price };
        editingIndex = null; // reset back to "adding" mode
        document.querySelector('.add-btn').textContent = 'Add Item'; // restore button text
    } else {
        // ADD new item
        inventory.push({ name, sku, category, quantity, price });
    }

    renderTable();
    form.reset();
    document.querySelector('a[href="#inventory"]').click();
});

function exportToCSV() {
    // Row 1: the column headers
    const headers = ['Item Name', 'SKU', 'Category', 'Quantity', 'Price'];

    // Convert each inventory item into a comma-separated row
    const rows = inventory.map(function (item) {
        return [item.name, item.sku, item.category, item.quantity, item.price].join(',');
    });

    // Join headers + all rows with newline characters
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create a Blob (a raw file-like object) from the CSV text
    const blob = new Blob([csvContent], { type: 'text/csv' });

    // Create a temporary URL pointing to that Blob
    const url = URL.createObjectURL(blob);

    // Create an invisible <a> tag, point it at the URL, and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv'; // the filename the user sees
    a.click();

    // Clean up the temporary URL from memory
    URL.revokeObjectURL(url);
}

document.getElementById('export-btn').addEventListener('click', exportToCSV);


// Draw the table once on page load with the sample data
renderTable();


