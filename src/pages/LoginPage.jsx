import { useState } from 'react';
import { 
  TextInput, 
  PasswordInput, 
  Button, 
  Title, 
  Paper, 
  Group, 
  Text, 
  Anchor,
  Divider,
  Box,
  Flex,
  rem
} from '@mantine/core';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { IconBrandGoogle, IconBrandFacebook, IconAt, IconLock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      notifications.show({
        title: 'Connexion réussie',
        message: 'Bienvenue sur votre espace',
        color: 'green',
      });
      navigate('/');
    } catch (error) {
      notifications.show({
        title: 'Erreur de connexion',
        message: error.message || 'Identifiants incorrects',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maw={460} mx="auto" py={40}>
      <Title ta="center" mb={20} style={{ fontSize: rem(28) }}>
        Bienvenue sur Airbnb
      </Title>
      
      <Paper withBorder shadow="sm" p={30} radius="md">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            placeholder="votre@email.com"
            required
            leftSection={<IconAt size={16} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            mb="md"
            size="md"
          />
          
          <PasswordInput
            label="Mot de passe"
            placeholder="Votre mot de passe"
            required
            leftSection={<IconLock size={16} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            mb="xl"
            size="md"
          />
          
          <Button 
            fullWidth 
            type="submit" 
            size="md"
            loading={loading}
            style={{
              backgroundColor: '#FF385C',
              '&:hover': { backgroundColor: '#E61E4D' }
            }}
          >
            Se connecter
          </Button>
        </form>

        <Divider my="lg" label="Ou continuer avec" labelPosition="center" />
        
        <Group grow mb="md">
          <Button 
            variant="default" 
            leftSection={<IconBrandGoogle size={18} />}
            radius="md"
          >
            Google
          </Button>
          <Button 
            variant="default" 
            leftSection={<IconBrandFacebook size={18} color="#1877F2" />}
            radius="md"
          >
            Facebook
          </Button>
        </Group>

        <Flex justify="center" gap="sm" mt="lg">
          <Text c="dimmed" size="sm">
            Pas encore de compte ?
          </Text>
          <Anchor component={Link} to="/register" size="sm">
            S'inscrire
          </Anchor>
        </Flex>
      </Paper>

      <Text c="dimmed" size="xs" ta="center" mt={40}>
        En vous connectant, vous acceptez nos Conditions d'utilisation
        et notre Politique de confidentialité.
      </Text>
    </Box>
  );
}

export default LoginPage;