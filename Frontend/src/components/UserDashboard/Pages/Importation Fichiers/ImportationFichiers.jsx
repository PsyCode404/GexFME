import React, { useState, useCallback } from 'react';
import { Card, Row, Col, Typography, Space, Alert, message } from 'antd';
import { CalculatorOutlined, FileOutlined } from '@ant-design/icons';
import FileUpload from './FileUpload';
import UserFolderSection from './UserFolderSection';
import axios from 'axios';

// URL du service pour les dossiers utilisateurs (intégré dans l'API principale)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const FOLDER_SERVICE_URL = API_URL;

const { Title, Text } = Typography;

const ImportationFichiers = () => {
    const [successfulUploads, setSuccessfulUploads] = useState(0);
    const [filenames, setFilenames] = useState({ file1: null, file2: null });
    const [files, setFiles] = useState({ file1: null, file2: null });

    const handleFileUploaded1 = useCallback((file) => {
        setFiles((prev) => ({ ...prev, file1: file }));
        setFilenames((prev) => ({ ...prev, file1: file.name }));
        setSuccessfulUploads((prev) => prev + 1);
    }, []);

    const handleFileUploaded2 = useCallback((file) => {
        setFiles((prev) => ({ ...prev, file2: file }));
        setFilenames((prev) => ({ ...prev, file2: file.name }));
        setSuccessfulUploads((prev) => prev + 1);
    }, []);

    const handleTransfer = async (customFolderName) => {
        if (successfulUploads < 2) {
            message.error('Veuillez importer deux fichiers .dxf avant de transférer.');
            return;
        }

        // Extraire l'email du token JWT
        let email = '';
        try {
            const token = localStorage.getItem('token');
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            email = tokenPayload.email || tokenPayload.sub || '';
            console.log('Email extrait du token:', email);
        } catch (e) {
            console.error('Erreur lors de l\'extraction de l\'email du token:', e);
            message.error('Erreur lors de l\'extraction des informations utilisateur');
            return;
        }

        const formData = new FormData();
        formData.append('file1', files.file1);
        formData.append('file2', files.file2);
        formData.append('filename1', filenames.file1);
        formData.append('filename2', filenames.file2);
        formData.append('customFolderName', customFolderName);
        formData.append('email', email);

        try {
            // Utiliser le service dédié pour le transfert de fichiers
            const response = await axios.post(`${FOLDER_SERVICE_URL}/transfer-files`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
            });

            message.success(response.data.message);
            setFiles({ file1: null, file2: null });
            setFilenames({ file1: null, file2: null });
            setSuccessfulUploads(0);
        } catch (error) {
            console.error('Erreur lors du transfert:', error);
            message.error(error.response?.data?.error || 'Erreur lors du transfert des fichiers.');
        }
    };

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
                    width: '100%',
                    overflow: 'hidden',
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
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    <CalculatorOutlined /> Surface
                </Title>
                <Text
                    style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginTop: '8px',
                        display: 'block',
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    Importez deux fichiers .dxf pour les transférer
                </Text>
            </div>

            {/* Alert */}
            <Alert
                message={<Text strong>Format accepté : .dxf uniquement</Text>}
                description="Seuls les fichiers au format .dxf sont acceptés pour le transfert."
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
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            />

            {/* Main Content */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
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
                    {/* Existing Files Section */}
                    <Col xs={24} md={12} lg={8}>
                        <Card
                            title={
                                <Space>
                                    <FileOutlined style={{ color: '#0052cc' }} />
                                    <Text
                                        strong
                                        style={{
                                            color: '#000000d9',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        Fichiers existants .dxf
                                    </Text>
                                </Space>
                            }
                            variant="borderless"
                            style={{
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                width: '100%',
                                maxWidth: '100%',
                                overflow: 'hidden',
                            }}
                            styles={{ body: { padding: '20px', overflow: 'auto', maxHeight: '400px' } }}
                            hoverable
                        >
                            <FileUpload onFileUploaded={handleFileUploaded1} />
                        </Card>
                    </Col>

                    {/* Project Export Section */}
                    <Col xs={24} md={12} lg={8}>
                        <Card
                            title={
                                <Space>
                                    <FileOutlined style={{ color: '#0052cc' }} />
                                    <Text
                                        strong
                                        style={{
                                            color: '#000000d9',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        Importation projet .dxf
                                    </Text>
                                </Space>
                            }
                            variant="borderless"
                            style={{
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                width: '100%',
                                maxWidth: '100%',
                                overflow: 'hidden',
                            }}
                            styles={{ body: { padding: '20px', overflow: 'auto', maxHeight: '400px' } }}
                            hoverable
                        >
                            <FileUpload onFileUploaded={handleFileUploaded2} />
                        </Card>
                    </Col>

                    {/* User Folder Section */}
                    <Col xs={24} md={12} lg={8}>
                        <Card
                            title={
                                <Space>
                                    <FileOutlined style={{ color: '#0052cc' }} />
                                    <Text
                                        strong
                                        style={{
                                            color: '#000000d9',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        Dossier utilisateur
                                    </Text>
                                </Space>
                            }
                            variant="borderless"
                            style={{
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                backgroundColor: '#f9fafb',
                                width: '100%',
                                maxWidth: '100%',
                                overflow: 'hidden',
                            }}
                            styles={{ body: { padding: '20px', overflow: 'auto', maxHeight: '400px' } }}
                            hoverable
                        >
                            <UserFolderSection
                                successfulUploads={successfulUploads}
                                onTransfer={handleTransfer}
                            />
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* Custom CSS */}
            <style jsx>{`
                .ant-card-hoverable:hover {
                    transform: scale(1.02);
                    box-shadow: 0 4px 14px rgba(0,0,0,0.1) !important;
                    border: 1px solid #e5e7eb;
                }
                .ant-card-head {
                    padding: 0 20px;
                    min-height: 56px;
                    borderBottom: '1px solid #e5e7eb';
                    overflow: 'hidden';
                }
                .ant-card-head-title {
                    font-weight: 600;
                    padding: 16px 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
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
                .ant-btn-primary:not(:disabled) {
                    animation: ${successfulUploads >= 2 ? 'pulse 2s infinite' : 'none'};
                }
                p, span, div, h1, h2, h3, h4, h5, h6 {
                    word-break: break-word;
                    overflow-wrap: break-word;
                }
            `}</style>
        </div>
    );
};

export default ImportationFichiers;