

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core'; // Import MantineProvider
import { Notifications } from '@mantine/notifications'; // Import Notifications component

import App from './App.jsx';
// --- IMPORTANT: Ensure this import path is correct ---
import { AuthProvider } from './auth/AuthContext'; 

// Import Mantine's global CSS
import '@mantine/core/styles.css';
// Import Mantine Notifications CSS
import '@mantine/notifications/styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* MantineProvider wraps the entire app to provide theme and styles */}
      <MantineProvider defaultColorScheme="light"> {/* Or "dark", or "auto" */}
        {/* Notifications component for displaying toasts */}
        <Notifications />
        <AuthProvider>
          <App />
        </AuthProvider>
      </MantineProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
