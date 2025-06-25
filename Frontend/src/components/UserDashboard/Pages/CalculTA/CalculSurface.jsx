import React, { useState, useEffect } from 'react';
import { Card, Space, Typography, Button, Alert, notification, Spin } from 'antd';
import { CalculatorOutlined, SwapOutlined, FileTextOutlined, FileExcelOutlined } from '@ant-design/icons';
import { InputText } from 'primereact/inputtext';
import axios from 'axios';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

// Define API URL for consistency
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const { Text, Title } = Typography;

const CalculSurface = ({ extractedDataProjet, extractedDataExistant, setCalculResults, calculResults, setVisaFilePath }) => {
    const [threshold, setThreshold] = useState('');
    const [floorName, setFloorName] = useState('');
    const [surfaceAreaProjet, setSurfaceAreaProjet] = useState(null);
    const [surfaceAreaExistant, setSurfaceAreaExistant] = useState(null);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [excelFilePath, setExcelFilePath] = useState(null);

    useEffect(() => {
        setSurfaceAreaProjet(null);
        setError(null);
    }, [extractedDataProjet]);
    
    useEffect(() => {
        setSurfaceAreaExistant(null);
        setError(null);
    }, [extractedDataExistant]);

    // Fonction pour calculer la surface d'un ensemble de données extrait
    const calculateAreaForData = (data) => {
        if (!data || (!data.polylines && !data.circles)) {
            return 0;
        }

        let totalArea = 0;

        if (data.polylines && data.polylines.length > 0) {
            data.polylines.forEach(polyline => {
                if (polyline.vertices && polyline.vertices.length > 2) {
                    let area = 0;
                    const coords = polyline.vertices;
                    for (let i = 0; i < coords.length - 1; i++) {
                        area += coords[i].x * coords[i + 1].y - coords[i + 1].x * coords[i].y;
                    }
                    area = Math.abs(area) / 2;
                    totalArea += area;
                }
            });
        }

        if (data.circles && data.circles.length > 0) {
            data.circles.forEach(circle => {
                if (circle.radius) {
                    const circleArea = Math.PI * Math.pow(circle.radius, 2);
                    totalArea += circleArea;
                }
            });
        }

        return totalArea;
    };

    // Fonction pour extraire les informations utilisateur et le dossier cible
    const getUserInfoAndFolder = async () => {
        // Extraire l'email du token JWT pour identifier l'utilisateur
        let email = '';
        try {
            const token = localStorage.getItem('token');
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            email = tokenPayload.email || tokenPayload.sub || '';
        } catch (e) {
            console.error('Erreur lors de l\'extraction de l\'email du token:', e);
            throw new Error('Erreur lors de l\'extraction des informations utilisateur');
        }
        
        // Déterminer le dossier dans lequel se trouvent les fichiers (M1, M2, etc.)
        let folderPath = '';
        
        // Utiliser la propriété parentFolder que nous avons ajoutée aux données extraites
        if (extractedDataProjet && extractedDataProjet.parentFolder) {
            folderPath = extractedDataProjet.parentFolder;
            console.log('Dossier parent détecté depuis le projet:', folderPath);
        } else if (extractedDataExistant && extractedDataExistant.parentFolder) {
            folderPath = extractedDataExistant.parentFolder;
            console.log('Dossier parent détecté depuis l\'existant:', folderPath);
        }
        
        // Fallback sur sourcePath si parentFolder n'est pas défini
        if (!folderPath && extractedDataProjet && extractedDataProjet.sourcePath) {
            const pathParts = extractedDataProjet.sourcePath.split('/');
            if (pathParts.length > 1) {
                folderPath = pathParts[0]; // Premier élément du chemin
                console.log('Dossier détecté depuis le chemin source du projet:', folderPath);
            }
        } else if (!folderPath && extractedDataExistant && extractedDataExistant.sourcePath) {
            const pathParts = extractedDataExistant.sourcePath.split('/');
            if (pathParts.length > 1) {
                folderPath = pathParts[0];
                console.log('Dossier détecté depuis le chemin source de l\'existant:', folderPath);
            }
        }
        
        console.log('Dossier final détecté:', folderPath);
        return { email, folderPath };
    };

    // Fonction pour générer le fichier visa.txt
    const generateVisaFile = async (surfaces) => {
        try {
            const { email, folderPath } = await getUserInfoAndFolder();

            // Appel au service backend pour générer le fichier visa
            const response = await axios.post(`${API_URL}/generate-visa-file`, {
                email: email,
                surfaces: surfaces,
                floorName: floorName || 'Sans nom',
                folderPath: folderPath // Transmettre le dossier parent (M1, M2, etc.)
            });

            return response.data.filePath;
        } catch (error) {
            console.error('Erreur lors de la génération du fichier visa:', error);
            throw error;
        }
    };

    // Fonction pour générer le fichier Excel
    const generateExcelFile = async (surfaces) => {
        try {
            const { email, folderPath } = await getUserInfoAndFolder();

            // Appel au service backend pour générer le fichier Excel
            const response = await axios.post(`${API_URL}/generate-excel-file`, {
                email: email,
                surfaces: surfaces,
                floorName: floorName || 'Sans nom',
                folderPath: folderPath
            });

            return response.data.filePath;
        } catch (error) {
            console.error('Erreur lors de la génération du fichier Excel:', error);
            throw error;
        }
    };

    // Fonction principale pour calculer les surfaces et générer le visa et excel
    const calculateSurfaceArea = async () => {
        if (!extractedDataProjet && !extractedDataExistant) {
            setError('Veuillez sélectionner au moins un fichier projet ou existant.');
            return;
        }

        setProcessing(true);
        setError(null);
        setExcelFilePath(null);

        try {
            // Calculer les surfaces pour chaque ensemble de données
            const surfaceProjet = extractedDataProjet ? calculateAreaForData(extractedDataProjet) : 0;
            const surfaceExistant = extractedDataExistant ? calculateAreaForData(extractedDataExistant) : 0;
            const difference = surfaceProjet - surfaceExistant;

            // Vérifier le seuil si nécessaire
            const thresholdValue = parseFloat(threshold);
            if (!isNaN(thresholdValue) && surfaceProjet < thresholdValue) {
                setError(`Surface projet (${surfaceProjet.toFixed(2)} m²) inférieure au seuil (${thresholdValue} m²).`);
            } else {
                // Préparer les données pour le visa
                const surfaces = {
                    projet: {
                        surface: surfaceProjet,
                        details: extractedDataProjet ? {
                            polylines: extractedDataProjet.polylines ? extractedDataProjet.polylines.length : 0,
                            circles: extractedDataProjet.circles ? extractedDataProjet.circles.length : 0
                        } : null,
                        // Ajouter les polylignes complètes pour les utiliser dans le fichier Excel
                        polylines: extractedDataProjet ? extractedDataProjet.polylines || [] : []
                    },
                    existant: {
                        surface: surfaceExistant,
                        details: extractedDataExistant ? {
                            polylines: extractedDataExistant.polylines ? extractedDataExistant.polylines.length : 0,
                            circles: extractedDataExistant.circles ? extractedDataExistant.circles.length : 0
                        } : null,
                        // Ajouter les polylignes complètes pour les utiliser dans le fichier Excel
                        polylines: extractedDataExistant ? extractedDataExistant.polylines || [] : []
                    },
                    difference: difference
                };

                // Générer les fichiers visa.txt et Excel en parallèle
                const [visaPath, excelPath] = await Promise.all([
                    generateVisaFile(surfaces),
                    generateExcelFile(surfaces)
                ]);
                
                setVisaFilePath(visaPath);
                setExcelFilePath(excelPath);

                // Mettre à jour les résultats pour afficher dans l'UI
                const results = {
                    surfaceProjet,
                    surfaceExistant,
                    difference,
                    timestamp: new Date().toISOString(),
                    floorName: floorName || 'Sans nom'
                };

                setCalculResults(results);
                notification.success({
                    message: 'Calcul terminé',
                    description: 'Les surfaces ont été calculées avec succès. Les fichiers VISA et Excel ont été générés.'
                });
            }
        } catch (err) {
            console.error('Erreur lors du calcul:', err);
            setError('Erreur lors du calcul: ' + (err.message || 'Veuillez réessayer.'));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Space direction="vertical" size={16} style={{ width: '100%', flex: 1 }}>
                <Space align="center">
                    <SwapOutlined style={{ color: '#1a73e8', fontSize: '18px' }} />
                    <Text strong style={{ fontSize: '16px', color: '#1a73e8' }}>Calcul comparatif des surfaces</Text>
                </Space>

                {/* Informations sur les fichiers sélectionnés */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                    <Card size="small" title="Projet" style={{ flex: 1, backgroundColor: extractedDataProjet ? '#f6ffed' : '#f5f5f5' }}>
                        <Text>{extractedDataProjet ? 'Fichier sélectionné' : 'Aucun fichier'}</Text>
                    </Card>
                    <Card size="small" title="Existant" style={{ flex: 1, backgroundColor: extractedDataExistant ? '#e6f7ff' : '#f5f5f5' }}>
                        <Text>{extractedDataExistant ? 'Fichier sélectionné' : 'Aucun fichier'}</Text>
                    </Card>
                </div>

                <div>
                    <Text strong style={{ fontSize: '14px' }}>Seuil (m²)</Text>
                    <InputText
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        placeholder="Valeur minimale (m²)"
                        style={{ width: '100%', marginTop: '6px', fontSize: '13px', padding: '4px 8px' }}
                        className="p-inputtext-sm"
                    />
                </div>

                <div>
                    <Text strong style={{ fontSize: '14px' }}>Nom d'étage</Text>
                    <InputText
                        value={floorName}
                        onChange={(e) => setFloorName(e.target.value)}
                        placeholder="Nom de l'étage"
                        style={{ width: '100%', marginTop: '6px', fontSize: '13px', padding: '4px 8px' }}
                        className="p-inputtext-sm"
                    />
                </div>

                <Button
                    type="primary"
                    onClick={calculateSurfaceArea}
                    style={{ width: '100%', borderRadius: '4px', padding: '4px 16px' }}
                    icon={<CalculatorOutlined />}
                    disabled={!extractedDataProjet && !extractedDataExistant || processing}
                    loading={processing}
                >
                    Calculer et générer VISA
                </Button>

                {processing && (
                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                        <Spin tip="Calcul en cours..." />
                    </div>
                )}

                {error && (
                    <Alert
                        message="Erreur"
                        description={error}
                        type="error"
                        showIcon
                        style={{ marginTop: '12px', borderRadius: '4px', fontSize: '13px' }}
                    />
                )}

                {excelFilePath && (
                    <Button
                        type="primary"
                        onClick={() => window.open(`${API_URL}/download-excel-file?filePath=${encodeURIComponent(excelFilePath)}`, '_blank')}
                        style={{ width: '100%', borderRadius: '4px', padding: '4px 16px', marginTop: '10px' }}
                        icon={<FileExcelOutlined />}
                    >
                        Télécharger
                    </Button>
                )}
            </Space>
        </div>
    );
};

export default CalculSurface;