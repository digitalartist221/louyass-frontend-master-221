// frontend/src/pages/MesContratsLocatairePage.jsx
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
    Divider,
    Checkbox,
    NumberInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
    IconCheck,
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

// --- Constantes de Configuration ---
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
    simule: { label: 'Prévu', color: 'cyan' }, // Nouveau statut pour les paiements simulés
};

const PERIODICITE = {
    journalier: { label: 'Journalier', days: 1, color: 'grape' },
    hebdomadaire: { label: 'Hebdomadaire', days: 7, color: 'indigo' },
    mensuel: { label: 'Mensuel', days: 30, color: 'violet' },
    trimestriel: { label: 'Trimestriel', days: 90, color: 'pink' },
    annuel: { label: 'Annuel', days: 365, color: 'teal' },
};

// --- Fonctions Utilitaires Améliorées ---
const formatDateToISO = (dateInput) => {
    if (!dateInput) return '';
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toISOString().split('T')[0];
};

const getErrorMessage = (error) => {
    if (error.response) {
        if (error.response.status === 422 && Array.isArray(error.response.data?.detail)) {
            return error.response.data.detail.map(err => {
                const loc = err.loc.length > 0 ? `[${err.loc.join('.')}] ` : '';
                return `${loc}${err.msg}`;
            }).join('; ');
        } else if (typeof error.response.data?.detail === 'string') {
            return error.response.data.detail;
        } else if (error.response.data) {
            return JSON.stringify(error.response.data);
        }
    }
    return error.message || "Une erreur inattendue est survenue.";
};

// Fonction de formatage de date plus robuste
const formatDate = (dateInput) => {
    if (!dateInput) return ''; // Retourne vide si null ou undefined
    let date;
    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
    } else {
        return ''; // Gère les types inattendus
    }

    if (isNaN(date.getTime())) {
        return ''; // Date invalide
    }
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const formatDateTime = (dateTimeInput) => {
    if (!dateTimeInput) return ''; // Retourne vide si null ou undefined
    let date;
    if (dateTimeInput instanceof Date) {
        date = dateTimeInput;
    } else if (typeof dateTimeInput === 'string') {
        date = new Date(dateTimeInput);
    } else {
        return '';
    }

    if (isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// --- Fonction pour simuler les paiements futurs ---
const generateSimulatedPayments = (contrat, existingPayments) => {
    const simulated = [];
    // Utiliser les opérateurs OR pour fournir des valeurs par défaut si les champs sont manquants
    const startDate = new Date(contrat.date_debut || new Date());
    const endDate = new Date(contrat.date_fin || new Date(new Date().setFullYear(new Date().getFullYear() + 1))); // Default to 1 year later
    const periodicPrice = contrat.chambre?.prix || 0; // Utiliser chambre.prix
    const periodicity = contrat.periodicite || 'mensuel'; // Default to monthly

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const existingPaymentDates = new Set(existingPayments.map(p => new Date(p.date_echeance).toISOString().split('T')[0]));

    // Limiter la simulation à un nombre raisonnable de paiements (ex: 2 ans ou 24 paiements)
    let maxSimulatedPayments = 24; 
    let count = 0;

    while (currentDate <= endDate && count < maxSimulatedPayments) {
        const dueDateISO = currentDate.toISOString().split('T')[0];
        if (!existingPaymentDates.has(dueDateISO)) {
            simulated.push({
                id: `sim-${simulated.length}-${contrat.id}-${currentDate.getTime()}`,
                contrat_id: contrat.id,
                montant: periodicPrice,
                date_echeance: new Date(currentDate),
                date_paiement: null,
                statut: currentDate < today ? 'impaye' : 'en_attente',
                isSimulated: true,
            });
            count++;
        }

        // Advance date based on periodicity
        switch (periodicity) {
            case 'journalier':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'hebdomadaire':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'mensuel':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            case 'trimestriel':
                currentDate.setMonth(currentDate.getMonth() + 3);
                break;
            case 'annuel':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
            default:
                // Fallback for unknown periodicity to prevent infinite loop
                currentDate.setMonth(currentDate.getMonth() + 1); // Default to monthly
                break;
        }
    }
    return simulated;
};

// --- Composant Principal ---
export default function MesContratsLocatairePage() {
    const theme = useMantineTheme();
    const { user } = useAuth();

    const [contrats, setContrats] = useState([]);
    const [isFetchingContrats, setIsFetchingContrats] = useState(true);
    const [globalError, setGlobalError] = useState(null);

    const [paiementsModalOpened, setPaiementsModalOpened] = useState(false);
    const [selectedContratForPaiements, setSelectedContratForPaiements] = useState(null);
    const [allPaiements, setAllPaiements] = useState([]);
    const [isFetchingPaiements, setIsFetchingPaiements] = useState(false);
    const [isMakingPayment, setIsMakingPayment] = useState(false);
    const [selectedPaymentsToPay, setSelectedPaymentsToPay] = useState({});

    const payForm = useForm({
        initialValues: {
            date_paiement: new Date(),
        },
        validate: {
            date_paiement: (value) => (value ? null : 'La date de paiement est requise'),
        },
    });

    // --- Fonctions de Récupération des Données ---
    const fetchContratsLocataire = useCallback(async () => {
        setIsFetchingContrats(true);
        setGlobalError(null);
        try {
            if (!user?.id || user?.role !== "locataire") {
                setContrats([]);
                setGlobalError("Vous devez être connecté en tant que locataire pour voir vos contrats.");
                setIsFetchingContrats(false);
                return;
            }

            const response = await api.get(`/locataire/contrats/`);
            // Formatage des contrats selon la nouvelle structure
            const formattedContrats = response.data.map(contrat => ({
                ...contrat,
                chambre: contrat.chambre || {},
                maison: contrat.chambre?.maison || {},
            }));
            setContrats(formattedContrats || []);
            console.log("Contrats locataire:", formattedContrats);
        } catch (error) {
            console.error('Erreur lors du chargement des contrats du locataire:', error);
            const errorMessage = getErrorMessage(error);
            setGlobalError(errorMessage);
            setContrats([]);
        } finally {
            setIsFetchingContrats(false);
        }
    }, [user]);

    const fetchPaiementsForContrat = useCallback(async (contrat) => {
        setIsFetchingPaiements(true);
        try {
            const response = await api.get(`/locataire/contrats/${contrat.id}/paiements`);
            const realPayments = response.data || [];
            
            // Générer les paiements simulés et les combiner avec les réels
            const simulatedPayments = generateSimulatedPayments(contrat, realPayments);

            // Fusionner et trier tous les paiements (réels + simulés) par date d'échéance
            const combinedPayments = [...realPayments, ...simulatedPayments]
                .sort((a, b) => new Date(a.date_echeance).getTime() - new Date(b.date_echeance).getTime());
            
            setAllPaiements(combinedPayments);
            setSelectedPaymentsToPay({});

        } catch (error) {
            console.error('Erreur lors du chargement des paiements:', error);
            const errorMessage = getErrorMessage(error);
            notifications.show({
                title: 'Erreur',
                message: `Impossible de charger les paiements: ${errorMessage}`,
                color: 'red',
                icon: <IconAlertTriangle size={18} />,
            });
            setAllPaiements([]);
        } finally {
            setIsFetchingPaiements(false);
        }
    }, []);

    // --- Hooks d'Effets (useEffect) ---
    useEffect(() => {
        fetchContratsLocataire();
    }, [fetchContratsLocataire]);

    useEffect(() => {
        if (paiementsModalOpened && allPaiements.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const next7Days = new Date(today);
            next7Days.setDate(today.getDate() + 7);

            let overduePaymentsCount = 0;
            let upcomingPaymentsCount = 0;
            const notificationMessages = [];

            allPaiements.forEach(p => {
                const dueDate = p.date_echeance instanceof Date ? p.date_echeance : new Date(p.date_echeance);
                dueDate.setHours(0, 0, 0, 0);

                if (p.statut === 'impaye' && dueDate < today) {
                    overduePaymentsCount++;
                    notificationMessages.push(`Le paiement de ${p.montant || '0'} CFA du ${formatDate(p.date_echeance)} est en retard.`);
                } else if ((p.statut === 'en_attente' || p.isSimulated) && dueDate >= today && dueDate <= next7Days) {
                    upcomingPaymentsCount++;
                    notificationMessages.push(`Le paiement de ${p.montant || '0'} CFA du ${formatDate(p.date_echeance)} est à venir.`);
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
    }, [allPaiements, paiementsModalOpened]);

    // --- Gestionnaires d'Événements ---
    const handleViewPaiements = (contrat) => {
        setSelectedContratForPaiements(contrat);
        setPaiementsModalOpened(true);
        fetchPaiementsForContrat(contrat);
    };

    const handleTogglePaymentSelection = (paiementId) => {
        setSelectedPaymentsToPay(prev => ({
            ...prev,
            [paiementId]: !prev[paiementId]
        }));
    };

    const handlePaySelected = async () => {
        if (!payForm.validate().hasErrors) {
            const values = payForm.values;
            const selectedIds = Object.keys(selectedPaymentsToPay).filter(id => selectedPaymentsToPay[id]);
            const paymentsToProcess = allPaiements.filter(p => selectedIds.includes(p.id));

            if (paymentsToProcess.length === 0) {
                notifications.show({
                    title: 'Aucun paiement sélectionné',
                    message: 'Veuillez sélectionner au moins un paiement à effectuer.',
                    color: 'orange',
                    icon: <IconAlertTriangle size={18} />,
                });
                return;
            }

            setIsMakingPayment(true);
            try {
                for (const paiement of paymentsToProcess) {
                    const payload = {
                        date_paiement: values.date_paiement.toISOString().split('T')[0],
                    };

                    if (paiement.isSimulated) {
                        const createPayload = {
                            contrat_id: paiement.contrat_id,
                            montant: paiement.montant || 0,
                            date_echeance: formatDateToISO(paiement.date_echeance),
                            date_paiement: formatDateToISO(values.date_paiement),
                            statut: 'paye',
                        };
                        await api.post('/paiements/', createPayload);
                        notifications.show({
                            title: `Paiement créé et marqué comme payé !`,
                            message: `Paiement prévu de ${paiement.montant || '0'} CFA du ${formatDate(paiement.date_echeance)} enregistré.`,
                            color: 'blue',
                            icon: <IconInfoCircle size={18} />,
                        });

                    } else {
                        await api.put(`/paiements/${paiement.id}/payer`, payload);
                        notifications.show({
                            title: `Paiement enregistré !`,
                            message: `Paiement de ${paiement.montant || '0'} CFA du ${formatDate(paiement.date_echeance)} marqué comme payé.`,
                            color: 'green',
                            icon: <IconCheck size={18} />,
                        });
                    }
                }

                fetchPaiementsForContrat(selectedContratForPaiements);
                payForm.reset();
                setSelectedPaymentsToPay({});

            } catch (error) {
                console.error('Erreur lors de l\'enregistrement des paiements:', error);
                const errorMessage = getErrorMessage(error);
                notifications.show({
                    title: 'Erreur',
                    message: `Erreur lors de l'enregistrement des paiements : ${errorMessage}`,
                    color: 'red',
                    icon: <IconAlertTriangle size={18} />,
                });
            } finally {
                setIsMakingPayment(false);
            }
        } else {
            notifications.show({
                title: 'Erreur de saisie',
                message: 'Veuillez corriger les erreurs dans le formulaire.',
                color: 'orange',
                icon: <IconAlertTriangle size={18} />,
            });
        }
    };

    // --- Rendu des Lignes de Tableau des Contrats ---
    const contratRows = contrats.map((contrat) => {
        const periodiciteLabel = PERIODICITE[contrat.periodicite]?.label || 'Non défini';
        const statutContratLabel = STATUT_CONTRAT[contrat.statut]?.label || 'Inconnu';
        const statutContratColor = STATUT_CONTRAT[contrat.statut]?.color || 'gray';

        return (
            <Table.Tr key={contrat.id}>
                <Table.Td>
                    <Group noWrap>
                        <IconHome size={16} color={theme.colors.gray[6]} />
                        <Stack spacing={0}>
                            <Text fw={500}>{contrat.chambre?.titre || 'Titre inconnu'}</Text>
                            <Text size="xs" c="dimmed">
                                {contrat.maison?.adresse || 'Adresse inconnue'}
                                {contrat.maison?.ville ? `, ${contrat.maison?.ville}` : ''}
                            </Text>
                        </Stack>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Group noWrap>
                        <IconCalendarEvent size={16} color={theme.colors.gray[6]} />
                        <Stack spacing={0}>
                            <Text>Du: {formatDate(contrat.date_debut) || 'Non défini'}</Text>
                            <Text>Au: {formatDate(contrat.date_fin) || 'Non défini'}</Text>
                        </Stack>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Stack spacing={0}>
                        <Text size="sm"><IconMoneybag size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Caution: {contrat.montant_caution} CFA</Text>
                        <Text size="sm"><IconCalendarEvent size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Périodicité: {periodiciteLabel}</Text>
                        <Text size="sm"><IconCash size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Loyer: {contrat.chambre?.prix} CFA</Text>
                    </Stack>
                </Table.Td>
                <Table.Td>
                    <Badge
                        color={statutContratColor}
                        variant="light"
                        radius="sm"
                    >
                        {statutContratLabel}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <Group spacing="xs">
                        <Tooltip label="Voir les paiements" position="top" withArrow>
                            <ActionIcon
                                color="blue"
                                onClick={() => handleViewPaiements(contrat)}
                                variant="light"
                                size="md"
                                loading={isFetchingPaiements && selectedContratForPaiements?.id === contrat.id}
                            >
                                <IconReceipt size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Table.Td>
            </Table.Tr>
        );
    });

    // --- Rendu des Lignes de Tableau des Paiements ---
    const paiementRows = allPaiements.map((paiement) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = paiement.date_echeance instanceof Date ? paiement.date_echeance : new Date(paiement.date_echeance);
        dueDate.setHours(0, 0, 0, 0);

        const isOverdue = (paiement.statut === 'impaye' || (paiement.isSimulated && dueDate < today));
        const canPay = (paiement.statut === 'impaye' || paiement.statut === 'en_attente' || paiement.isSimulated) && paiement.date_paiement === null;
        const isSelected = selectedPaymentsToPay[paiement.id];

        let statutColor = STATUT_PAIEMENT[paiement.statut]?.color || 'gray';
        let statutLabel = STATUT_PAIEMENT[paiement.statut]?.label || 'Inconnu';

        if (paiement.isSimulated) {
            statutColor = STATUT_PAIEMENT.simule.color;
            statutLabel = STATUT_PAIEMENT.simule.label;
            if (isOverdue) {
                statutColor = 'red';
                statutLabel = `${statutLabel} (En retard)`;
            }
        } else if (isOverdue) {
            statutColor = 'red';
            statutLabel = `${statutLabel} (En retard)`;
        }

        return (
            <Table.Tr key={paiement.id} style={{ backgroundColor: isSelected ? theme.colors.blue[0] : 'transparent' }}>
                <Table.Td>
                    <Group noWrap>
                        {canPay && (
                            <Checkbox
                                checked={isSelected}
                                onChange={() => handleTogglePaymentSelection(paiement.id)}
                                disabled={isMakingPayment || !canPay}
                            />
                        )}
                        <Text fw={500}>{paiement.montant || '0'} CFA</Text>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Badge
                        color={statutColor}
                        variant="light"
                        radius="sm"
                    >
                        {statutLabel}
                    </Badge>
                </Table.Td>
                <Table.Td>{formatDate(paiement.date_echeance) || 'Non défini'}</Table.Td>
                <Table.Td>{formatDateTime(paiement.date_paiement) || 'Non payé'}</Table.Td>
            </Table.Tr>
        );
    });

    const hasSelectedPayments = Object.values(selectedPaymentsToPay).some(val => val === true);

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
                    setAllPaiements([]);
                    setSelectedPaymentsToPay({});
                    payForm.reset();
                }}
                title={
                    <Group align="center">
                        <IconReceipt size={24} />
                        <Text fw={700}>Paiements pour le contrat de</Text>
                        <Text fw={700} c="blue">{selectedContratForPaiements?.chambre?.titre || '...'}</Text>
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

                <Paper p="md" mb="xl" shadow="xs" style={{ background: theme.colors.gray[1] }}>
                    <Title order={4} mb="sm">Effectuer un Paiement</Title>
                    <Group align="flex-end">
                        <DateInput
                            label="Date du paiement"
                            placeholder="Sélectionnez la date"
                            valueFormat="DD/MM/YYYY"
                            maxDate={new Date()}
                            {...payForm.getInputProps('date_paiement')}
                            style={{ flex: 1 }}
                        />
                        <Button
                            onClick={handlePaySelected}
                            loading={isMakingPayment}
                            disabled={isMakingPayment || !hasSelectedPayments || !payForm.isValid('date_paiement')}
                            leftSection={<IconCash size={16} />}
                        >
                            Payer les sélections ({Object.keys(selectedPaymentsToPay).filter(id => selectedPaymentsToPay[id]).length})
                        </Button>
                    </Group>
                    {payForm.errors.date_paiement && (
                        <Text color="red" size="sm" mt="xs">{payForm.errors.date_paiement}</Text>
                    )}
                </Paper>

                {allPaiements.length === 0 && !isFetchingPaiements ? (
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
                                <th>Sélection / Montant</th>
                                <th>Statut</th>
                                <th>Date d'échéance</th>
                                <th>Date de paiement</th>
                            </tr>
                        </thead>
                        <tbody>{paiementRows}</tbody>
                    </Table>
                )}
            </Modal>
        </Container>
    );
}