import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Image,
  Text,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Input,
  Select,
  Container,
  Title,
  Center,
  Alert,
  Loader,
  Paper,
  Stack,
  NumberInput,
  useMantineTheme
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMapPin, IconBath, IconBed, IconRuler, IconCurrencyDollar, IconSearch, IconAlertCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios'; // Assurez-vous que api.baseURL est correctement configuré ici
import { useAuth } from '../auth/AuthContext';

// Options pour le champ 'type' des chambres, synchronisées avec le backend
const ROOM_TYPES_OPTIONS = [
  { value: 'simple', label: 'Chambre simple' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison complète' },
];

/**
 * Helper function to check if a value is a valid number (not null, undefined, or NaN).
 * @param {*} value - The value to check.
 * @returns {boolean} - True if the value is a valid number, false otherwise.
 */
const isNumber = (value) => typeof value === 'number' && !isNaN(value);

/**
 * PropertyCard Component
 * Displays individual room/property details in a card format.
 * @param {object} props - Component props.
 * @param {object} props.result - The room data object from the API.
 * @param {function} props.onSelectRoom - Callback function when "Voir plus" is clicked.
 */
function PropertyCard({ result, onSelectRoom }) {
  // Destructure result with default empty objects for robustness
  const {
    id,
    adresse = 'Adresse inconnue',
    prix = 0,
    description = 'Aucune description disponible.',
    details = {}
  } = result;

  // Destructure properties from 'details' with default values
  const {
    titre = "Titre non disponible", // Backend returns 'titre' not 'titre_chambre'
    media,
    disponible = false,
    capacite = 'N/A',
    salle_de_bain = false,
    taille = 'N/A'
  } = details;

  // Function to determine the image URL
  const getImageUrl = () => {
    // The backend is expected to provide a full absolute URL for 'media'
    if (media && typeof media === 'string') {
      return media;
    }
    return 'https://placehold.co/400x200/ADD8E6/000000?text=No+Image';
  };

  // Function to safely render and truncate the description
  const renderDescription = () => {
    if (typeof description === 'string') {
      return description.length > 100
        ? description.substring(0, 97) + '...'
        : description;
    }
    return 'Aucune description disponible.';
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image
          src={getImageUrl()}
          height={160}
          alt={String(titre)} // Ensure alt text is always a string
          fallbackSrc="https://placehold.co/400x200/ADD8E6/000000?text=No+Image"
        />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500}>{titre}</Text> {/* Using 'titre' from details */}
        <Badge color={disponible ? "green" : "red"} variant="light">
          {disponible ? 'Disponible' : 'Indisponible'}
        </Badge>
      </Group>

      <Group gap={4}>
        <IconMapPin size={14} />
        <Text size="sm" c="dimmed">
          {adresse}
        </Text>
      </Group>
      <Text size="sm" c="dimmed" mt="xs">
        {renderDescription()}
      </Text>

      <Group mt="md" spacing="xs">
        <Group spacing={5}><IconBed size={16} /> <Text size="xs">{capacite} pers.</Text></Group>
        <Group spacing={5}><IconBath size={16} /> <Text size="xs">{salle_de_bain ? 'Oui' : 'Non'}</Text></Group>
        <Group spacing={5}><IconRuler size={16} /> <Text size="xs">{taille} m²</Text></Group> {/* Added m² for clarity */}
      </Group>

      <Group justify="space-between" align="center" mt="md">
        <Text fw={700} size="lg" color="blue">{prix} FCFA</Text>
        <Button
          variant="light"
          radius="md"
          onClick={() => onSelectRoom(id)}
          disabled={!disponible}
        >
          Voir plus
        </Button>
      </Group>
    </Card>
  );
}

/**
 * SearchPage Component
 * Provides a search interface for rooms/properties and displays results.
 */
export default function SearchPage() {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const { user } = useAuth(); // Access user context for authentication check

  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // New state to track initial load

  // Filter states, initialized to null for controlled inputs
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState(null);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [minCapacite, setMinCapacite] = useState(null);
  const [minTailleM2, setMinTailleM2] = useState(null);

  /**
   * Fetches search results from the API based on current filters.
   */
  const fetchSearchResults = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const params = {
        skip: 0,
        limit: 100,
      };

      // Conditionally add parameters if they have valid values
      if (searchText) {
        params.search_query = searchText;
      }
      if (selectedType) {
        params.type_chambre = selectedType;
      }

      // Ensure numeric parameters are valid numbers before adding to the request
      if (isNumber(minPrice) && minPrice >= 0) {
        params.prix_min = minPrice;
      }
      if (isNumber(maxPrice) && maxPrice >= 0) {
        params.prix_max = maxPrice;
      }
      if (isNumber(minCapacite) && minCapacite >= 1) {
        params.capacite_min = minCapacite;
      }
      if (isNumber(minTailleM2) && minTailleM2 >= 0) {
        params.taille_min_m2 = minTailleM2;
      }

      const response = await api.get('/recherche/chambres/', { params });

      // Robust validation of the API response data
      if (!Array.isArray(response.data)) {
        console.error('API response is not an array:', response.data);
        throw new Error('Format de données inattendu de l\'API. Attendu: Liste de chambres.');
      }

      // Map and validate each item in the response array
      const validatedResults = response.data.map(item => {
        // Ensure each item is an object and has at least an 'id'
        if (typeof item !== 'object' || item === null || !item.id) {
          console.warn('Skipping malformed item from API response:', item);
          return null; // Return null for malformed items, will be filtered out
        }
        return {
          id: item.id,
          adresse: item.adresse || 'Adresse non spécifiée',
          prix: item.prix !== undefined ? item.prix : 0,
          description: item.description || '',
          details: {
            titre: item.details?.titre || 'Titre non disponible', // Use optional chaining for safety
            media: item.details?.media || '',
            disponible: item.details?.disponible ?? false, // Use nullish coalescing for boolean
            capacite: item.details?.capacite !== undefined ? item.details.capacite : 'N/A',
            salle_de_bain: item.details?.salle_de_bain ?? false,
            taille: item.details?.taille !== undefined ? item.details.taille : 'N/A',
            ville: item.details?.ville || 'Ville non spécifiée',
            superficie: item.details?.superficie,
            type: item.details?.type,
            meublee: item.details?.meublee,
            maison_id: item.details?.maison_id
          },
          // Spread any other properties from the item that might be useful
          ...item
        };
      }).filter(item => item !== null); // Filter out any nulls from malformed items

      setSearchResults(validatedResults);
    } catch (err) {
      console.error("Failed to fetch search results:", err);
      // Construct a user-friendly error message
      let displayMessage = "Impossible de charger les résultats de recherche. Veuillez réessayer.";
      if (err.response) {
        // Specific API error
        if (err.response.status === 422) {
            displayMessage = "Erreur de validation des filtres. Veuillez vérifier les valeurs entrées pour le prix, capacité, ou taille.";
            if (err.response.data && err.response.data.detail) {
                // FastAPI provides validation errors in err.response.data.detail, which can be an array of errors
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
        } else if (err.response.status === 404) {
          displayMessage = "Aucune chambre trouvée pour vos critères de recherche.";
        } else {
          displayMessage = `Erreur du serveur (${err.response.status}).`;
        }
      } else if (err.request) {
        // Network error
        displayMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion internet.";
      } else {
        // Frontend or other error
        displayMessage = `Une erreur inattendue s'est produite: ${err.message}`;
      }
      setError(displayMessage);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true); // Mark initial load as complete
    }
  }, [searchText, selectedType, minPrice, maxPrice, minCapacite, minTailleM2]);

  // Effect hook to trigger search when filters change
  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]); // Dependency array ensures it runs when filters or the function itself change

  /**
   * Handles selecting a room, checking user authentication before navigating.
   * @param {string} roomId - The ID of the selected room.
   */
  const handleSelectRoom = (roomId) => {
    if (!user) {
      notifications.show({
        title: 'Authentification requise',
        message: 'Vous devez être connecté pour prendre rendez-vous ou réserver une chambre.',
        color: 'blue',
        icon: <IconAlertCircle size={18} />,
        autoClose: 5000,
      });
      // Redirect to login page with a redirect parameter
      navigate(`/login?redirect=/chambres/${roomId}/reserver`);
    } else {
      // Redirect directly to the reservation page
      navigate(`/chambres/${roomId}/reserver`);
    }
  };

  return (
    <Container
      size="xl"
      style={{
        background: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
        padding: '2rem',
        minHeight: '100vh',
        borderRadius: theme.radius.md
      }}
    >
      <Stack spacing="xl">
        <Title order={2} ta="center">
          <IconSearch size={28} style={{ marginRight: 10, verticalAlign: 'middle' }} />
          Rechercher des Chambres
        </Title>

        {/* Search Filters Section */}
        <Paper
          shadow="sm"
          radius="md"
          p="md"
          style={{
            background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
            border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}`
          }}
        >
          <Stack spacing="md">
            <Input
              placeholder="Rechercher par titre, description, adresse ou ville..."
              value={searchText}
              onChange={(event) => setSearchText(event.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              radius="md"
              aria-label="Search by text"
            />
            <Group grow>
              <Select
                data={ROOM_TYPES_OPTIONS}
                placeholder="Type de chambre"
                value={selectedType}
                onChange={setSelectedType}
                clearable
                radius="md"
                aria-label="Select room type"
              />
              <NumberInput
                placeholder="Prix Min (FCFA)"
                value={minPrice}
                onChange={setMinPrice}
                min={0}
                leftSection={<IconCurrencyDollar size={16} />}
                radius="md"
                aria-label="Minimum price"
              />
              <NumberInput
                placeholder="Prix Max (FCFA)"
                value={maxPrice}
                onChange={setMaxPrice}
                min={minPrice || 0} // Min value depends on minPrice
                leftSection={<IconCurrencyDollar size={16} />}
                radius="md"
                aria-label="Maximum price"
              />
            </Group>
            <Group grow>
              <NumberInput
                placeholder="Capacité Min"
                value={minCapacite}
                onChange={setMinCapacite}
                min={1}
                leftSection={<IconBed size={16} />}
                radius="md"
                aria-label="Minimum capacity"
              />
              <NumberInput
                placeholder="Taille Min (m²)"
                value={minTailleM2}
                onChange={setMinTailleM2}
                min={0}
                leftSection={<IconRuler size={16} />}
                radius="md"
                aria-label="Minimum size in square meters"
              />
            </Group>
          </Stack>
        </Paper>

        {/* Conditional rendering for loading, error, and results */}
        {error && (
          <Alert color="red" icon={<IconAlertCircle size={18} />} variant="light" radius="md">
            {error}
          </Alert>
        )}

        {loading && !initialLoadComplete ? ( // Show loader on initial load OR subsequent loads
          <Center h={200}>
            <Loader size="lg" />
            <Text ml="md">Chargement des chambres...</Text>
          </Center>
        ) : searchResults.length === 0 && initialLoadComplete && !loading ? ( // Show "no results" only after initial load and no loading
          <Center h={200}>
            <Alert
              color="blue"
              variant="light"
              title="Aucun résultat trouvé"
              icon={<IconAlertCircle size={20} />}
              p="lg"
              style={{ textAlign: 'center' }}
            >
              Votre recherche n'a retourné aucune chambre. Essayez d'ajuster vos filtres.
            </Alert>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {searchResults.map((result) => (
              <PropertyCard key={result.id} result={result} onSelectRoom={handleSelectRoom} />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}