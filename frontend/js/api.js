const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000/api' : '/api';

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = body?.error || body?.message || `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body;
}

export const api = {
  listItems: () => requestJson('/items'),
  getItem: (id) => requestJson(`/items/${id}`),
  createItem: (data) => requestJson('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => requestJson(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => requestJson(`/items/${id}`, { method: 'DELETE' }),
};
