import apiClient from './client';

// Removes empty values so the URL only contains active filters.
const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null));

export const ticketsApi = {
  list: (params, config) => apiClient.get('/tickets', { params: cleanParams(params), ...config }).then((r) => r.data),
  get: (id, config) => apiClient.get(`/tickets/${id}`, config).then((r) => r.data.data),
  create: (ticket) => apiClient.post('/tickets', ticket).then((r) => r.data.data),
  update: (id, changes) => apiClient.patch(`/tickets/${id}`, changes).then((r) => r.data.data),
  updateStatus: (id, status) => apiClient.patch(`/tickets/${id}/status`, { status }).then((r) => r.data.data),
  remove: (id) => apiClient.delete(`/tickets/${id}`),
  history: (id, config) => apiClient.get(`/tickets/${id}/history`, config).then((r) => r.data.data),
  activity: (id, config) => apiClient.get(`/tickets/${id}/activity`, config).then((r) => r.data.data),
};

export const assigneesApi = {
  list: (config) => apiClient.get('/assignees', config).then((r) => r.data.data),
};

export const analyticsApi = {
  get: (params, config) => apiClient.get('/analytics', { params: cleanParams(params), ...config }).then((r) => r.data.data),
};

export const metaApi = {
  get: (config) => apiClient.get('/meta', config).then((r) => r.data.data),
};
