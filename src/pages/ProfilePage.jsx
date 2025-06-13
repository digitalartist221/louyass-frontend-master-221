// pages/ProfilePage.jsx
import { Container, Title, Text, Paper } from '@mantine/core';
import { useAuth } from '../auth/AuthContext'; // Assuming useAuth provides user details

function ProfilePage() {
  const { user } = useAuth(); // Assuming your AuthContext provides user object/data

  if (!user) {
    // Handle case where user is not logged in or data is not yet loaded
    return (
      <Container size="sm" py="xl">
        <Text>Chargement du profil ou utilisateur non connecté...</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Paper shadow="xs" p="xl" withBorder>
        <Title order={2} mb="md">
          Mon Profil
        </Title>
        <Text size="lg" mb="sm">
          **Nom d'utilisateur:** {user.username || 'N/A'}
        </Text>
        <Text size="lg" mb="sm">
          **Email:** {user.email || 'N/A'}
        </Text>
        {/* Add more profile details as needed */}
        <Text mt="lg" c="dimmed">
          Bienvenue sur votre page de profil.
        </Text>
      </Paper>
    </Container>
  );
}

export default ProfilePage;