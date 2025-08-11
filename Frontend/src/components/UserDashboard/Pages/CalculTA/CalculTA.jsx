import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Alert, Button, Divider, notification, Modal } from 'antd';
import { CalculatorOutlined, FileOutlined, SwapOutlined, FileTextOutlined, DownloadOutlined, EyeOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import FileUpload from './FileUpload';
import CalculSurface from './CalculSurface';
import axios from 'axios';

// URL du service dédié pour les dossiers utilisateurs
const API_URL = process.env.REACT_APP_API_URL || 'https://gexfme.onrender.com';
const FOLDER_SERVICE_URL = API_URL;

const { Title, Text } = Typography;

const CalculTA = () => {
    const [folderStructure, setFolderStructure] = useState({ folders: [], files: [] });
    const [loadingFolder, setLoadingFolder] = useState(false);
    const [folderError, setFolderError] = useState(null);
    const [extractedDataProjet, setExtractedDataProjet] = useState(null);
    const [extractedDataExistant, setExtractedDataExistant] = useState(null);
    const [calculResults, setCalculResults] = useState(null);
    const [processingCalcul, setProcessingCalcul] = useState(false);
    const [visaFilePath, setVisaFilePath] = useState(null);
    const [visaContent, setVisaContent] = useState(null);
    const [showVisaContent, setShowVisaContent] = useState(false);

    const fetchFolderFiles = async () => {
        if (!localStorage.getItem('token')) {
            setFolderError('Veuillez vous connecter pour accéder à votre dossier');
            return;
        }

        setLoadingFolder(true);
        try {
            // Extraire l'email du token JWT
            let email = '';
            try {
                const token = localStorage.getItem('token');
                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                email = tokenPayload.email || tokenPayload.sub || '';
                console.log('Email extrait du token:', email);
            } catch (e) {
                console.error('Erreur lors de l\'extraction de l\'email du token:', e);
                setFolderError('Erreur lors de l\'extraction des informations utilisateur');
                setLoadingFolder(false);
                return;
            }
            
            // Utiliser le service dédié pour récupérer les fichiers
            const response = await axios.post(`${FOLDER_SERVICE_URL}/get-folder-files`, {
                email: email
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            setFolderStructure(response.data || { folders: [], files: [] });
            console.log('Folder structure:', response.data);
            console.log('Folders:', response.data?.folders);
            console.log('Files:', response.data?.files);
            setFolderError(null);
        } catch (error) {
            console.error('Erreur lors de la récupération des fichiers:', error);
            setFolderError(error.response?.data?.error || 'Erreur lors du chargement des fichiers du dossier');
        } finally {
            setLoadingFolder(false);
        }
    };

    useEffect(() => {
        fetchFolderFiles();
    }, []);

    return (
        <div
            style={{
                height: 'calc(100vh - 64px)',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fafafa',
                padding: '24px',
                overflowY: 'auto',
                boxSizing: 'border-box',
            }}
        >
            {/* Header Section */}
            <div
                style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    marginBottom: '24px',
                    borderBottom: '1px solid #e5e7eb',
                }}
            >
                <Title
                    level={3}
                    style={{
                        margin: 0,
                        color: '#0052cc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontWeight: 600,
                    }}
                >
                    <CalculatorOutlined /> Surface Calculator
                </Title>
                <Text
                    style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', display: 'block' }}
                >
                    Calculez automatiquement la surface à partir de fichiers .dxf
                </Text>
            </div>

            {/* Alert */}
            <Alert
                message={<Text strong>Format supporté : .dxf uniquement</Text>}
                description="Pour des calculs précis, seuls les fichiers .dxf sont acceptés."
                type="info"
                showIcon
                style={{
                    marginBottom: '24px',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: '#dbeafe',
                    border: 'none',
                    borderLeft: '4px solid #3b82f6',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                }}
            />

            {/* Main Content */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Row
                    gutter={[16, 16]}
                    style={{
                        flex: '1 0 auto',
                        alignItems: 'flex-start',
                        width: '100%',
                    }}
                >
                    {/* Fichiers du dossier personnel */}
                    <Col xs={24} md={12} lg={8}>
                        <Card
                            title={
                                <Space>
                                    <FileOutlined style={{ color: '#0052cc' }} />
                                    <Text strong style={{ color: '#000000d9' }}>Importation de fichier .dxf</Text>
                                </Space>
                            }
                            extra={
                                <Button
                                    type="text"
                                    icon={<ReloadOutlined style={{ transition: 'transform 0.5s', transform: loadingFolder ? 'rotate(360deg)' : 'none' }} />}
                                    onClick={fetchFolderFiles}
                                    loading={loadingFolder}
                                >
                                    Rafraîchir
                                </Button>
                            }
                            bordered={false}
                            style={{
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                width: '100%',
                            }}
                            bodyStyle={{ padding: '20px', overflow: 'auto' }}
                            hoverable
                        >
                            <FileUpload
                                folderStructure={folderStructure}
                                loading={loadingFolder}
                                error={folderError}
                                type="folder"
                                setExtractedData={setExtractedDataProjet}
                                extractedData={extractedDataProjet}
                                fileType="projet"
                            />
                        </Card>
                    </Col>

                    {/* Importation de projet .dxf (Copied from Fichiers du dossier personnel) */}
                    <Col xs={24} md={12} lg={8}>
                        <Card
                            title={
                                <Space>
                                    <FileOutlined style={{ color: '#0052cc' }} />
                                    <Text strong style={{ color: '#000000d9' }}>Importation d'existant .dxf</Text>
                                </Space>
                            }
                            extra={
                                <Button
                                    type="text"
                                    icon={<ReloadOutlined style={{ transition: 'transform 0.5s', transform: loadingFolder ? 'rotate(360deg)' : 'none' }} />}
                                    onClick={fetchFolderFiles}
                                    loading={loadingFolder}
                                >
                                    Rafraîchir
                                </Button>
                            }
                            bordered={false}
                            style={{
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                width: '100%',
                            }}
                            bodyStyle={{ padding: '20px', overflow: 'auto' }}
                            hoverable
                        >
                            <FileUpload
                                folderStructure={folderStructure}
                                loading={loadingFolder}
                                error={folderError}
                                type="folder"
                                setExtractedData={setExtractedDataExistant}
                                extractedData={extractedDataExistant}
                                fileType="existant"
                            />
                        </Card>
                    </Col>

                    {/* Calculateur de surface */}
                    <Col xs={24} md={12} lg={8}>
                        <Card
                            title={
                                <Space>
                                    <CalculatorOutlined style={{ color: '#0052cc' }} />
                                    <Text strong style={{ color: '#000000d9' }}>Calcul Surface</Text>
                                </Space>
                            }
                            bordered={false}
                            style={{
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                width: '100%',
                            }}
                            bodyStyle={{ padding: '20px', height: '100%' }}
                            hoverable
                        >
                            <CalculSurface 
                                extractedDataProjet={extractedDataProjet} 
                                extractedDataExistant={extractedDataExistant}
                                setCalculResults={setCalculResults}
                                calculResults={calculResults}
                                setVisaFilePath={setVisaFilePath}
                            />
                        </Card>
                    </Col>
                </Row>
                
                {/* Résultats du calcul */}
                {calculResults && (
                    <div style={{
                        marginTop: '24px',
                        background: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    }}>
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <Title level={4} style={{ color: '#0052cc', marginBottom: '16px' }}>
                                <SwapOutlined /> Résultats du calcul
                            </Title>
                            
                            <Row gutter={[16, 16]}>
                                <Col xs={24} md={8}>
                                    <Card title="Surface Projet" bordered={false}>
                                        <Title level={3} style={{ color: '#52c41a', textAlign: 'center' }}>
                                            {calculResults.surfaceProjet.toFixed(2)} m²
                                        </Title>
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card title="Surface Existant" bordered={false}>
                                        <Title level={3} style={{ color: '#1890ff', textAlign: 'center' }}>
                                            {calculResults.surfaceExistant.toFixed(2)} m²
                                        </Title>
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card title="Différence" bordered={false}>
                                        <Title level={3} style={{ 
                                            color: calculResults.difference > 0 ? '#52c41a' : '#f5222d', 
                                            textAlign: 'center' 
                                        }}>
                                            {calculResults.difference.toFixed(2)} m²
                                        </Title>
                                        <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
                                            {calculResults.difference > 0 ? 'Augmentation' : 'Diminution'}
                                        </Text>
                                    </Card>
                                </Col>
                            </Row>
                            
                            {visaFilePath && (
                                <Card 
                                    title={
                                        <Space>
                                            <FileTextOutlined style={{ color: '#722ed1' }} />
                                            <Text strong>Fichier VISA généré</Text>
                                        </Space>
                                    } 
                                    style={{ marginTop: '16px' }}
                                >
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Text>{visaFilePath}</Text>
                                        <Space>
                                            <Button 
                                                type="primary"
                                                icon={<DownloadOutlined />}
                                                onClick={() => {
                                                    // URL pour télécharger le fichier
                                                    const downloadUrl = `${FOLDER_SERVICE_URL}/download-visa-file?filePath=${encodeURIComponent(visaFilePath)}`;
                                                    
                                                    // Créer un lien temporaire pour le téléchargement
                                                    const link = document.createElement('a');
                                                    link.href = downloadUrl;
                                                    link.target = '_blank';
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }}
                                            >
                                                Télécharger
                                            </Button>
                                            
                                            <Button 
                                                type="default"
                                                icon={<EyeOutlined />}
                                                onClick={() => {
                                                    // Appel pour obtenir le contenu du fichier visa
                                                    axios.post(`${FOLDER_SERVICE_URL}/get-visa-content`, {
                                                        filePath: visaFilePath
                                                    })
                                                    .then(response => {
                                                        // Créer une div de résultat dans le dashboard avec le contenu du fichier
                                                        setVisaContent(response.data.content);
                                                        setShowVisaContent(true);
                                                    })
                                                    .catch(error => {
                                                        notification.error({
                                                            message: 'Erreur',
                                                            description: 'Impossible de lire le contenu du fichier VISA.'
                                                        });
                                                    });
                                                }}
                                            >
                                                Extraire
                                            </Button>
                                        </Space>
                                    </Space>
                                </Card>
                            )}
                            
                            {/* Affichage du contenu du fichier VISA */}
                            {showVisaContent && visaContent && (
                                <Card 
                                    title={
                                        <Space>
                                            <FileTextOutlined style={{ color: '#1677ff' }} />
                                            <Text strong>Contenu du fichier VISA</Text>
                                        </Space>
                                    }
                                    style={{ marginTop: '16px' }}
                                    extra={
                                        <Button 
                                            type="text" 
                                            icon={<CloseOutlined />} 
                                            onClick={() => setShowVisaContent(false)}
                                        />
                                    }
                                >
                                    <div 
                                        style={{ 
                                            maxHeight: '400px', 
                                            overflow: 'auto', 
                                            fontFamily: 'monospace', 
                                            whiteSpace: 'pre-wrap',
                                            background: '#f5f5f5',
                                            padding: '12px',
                                            borderRadius: '4px',
                                            border: '1px solid #e8e8e8'
                                        }}
                                    >
                                        {visaContent}
                                    </div>
                                </Card>
                            )}
                        </Space>
                    </div>
                )}
            </div>
            
            {/* Custom CSS */}
            <style jsx global>{`
                .ant-card-hoverable:hover {
                    transform: scale(1.02);
                    box-shadow: 0 4px 14px rgba(0,0,0,0.1) !important;
                    border: 1px solid #e5e7eb;
                }
                .ant-card-head {
                    padding: 0 20px;
                    min-height: 56px;
                    borderBottom: '1px solid #e5e7eb';
                }
                .ant-card-head-title {
                    font-weight: 600;
                    padding: 16px 0;
                }
                .ant-btn-primary:not(:disabled):hover {
                    background-color: #003eb3 !important;
                    transform: scale(1.05);
                }
                .ant-btn-primary:disabled {
                    cursor: not-allowed;
                    opacity: 0.8;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(0,82,204,0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(0,82,204,0); }
                    100% { box-shadow: 0 0 0 0 rgba(0,82,204,0); }
                }
            `}</style>
        </div>
    );
};

export default CalculTA;