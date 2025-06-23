// components/Header.jsx
import { Group, Button, Menu, Avatar, Text, Box } from '@mantine/core';
import { Link } from 'react-router-dom';
import { IconUser } from '@tabler/icons-react';
import { useAuth } from '../auth/AuthContext'; // Path adjusted for component

function Header() {
  const { userToken, user, logout } = useAuth(); // Get userToken and logout from AuthContext
console.log(user)
  return (
    <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
      <Group position="apart" align="center">
        <Text size="xl" weight={700} color="blue">
          Louyass 221
        </Text>
        <Group>
          <Button component={Link} to="/" variant="subtle">
            Accueil
          </Button>
          {userToken && user?.role === 'proprietaire' ? (
            <>
              <Button component={Link} to="/maisons" variant="subtle">
                Maisons
              </Button>
              <Button component={Link} to="/chambres" variant="subtle">
                Chambres
              </Button>
              <Button component={Link} to="/rendez-vous" variant="subtle">
                Rendez-vous
              </Button>
              <Button component={Link} to="/contrats" variant="subtle">
                Contrats
              </Button>
              <Button component={Link} to="/mes-paiements-proprietaire" variant="subtle">
                Paiements
              </Button> 
              <Button component={Link} to="/profile" variant="subtle">
                Profil
              </Button>
            </>
          ) :   userToken && user?.role === 'locataire' ? (
            <>
            <Button component={Link} to="/mes-paiements" variant="subtle">
                Mes paiements
              </Button>
            <Button component={Link} to="/profile" variant="subtle">
                Profil
              </Button>
            </>
          ) : null}

          {userToken ? (
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <Avatar color="blue" radius="xl">
                  <IconUser size={18} />
                </Avatar>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={logout}>Se déconnecter</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Group>
              <Button component={Link} to="/login" variant="default" size="xs">
                Connexion
              </Button>
              <Button component={Link} to="/register" variant="light" size="xs">
                S'inscrire
              </Button>
            </Group>
          )}
        </Group>
      </Group>
    </Box>
  );
}

export default Header;