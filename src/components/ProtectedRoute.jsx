import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, role = null }) => {
  const { user, userToken } = useAuth();
  
  // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (!userToken) {
    return <Navigate to="/login" replace />;
  }

  // Si un rôle spécifique est requis et que l'utilisateur n'a pas ce rôle
  if (role && user?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
