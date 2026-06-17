import client from './client'

// ─── Auth API ─────────────────────────────────────────────────────────────
export const authApi = {
  login: (data) =>
    client.post('/auth/login', data, { _isLoginRequest: true }),

  refresh: (refreshToken) =>
    client.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken) =>
    client.post('/auth/logout', { refreshToken }),

  forgotPassword: (data) =>
    client.post('/auth/forgot-password', data),

  resetPassword: (data) =>
    client.post('/auth/reset-password', data),

  changePassword: (data) =>
    client.post('/auth/change-password', data),

  register: (data) =>
    client.post('/auth/register', data),
}

// ─── Users API ────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: (params) =>
    client.get('/users', { params }),

  getById: (id) =>
    client.get(`/users/${id}`),

  create: (data) =>
    client.post('/users/save', data),

  update: (id, data) =>
    client.post('/users/save', { ...data, id }),

  delete: (id) =>
    client.delete(`/users/${id}`),
}

// ─── Items API ────────────────────────────────────────────────────────────
export const itemsApi = {
  getAll: (params) =>
    client.get('/items', { params }),

  getLookup: (search) =>
    client.get('/items/lookup', { params: search ? { search } : undefined }),

  getById: (id) =>
    client.get(`/items/${id}`),

  create: (data) =>
    client.post('/items/save', data),

  update: (id, data) =>
    client.post('/items/save', { ...data, id }),

  delete: (id) =>
    client.delete(`/items/${id}`),

  uploadImage: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return client.post(`/items/${id}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  export: (params, format) =>
    client.get('/items/export', { params: { ...params, format }, responseType: 'blob' }),
}

// ─── Invoices API ─────────────────────────────────────────────────────────
export const invoicesApi = {
  getAll: (params) =>
    client.get('/invoices', { params }),

  getById: (id) =>
    client.get(`/invoices/${id}`),

  create: (data) =>
    client.post('/invoices/save', data),

  update: (id, data) =>
    client.post('/invoices/save', { ...data, id }),

  delete: (id) =>
    client.delete(`/invoices/${id}`),

  getSummary: (from, to) =>
    client.get('/invoices/summary', { params: { from, to } }),

  export: (params, format) =>
    client.get('/invoices/export', { params: { ...params, format }, responseType: 'blob' }),
}

// ─── Account API — basic profile info update (PUT /profile) ──────────────
export const accountApi = {
  update: (data) =>
    client.put('/profile', data),
}

// ─── Profile API ──────────────────────────────────────────────────────────
export const profileApi = {
  getMe: () =>
    client.get('/profile/me'),

  getByUserId: (userId) =>
    client.get(`/profile/${userId}`),

  update: (data) =>
    client.put('/profile', data),

  uploadAvatar: (file) => {
    const form = new FormData()
    form.append('file', file)
    return client.post('/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ─── Resume API ───────────────────────────────────────────────────────────
export const resumeApi = {
  save: (data) =>
    client.post('/resume/save', data),

  getSample: () =>
    client.get('/resume/sample'),

  getPreview: (template) =>
    client.get('/resume/preview', { params: { template }, responseType: 'text' }),

  downloadPdf: (template) =>
    client.get('/resume/download/pdf', { params: { template }, responseType: 'blob' }),

  downloadDocx: (template) =>
    client.get('/resume/download/docx', { params: { template }, responseType: 'blob' }),
}

// ─── Dashboard API ────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: () =>
    client.get('/dashboard/summary'),
}

// ─── Locations API ────────────────────────────────────────────────────────
export const locationsApi = {
  getAll: (params) =>
    client.get('/locations', { params }),
  getLookup: () =>
    client.get('/locations/lookup'),
  getById: (id) =>
    client.get(`/locations/${id}`),
  create: (data) =>
    client.post('/locations/save', data),
  update: (id, data) =>
    client.post('/locations/save', { ...data, id }),
  delete: (id) =>
    client.delete(`/locations/${id}`),
}

// ─── Categories API ───────────────────────────────────────────────────────
export const categoriesApi = {
  getAll: () =>
    client.get('/categories'),
  // create + update parent: POST /categories/save (upsert — include id to update)
  save: (data) =>
    client.post('/categories/save', data),
  // create + update sub: POST /categories/sub/save (upsert — include id to update)
  saveSub: (data) =>
    client.post('/categories/sub/save', data),
  delete: (id) =>
    client.delete(`/categories/${id}`),
}

// ─── Brands API ───────────────────────────────────────────────────────────
export const brandsApi = {
  getAll: () =>
    client.get('/brands'),
  create: (data) =>
    client.post('/brands/save', data),
  update: (id, data) =>
    client.post('/brands/save', { ...data, id }),
  delete: (id) =>
    client.delete(`/brands/${id}`),
}

// ─── Payment Terms API ────────────────────────────────────────────────────
export const paymentTermsApi = {
  getAll: (params) => client.get('/paymentterms', { params }),
  getLookup: () => client.get('/paymentterms/lookup'),
  save: (data) => client.post('/paymentterms/save', data),
  delete: (id) => client.delete(`/paymentterms/${id}`),
}

// ─── Company API ──────────────────────────────────────────────────────────
export const companyApi = {
  get: () =>
    client.get('/company'),
  save: (data) =>
    client.post('/company/save', data),
}

// ─── Settings API ─────────────────────────────────────────────────────────
export const settingsApi = {
  getAll: () =>
    client.get('/settings'),
  getPublic: () =>
    client.get('/settings/public'),
  update: (key, value) =>
    client.put(`/settings/${key}`, { value }),
}

// ─── System API ───────────────────────────────────────────────────────────
export const systemApi = {
  health: () =>
    client.get('/system/health'),
}
