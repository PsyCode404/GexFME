import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Button, Card, message, Alert, Space, Typography, Spin, Input } from 'antd';
import { FolderOutlined, FolderAddOutlined, LoginOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../../../services/authService';

const { Text, Title } = Typography;

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
// Use the same API URL for folder service endpoints
const FOLDER_SERVICE_URL = API_URL;
axios.defaults.baseURL = API_URL;

const UserFolderSection = ({ successfulUploads, onTransfer }) => {
    const [folderExists, setFolderExists] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [customFolderName, setCustomFolderName] = useState('');
    const navigate = useNavigate();

    const isAuthenticated = () => {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000;
            if (expiry < Date.now()) {
                logout();
                message.error('Votre session a expiré. Veuillez vous reconnecter.');
                navigate('/login', { replace: true });
                return false;
            }
            return true;
        } catch (e) {
            console.error('Erreur lors de la vérification du token:', e);
            logout();
            navigate('/login', { replace: true });
            return false;
        }
    };

    const checkUserFolder = useCallback(() => {
        if (!isAuthenticated()) {
            setError('Veuillez vous connecter pour accéder à votre dossier');
            setLoading(false);
            return;
        }
        console.log('Vérification du dossier utilisateur avec XMLHttpRequest...');
        setLoading(true);
        const token = localStorage.getItem('token');
        console.log('Token récupéré:', token ? 'Token présent' : 'Token absent');
        
        try {
            console.log('Envoi de la requête POST /check-folder au service dédié');
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${FOLDER_SERVICE_URL}/check-folder`, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        console.log('Réponse reçue:', xhr.status, data);
                        
                        // Traitement des données
                        console.log('Données du dossier reçues:', data);
                        setFolderExists(data.folderExists);
                        setFolderName(data.folderName);
                        setError(null);

                        if (data.message) {
                            message.info(data.message);
                        }
                    } catch (e) {
                        console.error('Erreur lors du parsing de la réponse:', e);
                        setError('Erreur lors du traitement de la réponse du serveur');
                        message.error('Erreur lors du traitement de la réponse du serveur');
                    }
                } else if (xhr.status === 422) {
                    // Cas spécifique pour l'erreur 422 (UNPROCESSABLE ENTITY)
                    console.log('Erreur 422 détectée - Tentative de création du dossier');
                    // Essayer de créer le dossier automatiquement
                    setTimeout(() => {
                        createUserFolder();
                    }, 1000);
                } else if (xhr.status === 401) {
                    logout();
                    message.error('Session invalide ou expirée. Veuillez vous reconnecter.');
                    navigate('/login', { replace: true });
                } else {
                    console.error('Erreur lors de la vérification du dossier:', xhr.status, xhr.responseText);
                    setError(`Erreur lors de la vérification du dossier (${xhr.status})`);
                    message.error(`Erreur lors de la vérification du dossier (${xhr.status})`);
                }
                setLoading(false);
            };
            
            xhr.onerror = function() {
                console.error('Erreur réseau lors de la vérification du dossier');
                setError('Erreur réseau lors de la vérification du dossier');
                message.error('Erreur réseau lors de la vérification du dossier');
                setLoading(false);
            };
            
            // Extraire l'email du token JWT
            let email = '';
            try {
                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                email = tokenPayload.email || tokenPayload.sub || '';
                console.log('Email extrait du token:', email);
            } catch (e) {
                console.error('Erreur lors de l\'extraction de l\'email du token:', e);
            }
            
            // Envoyer une requête avec l'email dans le corps
            xhr.send(JSON.stringify({ email }));
        } catch (error) {
            console.error('Erreur complète:', error);
            
            // Récupérer le message d'erreur avec plus de détails
            let errorMessage = 'Erreur lors de la vérification du dossier';
            let status = null;
            
            if (error.message) {
                errorMessage = error.message;
                console.error('Message d\'erreur:', errorMessage);
                
                // Vérifier si le message d'erreur contient un code de statut
                if (error.message.includes('422')) {
                    status = 422;
                } else if (error.message.includes('401')) {
                    status = 401;
                }
            }

            if (status === 401) {
                logout();
                message.error('Session invalide ou expirée. Veuillez vous reconnecter.');
                navigate('/login', { replace: true });
            } else if (status === 422) {
                // Cas spécifique pour l'erreur 422 (UNPROCESSABLE ENTITY)
                console.log('Erreur 422 détectée - Tentative de création du dossier');
                // Essayer de créer le dossier automatiquement
                setTimeout(() => {
                    createUserFolder();
                }, 1000);
            } else {
                setError(errorMessage);
                message.error(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]); // Add navigate as a dependency

    const createUserFolder = () => {
        if (!isAuthenticated()) {
            setError('Veuillez vous connecter pour créer un dossier');
            return;
        }

        console.log('Création du dossier utilisateur avec XMLHttpRequest...');
        setLoading(true);
        const token = localStorage.getItem('token');
        console.log('Token récupéré:', token ? 'Token présent' : 'Token absent');

        try {
            // Utilisation de XMLHttpRequest avec notre service dédié
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${FOLDER_SERVICE_URL}/create-folder`, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('Réponse du serveur:', xhr.status, response);
                        
                        // La réponse est OK, traiter les données
                        setFolderExists(true);
                        setFolderName(response.folderName || 'user_folder');
                        setError(null);
                        message.success(response.message || 'Dossier créé avec succès');
                        
                        // Rafraîchir la liste des fichiers après un court délai
                        setTimeout(() => {
                            checkUserFolder();
                        }, 1000);
                    } catch (e) {
                        console.error('Erreur lors du parsing de la réponse:', e);
                        setError('Erreur lors du traitement de la réponse du serveur');
                        message.error('Erreur lors du traitement de la réponse du serveur');
                    }
                } else {
                    console.error('Erreur lors de la création du dossier:', xhr.status, xhr.responseText);
                    setError(`Erreur lors de la création du dossier (${xhr.status})`);
                    message.error(`Erreur lors de la création du dossier (${xhr.status})`);
                }
                setLoading(false);
            };
            
            xhr.onerror = function() {
                console.error('Erreur réseau lors de la création du dossier');
                setError('Erreur réseau lors de la création du dossier');
                message.error('Erreur réseau lors de la création du dossier');
                setLoading(false);
            };
            
            // Extraire l'email du token JWT
            let email = '';
            try {
                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                email = tokenPayload.email || tokenPayload.sub || '';
                console.log('Email extrait du token:', email);
            } catch (e) {
                console.error('Erreur lors de l\'extraction de l\'email du token:', e);
            }
            
            // Envoyer une requête avec l'email dans le corps
            xhr.send(JSON.stringify({ email }));
        } catch (error) {
            console.error('Erreur lors de la création du dossier:', error);
            
            // Extraire le message d'erreur
            let errorMessage = error.message || 'Erreur lors de la création du dossier';
            
            // Vérifier si l'erreur est liée à l'authentification
            if (errorMessage.includes('401')) {
                logout();
                message.error('Session invalide ou expirée. Veuillez vous reconnecter.');
                navigate('/login', { replace: true });
                return;
            }
            
            // Afficher l'erreur à l'utilisateur
            setError(errorMessage);
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleTransferWithCustomName = () => {
        if (!customFolderName.trim()) {
            message.error('Veuillez entrer un nom de dossier valide.');
            return;
        }
        onTransfer(customFolderName);
        setCustomFolderName('');
    };

    useEffect(() => {
        console.log('Vérification du dossier  ...');
        checkUserFolder();
        console.log('test ...');
    }, [checkUserFolder]); // Add checkUserFolder as a dependency

    if (!isAuthenticated()) {
        return (
            <Card
                title={<Title level={4} style={{ color: '#0052cc' }}>Votre Dossier Personnel</Title>}
                bordered={false}
                style={{
                    height: '100%',
                    minHeight: '400px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                }}
            >
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <LoginOutlined style={{ fontSize: '32px', color: '#0052cc' }} />
                    <Text style={{ color: '#6b7280' }}>Veuillez vous connecter pour accéder à votre dossier</Text>
                    <Button type="primary" href="/login" icon={<LoginOutlined />} style={{ backgroundColor: '#0052cc', border: 'none', borderRadius: '8px' }}>
                        Se connecter
                    </Button>
                </Space>
            </Card>
        );
    }

    return (
        <Card
            title={<Title level={4} style={{ color: '#0052cc' }}>Votre Dossier Personnel</Title>}
            bordered={false}
            style={{
                height: '100%',
                minHeight: '400px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            }}
            extra={
                <Button
                    type="text"
                    icon={<ReloadOutlined style={{ transition: 'transform 0.5s', transform: loading ? 'rotate(360deg)' : 'none' }} />}
                    onClick={checkUserFolder}
                    loading={loading}
                >
                    Rafraîchir
                </Button>
            }
        >
            {error && (
                <Alert
                    message="Erreur"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: '8px' }}
                />
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="large" />
                    <Text style={{ display: 'block', marginTop: '10px', color: '#6b7280' }}>
                        Chargement de votre dossier...
                    </Text>
                </div>
            ) : folderExists ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FolderOutlined style={{ fontSize: '24px', color: '#0052cc' }} />
                        <Text strong style={{ color: '#000000d9' }}>Votre dossier est prêt :</Text>
                        <Text code>{folderName}</Text>
                    </div>
                    <Text style={{ color: '#6b7280' }}>
                        Entrez un nom pour le dossier de transfert et téléchargez vos fichiers.
                    </Text>
                    <Input
                        placeholder="Nom du dossier de transfert"
                        value={customFolderName}
                        onChange={(e) => setCustomFolderName(e.target.value)}
                        style={{
                            marginTop: '10px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            padding: '8px 12px',
                            fontSize: '14px',
                        }}
                    />
                    <div style={{ marginTop: '20px' }}>
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            disabled={successfulUploads < 2 || !customFolderName.trim()}
                            size="large"
                            onClick={handleTransferWithCustomName}
                            style={{
                                width: '100%',
                                height: '56px',
                                borderRadius: '12px',
                                fontSize: '18px',
                                fontWeight: 500,
                                backgroundColor: (successfulUploads < 2 || !customFolderName.trim()) ? '#d1d5db' : '#0052cc',
                                border: 'none',
                                transition: 'all 0.3s ease',
                                boxShadow: (successfulUploads >= 2 && customFolderName.trim()) ? '0 4px 14px rgba(0,82,204,0.3)' : 'none',
                            }}
                        >
                            Transférer les fichiers
                        </Button>
                    </div>
                </Space>
            ) : (
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <FolderAddOutlined style={{ fontSize: '32px', color: '#0052cc' }} />
                    <Text style={{ color: '#6b7280' }}>Aucun dossier personnel trouvé</Text>
                    <Button
                        type="primary"
                        onClick={createUserFolder}
                        loading={loading}
                        icon={<FolderAddOutlined />}
                        style={{ backgroundColor: '#0052cc', border: 'none', borderRadius: '8px' }}
                    >
                        Créer Mon Dossier
                    </Button>
                </Space>
            )}
        </Card>
    );
};

export default UserFolderSection;