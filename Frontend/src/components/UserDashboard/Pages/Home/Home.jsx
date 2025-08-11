import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Row, Col, Space } from "antd";
import { FolderOutlined, CalculatorOutlined, FileOutlined } from "@ant-design/icons";
import { jwtDecode } from "jwt-decode";
import logo from "../../../../assets/logo.png";
import "./Home.css";

const { Title, Text, Paragraph } = Typography;

const Home = () => {
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Récupérer le token JWT du localStorage
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // Décoder le token pour obtenir les informations de l'utilisateur
        const decodedToken = jwtDecode(token);
        if (decodedToken && decodedToken.identity) {
          // Extraire le prénom et le nom de l'utilisateur
          const userId = decodedToken.identity;
          
          // Récupérer les informations de l'utilisateur depuis l'API
          fetch(`${process.env.REACT_APP_API_URL || "https://gexfme.onrender.com"}/api/users/${userId}`)
            .then(response => response.json())
            .then(data => {
              setUserName(`${data.prenom} ${data.nom}`);
            })
            .catch(error => {
              console.error("Erreur lors de la récupération des informations utilisateur:", error);
            });
        }
      } catch (error) {
        console.error("Erreur lors du décodage du token:", error);
      }
    }
  }, []);

  const featureCards = [
    {
      title: "Importation Fichiers",
      description: "Importez et gérez vos fichiers de projets facilement et en toute sécurité.",
      icon: <FolderOutlined className="feature-icon" />,
      path: "/user-dashboard/importation-fichiers"
    },
    {
      title: "Calcul des Surfaces",
      description: "Calculez automatiquement les surfaces de vos projets avec précision.",
      icon: <CalculatorOutlined className="feature-icon" />,
      path: "/user-dashboard/calcul-ta"
    },
    {
      title: "Ressources",
      description: "Accédez à des ressources et documentations pour optimiser votre travail.",
      icon: <FileOutlined className="feature-icon" />,
      path: "/user-dashboard/ressources"
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
          <img src={logo} alt="GExpertise Logo" className="welcome-logo" />
          <div className="welcome-text">
            <Title level={3} className="welcome-title">Bienvenue {userName}</Title>
            <Paragraph className="welcome-description">
              Votre plateforme tout-en-un pour la gestion de projets, le calcul de surfaces et la collaboration d'équipe.
              Commencez par explorer les fonctionnalités ci-dessous.
            </Paragraph>
          </div>
        </div>
      </Card>

      {/* Section des fonctionnalités */}
      <div className="features-section">
        <div className="section-header">
          <Title level={4} className="section-title">Découvrez les fonctionnalités</Title>
          <Text type="secondary" className="section-subtitle">
            Naviguez facilement entre les différentes sections de l'application
          </Text>
        </div>
        
        <Row gutter={[24, 24]} className="feature-cards">
          {featureCards.map((card, index) => (
            <Col xs={24} sm={24} md={8} lg={8} xl={8} key={index}>
              <Card 
                className="feature-card" 
                onClick={() => handleCardClick(card.path)}
                hoverable
                bordered={false}
              >
                <div className="card-content">
                  <div className="icon-container">
                    {card.icon}
                  </div>
                  <Title level={4} className="card-title">{card.title}</Title>
                  <Paragraph className="card-description">
                    {card.description}
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
