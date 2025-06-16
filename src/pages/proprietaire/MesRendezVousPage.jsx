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
    useMantineTheme
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconCheck,
    IconX,
    IconCalendarEvent,
    IconAlertTriangle,
    IconInfoCircle,
    IconClock,
    IconHome,
    IconUser,
    IconRefresh,
    IconTrash
} from '@tabler/icons-react';
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';

// Import Mantine Dates styles if not already imported globally (still good practice)
import '@mantine/dates/styles.css';

const STATUT_RENDEZ_VOUS = {
    en_attente: { label: 'En attente', color: 'orange' },
    confirmé: { label: 'Confirmé', color: 'green' },
    annulé: { label: 'Annulé', color: 'red' },
};

export default function MesRendezVousPage() {
    const theme = useMantineTheme();
    const { user } = useAuth(); // Assuming useAuth provides user.id, user.isProprietaire, and user.role

    const [rendezVous, setRendezVous] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [globalError, setGlobalError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const fetchRendezVous = useCallback(async () => {
        setIsFetching(true);
        setGlobalError(null);
        try {
            if (!user?.id) {
                setRendezVous([]);
                setIsFetching(false);
                setGlobalError("Connectez-vous pour voir et gérer vos rendez-vous.");
                return;
            }

            let url = `/rendez-vous`;
            // It's crucial here to fetch rendezvous relevant to the logged-in user
            // If the user is a proprietor, they need to see rendezvous for THEIR rooms.
            // If the user is a locataire, they need to see rendezvous THEY booked.
            if (user.isProprietaire) {
                url += `?proprietaire_id=${user.id}`; // Assuming your backend has this filter
            } else {
                url += `?locataire_id=${user.id}`;
            }

            const response = await api.get(url);
            console.log('Structure des données reçues du backend:', response.data);
            if (Array.isArray(response.data)) {
                 setRendezVous(response.data);
            } else if (response.data && Array.isArray(response.data.data)) {
                 setRendezVous(response.data.data);
            } else {
                 console.error("Unexpected data format from API:", response.data);
                 setGlobalError("Format de données inattendu. Veuillez contacter l'administrateur.");
                 setRendezVous([]);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des rendez-vous:', error);
            const errorMessage = error.response?.data?.detail || error.message || "Erreur lors du chargement des rendez-vous.";
            setGlobalError(errorMessage);
            setRendezVous([]);
        } finally {
            setIsFetching(false);
        }
    }, [user]); // Depend on user to re-fetch if user changes

    useEffect(() => {
        fetchRendezVous();
    }, [fetchRendezVous]);

    const handleUpdateRendezVous = async (rdvId, statut) => {
        setLoading(true);
        setGlobalError(null);
        setSuccessMessage(null);
        try {
            const payload = { statut: statut };

            await api.put(`/rendez-vous/${rdvId}`, payload);
            notifications.show({
                title: 'Succès !',
                message: `Rendez-vous ${statut} avec succès.`,
                color: 'green',
                icon: <IconCheck size={18} />,
            });
            await fetchRendezVous();
        } catch (error) {
            console.error('Erreur lors de la mise à jour du rendez-vous:', error);
            const errorMessage = error.response?.data?.detail || error.message || "Erreur lors de la mise à jour du rendez-vous.";
            setGlobalError(errorMessage);
            notifications.show({
                title: 'Erreur',
                message: errorMessage,
                color: 'red',
                icon: <IconAlertTriangle size={18} />,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRendezVous = async (rdvId) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?")) {
            return;
        }
        setLoading(true);
        setGlobalError(null);
        setSuccessMessage(null);
        try {
            await api.delete(`/rendez-vous/${rdvId}`);
            notifications.show({
                title: 'Succès !',
                message: 'Rendez-vous supprimé avec succès.',
                color: 'green',
                icon: <IconCheck size={18} />,
            });
            await fetchRendezVous();
        } catch (error) {
            console.error('Erreur lors de la suppression du rendez-vous:', error);
            const errorMessage = error.response?.data?.detail || error.message || "Erreur lors de la suppression du rendez-vous.";
            setGlobalError(errorMessage);
            notifications.show({
                title: 'Erreur',
                message: errorMessage,
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
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const rows = rendezVous.map((rdv) => {
        // Determine if the current user is the proprietor of the chambre associated with this rdv
        const isCurrentUserProprietaire = user?.id && user.id === rdv.chambre?.maison?.proprietaire_id;
        // Determine if the current user is the locataire who booked this rdv
        const isCurrentUserLocataire = user?.id === rdv.locataire_id;

        // Flags to control action button visibility
        let showProprietaireActions = false;
        let showLocataireCancel = false;
        let showDeleteAction = false;

        // Propriétaire peut confirmer/annuler les rendez-vous en attente
        if (isCurrentUserProprietaire) {
            if (rdv.statut === 'en_attente') {
                showProprietaireActions = true;
            }
        }

        // Locataire peut annuler ses propres rendez-vous en attente
        if (isCurrentUserLocataire) {
            if (rdv.statut === 'en_attente') {
                showLocataireCancel = true;
            }
        }

        // Propriétaire peut supprimer les rendez-vous annulés ou confirmés
        if (isCurrentUserProprietaire) {
            if (rdv.statut === 'annulé' || rdv.statut === 'confirmé') {
                showDeleteAction = true;
            }
        }

        // Locataire peut supprimer ses propres rendez-vous annulés ou confirmés
        if (isCurrentUserLocataire) {
            if (rdv.statut === 'annulé' || rdv.statut === 'confirmé') {
                showDeleteAction = true;
            }
        }

        // Determine if any action button will be rendered for this row
        const hasAnyAction = showProprietaireActions || showLocataireCancel || showDeleteAction;

        return (
            <Table.Tr key={rdv.id}>
                <Table.Td>
                    <Group noWrap>
                        <IconHome size={16} />
                        <Stack spacing={0}>
                            <Text fw={500}>{rdv.chambre?.titre || 'Chambre inconnue'}</Text>
                            <Text size="xs" c="dimmed">{rdv.chambre?.maison?.adresse || 'Adresse inconnue'}</Text>
                        </Stack>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Group noWrap>
                        <IconUser size={16} />
                        <Stack spacing={0}>
                            <Text fw={500}>{rdv.locataire?.nom || 'Nom inconnu'} {rdv.locataire?.prenom || ''}</Text>
                            <Text size="xs" c="dimmed">
                                {rdv.locataire?.telephone ? `Tél: ${rdv.locataire.telephone}` : 'Tél: inconnu'}<br />
                                {rdv.locataire?.email || 'Email inconnu'}
                            </Text>
                        </Stack>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Group noWrap>
                        <IconClock size={16} />
                        <Stack spacing={0}>
                            <Text>{formatDate(rdv.date_heure)}</Text>
                        </Stack>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Badge
                        color={STATUT_RENDEZ_VOUS[rdv.statut]?.color || 'gray'}
                        variant="light"
                    >
                        {STATUT_RENDEZ_VOUS[rdv.statut]?.label || rdv.statut}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <Group spacing="xs">
                        {showProprietaireActions && (
                            <>
                                <ActionIcon
                                    color="green"
                                    onClick={() => handleUpdateRendezVous(rdv.id, 'confirmé')}
                                    variant="light"
                                    size="md"
                                    title="Confirmer le rendez-vous"
                                    loading={loading}
                                >
                                    <IconCheck size={18} />
                                </ActionIcon>
                                <ActionIcon
                                    color="red"
                                    onClick={() => handleUpdateRendezVous(rdv.id, 'annulé')}
                                    variant="light"
                                    size="md"
                                    title="Annuler le rendez-vous"
                                    loading={loading}
                                >
                                    <IconX size={18} />
                                </ActionIcon>
                            </>
                        )}

                        {showLocataireCancel && (
                            <ActionIcon
                                color="red"
                                onClick={() => handleUpdateRendezVous(rdv.id, 'annulé')}
                                variant="light"
                                size="md"
                                title="Annuler le rendez-vous"
                                loading={loading}
                            >
                                <IconX size={18} />
                            </ActionIcon>
                        )}

                        {showDeleteAction && (
                            <ActionIcon
                                color="gray"
                                onClick={() => handleDeleteRendezVous(rdv.id)}
                                variant="light"
                                size="md"
                                title="Supprimer le rendez-vous"
                                loading={loading}
                            >
                                <IconTrash size={18} />
                            </ActionIcon>
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
                        <IconCalendarEvent size={28} style={{ marginRight: 10, verticalAlign: 'middle' }} />
                        Mes Rendez-vous
                    </Title>
                    <Button
                        leftSection={<IconRefresh size={16} />}
                        onClick={fetchRendezVous}
                        variant="outline"
                        disabled={isFetching || loading}
                    >
                        Actualiser
                    </Button>
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
                    {rendezVous.length === 0 && !isFetching ? (
                        <Center h={200}>
                            <Alert
                                color="blue"
                                variant="light"
                                title="Aucun rendez-vous trouvé"
                                icon={<IconInfoCircle size={20} />}
                                p="lg"
                                style={{ textAlign: 'center' }}
                            >
                                Vous n'avez pas encore de rendez-vous.
                            </Alert>
                        </Center>
                    ) : (
                        <Table verticalSpacing="md" highlightOnHover>
                            <thead>
                                <tr>
                                    <th>Chambre</th>
                                    <th>Locataire</th>
                                    <th>Date & Heure</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>{rows}</tbody>
                        </Table>
                    )}
                </Paper>
            </Stack>
        </Container>
    );
}