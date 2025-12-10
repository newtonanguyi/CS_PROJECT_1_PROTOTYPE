import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  getProfile: () => api.get('/auth/profile/'),
};

// Disease Detection API
export const diseaseAPI = {
  detect: (formData) => api.post('/disease/detect/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Weather API
export const weatherAPI = {
  getWeather: (location) => api.get(`/weather/${location}/`),
};

// Market API
export const marketAPI = {
  getPrices: (crop) => api.get('/market/prices/', { params: { crop } }),
  getHistory: (crop, days = 30) => api.get(`/market/history/${crop}/`, { params: { days } }),
  predictPrice: (crop) => api.get(`/market/predict/${crop}/`),
};

// Advisory API
export const advisoryAPI = {
  getComprehensive: (data) => api.post('/advisory/comprehensive/', data),
  getSeasonal: (month) => api.get('/advisory/seasonal/', { params: { month } }),
  chat: (message, location) => api.post('/advisory/chat/', { message, location }),
};

// RAG API
export const ragAPI = {
  search: (query, topK = 3) => api.post('/rag/search/', { query, top_k: topK }),
  initialize: () => api.get('/rag/initialize/'),
};

export default api;







