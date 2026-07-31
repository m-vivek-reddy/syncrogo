import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔑 Intercept every outgoing request and attach the Bearer token
apiClient.interceptors.request.use(
  (config) => {
    // 👇 Must match the key name used during login ('syncrogo_token')
    const token = localStorage.getItem('syncrogo_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);