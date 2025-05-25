// frontend/src/App.jsx

import { Routes, Route, Link } from "react-router-dom"; // No need for BrowserRouter here anymore, as it's in main.jsx
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import { useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Button, Group, Box } from '@mantine/core'; // Import Mantine components
import React from "react";
function App() {
  const { userToken, logout } = useAuth();

  return (
    <>
      <Group component="nav" px="md" py="xs" bg="dark" c="white" h={60} justify="space-between">
        <Box component={Link} to="/" style={{ textDecoration: 'none', color: 'inherit', fontSize: '1.25rem', fontWeight: 'bold' }}>
          Airbnb Clone
        </Box>
        <Group>
          {userToken ? (
            <Button onClick={logout} variant="light" color="blue">
              Déconnexion
            </Button>
          ) : (
            <>
              <Button component={Link} to="/login" variant="light" color="blue">
                Connexion
              </Button>
              <Button component={Link} to="/register" variant="filled" color="blue">
                Inscription
              </Button>
            </>
          )}
        </Group>
      </Group>

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Protected route for authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          {/* Add other protected routes here */}
        </Route>
      </Routes>
    </>
  );
}

export default App;


