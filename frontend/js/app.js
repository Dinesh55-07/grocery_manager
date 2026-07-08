import { api } from './api.js';

const VIEW_KEY = 'grocery-view-mode';

const CATEGORY_ICONS = {
  Fruits: 'fa-apple-whole',
  Vegetables: 'fa-carrot',
  Dairy: 'fa-bottle-droplet',
  Bakery: 'fa-bread-slice',
  Grains: 'fa-wheat-awn',
  Snacks: 'fa-cookie-bite',
  Beverages: 'fa-mug-hot',
  Household: 'fa-spray-can-sparkles',
  Frozen: 'fa-snowflake',
};

const state = {
  items: [],
  loading: false,
  error: '',
  viewMode: localStorage.getItem(VIEW_KEY) || 'cards',
  filters: {
    search: '',
    category: 'all',
    priority: 'all',
    status: 'all',
    sort: 'recent',
  },
};

function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || 'fa-seedling';
}

function getUniqueCategories(items) {
  return ['all', ...new Set(items.map((item) => item.category).filter(Boolean))];
}

function matchesSearch(item, query) {
  if (!query) return true;
  const haystack = [item.item_name, item.category, item.notes].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function applyFilters(items, filters) {
  const query = filters.search.trim();
  return items
    .filter((item) => matchesSearch(item, query))
    .filter((item) => filters.category === 'all' || item.category === filters.category)
    .filter((item) => filters.priority === 'all' || item.priority === filters.priority)
    .filter((item) => filters.status === 'all' || item.status === filters.status);
}

function applySort(items, sortValue) {
  const sorted = [...items];
  const compareText = (field, direction = 'asc') =>
    sorted.sort((a, b) => {
      const first = String(a[field] || '').toLowerCase();
      const second = String(b[field] || '').toLowerCase();
      return direction === 'asc' ? first.localeCompare(second) : second.localeCompare(first);
    });

  switch (sortValue) {
    case 'name-asc': return compareText('item_name', 'asc');
    case 'name-desc': return compareText('item_name', 'desc');
    case 'price-asc': return sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    case 'price-desc': return sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    case 'qty-asc': return sorted.sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0));
    case 'qty-desc': return sorted.sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
    case 'date-asc': return sorted.sort((a, b) => String(a.purchase_date || '').localeCompare(String(b.purchase_date || '')));
    case 'date-desc': return sorted.sort((a, b) => String(b.purchase_date || '').localeCompare(String(a.purchase_date || '')));
    default:
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

function getFilteredItems() {
  return applySort(applyFilters(state.items, state.filters), state.filters.sort);
}

function buildStats(items) {
  const purchased = items.filter((item) => item.status === 'Purchased').length;
  const pending = items.filter((item) => item.status === 'Pending').length;
  const highPriority = items.filter((item) => item.priority === 'High').length;
  const categoryCount = new Set(items.map((item) => item.category)).size;

  return [
    { label: 'Total Items', value: items.length, icon: 'fa-list' },
    { label: 'Purchased Items', value: purchased, icon: 'fa-circle-check' },
    { label: 'Pending Items', value: pending, icon: 'fa-clock' },
    { label: 'High Priority Items', value: highPriority, icon: 'fa-triangle-exclamation' },
    { label: 'Categories', value: categoryCount, icon: 'fa-tags' },
  ];
}

function renderStats(items) {
  const statsRow = document.getElementById('statsRow');
  if (!statsRow) return;

  statsRow.innerHTML = buildStats(items)
    .map(
      (stat) => `
        <div class="col-6 col-lg-4 col-xl-2">
          <div class="stats-card">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <i class="fa-solid ${stat.icon} text-success fs-4"></i>
              <span class="badge badge-soft">Live</span>
            </div>
            <div class="value">${stat.value}</div>
            <div class="label">${stat.label}</div>
          </div>
        </div>`
    )
    .join('');
}

function createActionButtons(item) {
  return `
    <a href="edit-item.html?id=${item.id}" class="btn btn-sm btn-outline-success"><i class="fa-solid fa-pen-to-square me-1"></i>Edit</a>
    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${item.id}" type="button"><i class="fa-solid fa-trash me-1"></i>Delete</button>
  `;
}

function renderCards(items) {
  return `
    <div class="row g-3">
      ${items
        .map(
          (item) => `
            <div class="col-md-6 col-xl-4">
              <div class="card grocery-card h-100">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 class="fw-bold mb-1">${item.item_name}</h5>
                      <div class="category-pill"><i class="fa-solid ${getCategoryIcon(item.category)}"></i>${item.category}</div>
                    </div>
                    <span class="badge ${item.status === 'Purchased' ? 'text-bg-success' : 'text-bg-warning'}">${item.status}</span>
                  </div>
                  <div class="mb-3 text-muted small">
                    <div><strong>Quantity:</strong> ${item.quantity} ${item.unit || ''}</div>
                    <div><strong>Price:</strong> ${money(item.price)}</div>
                    <div><strong>Priority:</strong> ${item.priority}</div>
                    <div><strong>Purchase Date:</strong> ${item.purchase_date || 'N/A'}</div>
                    <div><strong>Notes:</strong> ${item.notes || '—'}</div>
                    <div><strong>Created:</strong> ${new Date(item.created_at).toLocaleDateString()}</div>
                  </div>
                  <div class="d-flex gap-2 flex-wrap">${createActionButtons(item)}</div>
                </div>
              </div>
            </div>`
        )
        .join('')}
    </div>`;
}

function renderTable(items) {
  return `
    <div class="table-responsive">
      <table class="table align-middle">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
                <tr>
                  <td>
                    <div class="fw-semibold">${item.item_name}</div>
                    <div class="text-muted small">${item.notes || ''}</div>
                  </td>
                  <td>${item.category}</td>
                  <td>${item.quantity} ${item.unit || ''}</td>
                  <td>${money(item.price)}</td>
                  <td>${item.priority}</td>
                  <td><span class="badge ${item.status === 'Purchased' ? 'text-bg-success' : 'text-bg-warning'}">${item.status}</span></td>
                  <td>${new Date(item.created_at).toLocaleDateString()}</td>
                  <td><div class="d-flex gap-2 flex-wrap">${createActionButtons(item)}</div></td>
                </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function renderEmptyState(message) {
  return `
    <div class="empty-state text-center py-5">
      <i class="fa-solid fa-cart-shopping fa-3x mb-3 text-success"></i>
      <h4 class="fw-bold">${message}</h4>
      <p class="text-muted mb-4">Add your first item to start managing your grocery list.</p>
      <a href="add-item.html" class="btn btn-success px-4">Add First Item</a>
    </div>`;
}

function renderError(message) {
  return `
    <div class="alert alert-danger mb-0">
      <strong>Unable to load items.</strong>
      <div class="mt-1">${message}</div>
    </div>`;
}

function renderDashboard() {
  const itemsContainer = document.getElementById('itemsContainer');
  if (!itemsContainer) return;

  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const cardViewBtn = document.getElementById('cardViewBtn');
  const tableViewBtn = document.getElementById('tableViewBtn');

  renderStats(state.items);

  if (cardViewBtn && tableViewBtn) {
    cardViewBtn.classList.toggle('active', state.viewMode === 'cards');
    tableViewBtn.classList.toggle('active', state.viewMode === 'table');
  }

  if (loadingState) {
    loadingState.classList.toggle('d-none', !state.loading);
  }

  if (state.error) {
    itemsContainer.innerHTML = renderError(state.error);
    emptyState?.classList.add('d-none');
    return;
  }

  if (state.loading) {
    itemsContainer.innerHTML = '';
    emptyState?.classList.add('d-none');
    return;
  }

  const filteredItems = getFilteredItems();
  if (filteredItems.length === 0) {
    itemsContainer.innerHTML = '';
    if (emptyState) {
      emptyState.classList.remove('d-none');
      emptyState.innerHTML = state.items.length === 0
        ? renderEmptyState('No grocery items yet')
        : renderEmptyState('No items match your current filters');
    }
    return;
  }

  emptyState?.classList.add('d-none');
  itemsContainer.innerHTML = state.viewMode === 'table' ? renderTable(filteredItems) : renderCards(filteredItems);
}

function syncCategoryOptions() {
  const categoryFilter = document.getElementById('categoryFilter');
  if (!categoryFilter) return;

  const selectedValue = categoryFilter.value || 'all';
  const categories = getUniqueCategories(state.items).filter((value) => value !== 'all');

  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  categoryFilter.value = categories.includes(selectedValue) ? selectedValue : 'all';
  state.filters.category = categoryFilter.value;
}

async function loadDashboardItems() {
  state.loading = true;
  state.error = '';
  renderDashboard();

  try {
    state.items = await api.listItems();
    syncCategoryOptions();
  } catch (error) {
    state.error = error.message || 'The Flask API is not available.';
    state.items = [];
  } finally {
    state.loading = false;
    renderDashboard();
  }
}

async function deleteItem(itemId) {
  const confirmed = window.confirm('Are you sure you want to delete this grocery item?');
  if (!confirmed) return;

  try {
    await api.deleteItem(itemId);
    await loadDashboardItems();
  } catch (error) {
    window.alert(error.message || 'Unable to delete the grocery item.');
  }
}

function setViewMode(mode) {
  state.viewMode = mode;
  localStorage.setItem(VIEW_KEY, mode);
  renderDashboard();
}

function setupDashboard() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const priorityFilter = document.getElementById('priorityFilter');
  const statusFilter = document.getElementById('statusFilter');
  const sortSelect = document.getElementById('sortSelect');
  const itemsContainer = document.getElementById('itemsContainer');
  const cardViewBtn = document.getElementById('cardViewBtn');
  const tableViewBtn = document.getElementById('tableViewBtn');
  const exportBtn = document.getElementById('exportBtn');
  const printBtn = document.getElementById('printBtn');

  searchInput?.addEventListener('input', (event) => {
    state.filters.search = event.target.value;
    renderDashboard();
  });

  categoryFilter?.addEventListener('change', (event) => {
    state.filters.category = event.target.value;
    renderDashboard();
  });

  priorityFilter?.addEventListener('change', (event) => {
    state.filters.priority = event.target.value;
    renderDashboard();
  });

  statusFilter?.addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderDashboard();
  });

  sortSelect?.addEventListener('change', (event) => {
    state.filters.sort = event.target.value;
    renderDashboard();
  });

  cardViewBtn?.addEventListener('click', () => setViewMode('cards'));
  tableViewBtn?.addEventListener('click', () => setViewMode('table'));

  exportBtn?.addEventListener('click', () => {
    const filteredItems = getFilteredItems();
    const csvRows = ['item_name,quantity,unit,category,price,purchase_date,priority,status,notes,created_at'];

    filteredItems.forEach((item) => {
      csvRows.push([
        item.item_name,
        item.quantity,
        item.unit,
        item.category,
        item.price,
        item.purchase_date,
        item.priority,
        item.status,
        item.notes,
        item.created_at,
      ].map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'grocery-items.csv';
    link.click();
    URL.revokeObjectURL(url);
  });

  printBtn?.addEventListener('click', () => window.print());

  itemsContainer?.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.delete-btn');
    if (deleteButton) {
      deleteItem(deleteButton.dataset.id);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'dashboard') {
    setupDashboard();
    loadDashboardItems();
  }
});
