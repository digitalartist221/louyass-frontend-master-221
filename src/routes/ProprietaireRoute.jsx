import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export const ProprietaireRoute = () => {
  const { user, isLoading } = useAuth();
  console.log(user);
  if (isLoading) return <div>Chargement...</div>;
  if (!user || user.role !== 'proprietaire') return <Navigate to="/" replace />;

  return <Outlet />;
};