import axios from 'axios';
import { notifications } from '@mantine/notifications';
  
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Variable pour stocker la fonction de déconnexion.
// Elle sera définie dynamiquement depuis AuthContext.
let onUnauthorizedError = null;

// Fonction pour configurer l'intercepteur de réponses avec la logique de déconnexion.
// Cette fonction doit être appelée depuis AuthContext pour "injecter" la fonction logout.
export const setupAxiosInterceptors = (logoutFn) => {
  onUnauthorizedError = logoutFn; // Stocke la fonction de déconnexion
};

// Intercepteur de requêtes pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    // Récupérer le token depuis le localStorage
    const token = localStorage.getItem('token');
    
    // Si un token existe, l'ajouter à l'en-tête Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponses pour les erreurs
api.interceptors.response.use(
  response => response,
  error => {
    // Gérer spécifiquement les erreurs 401 (Non autorisé)
    // Cela peut indiquer un token expiré ou invalide du côté du backend.
    if (error.response && error.response.status === 401) {
      console.error("Requête 401 non autorisée. Token peut-être invalide ou expiré, ou non reconnu par le backend.");
      // Si une fonction de déconnexion a été fournie, l'appeler.
      if (onUnauthorizedError) {
        onUnauthorizedError(); // Déclenche la déconnexion automatique
        notifications.show({
          title: 'Session expirée ou invalide',
          message: 'Vos informations de connexion ne sont plus valides. Veuillez vous reconnecter.',
          color: 'red',
        });
      }
    }
    
    if (error.response) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error('Erreur réseau'));
  }
);

export default api;
