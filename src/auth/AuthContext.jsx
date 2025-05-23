// frontend/src/auth/AuthContext.jsx

import { createContext, useState, useEffect, useContext } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { notifications } from '@mantine/notifications'; // Import Mantine Notifications

export const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const token = res.data.access_token;

      localStorage.setItem("token", token);
      setUserToken(token);
      notifications.show({ // Mantine success notification
        title: 'Connexion réussie!',
        message: 'Bienvenue sur Airbnb Clone!',
        color: 'green',
      });
      navigate("/");
    } catch (error) {
      console.error("Échec de connexion:", error.response?.data || error.message);
      localStorage.removeItem("token");
      setUserToken(null);
      notifications.show({ // Mantine error notification
        title: 'Erreur de connexion',
        message: error.response?.data?.detail || 'Identifiants incorrects.',
        color: 'red',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUserToken(null);
    notifications.show({ // Mantine info notification
      title: 'Déconnexion',
      message: 'Vous avez été déconnecté.',
      color: 'blue',
    });
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ userToken, login, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};