// frontend/src/pages/HomePage.jsx

import React from "react";
import { useAuth } from "../auth/AuthContext";
import { Title, Text, Container } from '@mantine/core'; // Import Mantine components
import { Navigate } from "react-router-dom";
export default function HomePage() {
  const { userToken } = useAuth();
  if (!userToken) {
    return <Navigate to="/login" />;
  }
  return (
    <Container size="md" style={{ paddingTop: '2rem', textAlign: 'center' }}>
      <Title order={1} mb="md">Bienvenue sur Louyass!</Title>
      <div style={{ marginTop: '2rem' }}>
        <Text>Commencez à explorer des propriétés incroyables ou devenez un hôte.</Text>
        {/* Example: Add links to property listings or hosting dashboard */}
      </div>
    </Container>
  );
}