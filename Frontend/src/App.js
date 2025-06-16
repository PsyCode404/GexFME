import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import Login from './components/Login/Login';
import SignUp from './components/SignUp/SignUp';
import AdminDashboard from "./components/AdminDashboard/AdminDashboard";
import UserDashboard from "./components/UserDashboard/UserDashboard";
import UserHome from "./components/UserDashboard/Pages/Home/Home"; // Renamed to UserHome
import ImportationFichiers from "./components/UserDashboard/Pages/Importation Fichiers/ImportationFichiers";
import CalculTA from "./components/UserDashboard/Pages/CalculTA/CalculTA";
import Ressources from "./components/UserDashboard/Pages/Ressources/Ressources";
import Contact from "./components/UserDashboard/Pages/Contact/Contact";
import ParametreCompte from "./components/UserDashboard/Pages/parametre_compte/parametre_compte";
import GestionUtilisateurs from "./components/AdminDashboard/Pages/Gestion Utilisateurs/GestionUtilisateurs";
import GestionRessources from "./components/AdminDashboard/Pages/Gestion Ressources/GestionRessources";
import GestionLocal from "./components/AdminDashboard/Pages/Gestion Local/GestionLocal";
import Configuration from "./components/AdminDashboard/Pages/Configuration/configuration";
import AdminHome from "./components/AdminDashboard/Pages/Home/Home"; // Renamed to AdminHome
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import './styles/global.css';

function App() {
  return (
    <NotificationProvider>
      <Router>
        <Routes>
        {/* Redirection par défaut vers la page de connexion */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Routes publiques */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        
        {/* Route Admin avec sous-routes (protégées) */}
        <Route 
          path="/admin-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminHome />} /> {/* Use AdminHome as default */}
          <Route path="gestion-utilisateurs" element={<GestionUtilisateurs />} />
          <Route path="gestion-ressources" element={<GestionRessources />} />
          <Route path="gestion-local" element={<GestionLocal />} />
          <Route path="configuration" element={<Configuration />} />
        </Route>
        
        {/* Route Utilisateur avec sous-routes (protégées) */}
        <Route 
          path="/user-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<UserHome />} /> {/* Use UserHome as default */}
          <Route path="importation-fichiers" element={<ImportationFichiers />} />
          <Route path="calcul-ta" element={<CalculTA />} />
          <Route path="ressources" element={<Ressources />} />
          <Route path="contact" element={<Contact />} />
          <Route path="parametre_compte" element={<ParametreCompte />} />
        </Route>

        {/* Redirection pour les routes inconnues */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Router>
    </NotificationProvider>
  );
}

export default App;