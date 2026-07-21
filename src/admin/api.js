const API = {
  token: localStorage.getItem('csAdminToken'),
  
  setToken(token) {
    this.token = token;
    localStorage.setItem('csAdminToken', token);
  },
  
  clearToken() {
    this.token = null;
    localStorage.removeItem('csAdminToken');
  },
  
  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    
    const opts = { method, headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    
    const res = await fetch(`/api${path}`, opts);
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  
  async uploadFile(path, formData) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  
  login: (username, password) => API.request('POST', '/auth/login', { username, password }),
  me: () => API.request('GET', '/auth/me'),
  
  getGuides: () => API.request('GET', '/guides'),
  getGuide: (id) => API.request('GET', `/guides/${id}`),
  createGuide: (data) => API.request('POST', '/guides', data),
  updateGuide: (id, data) => API.request('PUT', `/guides/${id}`, data),
  deleteGuide: (id) => API.request('DELETE', `/guides/${id}`),
  publishGuide: (id) => API.request('POST', `/guides/${id}/publish`),
  regenerateCipher: (id) => API.request('POST', `/guides/${id}/cipher/regenerate`),
  translateGuide: (id) => API.request('POST', `/guides/${id}/translate-all`),
  
  getPublicGuides: () => fetch('/api/guides/public').then(r => r.json()),
  verifyCipher: (guideId, cipher) => API.request('POST', '/guides/verify', { guide_id: guideId, cipher }),
  
  uploadImage: (formData) => API.uploadFile('/images/upload', formData),
  deleteImage: (id) => API.request('DELETE', `/images/${id}`),
  
  getCloudFiles: () => API.request('GET', '/cloud/files'),
  uploadCloud: (formData) => API.uploadFile('/cloud/upload', formData),
  deleteCloud: (id) => API.request('DELETE', `/cloud/${id}`),
  updateCloud: (id, data) => API.request('PUT', `/cloud/${id}`, data),
  
  getLabels: () => API.request('GET', '/labels'),
  updateLabel: (key, data) => API.request('PUT', `/labels/${key}`, data),
  
  track: (eventType, guideId) => API.request('POST', '/analytics/track', { event_type: eventType, guide_id: guideId }),
  getDashboard: () => API.request('GET', '/analytics/dashboard'),
};
