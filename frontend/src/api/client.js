import axios from 'axios';

// In development the base URL is "/api" and Vite proxies it to Express.
// In production VITE_API_BASE_URL must point at the deployed API (ending in /api).
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Turns any Axios error into a human-readable message.
export function getErrorMessage(error) {
  if (axios.isCancel(error)) return null;
  const apiMessage = error?.response?.data?.error?.message;
  if (apiMessage) return apiMessage;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (!error?.response) return 'Unable to reach the server. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

// Field-level validation errors from the API: { title: 'Title is required', ... }
export function getFieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, detail) => {
    if (detail.field && !acc[detail.field]) acc[detail.field] = detail.message;
    return acc;
  }, {});
}

export default apiClient;
