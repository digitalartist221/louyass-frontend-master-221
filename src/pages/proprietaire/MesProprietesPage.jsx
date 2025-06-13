import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  TextInput,
  NumberInput,
  Textarea,
  Group,
  Text,
  ActionIcon,
  Alert,
  Container,
  Stack,
  Divider,
  LoadingOverlay,
  Title,
  Center,
  Paper,
  Select,
  useMantineTheme
} from '@mantine/core';
import { useForm } from '@mantine/form'; // Import useForm
import {
  IconEdit,
  IconCheck,
  IconTrash,
  IconAlertTriangle,
  IconPlus,
  IconInfoCircle,
  IconBuilding,
  IconMapPin,
  IconHome,
} from '@tabler/icons-react';

import api from '../../api/axios'; // Votre instance Axios
import { useAuth } from '../../auth/AuthContext'; // Votre contexte d'authentification

const VILLES = [
  'Abidjan',
  'Yamoussoukro',
  'Bouaké',
  'Daloa',
  'San-Pédro',
  'Korhogo',
  'Man',
  'Gagnoa'
];

export default function MesProprietesPage() {
  const theme = useMantineTheme();
  const { user } = useAuth(); // Récupérer l'utilisateur depuis le contexte d'authentification

  const [opened, setOpened] = useState(false); // État pour la modale d'ajout/édition
  const [deleteOpened, setDeleteOpened] = useState(false); // État pour la modale de suppression
  const [currentHouse, setCurrentHouse] = useState(null); // Maison actuellement sélectionnée pour édition ou suppression
  const [loading, setLoading] = useState(false); // État de chargement pour les opérations API (submit/delete)
  const [isFetching, setIsFetching] = useState(true); // État de chargement pour la récupération initiale des maisons
  const [globalError, setGlobalError] = useState(null); // Message d'erreur global
  const [successMessage, setSuccessMessage] = useState(null); // Message de succès global
  const [houses, setHouses] = useState([]); // Liste des maisons

  // Initialisation du formulaire avec Mantine useForm
  const form = useForm({
    initialValues: {
      nom: '',
      adresse: '',
      ville: '',
      superficie: '',
      description: '',
      latitude: '',
      longitude: '',
      // L'ID du propriétaire est déjà géré ici, il n'est donc pas nécessaire de le définir via setFieldValue dans useEffect.
      proprietaire_id: user?.id || null, 
    },
    validate: {
      nom: (value) => (value ? null : 'Le nom de la propriété est requis'),
      adresse: (value) => (value ? null : 'L\'adresse est requise'),
      ville: (value) => (value ? null : 'La ville est requise'),
      superficie: (value) => (value >= 10 ? null : 'La superficie minimale est de 10 m²'),
      // Validation pour latitude et longitude si elles sont considérées comme requises côté client
      latitude: (value) => (value === '' || (typeof value === 'number' && value >= -90 && value <= 90) ? null : 'Latitude invalide (-90 à 90)'),
      longitude: (value) => (value === '' || (typeof value === 'number' && value >= -180 && value <= 180) ? null : 'Longitude invalide (-180 à 180)'),
    },
  });

  // Fonction utilitaire pour réinitialiser le formulaire et fermer la modale
  const resetFormAndCloseModal = () => {
    form.reset();
    setCurrentHouse(null);
    setOpened(false);
    setGlobalError(null); // Efface les erreurs globales de la modale
  };

  // --- Récupération des Maisons ---
  const fetchHouses = useCallback(async () => {
    setIsFetching(true); // Active le spinner au début de la récupération des données
    setGlobalError(null);
    try {
      if (!user?.id) {
        setHouses([]);
        setIsFetching(false); // Arrête le spinner si pas d'utilisateur authentifié
        return;
      }

      const response = await api.get('/maisons');
      // Filtrer les maisons côté client car l'API GET /maisons ne prend pas de paramètre proprietaire_id
      const userHouses = response.data.filter(house => house.proprietaire_id === user.id);
      setHouses(userHouses);
    } catch (error) {
      console.error('Erreur lors du chargement des maisons:', error);
      const errorMessage = error.response?.data?.detail || error.message || "Erreur lors du chargement des maisons";
      setGlobalError(errorMessage);
      setHouses([]);
    } finally {
      // Le spinner (LoadingOverlay) est désactivé ici, que la requête GET réussisse ou échoue.
      // Cela assure qu'il s'arrête dès que les données sont reçues (ou que l'opération est terminée).
      setIsFetching(false); 
    }
  }, [user]); // Dépend de l'objet user. La fonction ne sera recréée que si 'user' change.

  // Effet pour récupérer les maisons lorsque l'objet utilisateur est disponible (après la connexion)
  // Cet effet ne se déclenche qu'une seule fois à l'initialisation du composant ou si 'user' change.
  // La ligne problématique `form.setFieldValue` a été retirée.
  useEffect(() => {
    if (user?.id) {
      fetchHouses(); // Déclenche la récupération des maisons
    } else {
      // Si l'utilisateur se déconnecte ou n'est pas disponible, vider les maisons et arrêter le chargement
      setHouses([]);
      setIsFetching(false);
      setGlobalError("Connectez-vous pour voir et gérer vos propriétés.");
    }
  }, [user, fetchHouses]); // 'form' n'est plus une dépendance explicite ici car setFieldValue a été retiré.

  // --- Gérer la soumission (Création/Modification) ---
  const handleSubmit = async (values) => {
    if (!user?.id) {
      setGlobalError("Utilisateur non authentifié. Impossible d'enregistrer la propriété.");
      return;
    }

    setLoading(true); // Active le spinner pour les opérations de soumission/modification
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      // Payload à envoyer au backend
      // ATTENTION: Les champs 'nom', 'ville', 'superficie' ne sont PAS dans votre schéma Pydantic 'MaisonBase/MaisonCreate' actuel.
      // Pour que le backend les accepte, vous DEVEZ modifier votre schéma Pydantic.
      // J'ai inclus 'latitude' et 'longitude' qui sont dans votre schéma MaisonBase.
      const payload = {
        nom: values.nom,
        adresse: values.adresse,
        ville: values.ville,
        superficie: values.superficie,
        description: values.description || null,
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
        proprietaire_id: user.id // Toujours utiliser l'ID de l'utilisateur authentifié
      };

      // Si vous voulez que 'nom', 'ville', 'superficie' soient envoyés et traités par le backend,
      // votre 'MaisonBase' dans schemas.py DOIT ressembler à ceci (exemple):
      /*
      class MaisonBase(BaseModel):
          nom: str # Nouveau champ
          adresse: str
          ville: str # Nouveau champ
          superficie: float # Nouveau champ
          latitude: Optional[float] = None
          longitude: Optional[float] = None
          description: Optional[str] = None
      */
      
      let response;
      if (currentHouse) {
        response = await api.put(`/maisons/${currentHouse.id}`, payload);
        setSuccessMessage('Propriété mise à jour avec succès!');
      } else {
        response = await api.post('/maisons', payload);
        setSuccessMessage('Propriété créée avec succès!');
      }

      await fetchHouses(); // Rafraîchit la liste des propriétés après l'opération (déclenchement manuel)
      resetFormAndCloseModal(); // Réinitialise le formulaire et ferme la modale
    } catch (error) {
      console.error('Erreur lors de la soumission de la maison:', error);
      const errorMessage = error.response?.data?.detail || error.message || "Erreur lors de l'enregistrement de la propriété";
      setGlobalError(errorMessage);
    } finally {
      setLoading(false); // Désactive le spinner une fois l'opération de soumission terminée
    }
  };

  // --- Gérer l'opération de suppression ---
  const handleDelete = async () => {
    if (!currentHouse) return;

    if (!user || !user.id) {
      setGlobalError("Utilisateur non authentifié. Impossible de supprimer la propriété.");
      return;
    }

    setLoading(true); // Active le spinner pour l'opération de suppression
    setGlobalError(null); // Efface les erreurs précédentes pour la suppression

    try {
      await api.delete(`/maisons/${currentHouse.id}`);
      setSuccessMessage('Propriété supprimée avec succès!');
      await fetchHouses(); // Rafraîchit la liste après la suppression (déclenchement manuel)
      setDeleteOpened(false); // Ferme la modale de confirmation de suppression
      setCurrentHouse(null); // Efface la maison actuelle
    } catch (err) {
      const errorMsg = err.response?.data?.detail
        || err.message
        || "Erreur lors de la suppression de la propriété.";
      setGlobalError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir la modale d'édition et pré-remplir le formulaire avec les données de la maison
  const openEditModal = (house) => {
    setCurrentHouse(house);
    form.setValues({
      nom: house.nom || '', // Utilisez house.nom si disponible, sinon vide
      adresse: house.adresse,
      ville: house.ville || '', // Utilisez house.ville si disponible, sinon vide
      superficie: house.superficie || '', // Utilisez house.superficie si disponible, sinon vide
      description: house.description || '',
      latitude: house.latitude || '',
      longitude: house.longitude || '',
      proprietaire_id: house.proprietaire_id,
    });
    setOpened(true);
  };

  return (
    <Container size="xl" style={{ background: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0], padding: '2rem', minHeight: '100vh', borderRadius: theme.radius.md }}>
      {/* Montre le loader si la récupération initiale est en cours (isFetching est vrai) ET qu'aucune autre opération (loading) n'est active. */}
      {/* Cela permet au loader de s'afficher lors du chargement initial des données de la table. */}
      <LoadingOverlay visible={isFetching && !loading} overlayBlur={2} /> 
      <Stack spacing="xl">
        <Group justify="space-between" align="center">
          <Title order={2}>
            <IconBuilding size={28} style={{ marginRight: 10, verticalAlign: 'middle' }} />
            Gestion des propriétés
          </Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              resetFormAndCloseModal(); // Utilisez la fonction de réinitialisation complète
              setOpened(true);
            }}
          >
            Ajouter une propriété
          </Button>
        </Group>

        {successMessage && (
          <Alert
            color="green"
            withCloseButton
            onClose={() => setSuccessMessage(null)}
            icon={<IconCheck size={18} />}
            variant="light"
            radius="md"
          >
            {successMessage}
          </Alert>
        )}

        {globalError && (
          <Alert
            color="red"
            withCloseButton
            onClose={() => setGlobalError(null)}
            icon={<IconAlertTriangle size={18} />}
            variant="light"
            radius="md"
          >
            {globalError}
          </Alert>
        )}

        <Paper shadow="sm" radius="md" p="md" style={{ background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0], border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}` }}>
          {houses.length === 0 ? (
            <Center h={200}>
              <Alert
                color="blue"
                variant="light"
                title="Aucune propriété enregistrée"
                icon={<IconInfoCircle size={20} />}
                p="lg"
                style={{ textAlign: 'center' }}
              >
                Cliquez sur "Ajouter une propriété" pour commencer.
              </Alert>
            </Center>
          ) : (
            <Table verticalSpacing="md" highlightOnHover>
              <thead>
                <tr>
                  <th>Propriété</th>
                  <th>Adresse</th>
                  <th>Ville</th>
                  <th>Superficie</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {houses.map((house) => (
                  <tr key={house.id}>
                    <td>
                      <Group noWrap>
                        {/* Afficher nom si disponible, sinon adresse */}
                        <Text fw={500}>{house.nom || house.adresse}</Text>
                        {house.description && (
                          <Text size="xs" color="dimmed" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {house.description}
                          </Text>
                        )}
                      </Group>
                    </td>
                    <td><Text>{house.adresse}</Text></td>
                    {/* Afficher ville et superficie seulement si elles existent dans les données */}
                    <td><Text>{house.ville || 'N/A'}</Text></td>
                    <td><Text>{house.superficie ? `${house.superficie} m²` : 'N/A'}</Text></td>
                    <td>
                      <Group spacing="xs">
                        <ActionIcon
                          color="blue"
                          onClick={() => openEditModal(house)}
                          variant="subtle"
                          size="md"
                          title="Modifier"
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          onClick={() => { setCurrentHouse(house); setDeleteOpened(true); }}
                          variant="subtle"
                          size="md"
                          title="Supprimer"
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Paper>
      </Stack>

      {/* --- Create/Edit Modal --- */}
      <Modal
        opened={opened}
        onClose={resetFormAndCloseModal}
        title={
          <Title order={3}>
            {currentHouse ? 'Modifier la propriété' : 'Ajouter une nouvelle propriété'}
          </Title>
        }
        size="lg"
        centered
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        radius="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack spacing="md">
            <TextInput
              label="Nom de la propriété"
              placeholder="Ex: Villa les palmiers"
              leftSection={<IconHome size={16} />}
              withAsterisk
              radius="md"
              {...form.getInputProps('nom')}
            />

            <TextInput
              label="Adresse complète"
              placeholder="Ex: Cocody, Rue des Jardins"
              leftSection={<IconMapPin size={16} />}
              withAsterisk
              radius="md"
              {...form.getInputProps('adresse')}
            />

            <Select
              label="Ville"
              placeholder="Sélectionnez une ville"
              leftSection={<IconMapPin size={16} />}
              withAsterisk
              data={VILLES}
              radius="md"
              searchable
              {...form.getInputProps('ville')}
            />

            <NumberInput
              label="Superficie (m²)"
              placeholder="Ex: 120"
              min={10}
              max={1000}
              withAsterisk
              radius="md"
              {...form.getInputProps('superficie')}
            />

            <Group grow>
                <NumberInput
                    label="Latitude (optionnel)"
                    placeholder="Ex: 5.3186"
                    leftSection={<IconMapPin size={16} />}
                    radius="md"
                    {...form.getInputProps('latitude')}
                />
                <NumberInput
                    label="Longitude (optionnel)"
                    placeholder="Ex: -4.0321"
                    leftSection={<IconMapPin size={16} />}
                    radius="md"
                    {...form.getInputProps('longitude')}
                />
            </Group>


            <Textarea
              label="Description (optionnel)"
              placeholder="Décrivez votre propriété en quelques mots..."
              minRows={3}
              radius="md"
              {...form.getInputProps('description')}
            />

            {globalError && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                {globalError}
              </Alert>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={resetFormAndCloseModal}
                disabled={loading}
                radius="md"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                loading={loading}
                radius="md"
              >
                {currentHouse ? 'Enregistrer les modifications' : 'Créer la propriété'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* --- Delete Confirmation Modal --- */}
      <Modal
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        title={
          <Title order={3} style={{ color: theme.colorScheme === 'dark' ? theme.colors.gray[3] : theme.colors.gray[9] }}>
            Confirmation de suppression
          </Title>
        }
        centered
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        radius="md"
      >
        <Text size="sm" mb="xl" style={{ color: theme.colorScheme === 'dark' ? theme.colors.gray[3] : theme.colors.gray[9] }}>
          Êtes-vous sûr de vouloir supprimer la propriété "<Text span fw={700} style={{ color: theme.colorScheme === 'dark' ? theme.colors.red[4] : theme.colors.red[6] }}>{currentHouse?.nom || currentHouse?.adresse}</Text>" ?
          Cette action est irréversible.
        </Text>

        {globalError && (
          <Alert color="red" mb="md" icon={<IconAlertTriangle size={16} />}>
            {globalError}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button
            variant="outline"
            onClick={() => setDeleteOpened(false)}
            disabled={loading}
            radius="md"
            style={{ borderColor: theme.colorScheme === 'dark' ? theme.colors.blue[4] : theme.colors.blue[6], color: theme.colorScheme === 'dark' ? theme.colors.gray[3] : theme.colors.gray[9] }}
          >
            Annuler
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            loading={loading}
            radius="md"
          >
            Confirmer la suppression
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
