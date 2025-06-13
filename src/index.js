import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core'; // Import MantineProvider
import { Notifications } from '@mantine/notifications'; // Import Notifications component

import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext'; // Ensure this import path is correct

// Import Mantine's global CSS (should only be imported once)
import '@mantine/core/styles.css';
// Import Mantine Notifications CSS
import '@mantine/notifications/styles.css';

import { theme } from './theme'; // Import your custom theme

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* MantineProvider wraps the entire app to provide theme and styles */}
      {/* Pass your custom theme to the MantineProvider */}
      <MantineProvider>
        {/* Notifications component for displaying toasts */}
        <Notifications />
        <AuthProvider>
          <App />
        </AuthProvider>
      </MantineProvider>
    </BrowserRouter>
  </React.StrictMode>,
);