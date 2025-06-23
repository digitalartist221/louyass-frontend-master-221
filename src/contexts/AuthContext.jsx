import { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Vérifier le token au chargement de l'application
    const checkAuth = async () => {
      if (userToken) {
        try {
          const response = await axios.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          logout();
        }
      }
    };

    checkAuth();
  }, [userToken]);

  const login = async (credentials) => {
    try {
      const response = await axios.post('/auth/login', credentials);
      const token = response.data.access_token;
      localStorage.setItem('token', token);
      setUserToken(token);
      setUser(response.data.user);
      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUserToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userToken,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
