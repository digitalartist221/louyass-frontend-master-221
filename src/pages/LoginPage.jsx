// frontend/src/pages/LoginPage.jsx

import { useAuth } from "../auth/AuthContext";
import { useForm } from '@mantine/form'; // Import useForm hook
import { TextInput, PasswordInput, Button, Paper, Title, Text, Anchor, Group } from '@mantine/core'; // Import Mantine components
import { Link } from 'react-router-dom'; // For navigation
import React from "react";

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  // Initialize Mantine form with validation rules
  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email invalide'),
      password: (value) => (value.length >= 6 ? null : 'Le mot de passe doit contenir au moins 6 caractères'),
    },
  });

  const handleLogin = async (values) => {
    try {
      await login(values.email, values.password);
      // Navigation is handled by AuthContext on success
    } catch (err) {
      // Errors are handled by AuthContext notifications
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ maxWidth: 450, width: '100%' }}>
        <Title order={2} ta="center" mt="md" mb={30}>
          Se connecter
        </Title>

        <form onSubmit={form.onSubmit(handleLogin)}>
          <TextInput
            label="Email"
            placeholder="votre@email.com"
            required
            {...form.getInputProps('email')} // Connects Mantine form to input
          />
          <PasswordInput
            label="Mot de passe"
            placeholder="Votre mot de passe"
            required
            mt="md"
            {...form.getInputProps('password')} // Connects Mantine form to input
          />

          <Button type="submit" fullWidth mt="xl" loading={isLoading}>
            Se connecter
          </Button>

          <Group mt="md" justify="center">
            <Text c="dimmed" size="sm">
              Pas de compte ?{' '}
              <Anchor component={Link} to="/register" size="sm">
                S'inscrire
              </Anchor>
            </Text>
          </Group>
        </form>
      </Paper>
    </div>
  );
}