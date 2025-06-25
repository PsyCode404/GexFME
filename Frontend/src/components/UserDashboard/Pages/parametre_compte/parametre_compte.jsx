import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import UserHeader from "../../UserHeader/UserHeader";
import { getUser, getToken } from "../../../../services/authService"; // Adjust path as needed
import { useNotification } from "../../../../context/NotificationContext";
import axios from "axios";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./parametre_compte.css";

// Définir l'URL de l'API de manière constante
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const DashboardParametreCompte = () => {
  const [selectedKey, setSelectedKey] = useState("1");
  const [userData, setUserData] = useState({
    nom: "",
    prenom: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const user = getUser();
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !getToken()) {
      console.log("Utilisateur non connecté ou token absent, redirection vers login");
      navigate("/login");
      return;
    }
    fetchUserData();
  }, [userId, navigate]);

  const fetchUserData = async () => {
    const token = getToken();
    console.log("Token pour fetchUserData:", token);
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.log("Erreur 401 dans fetchUserData, redirection vers login");
          navigate("/login");
          return;
        }
        throw new Error("Erreur lors de la récupération des données");
      }
      const data = await response.json();
      setUserData((prev) => ({ ...prev, ...data }));
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = () => {
    const token = getToken();
    console.log("Token pour handleProfileUpdate:", token);
    
    if (!token) {
      console.log("Aucun token trouvé, redirection vers login");
      navigate("/login");
      return;
    }
    
    console.log(`Préparation de la requête PUT pour ${API_URL}/api/users/${userId}`);
    
    // Utiliser XMLHttpRequest au lieu de fetch (fonctionne dans UserFolderSection.jsx)
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${API_URL}/api/users/${userId}`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    
    xhr.onload = function() {
      console.log("Statut de la réponse XHR:", xhr.status);
      console.log("Texte de la réponse XHR:", xhr.responseText);
      
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log("Réponse reçue:", data);
          showSuccess("Vos informations personnelles ont été mises à jour avec succès");
        } catch (e) {
          console.error("Erreur lors du parsing de la réponse:", e);
          showSuccess("Vos informations personnelles ont été mises à jour avec succès");
        }
      } else if (xhr.status === 401) {
        console.log("Erreur 401 dans handleProfileUpdate, redirection vers login");
        showError("Votre session a expiré. Veuillez vous reconnecter.");
        navigate("/login");
      } else {
        console.error("Erreur HTTP:", xhr.status, xhr.statusText);
        try {
          const errorData = JSON.parse(xhr.responseText);
          showError("Impossible de mettre à jour vos informations. Veuillez réessayer.");
        } catch (e) {
          showError("Erreur lors de la mise à jour. Veuillez réessayer plus tard.");
        }
      }
    };
    
    xhr.onerror = function() {
      console.error("Erreur réseau avec XMLHttpRequest");
      showError("Erreur de connexion au serveur. Vérifiez votre connexion et réessayez.");
    };
    
    // Préparer et envoyer les données
    const requestData = {
      nom: userData.nom || "",
      prenom: userData.prenom || "",
      email: userData.email || ""
    };
    
    console.log("Données envoyées dans xhr:", requestData);
    xhr.send(JSON.stringify(requestData));
  };

  const handlePasswordUpdate = async () => {
    if (userData.newPassword !== userData.confirmPassword) {
      showError("Les mots de passe ne correspondent pas");
      return;
    }
    
    if (!userData.currentPassword || !userData.newPassword) {
      showError("Veuillez remplir tous les champs");
      return;
    }
    
    const token = getToken();
    console.log("Token pour handlePasswordUpdate:", token);
    
    if (!token) {
      console.log("Aucun token trouvé, redirection vers login");
      navigate("/login");
      return;
    }
    try {
      // Utiliser fetch au lieu d'axios pour éviter les problèmes CORS
      const response = await fetch(`${API_URL}/api/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: userData.currentPassword,
          newPassword: userData.newPassword
        }),
        credentials: 'include'
      });
      
      console.log("Statut de la réponse:", response.status);
      
      if (response.ok) {
        showSuccess("Votre mot de passe a été mis à jour avec succès");
        setUserData({
          ...userData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        if (response.status === 401) {
          showError("Le mot de passe actuel est incorrect");
        } else {
          const errorData = await response.text();
          console.error("Détails de l'erreur:", errorData);
          showError("Impossible de mettre à jour votre mot de passe. Veuillez réessayer.");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du mot de passe:", error);
      showError("Erreur de connexion au serveur. Vérifiez votre connexion et réessayez.");
    }
  };

  return (
    <div className="parametre-compte-container">
      <UserHeader />
      <div className="parametre-compte-content">
        <div className="parametre-navigation">
          <Button
            className={`nav-button ${selectedKey === "1" ? "active" : ""}`}
            onClick={() => setSelectedKey("1")}
            icon="pi pi-user"
            label="Profil"
          />
          <Button
            className={`nav-button ${selectedKey === "2" ? "active" : ""}`}
            onClick={() => setSelectedKey("2")}
            icon="pi pi-lock"
            label="Sécurité"
          />
        </div>
        <div className="parametre-content">
          {selectedKey === "1" && (
            <Card title="👤 Informations du Profil" className="p-shadow-4">
              <div className="p-fluid">
                <div className="p-field">
                  <label htmlFor="nom">Nom :</label>
                  <InputText
                    id="nom"
                    name="nom"
                    value={userData.nom}
                    onChange={handleInputChange}
                    placeholder="Entrez votre nom"
                  />
                </div>
                <div className="p-field">
                  <label htmlFor="prenom">Prénom :</label>
                  <InputText
                    id="prenom"
                    name="prenom"
                    value={userData.prenom}
                    onChange={handleInputChange}
                    placeholder="Entrez votre prénom"
                  />
                </div>
                <div className="p-field">
                  <label htmlFor="email">Email :</label>
                  <InputText
                    id="email"
                    name="email"
                    value={userData.email}
                    onChange={handleInputChange}
                    placeholder="Entrez votre email"
                  />
                </div>
                <Button
                  label="Mettre à jour"
                  className="p-mt-3 p-button-primary custom-button"
                  icon="pi pi-check"
                  onClick={handleProfileUpdate}
                />
              </div>
            </Card>
          )}
          {selectedKey === "2" && (
            <Card title="🔒 Sécurité" className="p-shadow-4">
              <div className="p-fluid">
                <div className="p-field">
                  <label htmlFor="currentPassword">Mot de passe actuel :</label>
                  <Password
                    id="currentPassword"
                    name="currentPassword"
                    value={userData.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Entrez le mot de passe actuel"
                    feedback={false}
                  />
                </div>
                <div className="p-field">
                  <label htmlFor="newPassword">Nouveau mot de passe :</label>
                  <Password
                    id="newPassword"
                    name="newPassword"
                    value={userData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Entrez le nouveau mot de passe"
                    feedback={false}
                  />
                </div>
                <div className="p-field">
                  <label htmlFor="confirmPassword">Confirmer le mot de passe :</label>
                  <Password
                    id="confirmPassword"
                    name="confirmPassword"
                    value={userData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirmez le nouveau mot de passe"
                    feedback={false}
                  />
                </div>
                <Button
                  label="Changer le mot de passe"
                  className="p-mt-3 p-button-danger custom-button"
                  icon="pi pi-lock"
                  onClick={handlePasswordUpdate}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardParametreCompte;