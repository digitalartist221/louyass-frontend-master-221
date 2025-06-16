import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Modal,
  SimpleGrid,
  Card,
  Image,
  Badge,
  Loader,
  Center,
  Alert,
  Stack,
  Flex
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates'; // Requires @mantine/dates and dayjs
import { notifications } from '@mantine/notifications';
import { IconBed, IconRulerMeasure, IconBath, IconCalendar, IconMapPin, IconInfoCircle, IconAlertCircle } from '@tabler/icons-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'; // For Google Maps
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';

// Import Mantine Dates styles if not already imported globally
import '@mantine/dates/styles.css';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
};

// Replace with your Google Maps API Key
const Maps_API_KEY = 'YOUR_Maps_API_KEY'; // <<< REMPLACEZ CECI

export default function ChambreDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Accéder à l'utilisateur connecté

  const [chambre, setChambre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [rendezVousDate, setRendezVousDate] = useState(null);

  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: Maps_API_KEY,
  });

  const fetchChambreDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/chambres/${id}`);
      // Assurez-vous que les médias sont des URL absolues
      const formattedChambre = {
        ...response.data,
        medias: response.data.medias.map(media => {
          if (!media.url.startsWith('http://') && !media.url.startsWith('https://')) {
            // Assurez-vous que votre backend renvoie des chemins relatifs corrects,
            // par exemple "/uploads/image.jpg", pas juste "uploads/image.jpg"
            return { ...media, url: `http://localhost:8000${media.url.startsWith('/') ? '' : '/'}${media.url}` };
          }
          return media;
        })
      };
      setChambre(formattedChambre);
    } catch (err) {
      console.error("Erreur lors de la récupération des détails de la chambre:", err);
      let displayMessage = "Impossible de charger les détails de la chambre. Veuillez réessayer.";
      if (err.response) {
        if (err.response.status === 404) {
          displayMessage = "Chambre non trouvée.";
        } else if (typeof err.response.data?.detail === 'string') {
          displayMessage = `Erreur: ${err.response.data.detail}`;
        } else {
          displayMessage = `Erreur du serveur (${err.response.status}).`;
        }
      } else if (err.request) {
        displayMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion internet.";
      } else {
        displayMessage = `Une erreur inattendue s'est produite: ${err.message}`;
      }
      setError(displayMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChambreDetails();
  }, [fetchChambreDetails]);

  const handleTakeAppointment = useCallback(async () => {
    if (!user) {
      notifications.show({
        title: 'Authentification requise',
        message: 'Vous devez être connecté pour prendre rendez-vous.',
        color: 'blue',
        icon: <IconInfoCircle size={18} />,
        autoClose: 5000,
      });
      navigate(`/login?redirect=/chambres/${id}`);
      return;
    }

    if (!rendezVousDate) {
      notifications.show({
        title: 'Date de rendez-vous manquante',
        message: 'Veuillez sélectionner une date et une heure pour le rendez-vous.',
        color: 'red',
        icon: <IconInfoCircle size={18} />,
        autoClose: 5000,
      });
      return;
    }

    try {
      // Convertir rendezVousDate en Date si ce n'est pas déjà le cas
      const date = rendezVousDate instanceof Date ? rendezVousDate : new Date(rendezVousDate);
      const payload = {
        locataire_id: user.id, // ID de l'utilisateur connecté
        chambre_id: parseInt(id), // ID de la chambre
        date_heure: date.toISOString(), // Convertir en format ISO 8601
        statut: 'en_attente', // Statut initial
      };
      await api.post('/rendez-vous/', payload); // Endpoint corrigé pour Rendez-vous

      notifications.show({
        title: 'Rendez-vous pris !',
        message: 'Votre demande de rendez-vous a été envoyée. Vous serez contacté prochainement.',
        color: 'green',
        icon: <IconCalendar size={18} />,
        autoClose: 5000,
      });
      setModalOpened(false);
      setRendezVousDate(null); // Reset date
    } catch (err) {
      console.error("Erreur lors de la prise de rendez-vous:", err);
      let displayMessage = "Impossible de prendre rendez-vous. Veuillez réessayer.";
      if (err.response) {
        if (err.response.status === 422) {
          displayMessage = "Erreur de validation: Assurez-vous que toutes les informations sont correctes.";
          if (err.response.data?.detail) {
              const details = err.response.data.detail;
              if (Array.isArray(details) && details.length > 0) {
                  displayMessage += "\n Détails:";
                  details.forEach(detail => {
                      if (detail.loc && detail.msg) {
                          displayMessage += `\n - ${detail.loc.join('.')} : ${detail.msg}`;
                      } else if (typeof detail === 'string') {
                          displayMessage += `\n - ${detail}`;
                      }
                  });
              } else if (typeof details === 'string') {
                   displayMessage += `\n Détails: ${details}`;
              }
          }
        } else if (typeof err.response.data?.detail === 'string') {
          displayMessage = `Erreur: ${err.response.data.detail}`;
        } else {
          displayMessage = `Erreur du serveur (${err.response.status}).`;
        }
      } else if (err.request) {
        displayMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion internet.";
      } else {
        displayMessage = `Une erreur inattendue s'est produite: ${err.message}`;
      }
      notifications.show({
        title: 'Erreur',
        message: displayMessage,
        color: 'red',
        icon: <IconAlertCircle size={18} />,
        autoClose: 7000,
      });
    }
  }, [user, id, rendezVousDate, navigate]);

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
        <Text ml="md">Chargement des détails de la chambre...</Text>
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" icon={<IconAlertCircle size={20} />} title="Erreur">
          {error}
          <Button mt="md" onClick={() => navigate('/recherche')}>Retour à la recherche</Button>
        </Alert>
      </Container>
    );
  }

  if (!chambre) {
    return (
      <Container size="md" py="xl">
        <Alert color="orange" icon={<IconInfoCircle size={20} />} title="Chambre introuvable">
          Les détails de cette chambre n'ont pas pu être chargés.
          <Button mt="md" onClick={() => navigate('/recherche')}>Retour à la recherche</Button>
        </Alert>
      </Container>
    );
  }

  // Coordonnées par défaut (par exemple, centre de Touba, Sénégal)
  // Assurez-vous que votre backend fournit ces champs dans le modèle Maison ou Chambre
  const defaultCenter = { lat: 14.8858, lng: -14.7674 }; // Centre de Touba
  const mapCenter = (chambre.maison?.latitude && chambre.maison?.longitude)
    ? { lat: parseFloat(chambre.maison.latitude), lng: parseFloat(chambre.maison.longitude) }
    : defaultCenter;

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Container size="xl" py="xl">
      <Stack spacing="xl">
        <Title order={2} align="center">{chambre.titre || "Détails de la Chambre"}</Title>

        {/* Section Images de la Chambre */}
        {chambre.medias && chambre.medias.length > 0 && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">Galerie d'images</Title>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {chambre.medias.map((media, index) => (
                <Image
                  key={index}
                  src={media.url}
                  height={200}
                  alt={`Image de la chambre ${chambre.titre} ${index + 1}`}
                  radius="md"
                  onError={(e) => {
                    e.currentTarget.src = 'https://placehold.co/400x200/ADD8E6/000000?text=Image+non+disponible';
                    e.currentTarget.alt = 'Image non disponible';
                  }}
                />
              ))}
            </SimpleGrid>
          </Card>
        )}

        <Flex direction={{ base: 'column', md: 'row' }} gap="xl">
          {/* Détails de la Chambre (Gauche) */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ flex: 1 }}>
            <Title order={4} mb="md">Informations sur la Chambre</Title>
            <Stack spacing="sm">
              <Group justify="space-between">
                <Text fw={700}>Adresse:</Text>
                <Text>{chambre.maison?.adresse || 'Non spécifiée'}, {chambre.maison?.ville || 'Non spécifiée'}</Text>
              </Group>
              <Group justify="space-between">
                <Text fw={700}>Type:</Text>
                <Badge color="blue" variant="light">{chambre.type || 'Non spécifié'}</Badge>
              </Group>
              <Group justify="space-between">
                <Text fw={700}>Prix:</Text>
                <Text fw={700} size="lg" color="blue">
                  {chambre.prix !== undefined ? `${chambre.prix} FCFA / nuit` : 'N/A'}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text fw={700}>Description:</Text>
                <Text>{chambre.description || 'Aucune description disponible.'}</Text>
              </Group>
              <Group justify="space-between">
                <Text fw={700}>Capacité:</Text>
                <Group gap={5}><IconBed size={16} /><Text>{chambre.capacite || 'N/A'} personne(s)</Text></Group>
              </Group>
              <Group justify="space-between">
                <Text fw={700}>Taille:</Text>
                <Group gap={5}><IconRulerMeasure size={16} /><Text>{chambre.taille || 'N/A'} m²</Text></Group>
              </Group>
              <Group justify="space-between">
                <Text fw={700}>Salle de bain:</Text>
                <Group gap={5}><IconBath size={16} /><Text>{chambre.salle_de_bain ? 'Oui' : 'Non'}</Text></Group>
              </Group>
              <Group justify="space-between">
                <Text fw={700}>Meublée:</Text>
                <Text>{chambre.meublee ? 'Oui' : 'Non'}</Text>
              </Group>
              <Group justify="space-between">
                <Text fw={700}>Disponible:</Text>
                <Badge color={chambre.disponible ? "green" : "red"} variant="light">
                  {chambre.disponible ? 'Oui' : 'Non'}
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text fw={700}>Créée le:</Text>
                <Text>{formatDate(chambre.cree_le)}</Text>
              </Group>
            </Stack>

            <Button
              mt="xl"
              color="blue"
              fullWidth
              onClick={() => setModalOpened(true)}
              disabled={!chambre.disponible}
              leftSection={<IconCalendar size={20} />}
            >
              Prendre Rendez-vous
            </Button>
            {!chambre.disponible && (
              <Text color="red" size="sm" mt="xs" align="center">Cette chambre n'est pas disponible pour le moment.</Text>
            )}
          </Card>

          {/* Carte Google Maps (Droite) */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ flex: 1 }}>
            <Title order={4} mb="md">Localisation</Title>
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={15}
              >
                <Marker position={mapCenter} />
              </GoogleMap>
            ) : (
              <Center h={400}>
                <Loader size="sm" />
                <Text ml="xs">Chargement de la carte...</Text>
              </Center>
            )}
            <Group mt="md" align="center" justify="center" gap={5}>
              <IconMapPin size={16} />
              <Text>{chambre.maison?.adresse || 'Adresse inconnue'}</Text>
            </Group>
            {chambre.maison?.latitude && chambre.maison?.longitude && (
              <Text size="sm" color="dimmed" align="center">
                Lat: {mapCenter.lat.toFixed(4)}, Lng: {mapCenter.lng.toFixed(4)}
              </Text>
            )}
          </Card>
        </Flex>
      </Stack>

      {/* Modal pour la prise de rendez-vous */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Prendre Rendez-vous"
        centered
      >
        <Stack spacing="md">
          <Text size="sm" color="dimmed">
            Choisissez la date et l'heure à laquelle vous souhaitez visiter cette chambre.
          </Text>
          <DateTimePicker
            label="Date et Heure du Rendez-vous"
            placeholder="Sélectionnez la date et l'heure"
            value={rendezVousDate}
            onChange={setRendezVousDate}
            minDate={new Date()} // Impossible de prendre un RDV dans le passé
            // Optional: You might want to filter dates/times based on availability from backend
            clearable
            required
            locale="fr" // Set locale for French date formatting
          />
          <Button
            onClick={handleTakeAppointment}
            fullWidth
            mt="md"
            leftSection={<IconCalendar size={20} />}
          >
            Confirmer le rendez-vous
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}