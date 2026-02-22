const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.page-section');

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
    // event.target = the exact element that was clicked
    if (event.target.classList.contains('delete-btn')) {
        const index = parseInt(event.target.getAttribute('data-index'));
        inventory.splice(index, 1); // remove 1 item at that position
        renderTable();
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
    event.preventDefault(); // stop the page from reloading

    // Read the values from each input field
    const name = document.getElementById('item-name').value.trim();
    const sku = document.getElementById('sku').value.trim();
    const category = document.getElementById('category').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const price = parseFloat(document.getElementById('price').value);

    // Basic validation - don't allow empty submissions
    if (!name || !sku || !category || !quantity || !price) {
        alert('Please fill in all fields!');
        return; // stop here, don't add
    }

    // Create a new item object and push it into the array
    const newItem = { name, sku, category, quantity, price };
    inventory.push(newItem);

    // Redraw the table with the updated array
    renderTable();

    // Clear the form fields for the next entry
    form.reset();
});

// Draw the table once on page load with the sample data
renderTable();


