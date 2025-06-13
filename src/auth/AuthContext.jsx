// frontend/src/auth/AuthContext.jsx

import { createContext, useState, useEffect, useContext, useCallback } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { notifications } from '@mantine/notifications'; // Import Mantine Notifications

// Clés pour le localStorage
const TOKEN_KEY = "token";
const USER_KEY = "user";
const TOKEN_EXPIRATION_KEY = "tokenExpiration"; // Nouvelle clé pour la date d'expiration

export const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Récupérer le token et l'utilisateur du localStorage à l'initialisation
  // et vérifier la validité/expiration
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Indique si l'initialisation est en cours
  const navigate = useNavigate();

  // Fonction pour charger et valider l'état d'authentification depuis le localStorage
  const loadAuthState = useCallback(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      const storedExpiration = localStorage.getItem(TOKEN_EXPIRATION_KEY);

      if (storedToken && storedUser && storedExpiration) {
        const expirationTime = new Date(parseInt(storedExpiration, 10));
        const currentTime = new Date();

        if (expirationTime > currentTime) {
          // Le token est valide et non expiré
          setUserToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          // Le token a expiré, le nettoyer
          console.log("Token expiré, déconnexion automatique.");
          clearAuthState();
        }
      } else {
        // Pas de token ou données incomplètes, nettoyer
        clearAuthState();
      }
    } catch (error) {
      console.error('Erreur lors du chargement ou du parsing des données d\'authentification:', error);
      clearAuthState(); // En cas d'erreur de parsing, nettoyer l'état
    } finally {
      setIsLoading(false); // L'initialisation est terminée
    }
  }, []); // Aucune dépendance car elle ne dépend que de localStorage et des fonctions internes

  // Fonction pour nettoyer l'état d'authentification dans le state et le localStorage
  const clearAuthState = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_EXPIRATION_KEY);
    setUserToken(null);
    setUser(null);
  };

  // Charger l'état d'authentification au montage du composant
  useEffect(() => {
    loadAuthState();
  }, [loadAuthState]); // Dépend de loadAuthState pour s'assurer qu'elle est stable

  const login = async (email, password) => {
    setIsLoading(true); // Activer le loader pendant la connexion
    try {
      const res = await api.post("/auth/login", { email, password });
      const token = res.data.access_token;
      const userPayload = res.data.user;

      // Calculer l'expiration (1 semaine à partir de maintenant)
      const expirationTime = new Date();
      expirationTime.setDate(expirationTime.getDate() + 7); // Ajouter 7 jours

      // Enregistrer dans localStorage
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(userPayload));
      localStorage.setItem(TOKEN_EXPIRATION_KEY, expirationTime.getTime().toString()); // Stocker le timestamp

      // Mettre à jour l'état React
      setUserToken(token);
      setUser(userPayload);

      notifications.show({ // Mantine success notification
        title: 'Connexion réussie!',
        message: 'Bienvenue sur Louyass!',
        color: 'green',
      });
      navigate("/");
    } catch (error) {
      console.error("Échec de connexion:", error.response?.data || error.message);
      clearAuthState(); // Nettoyer l'état en cas d'échec de connexion
      notifications.show({ // Mantine error notification
        title: 'Erreur de connexion',
        message: error.response?.data?.detail || 'Identifiants incorrects.',
        color: 'red',
      });
      throw error; // Propager l'erreur pour la gestion côté composant
    } finally {
      setIsLoading(false); // Désactiver le loader
    }
  };

  const logout = () => {
    clearAuthState(); // Utiliser la fonction de nettoyage centralisée
    notifications.show({ // Mantine info notification
      title: 'Déconnexion',
      message: 'Vous avez été déconnecté.',
      color: 'blue',
    });
    navigate("/login");
  };

  // Fournir l'état et les fonctions via le contexte
  return (
    <AuthContext.Provider value={{ userToken, user, login, logout, isLoading }}>
      {/* Rendre les enfants uniquement après que l'état d'authentification a été chargé */}
      {!isLoading && children}
    </AuthContext.Provider>
  );
};
