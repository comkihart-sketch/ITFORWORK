const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('shiftflow_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function fetchJson(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'เกิดข้อผิดพลาดในการติดต่อระบบ');
  }

  return data;
}

export const api = {
  auth: {
    login: (username, password) => 
      fetchJson(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      }),
    me: () => fetchJson(`${API_BASE}/auth/me`),
    getUsers: () => fetchJson(`${API_BASE}/auth/users`),
    changePassword: (data) => fetchJson(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  },

  shifts: {
    get: (month) => fetchJson(`${API_BASE}/shifts?month=${month}`),
    save: (shiftData) => fetchJson(`${API_BASE}/shifts`, {
      method: 'POST',
      body: JSON.stringify(shiftData)
    }),
  },

  swaps: {
    get: () => fetchJson(`${API_BASE}/swaps`),
    request: (swapData) => fetchJson(`${API_BASE}/swaps/request`, {
      method: 'POST',
      body: JSON.stringify(swapData)
    }),
    approve: (id) => fetchJson(`${API_BASE}/swaps/${id}/approve`, {
      method: 'POST'
    }),
    reject: (id, responseNote) => fetchJson(`${API_BASE}/swaps/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ response_note: responseNote })
    }),
  },

  notes: {
    get: (month, date) => {
      let q = '';
      if (date) q = `?date=${date}`;
      else if (month) q = `?month=${month}`;
      return fetchJson(`${API_BASE}/notes${q}`);
    },
    create: (noteData) => fetchJson(`${API_BASE}/notes`, {
      method: 'POST',
      body: JSON.stringify(noteData)
    }),
    delete: (id) => fetchJson(`${API_BASE}/notes/${id}`, {
      method: 'DELETE'
    }),
  },

  shiftTypes: {
    get: () => fetchJson(`${API_BASE}/shift-types`),
    create: (data) => fetchJson(`${API_BASE}/shift-types`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => fetchJson(`${API_BASE}/shift-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => fetchJson(`${API_BASE}/shift-types/${id}`, {
      method: 'DELETE'
    }),
  },

  holidays: {
    get: () => fetchJson(`${API_BASE}/holidays`),
    create: (data) => fetchJson(`${API_BASE}/holidays`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    delete: (id) => fetchJson(`${API_BASE}/holidays/${id}`, {
      method: 'DELETE'
    }),
  },

  adminUsers: {
    get: () => fetchJson(`${API_BASE}/admin/users`),
    create: (data) => fetchJson(`${API_BASE}/admin/users`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => fetchJson(`${API_BASE}/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => fetchJson(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE'
    }),
  }
};
