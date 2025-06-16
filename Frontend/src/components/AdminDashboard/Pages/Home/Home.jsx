import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Row, Col, Space, Badge } from "antd";
import { 
  UserOutlined, 
  TeamOutlined, 
  SettingOutlined, 
  FileOutlined, 
  DashboardOutlined 
} from "@ant-design/icons";
import { jwtDecode } from "jwt-decode";
import logo from "../../../../assets/logo.png";
import "./Home.css";

const { Title, Text, Paragraph } = Typography;

const Home = () => {
  const [adminName, setAdminName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Récupérer le token JWT du localStorage
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // Décoder le token pour obtenir les informations de l'administrateur
        const decodedToken = jwtDecode(token);
        if (decodedToken && decodedToken.identity) {
          // Extraire l'ID de l'administrateur
          const adminId = decodedToken.identity;
          
          // Récupérer les informations de l'administrateur depuis l'API
          fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/users/${adminId}`)
            .then(response => response.json())
            .then(data => {
              setAdminName(`${data.prenom} ${data.nom}`);
            })
            .catch(error => {
              console.error("Erreur lors de la récupération des informations administrateur:", error);
            });
        }
      } catch (error) {
        console.error("Erreur lors du décodage du token:", error);
      }
    }
  }, []);

  const adminFeatures = [
    {
      title: "Gestion des Utilisateurs",
      description: "Créez, modifiez et gérez les comptes utilisateurs de la plateforme.",
      icon: <UserOutlined className="feature-icon" />,
      path: "/admin-dashboard/gestion-utilisateurs"
    },
    {
      title: "Configuration",
      description: "Configurez les paramètres globaux de l'application et du système.",
      icon: <SettingOutlined className="feature-icon" />,
      path: "/admin-dashboard/configuration"
    },
    {
      title: "Gestion des Ressources",
      description: "Gérez les documents et ressources disponibles pour les utilisateurs.",
      icon: <FileOutlined className="feature-icon" />,
      path: "/admin-dashboard/gestion-ressources"
    }
  ];

  const handleCardClick = (path) => {
    navigate(path);
  };

  return (
    <div className="home-container">
      {/* Carte de bienvenue */}
      <Card className="welcome-card" bordered={false}>
        <div className="welcome-content">
          <div className="logo-container">
            <img src={logo} alt="GExpertise Logo" className="welcome-logo" />
          </div>
          <div className="welcome-text">
            <span className="admin-badge">Administration</span>
            <Title level={3} className="welcome-title">Bienvenue {adminName}</Title>
            <Paragraph className="welcome-description">
              Panneau d'administration de GExpertise. Gérez les utilisateurs, les équipes, les paramètres système 
              et surveillez les performances de la plateforme depuis cette interface centralisée.
            </Paragraph>
          </div>
        </div>
      </Card>

      {/* Section des fonctionnalités */}
      <div className="features-section">
        <div className="section-header">
          <Title level={4} className="section-title">Fonctionnalités d'Administration</Title>
          <Text type="secondary" className="section-subtitle">
            Accédez rapidement à toutes les fonctions d'administration de la plateforme
          </Text>
        </div>
        
        <Row gutter={[24, 24]} className="feature-cards">
          {adminFeatures.map((feature, index) => (
            <Col xs={24} sm={24} md={12} lg={8} xl={8} key={index}>
              <Card 
                className="feature-card" 
                onClick={() => handleCardClick(feature.path)}
                hoverable
                bordered={false}
              >
                <div className="card-content">
                  <div className="icon-container">
                    {feature.icon}
                  </div>
                  <Title level={4} className="card-title">{feature.title}</Title>
                  <Paragraph className="card-description">
                    {feature.description}
                  </Paragraph>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default Home;
