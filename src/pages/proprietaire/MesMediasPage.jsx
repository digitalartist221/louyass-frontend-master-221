import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Modal,
  TextInput,
  Textarea,
  Group,
  Text,
  ActionIcon,
  Alert,
  Container,
  Stack,
  Divider,
  Badge,
  Select,
  LoadingOverlay,
  Title,
  Center,
  Paper,
  Image,
  Card,
  SimpleGrid,
  Tooltip, // Added for the button tooltip
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
  IconEdit,
  IconTrash,
  IconAlertTriangle,
  IconPlus,
  IconInfoCircle,
  IconPhoto,
  IconVideo,
  IconUpload,
  IconX,
  IconCamera,
  IconBuilding,
  IconHome, // Assuming you might navigate to properties
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext'; // Correct path to AuthContext

const colorPalette = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  textPrimary: '#343A40',
  textSecondary: '#6C757D',
  primary: '#007bff',
  primaryLight: '#CCE5FF',
  secondary: '#6C757D',
  accent: '#17A2B8',
  danger: '#DC3545',
  border: '#DEE2E6',
};

const MEDIA_TYPE_OPTIONS = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Vidéo' },
];

export default function MesMediasPage() {
  const navigate = useNavigate();
  const [medias, setMedias] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [opened, setOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [isFetching, setIsFetching] = useState(true);

  const { user, isAuthenticated } = useAuth(); // Use full auth state

  const form = useForm({
    initialValues: {
      chambre_id: null,
      url: '',
      type: '',
      description: '',
      files: [], // For Dropzone uploads
    },
    validate: {
      chambre_id: (value) => (value ? null : 'Veuillez sélectionner une chambre'),
      url: (value, values) => {
        // URL is required if no files are selected AND we are in creation mode (not editing)
        if (!currentMedia && (!values.files || values.files.length === 0)) {
          if (!value) return "L'URL du média est requise si aucun fichier n'est uploadé";
          if (value && !/^https?:\/\/.+\..+/.test(value)) return "L'URL n'est pas valide";
        }
        return null;
      },
      type: (value, values) => {
        // Type is required if no files are provided (manual URL creation/edit)
        // If files are provided, the type is inferred or handled by the upload logic.
        if ((!values.files || values.files.length === 0) && !value) {
          return 'Le type de média est requis';
        }
        return null;
      },
      files: (value, values) => {
        // Files are required only if we are in creation mode AND no URL is provided
        if (!currentMedia && (!values.url || values.url.trim() === '') && (!value || value.length === 0)) {
          return "Veuillez sélectionner au moins un fichier ou fournir une URL.";
        }
        return null;
      }
    }
  });

  // --- API Calls (using useCallback for memoization) ---

  const fetchChambres = useCallback(async () => {
    setGlobalError(null);
    try {
      if (!isAuthenticated) {
        setChambres([]);
        return;
      }
      const response = await api.get('/chambres');
      // Assuming chambre objects have a proprietaire_id or can be linked via house_id -> proprietaire_id
      // For simplicity, let's assume we filter by a property ID associated with the user.
      // A more robust solution might involve fetching houses first, then chambers for those houses.
      // For now, let's just get all chambers and let the server handle ownership for medias.
      // Or, if chambres also have a proprietaire_id:
      // const userChambres = response.data.filter(chambre => chambre.proprietaire_id === user.id);
      setChambres(response.data.map(chambre => ({
        value: String(chambre.id),
        label: `${chambre.titre} (ID: ${chambre.id}) - Propriété: ${chambre.maison_id}`
      })));
      return response.data.map(chambre => chambre.id); // Return chamber IDs for media filtering
    } catch (err) {
      setGlobalError(err.response?.data?.detail || "Erreur lors du chargement des chambres disponibles.");
      setChambres([]);
      return [];
    }
  }, [isAuthenticated]);

  const fetchMedias = useCallback(async (userChamberIds) => {
    setIsFetching(true);
    setGlobalError(null);
    try {
      if (!isAuthenticated || !userChamberIds || userChamberIds.length === 0) {
        setMedias([]);
        setIsFetching(false);
        return;
      }
      const response = await api.get('/medias');
      // Filter medias to only show those belonging to the user's chambers
      const userMedias = response.data.filter(media => userChamberIds.includes(media.chambre_id));
      setMedias(userMedias);
    } catch (err) {
      setGlobalError(err.response?.data?.detail || "Erreur lors du chargement des médias. Veuillez réessayer.");
      setMedias([]);
    } finally {
      setIsFetching(false);
    }
  }, [isAuthenticated]);

  // Orchestration of data fetching
  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated) {
        const chamberIds = await fetchChambres();
        if (chamberIds.length > 0) {
          await fetchMedias(chamberIds);
        } else {
          // No chambers, so no media to fetch
          setMedias([]);
          setIsFetching(false);
        }
      } else {
        setChambres([]);
        setMedias([]);
        setIsFetching(false);
        setGlobalError("Connectez-vous pour gérer vos médias.");
      }
    };
    loadData();
  }, [isAuthenticated, fetchChambres, fetchMedias]); // Depend on user and memoized fetch functions

  const resetForm = () => {
    form.reset();
    setCurrentMedia(null);
    setOpened(false);
    setGlobalError(null);
  };

  const handleSubmit = async (values) => {
    if (!isAuthenticated) {
      setGlobalError("Utilisateur non authentifié. Impossible de soumettre le média.");
      return;
    }

    setLoading(true);
    setGlobalError(null);

    try {
      if (currentMedia) {
        // Update existing media (chambre_id, url, type, description are modifiable for existing)
        const mediaData = {
          chambre_id: Number(values.chambre_id),
          url: values.url,
          type: values.type,
          description: values.description,
        };
        await api.put(`/medias/${currentMedia.id}`, mediaData);
      } else {
        // Create new media - handle file uploads or manual URL entry
        if (values.files && values.files.length > 0) {
          for (const file of values.files) {
            const formData = new FormData();
            formData.append("file", file); // Matches FastAPI's `file: UploadFile = File(...)`
            formData.append("chambre_id", values.chambre_id); // Matches FastAPI's `chambre_id: int = Form(...)`
            
            // Infer type from file if not explicitly set (e.g., if only one file was dropped and it auto-assigned)
            let inferredType = '';
            if (file.type.startsWith('image/')) inferredType = 'photo';
            else if (file.type.startsWith('video/')) inferredType = 'video';

            formData.append("type", inferredType || values.type); // Use inferred type, or manual type if specified

            if (values.description) {
              formData.append("description", values.description); // Matches FastAPI's `description: Optional[str] = Form(None)`
            }

            await api.post('/medias/upload-file/', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
          }
        } else if (values.url && values.type) {
          // If URL is provided manually (and no files were selected)
          const mediaData = {
            chambre_id: Number(values.chambre_id),
            url: values.url,
            type: values.type,
            description: values.description,
          };
          await api.post('/medias/', mediaData); // Use the general /medias/ endpoint for manual URLs
        } else {
            setGlobalError("Veuillez sélectionner des fichiers ou fournir une URL et un type pour créer un média.");
            setLoading(false);
            return;
        }
      }

      const updatedChamberIds = await fetchChambres(); // Re-fetch chambers to ensure latest list
      await fetchMedias(updatedChamberIds); // Re-fetch medias with potentially updated chamber IDs
      resetForm();
    } catch (err) {
      console.error("API Error:", err); // Log the full error for debugging
      // Correctly handle FastAPI's 422 error details or other errors
      setGlobalError(err.response?.data?.detail || "Une erreur est survenue lors de l'enregistrement du média.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentMedia || !isAuthenticated) return;

    setLoading(true);
    setGlobalError(null);
    try {
      await api.delete(`/medias/${currentMedia.id}`);
      const updatedChamberIds = await fetchChambres(); // Re-fetch chambers
      await fetchMedias(updatedChamberIds); // Re-fetch medias
      setDeleteOpened(false);
      setCurrentMedia(null);
    } catch (err) {
      setGlobalError(err.response?.data?.detail || "Erreur lors de la suppression du média.");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (media) => {
    setCurrentMedia(media);
    form.setValues({
      ...media,
      chambre_id: media.chambre_id ? String(media.chambre_id) : null,
      files: [], // Clear files when editing, as we're modifying an existing URL/data
    });
    setOpened(true);
  };

  // Generate previews for selected files in the Dropzone
  const previewFiles = form.values.files.map((file, index) => {
    const imageUrl = URL.createObjectURL(file);
    return (
      <Paper key={file.name + index} withBorder p="xs" radius="md" style={{ position: 'relative' }}>
        {file.type.startsWith('image/') ? (
          <Image
            src={imageUrl}
            alt={file.name}
            height={80}
            fit="contain"
            radius="sm"
          />
        ) : (
          <Center style={{ height: 80 }}>
            <IconVideo size={40} color={colorPalette.textSecondary} />
          </Center>
        )}
        <Text size="xs" truncate mt="xs">{file.name}</Text>
        <ActionIcon
          size="sm"
          color="red"
          variant="filled"
          style={{ position: 'absolute', top: 5, right: 5 }}
          onClick={() => {
            const updatedFiles = form.values.files.filter((f) => f !== file);
            form.setFieldValue('files', updatedFiles);
            URL.revokeObjectURL(imageUrl); // Clean up temporary URL
            // If all files are removed, reset type
            if (updatedFiles.length === 0) {
              form.setFieldValue('type', '');
            } else if (updatedFiles.length === 1) {
              // Re-infer type if only one file remains
              let inferredType = '';
              if (updatedFiles[0].type.startsWith('image/')) inferredType = 'photo';
              else if (updatedFiles[0].type.startsWith('video/')) inferredType = 'video';
              form.setFieldValue('type', inferredType);
            }
          }}
        >
          <IconX size={12} />
        </ActionIcon>
      </Paper>
    );
  });

  return (
    <Container size="xl" style={{ background: colorPalette.background, padding: '2rem', minHeight: '100vh' }}>
      <LoadingOverlay visible={isFetching} overlayBlur={2} />

      <Stack spacing="xl">
        <Group justify="space-between" align="center">
          <Title order={2} style={{ color: colorPalette.textPrimary }}>
            <IconCamera size={28} style={{ marginRight: 10, verticalAlign: 'middle', color: colorPalette.primary }} />
            Gestion des médias de chambres
          </Title>
          <Tooltip
            label={chambres.length === 0 ? "Vous devez d'abord avoir au moins une chambre enregistrée" : ""}
            position="bottom"
            disabled={chambres.length > 0}
          >
            <div>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  resetForm();
                  setOpened(true);
                }}
                style={{ backgroundColor: colorPalette.primary }}
                disabled={chambres.length === 0 || !user?.id}
              >
                Ajouter un média
              </Button>
            </div>
          </Tooltip>
        </Group>

        {!user?.id && (
          <Alert color="orange" icon={<IconAlertTriangle />}>
            Vous devez être connecté pour gérer vos médias.
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
            {/* Display detailed error messages from the backend (FastAPI 422 format) */}
            {Array.isArray(globalError) && globalError.every(e => typeof e === 'object' && e !== null && 'msg' in e)
              ? globalError.map((e, index) => (
                  <Text key={index} size="sm">
                    {e.loc && e.loc[1] ? `Champ '${e.loc[1]}': ` : ''}{e.msg}
                  </Text>
                ))
              : globalError // Otherwise, display as-is (e.g., if it's a simple string error from catch block)
            }
          </Alert>
        )}

        <Divider my="sm" />

        <Paper shadow="sm" radius="md" p="md" style={{ background: colorPalette.surface, border: `1px solid ${colorPalette.border}` }}>
          {medias.length === 0 && !isFetching ? (
            <Center h={200}>
              {chambres.length === 0 && user?.id ? (
                <Alert
                  color="red"
                  variant="light"
                  title="Aucune chambre enregistrée"
                  icon={<IconInfoCircle size={20} />}
                  p="lg"
                  style={{ textAlign: 'center' }}
                >
                  <Text mb="md">
                    Vous devez d'abord créer des chambres avant de pouvoir ajouter des médias.
                  </Text>
                  <Button
                    leftSection={<IconHome size={16} />}
                    onClick={() => navigate('/mes-chambres')} // Navigate to chambers page
                    style={{ backgroundColor: colorPalette.primary }}
                  >
                    Créer une chambre
                  </Button>
                </Alert>
              ) : (
                <Alert
                  color="blue"
                  variant="light"
                  title="Aucun média enregistré"
                  icon={<IconInfoCircle size={20} />}
                  p="lg"
                  style={{ textAlign: 'center' }}
                >
                  {user?.id ? 'Cliquez sur "Ajouter un média" pour commencer à enrichir vos annonces.' : 'Connectez-vous pour gérer vos médias.'}
                </Alert>
              )}
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg" verticalSpacing="lg">
              {medias.map((media) => (
                <Card key={media.id} shadow="sm" padding="lg" radius="md" withBorder>
                  <Card.Section>
                    {media.type === 'photo' ? (
                        <a href={api.defaults.baseURL + media.url} target="_blank" rel="noopener noreferrer">
                          <Image
                            src={api.defaults.baseURL + media.url}
                            height={160}
                            alt={media.description || 'Média'}
                            fit="cover"
                            style={{ borderTopLeftRadius: 'md', borderTopRightRadius: 'md' }}
                          />
                        </a>
                    ) : (
                      <Center style={{ height: 160, background: colorPalette.textPrimary, borderTopLeftRadius: 'md', borderTopRightRadius: 'md' }}>
                        {/* You might want a video player here or a link to the video */}
                        <a href={api.defaults.baseURL + media.url} target="_blank" rel="noopener noreferrer">
                          <IconVideo size={80} color={colorPalette.background} />
                        </a>
                      </Center>
                    )}
                  </Card.Section>

                  <Group justify="space-between" mt="md" mb="xs">
                    <Badge color={media.type === 'photo' ? 'lime' : 'violet'} variant="light">
                      {media.type}
                    </Badge>
                    <Badge color="gray" variant="light" leftSection={<IconBuilding size={12} />}>
                      ID Chambre: {media.chambre_id}
                    </Badge>
                  </Group>

                  <Text size="sm" color="dimmed" mt="xs">
                    {chambres.find(c => Number(c.value) === media.chambre_id)?.label || `Chambre ID: ${media.chambre_id}`}
                  </Text>
                  <Text size="sm" mt="xs" fw={500} lineClamp={2}>
                    {media.description || 'Pas de description'}
                  </Text>
                  <Group mt="md" justify="flex-end">
                    <ActionIcon color="blue" onClick={() => openEditModal(media)} variant="light" title="Modifier" disabled={!user?.id}>
                      <IconEdit size={18} />
                    </ActionIcon>
                    <ActionIcon color="red" onClick={() => { setCurrentMedia(media); setDeleteOpened(true); }} variant="light" title="Supprimer" disabled={!user?.id}>
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Paper>
      </Stack>

      {/* --- Create/Edit Modal --- */}
      <Modal
        opened={opened}
        onClose={resetForm}
        title={
          <Title order={3} style={{ color: currentMedia ? colorPalette.textPrimary : colorPalette.primary }}>
            {currentMedia ? 'Modifier le média' : 'Ajouter un nouveau média'}
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
            <Select
              label="Appartient à la chambre"
              placeholder="Sélectionnez une chambre"
              leftSection={<IconBuilding size={16} />}
              withAsterisk
              data={chambres}
              value={form.values.chambre_id}
              onChange={(value) => form.setFieldValue('chambre_id', value)}
              error={form.errors.chambre_id}
              radius="md"
            />

            {/* Dropzone for file uploads (visible only during creation, not editing) */}
            {!currentMedia && (
                <>
                    <Dropzone
                        onDrop={(files) => {
                            form.setFieldValue('files', files);
                            form.setFieldValue('url', ''); // Clear URL if files are dropped
                            // Infer type if a single file is selected
                            if (files.length === 1) {
                                let inferredType = '';
                                if (files[0].type.startsWith('image/')) inferredType = 'photo';
                                else if (files[0].type.startsWith('video/')) inferredType = 'video';
                                form.setFieldValue('type', inferredType);
                            } else {
                                form.setFieldValue('type', ''); // Clear type if multiple files (user needs to pick)
                            }
                        }}
                        onReject={(files) => {
                            setGlobalError(`Certains fichiers n'ont pas été acceptés. Types supportés: images ou vidéos.`);
                        }}
                        maxFiles={10}
                        maxSize={5 * 1024 ** 2} // 5MB per file
                        accept={[MIME_TYPES.JPEG, MIME_TYPES.PNG, MIME_TYPES.GIF, MIME_TYPES.WEBP, MIME_TYPES.MP4, MIME_TYPES.MOV]}
                        loading={loading}
                        disabled={form.values.url !== ''} // Disable if a manual URL is being entered
                        {...form.getInputProps('files')}
                    >
                        <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
                            <Dropzone.Accept>
                                <IconUpload size={50} stroke={1.5} color="var(--mantine-color-blue-6)" />
                            </Dropzone.Accept>
                            <Dropzone.Reject>
                                <IconX size={50} stroke={1.5} color="var(--mantine-color-red-6)" />
                            </Dropzone.Reject>
                            <Dropzone.Idle>
                                <IconPhoto size={50} stroke={1.5} color="var(--mantine-color-dimmed)" />
                            </Dropzone.Idle>

                            <div>
                                <Text size="xl" inline>
                                    Glissez-déposez les images ou vidéos ici, ou cliquez pour sélectionner
                                </Text>
                                <Text size="sm" color="dimmed" inline mt={7}>
                                    Fichiers supportés: .jpeg, .png, .gif, .webp, .mp4, .mov (max 5MB par fichier)
                                </Text>
                            </div>
                        </Group>
                    </Dropzone>

                    {form.errors.files && <Text size="sm" color="red">{form.errors.files}</Text>}

                    {previewFiles.length > 0 && (
                        <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} mt="md">
                            {previewFiles}
                        </SimpleGrid>
                    )}

                    <Text size="sm" ta="center" color="dimmed">OU</Text>
                </>
            )}

            {/* Manual URL field (visible when editing or if no files selected for creation) */}
            <TextInput
                label="URL du média (si déjà hébergé)"
                placeholder="Ex: https://example.com/mon_media.jpg"
                leftSection={<IconPhoto size={16} />}
                withAsterisk={!currentMedia && (form.values.files && form.values.files.length === 0)} // Required if no files are selected for creation
                {...form.getInputProps('url')}
                radius="md"
                disabled={form.values.files.length > 0 && !currentMedia} // Disable if files are selected, unless in edit mode
            />

            <Select
              label="Type de média"
              placeholder="Sélectionnez le type"
              withAsterisk={!currentMedia && (form.values.files && form.values.files.length === 0)} // Required if no files are selected for creation
              data={MEDIA_TYPE_OPTIONS}
              {...form.getInputProps('type')}
              radius="md"
              // Disable if type can be inferred from files (during creation) and there's only one file
              disabled={
                !currentMedia &&
                form.values.files.length === 1 &&
                (form.values.files[0]?.type?.startsWith('image/') || form.values.files[0]?.type?.startsWith('video/'))
              }
            />

            <Textarea
              label="Description (optionnel)"
              placeholder="Décrivez ce média..."
              minRows={2}
              {...form.getInputProps('description')}
              radius="md"
            />

            {globalError && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                {globalError}
              </Alert>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={loading}
                radius="md"
                style={{ borderColor: colorPalette.secondary, color: colorPalette.textPrimary }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                loading={loading}
                style={{ backgroundColor: colorPalette.primary }}
                radius="md"
              >
                {currentMedia ? 'Enregistrer les modifications' : 'Ajouter le(s) média(s)'}
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
          <Title order={3} style={{ color: colorPalette.textPrimary }}>
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
        <Text size="sm" mb="xl" color={colorPalette.textPrimary}>
          Êtes-vous sûr de vouloir supprimer ce média (<Text span fw={700} color={colorPalette.danger}>{currentMedia?.description || currentMedia?.url}</Text>) ?
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
            style={{ borderColor: colorPalette.secondary, color: colorPalette.textPrimary }}
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