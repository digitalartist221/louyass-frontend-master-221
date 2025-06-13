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
  LoadingOverlay,
  Title,
  Center,
  Paper,
  Select,
  Switch, // Pour les booléens (meublee, salle_de_bain, disponible)
  MultiSelect, // Pour les caractéristiques
  Image, // Pour afficher les images des médias
  useMantineTheme
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'; // Import du Dropzone
import { notifications } from '@mantine/notifications'; // Pour les notifications
import {
  IconEdit,
  IconCheck,
  IconTrash,
  IconAlertTriangle,
  IconPlus,
  IconInfoCircle,
  IconBed, // Icône pour la chambre
  IconBuilding, // Pour la relation avec la maison
  IconBath, // Pour la salle de bain
  IconCurrencyDollar, // Pour le prix
  IconDimensions, // Pour la taille (superficie)
  IconUsers, // Pour la capacité
  IconListDetails, // Pour les caractéristiques
  IconCategory, // Pour le type de chambre
  IconUpload, // Pour le Dropzone
  IconPhoto, // Pour le Dropzone
  IconX // Pour les erreurs de Dropzone
} from '@tabler/icons-react';

import api from '../../api/axios'; // Votre instance Axios
import { useAuth } from '../../auth/AuthContext'; // Votre contexte d'authentification

// Options pour le champ 'type' des chambres
const ROOM_TYPES = [
  { value: 'simple', label: 'Chambre simple' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison complète' },
];

export default function MesChambresPage() {
  const theme = useMantineTheme();
  const { user } = useAuth(); // Récupérer l'utilisateur depuis le contexte d'authentification

  const [opened, setOpened] = useState(false); // État pour la modale d'ajout/édition
  const [deleteOpened, setDeleteOpened] = useState(false); // État pour la modale de suppression
  const [currentRoom, setCurrentRoom] = useState(null); // Chambre actuellement sélectionnée pour édition ou suppression
  const [loading, setLoading] = useState(false); // État de chargement pour les opérations API (submit/delete)
  const [isFetching, setIsFetching] = useState(true); // État de chargement pour la récupération initiale des chambres
  const [globalError, setGlobalError] = useState(null); // Message d'erreur global
  const [successMessage, setSuccessMessage] = useState(null); // Message de succès global
  const [rooms, setRooms] = useState([]); // Liste des chambres
  const [userHouses, setUserHouses] = useState([]); // Pour stocker les maisons appartenant à l'utilisateur, utilisées pour le Select

  // États pour la gestion des médias
  const [uploadedFiles, setUploadedFiles] = useState([]); // Fichiers sélectionnés dans le Dropzone (avant upload)
  const [roomMedias, setRoomMedias] = useState([]); // Médias déjà associés à la chambre (après upload)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false); // État de chargement pour l'upload de médias
  const [mediaUploadError, setMediaUploadError] = useState(null); // Erreur spécifique à l'upload de médias


  // Initialisation du formulaire avec Mantine useForm pour une chambre
  const form = useForm({
    initialValues: {
      maison_id: null,
      titre: '',
      description: '',
      taille: '',
      type: 'simple', // Valeur par défaut
      meublee: false,
      prix: '',
      disponible: true, // Disponible par défaut
      capacite: 1, // Capacité par défaut
      salle_de_bain: false,
    },
    validate: {
      maison_id: (value) => (value ? null : 'La maison est requise'),
      titre: (value) => (value ? null : 'Le titre est requis'),
      type: (value) => (value ? null : 'Le type de chambre est requis'),
      prix: (value) => (value > 0 ? null : 'Le prix doit être positif'),
    },
  });

  // Fonction utilitaire pour réinitialiser le formulaire et fermer la modale
  const resetFormAndCloseModal = () => {
    form.reset();
    setCurrentRoom(null);
    setOpened(false);
    setGlobalError(null); // Efface les erreurs globales de la modale
    setUploadedFiles([]); // Réinitialise les fichiers du Dropzone
    setRoomMedias([]); // Réinitialise les médias de la chambre
    setMediaUploadError(null); // Efface les erreurs d'upload média
  };

  // --- Récupération des Chambres (filtrées par maisons de l'utilisateur) ---
  const fetchRooms = useCallback(async () => {
    setIsFetching(true); // Active le spinner au début de la récupération des données
    setGlobalError(null);
    try {
      if (!user?.id) {
        setRooms([]);
        setUserHouses([]); // S'assurer que les maisons sont aussi vides
        setIsFetching(false); // Arrête le spinner si pas d'utilisateur authentifié
        return;
      }

      // 1. Récupérer uniquement les maisons de l'utilisateur actuel en utilisant le filtre côté backend
      const housesResponse = await api.get(`/maisons?proprietaire_id=${user.id}`);
      const currentUserHouses = housesResponse.data; // Les maisons sont déjà filtrées par le backend
      setUserHouses(currentUserHouses); // Mettre à jour l'état pour le Select des maisons

      // 2. Récupérer les chambres de l'utilisateur. Le backend va maintenant filtrer par propriétaire.
      const roomsResponse = await api.get('/chambres'); // Cet endpoint renverra maintenant uniquement les chambres des maisons de l'utilisateur connecté.
      setRooms(roomsResponse.data); // Plus besoin de filtrer côté client ici.

    } catch (error) {
      console.error('Erreur lors du chargement des chambres:', error);
      const errorMessage = error.response?.data?.detail || error.message || "Erreur lors du chargement des chambres";
      setGlobalError(errorMessage);
      setRooms([]);
      setUserHouses([]);
    } finally {
      // Le spinner (LoadingOverlay) est désactivé ici, que la requête GET réussisse ou échoue.
      // Cela assure qu'il s'arrête dès que les données sont reçues (ou que l'opération est terminée).
      setIsFetching(false); 
    }
  }, [user]); // Dépend de l'objet user. La fonction ne sera recréée que si 'user' change.

  // Effet pour récupérer les chambres lorsque l'objet utilisateur est disponible (après la connexion)
  // Cet effet ne se déclenche qu'une seule fois à l'initialisation du composant ou si 'user' change.
  // Il n'y a pas de boucle de rendu ici.
  useEffect(() => {
    if (user?.id) {
      fetchRooms(); // Déclenche la récupération des chambres
    } else {
      // Si l'utilisateur se déconnecte ou n'est pas disponible, vider les maisons et arrêter le chargement
      setRooms([]);
      setUserHouses([]);
      setIsFetching(false);
      setGlobalError("Connectez-vous pour voir et gérer vos chambres.");
    }
  }, [user, fetchRooms]); // 'fetchRooms' est stable grâce à useCallback, donc pas de boucle.

  // --- Récupération des médias pour une chambre spécifique ---
  const fetchRoomMedias = useCallback(async (chambreId) => {
    if (!chambreId) {
      setRoomMedias([]);
      return;
    }
    try {
      // Le backend doit supporter le filtrage par chambre_id pour optimiser cette requête.
      const response = await api.get(`/medias?chambre_id=${chambreId}`);
      setRoomMedias(response.data); // Supprimer le filtrage côté client si le backend le fait
    } catch (error) {
      console.error('Erreur lors du chargement des médias de la chambre:', error);
      notifications.show({
        title: 'Erreur de médias',
        message: 'Impossible de charger les médias de la chambre.',
        color: 'red',
      });
      setRoomMedias([]);
    }
  }, []);

  // --- Gérer la soumission du formulaire (Création/Modification) ---
  const handleSubmit = async (values) => {
    if (!user?.id) {
      setGlobalError("Utilisateur non authentifié. Impossible d'enregistrer la chambre.");
      return;
    }

    setLoading(true); // Active le spinner pour les opérations de soumission/modification
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      // Payload basé sur le schéma ChambreCreate
      const payload = {
        maison_id: parseInt(values.maison_id, 10), // Convertir l'ID de la maison en nombre entier pour le backend
        titre: values.titre,
        description: values.description || null,
        taille: values.taille || null,
        type: values.type,
        meublee: values.meublee,
        prix: parseFloat(values.prix), // Convertir en float
        disponible: values.disponible,
        capacite: values.capacite,
        salle_de_bain: values.salle_de_bain,
      };
      
      let response;
      if (currentRoom) {
        // Mode modification
        response = await api.put(`/chambres/${currentRoom.id}`, payload);
        setSuccessMessage('Chambre mise à jour avec succès!');
      } else {
        // Mode création
        response = await api.post('/chambres', payload);
        setSuccessMessage('Chambre créée avec succès!');
      }

      await fetchRooms(); // Rafraîchir la liste après l'opération (déclenchement manuel)
      resetFormAndCloseModal(); // Réinitialiser le formulaire et fermer la modale
    } catch (error) {
      console.error('Erreur lors de la soumission de la chambre:', error);
      const errorMessage = error.response?.data?.detail || error.message || "Erreur lors de l'enregistrement de la chambre";
      setGlobalError(errorMessage);
    } finally {
      setLoading(false); // Désactive le spinner une fois l'opération de soumission terminée
    }
  };

  // --- Gérer l'opération de suppression de la chambre ---
  const handleDelete = async () => {
    if (!currentRoom) return;

    if (!user || !user.id) {
      setGlobalError("Utilisateur non authentifié. Impossible de supprimer la chambre.");
      return;
    }

    setLoading(true); // Active le spinner pour l'opération de suppression
    setGlobalError(null); // Effacer les erreurs précédentes pour la suppression

    try {
      await api.delete(`/chambres/${currentRoom.id}`);
      setSuccessMessage('Chambre supprimée avec succès!');
      await fetchRooms(); // Rafraîchir la liste après la suppression (déclenchement manuel)
      setDeleteOpened(false); // Fermer la modale de confirmation de suppression
      setCurrentRoom(null); // Effacer la chambre actuelle
    } catch (err) {
      const errorMsg = err.response?.data?.detail
        || err.message
        || "Erreur lors de la suppression de la chambre.";
      setGlobalError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir la modale d'édition et pré-remplir le formulaire avec les données de la chambre
  const openEditModal = (room) => {
    setCurrentRoom(room);
    form.setValues({
      // Convertir l'ID de la maison en chaîne pour le formulaire Mantine Select
      maison_id: String(room.maison_id), 
      titre: room.titre,
      description: room.description || '',
      taille: room.taille || '',
      type: room.type,
      meublee: room.meublee,
      prix: room.prix,
      disponible: room.disponible,
      capacite: room.capacite,
      salle_de_bain: room.salle_de_bain,
    });
    setOpened(true);
    fetchRoomMedias(room.id); // Charger les médias de la chambre sélectionnée
  };

  // Mapper les maisons de l'utilisateur pour le composant Select
  const houseOptions = userHouses.map(house => ({
    value: String(house.id), // Convertir l'ID numérique en chaîne de caractères pour Mantine Select
    label: house.nom || house.adresse // Afficher le nom ou l'adresse de la maison
  }));

  // --- Fonctions de gestion des médias ---

  // Gérer le dépôt de fichiers dans le Dropzone
  const handleDropzoneDrop = (files) => {
    setUploadedFiles(files);
    setMediaUploadError(null); // Réinitialiser les erreurs d'upload
  };

  // Gérer le rejet de fichiers dans le Dropzone
  const handleDropzoneReject = (fileRejections) => {
    const messages = fileRejections.map(({ file, errors }) => 
      `${file.name} : ${errors.map(e => e.message).join(', ')}`
    ).join('\n');
    setMediaUploadError(`Fichiers rejetés: \n${messages}`);
    notifications.show({
      title: 'Fichier(s) rejeté(s)',
      message: `Certains fichiers n'ont pas pu être ajoutés: ${messages}`,
      color: 'red',
    });
  };

  // Uploader les fichiers sélectionnés
  const handleMediaUpload = async () => {
    if (!currentRoom || uploadedFiles.length === 0) {
      notifications.show({
        title: 'Aucun fichier à uploader',
        message: 'Veuillez sélectionner des fichiers avant de lancer l\'upload.',
        color: 'yellow',
      });
      return;
    }

    if (!user?.id) {
        notifications.show({
            title: 'Erreur d\'authentification',
            message: 'Vous devez être connecté pour uploader des médias.',
            color: 'red',
        });
        return;
    }

    setIsUploadingMedia(true);
    setMediaUploadError(null);
    let successCount = 0;

    for (const file of uploadedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      // Votre endpoint FastAPI attend `chambre_id` comme paramètre de requête ou partie du corps form-data
      try {
        await api.post(`/medias?chambre_id=${currentRoom.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        successCount++;
      } catch (error) {
        console.error('Erreur lors de l\'upload du fichier:', file.name, error);
        setMediaUploadError(prev => `${prev ? prev + '\n' : ''}Échec de l'upload pour ${file.name}: ${error.response?.data?.detail || error.message}`);
        notifications.show({
          title: `Échec de l'upload: ${file.name}`,
          message: error.response?.data?.detail || 'Une erreur est survenue.',
          color: 'red',
        });
      }
    }

    setIsUploadingMedia(false);
    setUploadedFiles([]); // Vider les fichiers après l'upload
    await fetchRoomMedias(currentRoom.id); // Recharger les médias de la chambre
    
    if (successCount > 0) {
      notifications.show({
        title: 'Upload terminé!',
        message: `${successCount} fichier(s) uploadé(s) avec succès.`,
        color: 'green',
      });
    }
  };

  // Supprimer un média existant
  const handleMediaDelete = async (mediaId) => {
    if (!user?.id) {
        notifications.show({
            title: 'Erreur d\'authentification',
            message: 'Vous devez être connecté pour supprimer des médias.',
            color: 'red',
        });
        return;
    }

    setIsUploadingMedia(true); // Utiliser le même loader pour les opérations médias
    try {
      await api.delete(`/medias/${mediaId}`);
      notifications.show({
        title: 'Média supprimé!',
        message: 'Le média a été supprimé avec succès.',
        color: 'green',
      });
      await fetchRoomMedias(currentRoom.id); // Recharger les médias de la chambre
    } catch (error) {
      console.error('Erreur lors de la suppression du média:', error);
      notifications.show({
        title: 'Erreur de suppression',
        message: error.response?.data?.detail || 'Impossible de supprimer le média.',
        color: 'red',
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };


  return (
    <Container size="xl" style={{ background: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0], padding: '2rem', minHeight: '100vh', borderRadius: theme.radius.md }}>
      {/* Montre le loader si la récupération initiale est en cours (isFetching est vrai) ET qu'aucune autre opération (loading) n'est active. */}
      {/* Cela permet au loader de s'afficher lors du chargement initial des données de la table. */}
      <LoadingOverlay visible={isFetching && !loading} overlayBlur={2} /> 
      <Stack spacing="xl">
        <Group justify="space-between" align="center">
          <Title order={2}>
            <IconBed size={28} style={{ marginRight: 10, verticalAlign: 'middle' }} />
            Gestion des chambres
          </Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              resetFormAndCloseModal(); // Utilise la fonction de réinitialisation complète
              setOpened(true);
            }}
            disabled={userHouses.length === 0} // Désactiver le bouton si l'utilisateur n'a pas de maisons enregistrées
          >
            Ajouter une chambre
          </Button>
        </Group>

        {/* Message d'avertissement si l'utilisateur n'a pas de maisons */}
        {userHouses.length === 0 && !isFetching && !globalError && (
            <Alert
                color="orange"
                icon={<IconAlertTriangle size={18} />}
                variant="light"
                radius="md"
            >
                Vous devez d'abord ajouter au moins une propriété (maison) pour pouvoir ajouter des chambres.
            </Alert>
        )}

        {/* Alertes de succès et d'erreur */}
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

        {/* Tableau d'affichage des chambres */}
        <Paper shadow="sm" radius="md" p="md" style={{ background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0], border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}` }}>
          {rooms.length === 0 ? (
            <Center h={200}>
              <Alert
                color="blue"
                variant="light"
                title="Aucune chambre enregistrée"
                icon={<IconInfoCircle size={20} />}
                p="lg"
                style={{ textAlign: 'center' }}
              >
                Cliquez sur "Ajouter une chambre" pour commencer à louer vos espaces.
              </Alert>
            </Center>
          ) : (
            <Table verticalSpacing="md" highlightOnHover>
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Maison</th>
                  <th>Type</th>
                  <th>Prix</th>
                  <th>Dispo.</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <Group noWrap>
                        <Text fw={500}>{room.titre}</Text>
                        {room.description && (
                          <Text size="xs" color="dimmed" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {room.description}
                          </Text>
                        )}
                      </Group>
                    </td>
                    <td>
                        {/* Affiche le nom de la maison associée à la chambre. Convertit l'ID de la chambre en chaîne pour la comparaison. */}
                        <Text>{houseOptions.find(h => h.value === String(room.maison_id))?.label || 'N/A'}</Text> 
                    </td>
                    <td><Text>{ROOM_TYPES.find(t => t.value === room.type)?.label || room.type}</Text></td>
                    <td><Text>{room.prix} FCFA</Text></td>
                    <td>
                      <Text color={room.disponible ? 'green' : 'red'}>
                        {room.disponible ? 'Disponible' : 'Non disponible'}
                      </Text>
                    </td>
                    <td>
                      <Group spacing="xs">
                        <ActionIcon
                          color="blue"
                          onClick={() => openEditModal(room)}
                          variant="subtle"
                          size="md"
                          title="Modifier"
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          onClick={() => { setCurrentRoom(room); setDeleteOpened(true); }}
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

      {/* --- Modale de Création/Édition de Chambre --- */}
      <Modal
        opened={opened}
        onClose={resetFormAndCloseModal}
        title={
          <Title order={3}>
            {currentRoom ? 'Modifier la chambre' : 'Ajouter une nouvelle chambre'}
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
        <LoadingOverlay visible={loading || isUploadingMedia} overlayBlur={2} /> {/* Loader pour formulaire et upload média */}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack spacing="md">
            <Select
              label="Maison"
              placeholder="Sélectionnez une maison"
              leftSection={<IconBuilding size={16} />}
              withAsterisk
              data={houseOptions}
              radius="md"
              searchable
              disabled={userHouses.length === 0} 
              {...form.getInputProps('maison_id')}
            />

            <TextInput
              label="Titre de la chambre"
              placeholder="Ex: Chambre lumineuse avec vue sur jardin"
              leftSection={<IconBed size={16} />}
              withAsterisk
              radius="md"
              {...form.getInputProps('titre')}
            />

            <Textarea
              label="Description"
              placeholder="Décrivez votre chambre en quelques mots..."
              minRows={3}
              radius="md"
              {...form.getInputProps('description')}
            />

            <Group grow>
                <TextInput
                    label="Taille (ex: 12m²)"
                    placeholder="Ex: 12m²"
                    leftSection={<IconDimensions size={16} />}
                    radius="md"
                    {...form.getInputProps('taille')}
                />
                <Select
                    label="Type de chambre"
                    placeholder="Sélectionnez un type"
                    leftSection={<IconCategory size={16} />}
                    withAsterisk
                    data={ROOM_TYPES}
                    radius="md"
                    searchable
                    {...form.getInputProps('type')}
                />
            </Group>

            <Group grow>
                <Switch
                    label="Meublée"
                    checked={form.values.meublee}
                    {...form.getInputProps('meublee', { type: 'checkbox' })}
                />
                <Switch
                    label="Salle de bain privée"
                    checked={form.values.salle_de_bain}
                    {...form.getInputProps('salle_de_bain', { type: 'checkbox' })}
                />
                <Switch
                    label="Disponible"
                    checked={form.values.disponible}
                    {...form.getInputProps('disponible', { type: 'checkbox' })}
                />
            </Group>

            <Group grow>
                <NumberInput
                    label="Prix (FCFA)"
                    placeholder="Ex: 50000"
                    min={1000}
                    withAsterisk
                    leftSection={<IconCurrencyDollar size={16} />}
                    radius="md"
                    {...form.getInputProps('prix')}
                />
                <NumberInput
                    label="Capacité (personnes)"
                    placeholder="Ex: 2"
                    min={1}
                    max={10}
                    withAsterisk
                    leftSection={<IconUsers size={16} />}
                    radius="md"
                    {...form.getInputProps('capacite')}
                />
            </Group>


            {/* Section pour l'upload de médias - visible uniquement en mode édition */}
            {currentRoom && (
              <>
                <Title order={4} mt="xl">Ajouter des médias</Title>
                <Dropzone
                  onDrop={handleDropzoneDrop}
                  onReject={handleDropzoneReject}
                  maxSize={5 * 1024 ** 2} // 5MB
                  accept={IMAGE_MIME_TYPE} // Accepte seulement les images
                  multiple // Permet la sélection multiple
                  radius="md"
                >
                  <Group justify="center" gap="md" mih={120} style={{ pointerEvents: 'none' }}>
                    <Dropzone.Accept>
                      <IconUpload size={50} stroke={1.5} color={theme.colors.blue[6]} />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                      <IconX size={50} stroke={1.5} color={theme.colors.red[6]} />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                      <IconPhoto size={50} stroke={1.5} color={theme.colors.dimmed} />
                    </Dropzone.Idle>

                    <div>
                      <Text size="xl" inline>
                        Glissez des images ici ou cliquez pour sélectionner des fichiers
                      </Text>
                      <Text size="sm" color="dimmed" inline mt={7}>
                        Les images ne doivent pas dépasser 5 Mo
                      </Text>
                    </div>
                  </Group>
                </Dropzone>

                {uploadedFiles.length > 0 && (
                  <Stack mt="md">
                    <Text size="sm" fw={500}>Fichiers sélectionnés ({uploadedFiles.length}) :</Text>
                    <Group>
                      {uploadedFiles.map((file, index) => (
                        <Text key={index} size="sm">{file.name}</Text>
                      ))}
                    </Group>
                    <Button
                      onClick={handleMediaUpload}
                      loading={isUploadingMedia}
                      disabled={uploadedFiles.length === 0}
                      leftSection={<IconUpload size={16} />}
                      radius="md"
                    >
                      Uploader les images
                    </Button>
                  </Stack>
                )}

                {mediaUploadError && (
                  <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                    {mediaUploadError}
                  </Alert>
                )}

                {/* Affichage des médias existants */}
                {roomMedias.length > 0 && (
                  <Stack mt="xl">
                    <Title order={4}>Médias existants ({roomMedias.length})</Title>
                    <Group>
                      {roomMedias.map(media => (
                        <Paper
                          key={media.id}
                          shadow="xs"
                          radius="md"
                          p="xs"
                          withBorder
                          style={{ position: 'relative' }}
                        >
                          <Image
                            src={`http://localhost:8000/${media.url}`} // Assurez-vous que l'URL est correcte pour votre backend
                            alt={media.description || `Média ${media.id}`}
                            width={120}
                            height={120}
                            fit="cover"
                            radius="sm"
                          />
                          <ActionIcon
                            color="red"
                            variant="filled"
                            size="sm"
                            style={{ position: 'absolute', top: 5, right: 5 }}
                            onClick={() => handleMediaDelete(media.id)}
                            title="Supprimer le média"
                            loading={isUploadingMedia} // Utilise le même loader
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Paper>
                      ))}
                    </Group>
                  </Stack>
                )}
              </>
            )}

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
                {currentRoom ? 'Enregistrer les modifications' : 'Créer la chambre'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* --- Modale de Confirmation de Suppression --- */}
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
          Êtes-vous sûr de vouloir supprimer la chambre "<Text span fw={700} style={{ color: theme.colorScheme === 'dark' ? theme.colors.red[4] : theme.colors.red[6] }}>{currentRoom?.titre}</Text>" ?
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
