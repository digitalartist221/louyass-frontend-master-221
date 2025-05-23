// frontend/src/pages/RegisterPage.jsx

import { useState } from "react";
import api from "../api/axios";
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Anchor, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Link, useNavigate } from 'react-router-dom';
import React from "react";

export default function RegisterPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email invalide'),
      password: (value) => (value.length >= 6 ? null : 'Le mot de passe doit contenir au moins 6 caractères'),
      confirmPassword: (value, { password }) =>
        value === password ? null : 'Les mots de passe ne correspondent pas',
    },
  });

  const handleRegister = async (values) => {
    setIsRegistering(true);
    try {
      await api.post("/auth/register", { email: values.email, password: values.password });
      notifications.show({
        title: 'Inscription réussie!',
        message: 'Votre compte a été créé. Vous pouvez maintenant vous connecter.',
        color: 'green',
      });
      navigate("/login");
    } catch (err) {
      notifications.show({
        title: 'Erreur d\'inscription',
        message: err.response?.data?.detail || 'Une erreur est survenue lors de l\'inscription.',
        color: 'red',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ maxWidth: 450, width: '100%' }}>
        <Title order={2} ta="center" mt="md" mb={30}>
          S'inscrire
        </Title>

        <form onSubmit={form.onSubmit(handleRegister)}>
          <TextInput
            label="Email"
            placeholder="votre@email.com"
            required
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Mot de passe"
            placeholder="Créez un mot de passe"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <PasswordInput
            label="Confirmer le mot de passe"
            placeholder="Confirmez votre mot de passe"
            required
            mt="md"
            {...form.getInputProps('confirmPassword')}
          />

          <Button type="submit" fullWidth mt="xl" loading={isRegistering}>
            S'inscrire
          </Button>

          <Group mt="md" justify="center">
            <Text c="dimmed" size="sm">
              Déjà un compte ?{' '}
              <Anchor component={Link} to="/login" size="sm">
                Se connecter
              </Anchor>
            </Text>
          </Group>
        </form>
      </Paper>
    </div>
  );
}