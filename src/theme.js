// frontend/src/theme.js

import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  // Define custom colors
  colors: {
    // Airbnb's primary red, with a range of shades
    'airbnb-red': [
      '#FFE8E8', // Lightest
      '#FFC0C0',
      '#FF9898',
      '#FF7070',
      '#FF4848', // Main shade (similar to Airbnb's iconic red)
      '#E64141',
      '#CD3A3A',
      '#B43333',
      '#9B2C2C',
      '#822525', // Darkest
    ],
    // You can add other custom colors here, e.g., for grays, success, warning
    'airbnb-gray': [
        '#F8F9FA', // light
        '#E9ECEF',
        '#DEE2E6',
        '#CED4DA',
        '#ADB5BD', // medium
        '#868E96',
        '#495057',
        '#343A40',
        '#212529', // dark
        '#1A1D21',
    ],
  },

  // Set the primary color for components like buttons, links, etc.
  primaryColor: 'airbnb-red',

  // Customize fonts
  fontFamily: 'Roboto, sans-serif', // Make sure to import this font in your index.html or global CSS
  fontFamilyMonospace: 'Monaco, Courier, monospace',
  headings: { fontFamily: 'Roboto, sans-serif' },

  // Customize spacing (e.g., margins, paddings)
  spacing: {
    xs: rem(4),
    sm: rem(8),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  // Customize radius (e.g., for buttons, cards)
  radius: {
    xs: rem(2),
    sm: rem(4),
    md: rem(8),
    lg: rem(16),
    xl: rem(32),
  },

  // Customize shadows
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  },

  // Add global styles
  // If you need more complex global styles or want to override Mantine defaults significantly,
  // consider using global.css or adding styles directly to your AppShell components.
  globalStyles: (theme) => ({
    body: {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
      color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[9],
    },
  }),
});