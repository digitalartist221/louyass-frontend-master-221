// frontend/src/auth/ProtectedRoute.jsx

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import React from "react";

export const ProtectedRoute = () => {
  const { userToken, isLoading } = useAuth();

  if (isLoading) {
    return <div>Chargement de l'authentification...</div>;
  }

  if (!userToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};