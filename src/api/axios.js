import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Intercepteur pour les erreurs
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error('Erreur réseau'));
  }
);

export default api;