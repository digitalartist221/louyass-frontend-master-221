// pages/ProfilePage.jsx
import { 
  Container, 
  Title, 
  Text, 
  Paper, 
  Group, 
  Avatar, 
  Badge, 
  Button, 
  Stack, 
  Card, 
  Divider,
  ThemeIcon
} from '@mantine/core';
import { IconUser, IconMail, IconPhone, IconId, IconMapPin } from '@tabler/icons-react';
import { useAuth } from '../auth/AuthContext';

const profileContainerStyle = {
  display: 'flex',
  gap: '1.5rem',
  alignItems: 'center',
  marginBottom: '1.5rem',
};

const infoCardStyle = {
  padding: '1.5rem',
  borderRadius: '0.5rem',
  transition: 'transform 150ms ease',
  '&:hover': {
    transform: 'translateY(-2px)',
  },
};

const infoIconStyle = {
  marginRight: '0.5rem',
};

const roleBadgeStyle = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
};

function ProfilePage() {
  const { user, logout } = useAuth(); // Assuming your AuthContext provides user object/data and logout function

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Card p="xl" withBorder>
          <Text color="dimmed" align="center">
            Veuillez vous connecter pour accéder à votre profil
          </Text>
        </Card>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Card p="xl" withBorder>
          <Text color="dimmed" align="center">
            Veuillez vous connecter pour accéder à votre profil
          </Text>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Card shadow="sm" p="xl" withBorder>
        <Stack spacing="xl">
          {/* Section de profil */}
          <Group style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Avatar size={120} radius="xl">
              {user.prenom?.[0] || 'U'}
            </Avatar>
            <Stack spacing="sm">
              <Group position="apart" align="flex-start">
                <Title order={2}>{user.prenom} {user.nom}</Title>
                <Badge style={{ backgroundColor: '#2563eb', color: '#ffffff' }} variant="filled">
                  {user.role === 'proprietaire' ? 'Propriétaire' : 'Locataire'}
                </Badge>
              </Group>
              <Text size="sm" color="dimmed">
                Membre depuis {new Date(user.cree_le).toLocaleDateString()}
              </Text>
            </Stack>
          </Group>

          {/* Informations personnelles */}
          <Card style={{ padding: '1.5rem', borderRadius: '0.5rem', transition: 'transform 150ms ease', '&:hover': { transform: 'translateY(-2px)' } }}>
            <Title order={3} mb="md">Informations personnelles</Title>
            <Stack spacing="sm">
              <Group>
                <ThemeIcon size={30} radius="md" style={{ marginRight: '0.5rem' }}>
                  <IconUser size={20} />
                </ThemeIcon>
                <Text size="lg">{user.prenom} {user.nom}</Text>
              </Group>
              <Group>
                <ThemeIcon size={30} radius="md" style={{ marginRight: '0.5rem' }}>
                  <IconMail size={20} />
                </ThemeIcon>
                <Text size="lg">{user.email}</Text>
              </Group>
              {user.telephone && (
                <Group>
                  <ThemeIcon size={30} radius="md" style={{ marginRight: '0.5rem' }}>
                    <IconPhone size={20} />
                  </ThemeIcon>
                  <Text size="lg">{user.telephone}</Text>
                </Group>
              )}
              {user.cni && (
                <Group>
                  <ThemeIcon size={30} radius="md" style={{ marginRight: '0.5rem' }}>
                    <IconId size={20} />
                  </ThemeIcon>
                  <Text size="lg">CNI: {user.cni}</Text>
                </Group>
              )}
              {user.ville && (
                <Group>
                  <ThemeIcon size={30} radius="md"  style={{ marginRight: '0.5rem' }}>
                    <IconMapPin size={20} />
                  </ThemeIcon>
                  <Text size="lg">{user.ville}</Text>
                </Group>
              )}
            </Stack>
          </Card>

          {/* Actions */}
          <Group position="right">
            <Button
              variant="subtle"
              onClick={logout}
              leftSection={<IconUser size={16} />}
            >
              Déconnexion
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}

export default ProfilePage;