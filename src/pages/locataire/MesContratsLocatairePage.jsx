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
    Flex,
    Divider,
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
    IconFileText,
    IconCalendarEvent,
    IconHome,
    IconReceipt,
    IconBellRinging,
    IconMoneybag,
    IconCash,
} from '@tabler/icons-react';
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';

import '@mantine/dates/styles.css';

const STATUT_CONTRAT = {
    actif: { label: 'Actif', color: 'green' },
    resilie: { label: 'Résilié', color: 'red' },
    en_attente: { label: 'En Attente', color: 'yellow' },
};

const STATUT_PAIEMENT = {
    paye: { label: 'Payé', color: 'green' },
    impaye: { label: 'Impayé', color: 'orange' },
    en_attente: { label: 'À Venir', color: 'blue' },
    annule: { label: 'Annulé', color: 'gray' },
};

const MODE_PAIEMENT = {
    virement: { label: 'Virement', color: 'blue' },
    cash: { label: 'Cash', color: 'teal' },
    "mobile money": { label: 'Mobile Money', color: 'cyan' },
};

const PERIODICITE = {
    journalier: { label: 'Journalier', color: 'grape' },
    hebdomadaire: { label: 'Hebdomadaire', color: 'indigo' },
    mensuel: { label: 'Mensuel', color: 'violet' },
};

const getErrorMessage = (error) => {
    if (error.response && error.response.status === 422 && Array.isArray(error.response.data?.detail)) {
        return error.response.data.detail.map(err => {
            const loc = err.loc.length > 0 ? `[${err.loc.join('.')}] ` : '';
            return `${loc}${err.msg}`;
        }).join('; ');
    } else if (error.response && error.response.data && typeof error.response.data.detail === 'string') {
        return error.response.data.detail;
    } else if (error.message) {
        return error.message;
    }
    return "Une erreur inattendue est survenue.";
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Date invalide';
    }
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
        return 'Date invalide';
    }
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function MesContratsLocatairePage() {
    const theme = useMantineTheme();
    const { user } = useAuth();

    const [contrats, setContrats] = useState([]);
    const [isFetchingContrats, setIsFetchingContrats] = useState(true);
    const [globalError, setGlobalError] = useState(null);

    const [paiementsModalOpened, setPaiementsModalOpened] = useState(false);
    const [selectedContratForPaiements, setSelectedContratForPaiements] = useState(null);
    const [paiements, setPaiements] = useState([]);
    const [isFetchingPaiements, setIsFetchingPaiements] = useState(false);
    const [isMakingPayment, setIsMakingPayment] = useState(false);

    const payForm = useForm({
        initialValues: {
            date_paiement: new Date(),
        },
        validate: {
            date_paiement: (value) => (value ? null : 'La date de paiement est requise'),
        },
    });

    const fetchContratsLocataire = useCallback(async () => {
        setIsFetchingContrats(true);
        setGlobalError(null);
        try {
            if (!user?.id || user?.role !== "locataire") {
                setContrats([]);
                setGlobalError("Vous devez être connecté en tant que locataire pour voir vos contrats.");
                return;
            }

            const response = await api.get(`/locataire/contrats`);
            console.log('Contrats locataire reçus:', response.data);
            setContrats(response.data || []);
        } catch (error) {
            console.error('Erreur lors du chargement des contrats du locataire:', error);
            const errorMessage = getErrorMessage(error);
            setGlobalError(errorMessage);
            setContrats([]);
        } finally {
            setIsFetchingContrats(false);
        }
    }, [user]);

    const fetchPaiementsForContrat = useCallback(async (contratId) => {
        setIsFetchingPaiements(true);
        try {
            const response = await api.get(`/locataire/contrats/${contratId}/paiements`);
            console.log('Paiements reçus pour le contrat:', response.data);
            setPaiements(response.data || []);
        } catch (error) {
            console.error('Erreur lors du chargement des paiements:', error);
            const errorMessage = getErrorMessage(error);
            notifications.show({
                title: 'Erreur',
                message: `Impossible de charger les paiements: ${errorMessage}`,
                color: 'red',
                icon: <IconAlertTriangle size={18} />,
            });
            setPaiements([]);
        } finally {
            setIsFetchingPaiements(false);
        }
    }, []);

    useEffect(() => {
        fetchContratsLocataire();
    }, [fetchContratsLocataire]);

    useEffect(() => {
        if (paiementsModalOpened && paiements.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let overduePaymentsCount = 0;
            let upcomingPaymentsCount = 0;
            const notificationMessages = [];

            paiements.forEach(p => {
                const dueDate = new Date(p.date_echeance);
                dueDate.setHours(0, 0, 0, 0);

                if (p.statut === 'impaye' && dueDate < today) {
                    overduePaymentsCount++;
                    notificationMessages.push(`Le paiement de ${p.montant} CFA du ${formatDate(p.date_echeance)} est en retard.`);
                } else if (p.statut === 'en_attente' && dueDate >= today && dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
                    upcomingPaymentsCount++;
                    notificationMessages.push(`Le paiement de ${p.montant} CFA du ${formatDate(p.date_echeance)} est à venir.`);
                }
            });

            if (overduePaymentsCount > 0) {
                notifications.show({
                    title: `Attention : ${overduePaymentsCount} paiement(s) en retard !`,
                    message: (
                        <Stack spacing="xs">
                            <Text>Vous avez des paiements en retard pour ce contrat :</Text>
                            {notificationMessages.filter(msg => msg.includes('en retard')).map((msg, index) => (
                                <Text key={index} size="sm" c="red">{msg}</Text>
                            ))}
                            <Text fw={700}>Veuillez régulariser votre situation rapidement.</Text>
                        </Stack>
                    ),
                    color: 'red',
                    icon: <IconBellRinging size={18} />,
                    autoClose: false,
                });
            }
            if (upcomingPaymentsCount > 0) {
                notifications.show({
                    title: `Rappel : ${upcomingPaymentsCount} paiement(s) à venir`,
                    message: (
                        <Stack spacing="xs">
                            <Text>Des paiements sont à venir dans les 7 prochains jours pour ce contrat :</Text>
                            {notificationMessages.filter(msg => msg.includes('à venir')).map((msg, index) => (
                                <Text key={index} size="sm" c="orange">{msg}</Text>
                            ))}
                        </Stack>
                    ),
                    color: 'orange',
                    icon: <IconBellRinging size={18} />,
                    autoClose: 10000,
                });
            }
        }
    }, [paiements, paiementsModalOpened]);

    const handleViewPaiements = (contrat) => {
        setSelectedContratForPaiements(contrat);
        setPaiementsModalOpened(true);
        fetchPaiementsForContrat(contrat.id);
    };

    const handleMakePayment = async (paiementId) => {
        const values = payForm.values;
        if (!values.date_paiement) {
            notifications.show({
                title: 'Erreur',
                message: 'Veuillez sélectionner une date de paiement.',
                color: 'red',
                icon: <IconAlertTriangle size={18} />,
            });
            return;
        }

        setIsMakingPayment(true);
        try {
            const montant = selectedContratForPaiements?.chambre_prix || 0;
            const payload = {
                date_paiement: values.date_paiement.toISOString().split('T')[0],
                montant: montant,
                statut: 'paye'
            };
            await api.put(`/paiements/${paiementId}/payer`, payload);
            notifications.show({
                title: 'Paiement effectué !',
                message: 'Votre paiement a été enregistré avec succès.',
                color: 'green',
                icon: <IconCheck size={18} />,
            });
            fetchPaiementsForContrat(selectedContratForPaiements.id);
            payForm.reset();
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du paiement:', error);
            const errorMessage = getErrorMessage(error);
            notifications.show({
                title: 'Erreur',
                message: `Erreur lors de l'enregistrement du paiement : ${errorMessage}`,
                color: 'red',
                icon: <IconAlertTriangle size={18} />,
            });
        } finally {
            setIsMakingPayment(false);
        }
    };

    const contratRows = contrats.map((contrat) => {
        const isCurrentUserLocataire = true; 

        return (
            <Table.Tr key={contrat.id}>
                <Table.Td>
                    <Group noWrap>
                        <IconHome size={16} color={theme.colors.gray[6]} />
                        <Stack spacing={0}>
                            <Text fw={500}>{contrat.chambre_titre || 'Chambre inconnue'}</Text>
                            <Text size="xs" c="dimmed">{contrat.chambre_adresse || 'Adresse inconnue'}, {contrat.chambre_ville || ''}</Text>
                        </Stack>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Group noWrap>
                        <IconCalendarEvent size={16} color={theme.colors.gray[6]} />
                        <Stack spacing={0}>
                            <Text>Du: {formatDate(contrat.date_debut)}</Text>
                            <Text>Au: {formatDate(contrat.date_fin)}</Text>
                        </Stack>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Stack spacing={0}>
                        <Text size="sm"><IconMoneybag size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Caution: {contrat.montant_caution} CFA</Text>
                        <Text size="sm"><IconCalendarEvent size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Périodicité: {PERIODICITE[contrat.periodicite]?.label || contrat.periodicite}</Text>
                        <Text size="sm"><IconCash size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Loyer Mensuel: {contrat.chambre_prix_mensuel} CFA</Text>
                    </Stack>
                </Table.Td>
                <Table.Td>
                    <Badge
                        color={STATUT_CONTRAT[contrat.statut]?.color || 'gray'}
                        variant="light"
                        radius="sm"
                    >
                        {STATUT_CONTRAT[contrat.statut]?.label || contrat.statut}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <Group spacing="xs">
                        {isCurrentUserLocataire && (
                            <Tooltip label="Voir les paiements" position="top" withArrow>
                                <ActionIcon
                                    color="blue"
                                    onClick={() => handleViewPaiements(contrat)}
                                    variant="light"
                                    size="md"
                                    loading={isFetchingPaiements}
                                >
                                    <IconReceipt size={18} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </Group>
                </Table.Td>
            </Table.Tr>
        );
    });

    const paiementRows = paiements.map((paiement) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(paiement.date_echeance);
        dueDate.setHours(0, 0, 0, 0);

        const isOverdue = paiement.statut === 'impaye' && dueDate < today;
        const canPay = paiement.statut === 'impaye' || paiement.statut === 'en_attente';

        return (
            <Table.Tr key={paiement.id}>
                <Table.Td>
                    <Text fw={500}>{paiement.montant} CFA</Text>
                </Table.Td>
                <Table.Td>
                    <Badge
                        color={STATUT_PAIEMENT[paiement.statut]?.color || (isOverdue ? 'red' : 'gray')}
                        variant="light"
                        radius="sm"
                    >
                        {STATUT_PAIEMENT[paiement.statut]?.label || paiement.statut}
                        {isOverdue && <Text span fw={700} ml={5}> (En retard)</Text>}
                    </Badge>
                </Table.Td>
                <Table.Td>{formatDate(paiement.date_echeance)}</Table.Td>
                <Table.Td>{formatDateTime(paiement.date_paiement)}</Table.Td>
                <Table.Td>
                    {canPay ? (
                        <Group>
                            <DateInput
                                placeholder="Date du paiement"
                                valueFormat="DD/MM/YYYY"
                                maxDate={new Date()}
                                {...payForm.getInputProps('date_paiement')}
                                style={{ flex: 1 }}
                            />
                            <Button
                                onClick={() => handleMakePayment(paiement.id)}
                                loading={isMakingPayment}
                                disabled={isMakingPayment || !payForm.isValid('date_paiement')}
                                size="sm"
                                leftSection={<IconCash size={16} />}
                            >
                                Payer
                            </Button>
                        </Group>
                    ) : (
                        <Text size="sm" c="dimmed">Déjà payé ou annulé</Text>
                    )}
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
            <LoadingOverlay visible={isFetchingContrats || isMakingPayment} overlayBlur={2} />

            <Stack spacing="xl">
                <Group justify="space-between" align="center">
                    <Title order={2}>
                        <IconFileText size={28} style={{ marginRight: 10, verticalAlign: 'middle' }} />
                        Mes Contrats de Location
                    </Title>
                    <Button
                        leftSection={<IconRefresh size={16} />}
                        onClick={fetchContratsLocataire}
                        variant="outline"
                        disabled={isFetchingContrats || isMakingPayment}
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

                <Paper shadow="sm" radius="md" p="md" style={{ background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0], border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}` }}>
                    {contrats.length === 0 && !isFetchingContrats ? (
                        <Center h={200}>
                            <Alert
                                color="blue"
                                variant="light"
                                title="Aucun contrat trouvé"
                                icon={<IconInfoCircle size={20} />}
                                p="lg"
                                style={{ textAlign: 'center' }}
                            >
                                Vous n'avez pas encore de contrats de location associés à votre compte.
                            </Alert>
                        </Center>
                    ) : (
                        <Table verticalSpacing="md" highlightOnHover>
                            <thead>
                                <tr>
                                    <th>Chambre</th>
                                    <th>Période de Contrat</th>
                                    <th>Détails Financiers</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>{contratRows}</tbody>
                        </Table>
                    )}
                </Paper>
            </Stack>

            <Modal
                opened={paiementsModalOpened}
                onClose={() => {
                    setPaiementsModalOpened(false);
                    setSelectedContratForPaiements(null);
                    setPaiements([]);
                    payForm.reset();
                }}
                title={
                    <Group align="center">
                        <IconReceipt size={24} />
                        <Text fw={700}>Paiements pour le contrat de</Text>
                        <Text fw={700} c="blue">{selectedContratForPaiements?.chambre_titre || '...'}</Text>
                    </Group>
                }
                size="xl"
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
            >
                <Divider my="md" />
                <LoadingOverlay visible={isFetchingPaiements} />
                {paiements.length === 0 && !isFetchingPaiements ? (
                    <Center h={150}>
                        <Alert
                            color="blue"
                            variant="light"
                            title="Aucun paiement trouvé"
                            icon={<IconInfoCircle size={20} />}
                            p="lg"
                            style={{ textAlign: 'center' }}
                        >
                            Aucun paiement n'est enregistré pour ce contrat ou ils sont en cours de génération.
                        </Alert>
                    </Center>
                ) : (
                    <Table verticalSpacing="md" highlightOnHover>
                        <thead>
                            <tr>
                                <th>Montant</th>
                                <th>Statut</th>
                                <th>Date d'échéance</th>
                                <th>Date de paiement</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>{paiementRows}</tbody>
                    </Table>
                )}
            </Modal>
        </Container>
    );
}