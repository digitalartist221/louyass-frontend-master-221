// frontend/src/pages/MesPaiementsProprietairePage.jsx
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
    Tabs, // Added Tabs for navigation between "All" and "Pending" payments
    Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconAlertTriangle,
    IconInfoCircle,
    IconRefresh,
    IconHome,
    IconCalendarEvent,
    IconCash,
    IconHourglass,
    IconCheck,
    IconFileText, // For the main title
    IconReceipt, // For payment-related icons
    IconUser, // For locataire
} from '@tabler/icons-react';

import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';

import '@mantine/dates/styles.css';

// --- Constantes de Configuration (Reuses from your provided code) ---
const STATUT_PAIEMENT = {
    paye: { label: 'Payé', color: 'green' },
    impaye: { label: 'Impayé', color: 'orange' },
    en_attente: { label: 'À Venir', color: 'blue' },
    annule: { label: 'Annulé', color: 'gray' },
    simule: { label: 'Prévu', color: 'cyan' }, // Added 'simule' if it's a potential status
};

// --- Fonctions Utilitaires (Reuses from your provided code) ---
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

const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    let date;
    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
    } else {
        return 'N/A';
    }

    if (isNaN(date.getTime())) {
        return 'Date invalide';
    }
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const formatDateTime = (dateTimeInput) => {
    if (!dateTimeInput) return 'N/A';
    let date;
    if (dateTimeInput instanceof Date) {
        date = dateTimeInput;
    } else if (typeof dateTimeInput === 'string') {
        date = new Date(dateTimeInput);
    } else {
        return 'N/A';
    }

    if (isNaN(date.getTime())) {
        return 'Date invalide';
    }
    return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// --- Composant Principal ---
export default function MesPaiementsProprietairePage() {
    const theme = useMantineTheme();
    const { user } = useAuth();

    const [allPayments, setAllPayments] = useState([]);
    const [pendingMonthlyPayments, setPendingMonthlyPayments] = useState([]);
    const [isFetchingPayments, setIsFetchingPayments] = useState(true);
    const [globalError, setGlobalError] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'pending-this-month'

    // --- Fonctions de Récupération des Données ---
    const fetchAllPayments = useCallback(async () => {
        setIsFetchingPayments(true);
        setGlobalError(null);
        try {
            if (!user?.id || user?.role !== "proprietaire") {
                setAllPayments([]);
                setGlobalError("Vous devez être connecté en tant que propriétaire pour voir les paiements de vos maisons.");
                setIsFetchingPayments(false);
                return;
            }

            const response = await api.get(`/proprietaire/paiements/`);
            setAllPayments(response.data || []);
            console.log("Tous les paiements du propriétaire:", response.data);
        } catch (error) {
            console.error('Erreur lors du chargement de tous les paiements du propriétaire:', error);
            const errorMessage = getErrorMessage(error);
            setGlobalError(errorMessage);
            setAllPayments([]);
        } finally {
            setIsFetchingPayments(false);
        }
    }, [user]);

    const fetchPendingMonthlyPayments = useCallback(async () => {
        setIsFetchingPayments(true);
        setGlobalError(null);
        try {
            if (!user?.id || user?.role !== "proprietaire") {
                setPendingMonthlyPayments([]);
                setGlobalError("Vous devez être connecté en tant que propriétaire pour voir les paiements en attente.");
                setIsFetchingPayments(false);
                return;
            }

            const response = await api.get(`/proprietaire/paiements/pending-this-month`);
            setPendingMonthlyPayments(response.data || []);
            console.log("Paiements en attente ce mois-ci:", response.data);
        } catch (error) {
            console.error('Erreur lors du chargement des paiements en attente du mois:', error);
            const errorMessage = getErrorMessage(error);
            setGlobalError(errorMessage);
            setPendingMonthlyPayments([]);
        } finally {
            setIsFetchingPayments(false);
        }
    }, [user]);

    // --- Hooks d'Effets (useEffect) ---
    useEffect(() => {
        if (activeTab === 'all') {
            fetchAllPayments();
        } else if (activeTab === 'pending-this-month') {
            fetchPendingMonthlyPayments();
        }
    }, [activeTab, fetchAllPayments, fetchPendingMonthlyPayments]);

    // --- Gestionnaire de Changement d'Onglet ---
    const handleTabChange = (value) => {
        setActiveTab(value);
    };

    // --- Rendu des Lignes de Tableau des Paiements ---
    const renderPaymentRows = (payments) => {
        if (!payments || payments.length === 0) {
            return (
                <Table.Tr>
                    <Table.Td colSpan={7}>
                        <Center py="lg">
                            <Text c="dimmed">Aucun paiement à afficher.</Text>
                        </Center>
                    </Table.Td>
                </Table.Tr>
            );
        }

        return payments.map((paiement) => {
            const statutPaiementConfig = STATUT_PAIEMENT[paiement.statut] || { label: 'Inconnu', color: 'gray' };
            const chambreTitle = paiement.chambre?.titre || 'Chambre inconnue';
            const maisonAddress = paiement.chambre?.maison?.adresse || 'Adresse inconnue';
            const locataireEmail = paiement.locataire?.email || 'Locataire inconnu';

            return (
                <Table.Tr key={paiement.id}>
                    <Table.Td>
                        <Group noWrap>
                            <IconHome size={16} color={theme.colors.gray[6]} />
                            <Stack spacing={0}>
                                <Text fw={500}>{chambreTitle}</Text>
                                <Text size="xs" c="dimmed">{maisonAddress}</Text>
                            </Stack>
                        </Group>
                    </Table.Td>
                    <Table.Td>
                        <Group noWrap>
                            <IconUser size={16} color={theme.colors.gray[6]} />
                            <Text>{locataireEmail}</Text>
                        </Group>
                    </Table.Td>
                    <Table.Td>
                        <Group noWrap>
                            <IconCash size={16} color={theme.colors.gray[6]} />
                            <Text>{paiement.chambre?.prix || 'N/A'} CFA</Text>
                        </Group>
                    </Table.Td>
                    <Table.Td>
                        <Group noWrap>
                            <IconCalendarEvent size={16} color={theme.colors.gray[6]} />
                            <Text>{formatDate(paiement.date_echeance)}</Text>
                        </Group>
                    </Table.Td>
                    <Table.Td>{formatDate(paiement.date_paiement) || 'N/A'}</Table.Td>
                    <Table.Td>
                        <Badge
                            color={statutPaiementConfig.color}
                            variant="light"
                            radius="sm"
                        >
                            {statutPaiementConfig.label}
                        </Badge>
                    </Table.Td>
                    <Table.Td>{formatDateTime(paiement.cree_le)}</Table.Td>
                </Table.Tr>
            );
        });
    };

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
            <LoadingOverlay visible={isFetchingPayments} overlayBlur={2} />

            <Stack spacing="xl">
                <Group justify="space-between" align="center">
                    <Title order={2}>
                        <IconCash size={28} style={{ marginRight: 10, verticalAlign: 'middle' }} />
                        Mes Paiements de Location (Propriétaire)
                    </Title>
                    <Button
                        leftSection={<IconRefresh size={16} />}
                        onClick={activeTab === 'all' ? fetchAllPayments : fetchPendingMonthlyPayments}
                        variant="outline"
                        disabled={isFetchingPayments}
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

                {!isFetchingPayments && !globalError && (
                    <Tabs value={activeTab} onChange={handleTabChange} keepMounted={false}>
                        <Tabs.List>
                            <Tabs.Tab value="all" leftSection={<IconReceipt size={18} />}>
                                Tous les paiements
                            </Tabs.Tab>
                            <Tabs.Tab value="pending-this-month" leftSection={<IconHourglass size={18} />}>
                                Paiements en attente ce mois-ci
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="all" pt="md">
                            <Paper shadow="sm" radius="md" p="md" style={{ background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0], border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}` }}>
                                <Title order={4} mb="md">Liste de tous les paiements</Title>
                                <Table miw={1000} verticalSpacing="sm" highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Propriété</Table.Th>
                                            <Table.Th>Locataire</Table.Th>
                                            <Table.Th>Montant</Table.Th>
                                            <Table.Th>Date d'échéance</Table.Th>
                                            <Table.Th>Date de Paiement</Table.Th>
                                            <Table.Th>Statut</Table.Th>
                                            <Table.Th>Créé le</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>{renderPaymentRows(allPayments)}</Table.Tbody>
                                </Table>
                            </Paper>
                        </Tabs.Panel>

                        <Tabs.Panel value="pending-this-month" pt="md">
                            <Paper shadow="sm" radius="md" p="md" style={{ background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0], border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}` }}>
                                <Title order={4} mb="md">Paiements en attente pour le mois en cours</Title>
                                <Table miw={1000} verticalSpacing="sm" highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Propriété</Table.Th>
                                            <Table.Th>Locataire</Table.Th>
                                            <Table.Th>Montant</Table.Th>
                                            <Table.Th>Date d'échéance</Table.Th>
                                            <Table.Th>Date de Paiement</Table.Th>
                                            <Table.Th>Statut</Table.Th>
                                            <Table.Th>Créé le</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>{renderPaymentRows(pendingMonthlyPayments)}</Table.Tbody>
                                </Table>
                            </Paper>
                        </Tabs.Panel>
                    </Tabs>
                )}
            </Stack>
        </Container>
    );
}