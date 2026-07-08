import { api } from './api.js';

const CATEGORY_SUGGESTIONS = ['Fruits', 'Vegetables', 'Dairy', 'Bakery', 'Grains', 'Snacks', 'Beverages', 'Household', 'Frozen'];

function fillCategorySuggestions() {
  const datalist = document.getElementById('categoryList');
  if (!datalist) return;
  datalist.innerHTML = CATEGORY_SUGGESTIONS.map((category) => `<option value="${category}"></option>`).join('');
}

function getFormData() {
  const unitField = document.getElementById('unit');

  return {
    item_name: document.getElementById('itemName').value.trim(),
    quantity: Number(document.getElementById('quantity').value),
    unit: unitField ? unitField.value.trim() : '',
    category: document.getElementById('category').value.trim(),
    price: Number(document.getElementById('price').value || 0),
    purchase_date: document.getElementById('purchaseDate').value || null,
    priority: document.getElementById('priority').value,
    status: document.getElementById('status').value || 'Pending',
    notes: document.getElementById('notes').value.trim(),
  };
}

function setFormData(item) {
  document.getElementById('itemId').value = item.id;
  document.getElementById('itemName').value = item.item_name || '';
  document.getElementById('quantity').value = item.quantity ?? '';
  const unitField = document.getElementById('unit');
  if (unitField) {
    unitField.value = item.unit || '';
  }
  document.getElementById('category').value = item.category || '';
  document.getElementById('price').value = item.price ?? '';
  document.getElementById('purchaseDate').value = item.purchase_date || '';
  document.getElementById('priority').value = item.priority || 'Medium';
  document.getElementById('status').value = item.status || 'Pending';
  document.getElementById('notes').value = item.notes || '';
}

function validate(data) {
  if (!data.item_name) return 'Item name cannot be empty.';
  if (!data.quantity || data.quantity <= 0) return 'Quantity must be greater than zero.';
  if (data.price < 0) return 'Price cannot be negative.';
  if (!data.category) return 'Category is required.';
  return '';
}

async function setupEditMode() {
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get('id');
  if (!itemId) return;

  try {
    const item = await api.getItem(itemId);
    setFormData(item);
  } catch (error) {
    window.alert(error.message || 'Item not found.');
    window.location.href = 'index.html';
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const mode = document.body.dataset.mode;
  const itemId = document.getElementById('itemId').value;
  const payload = getFormData();
  const error = validate(payload);

  if (error) {
    window.alert(error);
    return;
  }

  try {
    if (mode === 'edit') {
      await api.updateItem(itemId, payload);
    } else {
      await api.createItem(payload);
    }

    window.location.href = 'index.html';
  } catch (submissionError) {
    window.alert(submissionError.message || 'Unable to save the grocery item.');
  }
}

function init() {
  fillCategorySuggestions();
  document.getElementById('itemForm')?.addEventListener('submit', handleSubmit);

  if (document.body.dataset.mode === 'edit') {
    setupEditMode();
  }
}

document.addEventListener('DOMContentLoaded', init);
