import React from 'react';
import { Card, Image, Text, Group, Badge, Button, Flex } from '@mantine/core';
import { IconBath, IconBed, IconRulerMeasure, IconMapPin } from '@tabler/icons-react'; // Added IconMapPin

function ApartmentCard({ image, title, location, price, type, bedrooms, bathrooms, area, description }) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image
          src={image || 'https://via.placeholder.com/300x200?text=Apartment+Image'} // Fallback image
          height={180}
          alt={title}
          fit="cover" // Ensure image covers the area
        />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={600} size="xl" lineClamp={1}>{title}</Text>
        <Badge color="blue" variant="filled" radius="sm">{type}</Badge>
      </Group>

      <Group gap="xs" mb="sm">
        <IconMapPin size={16} color="var(--mantine-color-dimmed)" />
        <Text size="sm" c="dimmed">{location}</Text>
      </Group>

      <Text size="xl" fw={700} c="green" mb="md">
        {price.toLocaleString('fr-FR')} FCFA
      </Text>

      <Flex gap="md" wrap="wrap" mb="md">
        {bedrooms && (
          <Group gap="xs">
            <IconBed size={18} color="var(--mantine-color-gray-6)" />
            <Text size="sm">{bedrooms} ch.</Text>
          </Group>
        )}
        {bathrooms && (
          <Group gap="xs">
            <IconBath size={18} color="var(--mantine-color-gray-6)" />
            <Text size="sm">{bathrooms} sdb.</Text>
          </Group>
        )}
        {area && (
          <Group gap="xs">
            <IconRulerMeasure size={18} color="var(--mantine-color-gray-6)" />
            <Text size="sm">{area} m²</Text>
          </Group>
        )}
      </Flex>

      <Text size="sm" c="dimmed" lineClamp={3} mb="md">
        {description}
      </Text>

      <Button variant="light" color="blue" fullWidth radius="md">
        Voir les détails
      </Button>
    </Card>
  );
}

export default ApartmentCard;