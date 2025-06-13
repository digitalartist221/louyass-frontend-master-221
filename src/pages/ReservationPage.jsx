import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Title, Text, Button, Group, Modal, TextInput, NumberInput } from '@mantine/core';
import { IconBed, IconRulerMeasure, IconBath, IconCalendar } from '@tabler/icons-react';
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function ReservationPage() {
  const { id } = useParams();
  const [chambre, setChambre] = useState(null);
  const [opened, setOpened] = useState(false);
  const [dateDebut, setDateDebut] = useState(new Date());
  const [nombreNuit, setNombreNuit] = useState(1);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchChambre = async () => {
      try {
        const response = await api.get(`/chambres/${id}`);
        setChambre(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchChambre();
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/reservations', {
        chambreId: id,
        clientId: user.id,
        dateDebut,
        nombreNuit,
      });
      navigate(`/reservations/${response.data.id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} align="center">
        Réservation
      </Title>
      {chambre && (
        <Group position="apart" mt="md">
          <Text weight={700}>
            {chambre.nom}
          </Text>
          <Text>
            {chambre.prix}€ / nuit
          </Text>
        </Group>
      )}
      <Group position="apart" mt="md">
        <IconBed size={24} />
        <Text>
          {chambre && chambre.nombreLit} lit(s)
        </Text>
      </Group>
      <Group position="apart" mt="md">
        <IconRulerMeasure size={24} />
        <Text>
          {chambre && chambre.superficie} m²
        </Text>
      </Group>
      <Group position="apart" mt="md">
        <IconBath size={24} />
        <Text>
          {chambre && chambre.nombreSalleDeBain} salle(s) de bain
        </Text>
      </Group>
      <Button mt="md" color="blue" onClick={() => setOpened(true)}>
        Réserver
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Réserver cette chambre"
      >
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Date de début"
            type="date"
            value={dateDebut.toISOString().split('T')[0]}
            onChange={(event) => setDateDebut(new Date(event.currentTarget.value))}
            required
          />
          <NumberInput
            label="Nombre de nuit"
            value={nombreNuit}
            onChange={(value) => setNombreNuit(value)}
            min={1}
            max={31}
            required
          />
          <Button type="submit" color="blue" mt="md">
            Réserver
          </Button>
        </form>
      </Modal>
    </Container>
  );
}
