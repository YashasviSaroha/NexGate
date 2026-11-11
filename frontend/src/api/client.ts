import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to catch unauthorized responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 on protected route, redirect to login unless already on auth page
    if (
      error.response?.status === 401 &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/register')
    ) {
      // Allow component to catch and handle gracefully
    }
    return Promise.reject(error);
  }
);
