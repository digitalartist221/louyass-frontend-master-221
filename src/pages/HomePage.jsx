// frontend/src/pages/HomePage.jsx

import React from "react";
import { useAuth } from "../auth/AuthContext";
import { Title, Text, Container } from '@mantine/core'; // Import Mantine components

export default function HomePage() {
  const { userToken } = useAuth();

  return (
    <Container size="md" style={{ paddingTop: '2rem', textAlign: 'center' }}>
      <Title order={1} mb="md">Bienvenue sur Airbnb Clone!</Title>
      {userToken ? (
        <Text size="lg">Vous êtes connecté avec succès.</Text>
      ) : (
        <Text size="lg">Vous devez vous connecter pour voir le contenu ici.</Text>
      )}
      <div style={{ marginTop: '2rem' }}>
        <Text>Commencez à explorer des propriétés incroyables ou devenez un hôte.</Text>
        {/* Example: Add links to property listings or hosting dashboard */}
      </div>
    </Container>
  );
}