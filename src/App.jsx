// App.jsx
import { AppShell } from '@mantine/core';
import { Routes, Route } from 'react-router-dom';

// Import your page components
import Header from './components/Header'; // We'll create/refactor this
import Search from './pages/Search';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage'; // Assuming you'll create a dedicated profile page

import MesProprietesPage from './pages/proprietaire/MesProprietesPage';
import MesChambresPage from './pages/proprietaire/MesChambrePages';
import SearchPage from './pages/Search';
import ChambreDetailPage from './pages/ChambreDetailPage';
import MesRendezVousPage from './pages/proprietaire/MesRendezVousPage';

function App() {
  return (
    <AppShell>
       <Header /> 
    
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<SearchPage />} />
        <Route path="/maisons" element={<MesProprietesPage />} />
        <Route path="/chambres" element={<MesChambresPage />} />
        <Route path="/medias" element={<Search />} />
        <Route path="/profile" element={<ProfilePage />} /> {/* Render a dedicated ProfilePage */}
        <Route path="/chambres/:id/reserver" element={<ChambreDetailPage  />} />
        <Route path="/rendez-vous" element={<MesRendezVousPage />} /> 
        {/* You might want a 404 page for unmatched routes */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
    </AppShell>
  );
}

export default App;