import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Paper,
  Group,
  Text,
  Anchor,
  Checkbox,
  Stack,
  Notification,
  Loader
} from '@mantine/core';
import { IconCheck, IconX, IconAt, IconUser, IconPhone, IconId } from '@tabler/icons-react';
import api from '../api/axios';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nom_utilisateur: '',
    telephone: '',
    cni: '',
    role: 'locataire'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email invalide';
        break;
      case 'password':
        if (value.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
        break;
      case 'confirmPassword':
        if (value !== formData.password) return 'Les mots de passe ne correspondent pas';
        break;
      case 'nom_utilisateur':
        if (value.length < 3) return 'Le nom d\'utilisateur doit contenir au moins 3 caractères';
        break;
      case 'telephone':
        if (value && !/^[0-9]{9}$/.test(value)) return 'Numéro de téléphone invalide';
        break;
      default:
        return '';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validation en temps réel
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        const error = validateField(name, value);
        if (error) newErrors[name] = error;
        else delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validation avant soumission
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'cni' && key !== 'confirmPassword') { // On ne valide pas la CNI et la confirmation de mot de passe ici
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    // Validation spécifique pour la confirmation de mot de passe
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...userData } = formData; // On enlève confirmPassword avant l'envoi
      
      const response = await api.post('/auth/register', userData);
      
      setNotification({
        title: 'Inscription réussie',
        message: 'Votre compte a été créé avec succès',
        color: 'green',
        icon: <IconCheck />
      });

      // Redirection après 2 secondes
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      let errorMessage = 'Une erreur est survenue';
      
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = error.response.data.detail || 'Erreur de validation';
          
          // Gestion des erreurs spécifiques de l'API
          if (error.response.data.detail === "Email déjà utilisé.") {
            setErrors({ ...errors, email: errorMessage });
          }
        } else if (error.response.status === 500) {
          errorMessage = 'Erreur serveur';
        }
      }

      setNotification({
        title: 'Erreur',
        message: errorMessage,
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '2rem 1rem' }}>
      <Title order={2} ta="center" mb="sm">
        Créer un compte
      </Title>
      
      <Text c="dimmed" ta="center" mb="xl">
        Déjà membre ?{' '}
        <Anchor component={Link} to="/login" size="sm">
          Se connecter
        </Anchor>
      </Text>

      {notification && (
        <Notification
          icon={notification.icon}
          color={notification.color}
          title={notification.title}
          onClose={() => setNotification(null)}
          mb="xl"
        >
          {notification.message}
        </Notification>
      )}

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="votre@email.com"
              required
              name="email"
              leftSection={<IconAt size={16} />}
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              withAsterisk
            />

            <TextInput
              label="Nom d'utilisateur"
              placeholder="Votre pseudo"
              required
              name="nom_utilisateur"
              leftSection={<IconUser size={16} />}
              value={formData.nom_utilisateur}
              onChange={handleChange}
              error={errors.nom_utilisateur}
              withAsterisk
            />

            <Group grow>
              <TextInput
                label="Téléphone"
                placeholder="0600000000"
                name="telephone"
                leftSection={<IconPhone size={16} />}
                value={formData.telephone}
                onChange={handleChange}
                error={errors.telephone}
              />

              <TextInput
                label="CNI (optionnel)"
                placeholder="Numéro de CNI"
                name="cni"
                leftSection={<IconId size={16} />}
                value={formData.cni}
                onChange={handleChange}
              />
            </Group>

            <PasswordInput
              label="Mot de passe"
              placeholder="Votre mot de passe"
              required
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              withAsterisk
            />

            <PasswordInput
              label="Confirmer le mot de passe"
              placeholder="Retapez votre mot de passe"
              required
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              withAsterisk
            />

            <Stack gap="xs" mb="md">
              <Text fw={500} size="sm">Vous êtes :</Text>
              <Checkbox
                checked={formData.role === 'locataire'}
                onChange={() => setFormData({...formData, role: 'locataire'})}
                label="Locataire - Je cherche un logement"
                radius="sm"
              />
              <Checkbox
                checked={formData.role === 'proprietaire'}
                onChange={() => setFormData({...formData, role: 'proprietaire'})}
                label="Propriétaire - Je propose un logement"
                radius="sm"
              />
            </Stack>

            <Button
              type="submit"
              fullWidth
              size="md"
              loading={loading}
              leftSection={loading ? <Loader size="xs" /> : null}
              disabled={Object.keys(errors).length > 0 || loading}
              style={{
                backgroundColor: '#FF385C',
                '&:hover': { backgroundColor: '#E61E4D' }
              }}
            >
              {loading ? 'Création en cours...' : 'S\'inscrire'}
            </Button>
          </Stack>
        </form>
      </Paper>

      <Text c="dimmed" size="xs" ta="center" mt="xl">
        En vous inscrivant, vous acceptez nos{' '}
        <Anchor href="#" size="xs">
          Conditions d'utilisation
        </Anchor>{' '}
        et notre{' '}
        <Anchor href="#" size="xs">
          Politique de confidentialité
        </Anchor>.
      </Text>
    </div>
  );
}

export default RegisterPage;