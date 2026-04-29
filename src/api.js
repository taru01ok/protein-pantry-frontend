import axios from 'axios';

const API = axios.create({
  baseURL: 'https://protein-pantry-tracker.onrender.com'
});

// Automatically attach token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getItems = (params) => API.get('/items', { params });
export const addItem = (data) => API.post('/items', data);
export const updateItem = (id, data) => API.put(`/items/${id}`, data);
export const deleteItem = (id) => API.delete(`/items/${id}`);
export const getLowStock = () => API.get('/items/low-stock');
export const getExpiringSoon = () => API.get('/items/expiring-soon');