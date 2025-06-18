import React, { useState, useEffect, useCallback } from 'react';
import {
    Table,
    Button,
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
    Badge,
    useMantineTheme,
    Tooltip,
    Modal,
    Select,
    NumberInput,
    Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
    IconCheck,
    IconX,
    IconAlertTriangle,
    IconInfoCircle,
    IconRefresh,
    IconTrash,
    IconFileText,
    IconCalendarEvent,
    IconHome,
    IconUser,
    IconPlus,
    IconQuestionMark, // Added for confirmation modals
} from '@tabler/icons-react';
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';

// Import Mantine Dates styles if not already imported globally
import '@mantine/dates/styles.css';

// --- Contrat Status Configuration ---
const STATUT_CONTRAT = {
    actif: { label: 'Actif', color: 'green' },
    resilié: { label: 'Résilié', color: 'red' },
};

// --- Contract Mode Paiement Configuration (Frontend Display) ---
const MODE_PAIEMENT = {
    virement: { label: 'Virement', color: 'blue' },
    cash: { label: 'Cash', color: 'teal' },
    "mobile money": { label: 'Mobile Money', color: 'cyan' },
};

// --- Contract Periodicite Configuration (Frontend Display) ---
const PERIODICITE = {
    journalier: { label: 'Journalier', color: 'grape' },
    hebdomadaire: { label: 'Hebdomadaire', color: 'indigo' },
    mensuel: { label: 'Mensuel', color: 'violet' },
};

// --- Helper function to parse error messages ---
const getErrorMessage = (error) => {
    if (error.response && error.response.status === 422 && Array.isArray(error.response.data?.detail)) {
        // Pydantic validation errors (array of objects with 'loc' and 'msg')
        return error.response.data.detail.map(err => {
            const loc = err.loc.length > 0 ? `[${err.loc.join('.')}] ` : '';
            return `${loc}${err.msg}`;
        }).join('; ');
    } else if (error.response && error.response.data && typeof error.response.data.detail === 'string') {
        // Generic FastAPI error with a simple detail string
        return error.response.data.detail;
    } else if (error.message) {
        // Axios or network error message
        return error.message;
    }
    return "Une erreur inattendue est survenue.";
};


export default function MesContratsPage() {
    const theme = useMantineTheme();
    const { user } = useAuth();

    const [contrats, setContrats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [globalError, setGlobalError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [createModalOpened, setCreateModalOpened] = useState(false);
    // State for confirmation modals
    const [terminateConfirmModalOpened, setTerminateConfirmModalOpened] = useState(false);
    const [deleteConfirmModalOpened, setDeleteConfirmModalOpened] = useState(false);
    const [selectedContratId, setSelectedContratId] = useState(null); // To store the ID of the contract to be terminated/deleted

    const [tenants, setTenants] = useState([]);
    const [rooms, setRooms] = useState([]);

    // Form for creating a new contract
    const createForm = useForm({
        initialValues: {
            locataire_id: '', // Use empty string for Select to correctly trigger validation
            chambre_id: '', // Use empty string for Select to correctly trigger validation
            date_debut: null,
            date_fin: null,
            montant_caution: 0,
            mois_caution: 0,
            description: '',
            mode_paiement: '',
            periodicite: '',
            statut: 'actif', // Default to actif when creating a new contract
        },
        validate: {
            locataire_id: (value) => (value ? null : 'Veuillez sélectionner un locataire'),
            chambre_id: (value) => (value ? null : 'Veuillez sélectionner une chambre'),
            date_debut: (value) => (value ? null : 'La date de début est requise'),
            date_fin: (value, values) => {
                if (!value) return 'La date de fin est requise';
                if (!values.date_debut) return null; // date_debut will have its own validation
                // Ensure values are Date objects for comparison
                const startDate = new Date(values.date_debut);
                const endDate = new Date(value);
                // Compare only dates, ignore time component to allow same-day end
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                return endDate >= startDate ? null : 'La date de fin doit être postérieure ou égale à la date de début';
            },
            montant_caution: (value) => (value !== null && value >= 0 ? null : 'Le montant de caution doit être positif ou zéro'),
            mois_caution: (value) => (value !== null && value >= 0 && value <= 3 ? null : 'Le nombre de mois de caution doit être entre 0 et 3'),
            mode_paiement: (value) => (value ? null : 'Le mode de paiement est requis'),
            periodicite: (value) => (value ? null : 'La périodicité est requise'),
            statut: (value) => (value === 'actif' || value === 'resilié' ? null : 'Le statut doit être soit "actif" soit "resilié"'),
        },
    });

    // Fetch contracts
    const fetchContrats = useCallback(async () => {
        setIsFetching(true);
        setGlobalError(null);
        try {
            if (!user?.id) {
                setContrats([]);
                setGlobalError("Connectez-vous pour voir et gérer vos contrats.");
                return;
            }

            const response = await api.get('/contrats');
            console.log('Structure des données reçues du backend (contrats):', response.data);
            if (Array.isArray(response.data)) {
                setContrats(response.data);
            } else if (response.data && Array.isArray(response.data.data)) {
                // In case the API wraps the array in a 'data' key
                setContrats(response.data.data);
            } else {
                console.error("Unexpected data format from API:", response.data);
                setGlobalError("Format de données inattendu. Veuillez contacter l'administrateur.");
                setContrats([]);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des contrats:', error);
            const errorMessage = getErrorMessage(error);
            setGlobalError(errorMessage);
            setContrats([]);
        } finally {
            setIsFetching(false);
        }
    }, [user]);

    // Fetch tenants and rooms for the creation form (only if proprietor)
    const fetchFormDependencies = useCallback(async () => {
        if (user?.role === "proprietaire") {
            try {
                // Fetch tenants (assuming an endpoint for all locataires or filterable by proprietor)
                const tenantsResponse = await api.get('/users?role=locataire'); // Adjust this endpoint as per your API
                setTenants(tenantsResponse.data.map(t => ({ value: t.id.toString(), label: `${t.prenom} ${t.nom} (${t.email})` })));

                // Fetch rooms owned by the current proprietor
                const roomsResponse = await api.get(`/chambres/mes-chambres`); // Assuming you have an endpoint for owner's rooms
                setRooms(roomsResponse.data.map(r => ({ value: r.id.toString(), label: `${r.titre} (${r.maison?.adresse || 'N/A'})` })));

            } catch (error) {
                console.error('Erreur lors du chargement des dépendances du formulaire:', error);
                const errorMessage = getErrorMessage(error);
                notifications.show({
                    title: 'Erreur de chargement',
                    message: `Impossible de charger les locataires ou les chambres : ${errorMessage}`,
                    color: 'red',
                    icon: <IconAlertTriangle size={18} />,
                });
            }
        }
    }, [user]);


    useEffect(() => {
        fetchContrats();
        fetchFormDependencies();
    }, [fetchContrats, fetchFormDependencies]);

    // --- Contract Actions ---

    // Function to open the termination confirmation modal
    const openTerminateConfirmModal = (contratId) => {
        setSelectedContratId(contratId);
        setTerminateConfirmModalOpened(true);
    };

    // Function to open the deletion confirmation modal
    const openDeleteConfirmModal = (contratId) => {
        setSelectedContratId(contratId);
        setDeleteConfirmModalOpened(true);
    };

    // Actual termination logic
    const confirmTerminateContrat = async () => {
        setTerminateConfirmModalOpened(false); // Close the modal
        if (!selectedContratId) return;

        setLoading(true);
        setGlobalError(null);
        setSuccessMessage(null);
        try {
            // Get the current contract details first
            const contrat = contrats.find(c => c.id === selectedContratId);
            if (!contrat) {
                throw new Error("Contrat non trouvé");
            }

            // Include all required fields from the original contract
            const payload = {
                locataire_id: contrat.locataire_id,
                chambre_id: contrat.chambre_id,
                date_debut: contrat.date_debut,
                date_fin: contrat.date_fin,
                montant_caution: contrat.montant_caution,
                mois_caution: contrat.mois_caution,
                mode_paiement: contrat.mode_paiement,
                periodicite: contrat.periodicite,
                statut: 'resilié'
            };

            await api.put(`/contrats/${selectedContratId}`, payload);
            notifications.show({
                title: 'Succès !',
                message: `Contrat résilié avec succès.`,
                color: 'green',
                icon: <IconCheck size={18} />,
            });
            await fetchContrats();
        } catch (error) {
            console.error('Erreur lors de la résiliation du contrat:', error);
            const errorMessage = getErrorMessage(error);
            setGlobalError(errorMessage);
            notifications.show({
                title: 'Erreur',
                message: errorMessage,
                color: 'red',
                icon: <IconAlertTriangle size={18} />,
            });
        } finally {
            setLoading(false);
            setSelectedContratId(null); // Clear selected ID
        }
    };

    // Actual deletion logic
    const confirmDeleteContrat = async () => {
        setDeleteConfirmModalOpened(false); // Close the modal
        if (!selectedContratId) return;

        setLoading(true);
        setGlobalError(null);
        setSuccessMessage(null);
        try {
            await api.delete(`/contrats/${selectedContratId}`);
            notifications.show({
                title: 'Succès !',
                message: 'Contrat supprimé avec succès.',
                color: 'green',
                icon: <IconCheck size={18} />,
            });
            await fetchContrats();
        } catch (error) {
            console.error('Erreur lors de la suppression du contrat:', error);
            const errorMessage = getErrorMessage(error);
            setGlobalError(errorMessage);
            notifications.show({
                title: 'Erreur',
                message: errorMessage,
                color: 'red',
                icon: <IconAlertTriangle size={18} />,
            });
        } finally {
            setLoading(false);
            setSelectedContratId(null); // Clear selected ID
        }
    };

    const handleCreateContrat = async (values) => {
        setLoading(true);
        setGlobalError(null);
        setSuccessMessage(null);
        try {
            const payload = {
                ...values,
                // Ensure date_debut and date_fin are valid Date objects before converting to ISO string
                // .toISOString().split('T')[0] converts Date to "YYYY-MM-DD" string
                date_debut: values.date_debut ? new Date(values.date_debut).toISOString().split('T')[0] : null,
                date_fin: values.date_fin ? new Date(values.date_fin).toISOString().split('T')[0] : null,
                locataire_id: parseInt(values.locataire_id), // Convert string from Select to integer
                chambre_id: parseInt(values.chambre_id),     // Convert string from Select to integer
            };

            await api.post('/contrats', payload);
            notifications.show({
                title: 'Succès !',
                message: 'Contrat créé avec succès.',
                color: 'green',
                icon: <IconCheck size={18} />,
            });
            setCreateModalOpened(false);
            createForm.reset();
            await fetchContrats();
        } catch (error) {
            console.error('Erreur lors de la création du contrat:', error);
            const errorMessage = getErrorMessage(error); // Use the helper for consistent parsing
            setGlobalError(errorMessage);
            notifications.show({
                title: 'Erreur',
                message: `Erreur lors de la création : ${errorMessage}`, // More specific message for creation
                color: 'red',
                icon: <IconAlertTriangle size={18} />,
            });
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        // Add a check for invalid date objects
        if (isNaN(date.getTime())) {
            return 'Date invalide';
        }
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const rows = contrats.map((contrat) => {
        // Ensure that contrat.chambre and contrat.locataire exist before accessing nested properties
        // This is important because the backend might return them as null if not loaded or linked.
        const isCurrentUserProprietaire = user?.id && user.id === contrat.chambre?.maison?.proprietaire_id;
        // const isCurrentUserLocataire = user?.id === contrat.locataire_id; // Not directly used for actions below

        let showTerminateAction = false;
        let showDeleteAction = false;

        if (isCurrentUserProprietaire && contrat.statut === 'actif') {
            showTerminateAction = true;
        }

        if (isCurrentUserProprietaire && contrat.statut === 'resilié') {
            showDeleteAction = true;
        }

        const hasAnyAction = showTerminateAction || showDeleteAction;

        return (
            <Table.Tr key={contrat.id}>
                <Table.Td>
                    <Group noWrap>
                        <IconHome size={16} />
                        <Stack spacing={0}>
                            <Text fw={500}>{contrat.chambre?.titre || 'Chambre inconnue'}</Text>
                            <Text size="xs" c="dimmed">{contrat.chambre?.maison?.adresse || 'Adresse inconnue'}</Text>
                        </Stack>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Group noWrap>
                        <IconUser size={16} />
                        <Stack spacing={0}>
                            {/* Assuming contrat.locataire.nom from backend schema already contains "Prenom Nom" */}
                            <Text fw={500}>{contrat.locataire?.nom || 'Nom inconnu'}</Text>
                            <Text size="xs" c="dimmed">
                                {contrat.locataire?.telephone ? `Tél: ${contrat.locataire.telephone}` : 'Tél: inconnu'}<br />
                                {contrat.locataire?.email || 'Email inconnu'}
                            </Text>
                        </Stack>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Group noWrap>
                        <IconCalendarEvent size={16} />
                        <Stack spacing={0}>
                            <Text>Du: {formatDate(contrat.date_debut)}</Text>
                            <Text>Au: {formatDate(contrat.date_fin)}</Text>
                        </Stack>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Stack spacing={0}>
                        <Text size="sm">Caution: {contrat.montant_caution} CFA ({contrat.mois_caution} mois)</Text>
                        <Text size="sm">Paiement: {MODE_PAIEMENT[contrat.mode_paiement]?.label || contrat.mode_paiement}</Text>
                        <Text size="sm">Périodicité: {PERIODICITE[contrat.periodicite]?.label || contrat.periodicite}</Text>
                    </Stack>
                </Table.Td>
                <Table.Td>
                    <Badge
                        color={STATUT_CONTRAT[contrat.statut]?.color || 'gray'}
                        variant="light"
                    >
                        {STATUT_CONTRAT[contrat.statut]?.label || contrat.statut}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <Group spacing="xs">
                        {showTerminateAction && (
                            <Tooltip label="Résilier le contrat" position="top" withArrow>
                                <ActionIcon
                                    color="red"
                                    onClick={() => openTerminateConfirmModal(contrat.id)} // Open modal instead of direct confirm
                                    variant="light"
                                    size="md"
                                    loading={loading}
                                >
                                    <IconX size={18} />
                                </ActionIcon>
                            </Tooltip>
                        )}

                        {showDeleteAction && (
                            <Tooltip label="Supprimer le contrat" position="top" withArrow>
                                <ActionIcon
                                    color="gray"
                                    onClick={() => openDeleteConfirmModal(contrat.id)} // Open modal instead of direct confirm
                                    variant="light"
                                    size="md"
                                    loading={loading}
                                >
                                    <IconTrash size={18} />
                                </ActionIcon>
                            </Tooltip>
                        )}

                        {!hasAnyAction && (
                            <Text size="sm" c="dimmed">Action non disponible</Text>
                        )}
                    </Group>
                </Table.Td>
            </Table.Tr>
        );
    });

    return (
        <Container
            size="xl"
            style={{
                background: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
                padding: '2rem',
                minHeight: '100vh',
                borderRadius: theme.radius.md,
                position: 'relative'
            }}
        >
            <LoadingOverlay visible={isFetching || loading} overlayBlur={2} />

            <Stack spacing="xl">
                <Group justify="space-between" align="center">
                    <Title order={2}>
                        <IconFileText size={28} style={{ marginRight: 10, verticalAlign: 'middle' }} />
                        Mes Contrats
                    </Title>
                    <Group>
                        {user?.role === "proprietaire" && (
                            <Button
                                leftSection={<IconPlus size={16} />}
                                onClick={() => setCreateModalOpened(true)}
                                variant="filled"
                            >
                                Nouveau Contrat
                            </Button>
                        )}
                        <Button
                            leftSection={<IconRefresh size={16} />}
                            onClick={fetchContrats}
                            variant="outline"
                            disabled={isFetching || loading}
                        >
                            Actualiser
                        </Button>
                    </Group>
                </Group>

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

                <Paper shadow="sm" radius="md" p="md" style={{ background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0], border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}` }}>
                    {contrats.length === 0 && !isFetching ? (
                        <Center h={200}>
                            <Alert
                                color="blue"
                                variant="light"
                                title="Aucun contrat trouvé"
                                icon={<IconInfoCircle size={20} />}
                                p="lg"
                                style={{ textAlign: 'center' }}
                            >
                                Vous n'avez pas encore de contrats.
                            </Alert>
                        </Center>
                    ) : (
                        <Table verticalSpacing="md" highlightOnHover>
                            <thead>
                                <tr>
                                    <th>Chambre</th>
                                    <th>Locataire</th>
                                    <th>Période de Contrat</th>
                                    <th>Détails Financiers</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>{rows}</tbody>
                        </Table>
                    )}
                </Paper>
            </Stack>

            {/* Modal for creating a new contract */}
            <Modal
                opened={createModalOpened}
                onClose={() => {
                    setCreateModalOpened(false);
                    createForm.reset();
                }}
                title="Créer un nouveau contrat"
                size="lg"
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
            >
                <form onSubmit={createForm.onSubmit(handleCreateContrat)}>
                    <Stack>
                        <Select
                            label="Locataire"
                            placeholder="Sélectionner un locataire"
                            data={tenants}
                            searchable
                            clearable
                            {...createForm.getInputProps('locataire_id')}
                        />
                        <Select
                            label="Chambre"
                            placeholder="Sélectionner une chambre"
                            data={rooms}
                            searchable
                            clearable
                            {...createForm.getInputProps('chambre_id')}
                        />
                        <Group grow>
                            <DateInput
                                label="Date de début"
                                placeholder="Sélectionner une date"
                                valueFormat="YYYY-MM-DD"
                                {...createForm.getInputProps('date_debut')}
                            />
                            <DateInput
                                label="Date de fin"
                                placeholder="Sélectionner une date"
                                valueFormat="YYYY-MM-DD"
                                {...createForm.getInputProps('date_fin')}
                            />
                        </Group>
                        <Group grow>
                            <NumberInput
                                label="Montant Caution (CFA)"
                                placeholder="Ex: 150000"
                                min={0}
                                {...createForm.getInputProps('montant_caution')}
                            />
                            <NumberInput
                                label="Mois Caution (Max 3)"
                                placeholder="Ex: 1"
                                min={0}
                                max={3}
                                {...createForm.getInputProps('mois_caution')}
                            />
                        </Group>
                        <Select
                            label="Mode de paiement"
                            placeholder="Sélectionner le mode"
                            data={Object.keys(MODE_PAIEMENT).map(key => ({ value: key, label: MODE_PAIEMENT[key].label }))}
                            {...createForm.getInputProps('mode_paiement')}
                        />
                        <Select
                            label="Périodicité"
                            placeholder="Sélectionner la périodicité"
                            data={Object.keys(PERIODICITE).map(key => ({ value: key, label: PERIODICITE[key].label }))}
                            {...createForm.getInputProps('periodicite')}
                        />
                        <Textarea
                            label="Description"
                            placeholder="Entrez une description pour le contrat (optionnel)"
                            minRows={2}
                            {...createForm.getInputProps('description')}
                        />
                        <Select
                            label="Statut"
                            placeholder="Sélectionner le statut"
                            data={[
                                { value: 'actif', label: 'Actif' },
                                { value: 'resilié', label: 'Résilié' },
                            ]}
                            {...createForm.getInputProps('statut')}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCreateModalOpened(false);
                                    createForm.reset();
                                }}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" loading={loading}>
                                Créer le contrat
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* Confirmation Modal for Terminate Contract */}
            <Modal
                opened={terminateConfirmModalOpened}
                onClose={() => setTerminateConfirmModalOpened(false)}
                title={<Group><IconQuestionMark size={20} color="orange" /> <Title order={4}>Confirmer la résiliation</Title></Group>}
                centered
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
            >
                <Text size="sm">
                    Êtes-vous sûr de vouloir **résilier** ce contrat ? Cette action est irréversible et changera le statut du contrat à "résilié".
                </Text>
                <Group justify="flex-end" mt="md">
                    <Button variant="outline" onClick={() => setTerminateConfirmModalOpened(false)}>
                        Annuler
                    </Button>
                    <Button color="red" onClick={confirmTerminateContrat} loading={loading}>
                        Résilier
                    </Button>
                </Group>
            </Modal>

            {/* Confirmation Modal for Delete Contract */}
            <Modal
                opened={deleteConfirmModalOpened}
                onClose={() => setDeleteConfirmModalOpened(false)}
                title={<Group><IconAlertTriangle size={20} color="red" /> <Title order={4}>Confirmer la suppression</Title></Group>}
                centered
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
            >
                <Text size="sm">
                    Êtes-vous sûr de vouloir **supprimer** ce contrat ? Cette action est définitive et ne pourra pas être annulée.
                </Text>
                <Group justify="flex-end" mt="md">
                    <Button variant="outline" onClick={() => setDeleteConfirmModalOpened(false)}>
                        Annuler
                    </Button>
                    <Button color="red" onClick={confirmDeleteContrat} loading={loading}>
                        Supprimer
                    </Button>
                </Group>
            </Modal>
        </Container>
    );
}