import React, { useState } from 'react';
import { Upload, message, Button, Progress, Space, Tree, Table, Card, List, Spin, Typography, Modal, Tabs, Tooltip, Empty, notification } from 'antd';
import { InboxOutlined, FileOutlined, FileTextOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, FolderOutlined, InfoCircleOutlined, DownloadOutlined, EyeOutlined, CloseOutlined } from '@ant-design/icons';
import axios from 'axios';
import { motion } from 'framer-motion'; // For animations

// Define API URL for consistency
const API_URL = process.env.REACT_APP_API_URL || 'https://gexfme.onrender.com';

const { Dragger } = Upload;
const { Text, Paragraph, Title } = Typography;
const { TabPane } = Tabs;

// Styles CSS personnalisés internes pour les boutons
const buttonStyles = `
    .download-button {
        color: #1677ff;
    }
    .download-button:hover {
        color: #4096ff !important;
        background-color: #e6f7ff !important;
    }
    .download-button:active {
        color: #0958d9 !important;
        background-color: #bae0ff !important;
    }
    .extract-button {
        color: #0052cc;
    }
    .extract-button:hover {
        color: #2779e3 !important;
        background-color: #e8f0fe !important;
    }
    .extract-button:active {
        color: #0747a6 !important;
        background-color: #cce0ff !important;
    }
`;

const FileUpload = ({ folderStructure, loading, error, type, setExtractedData, extractedData, fileType = 'projet' }) => {
    const [fileList, setFileList] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [currentProgress, setCurrentProgress] = useState(0);
    const [loadingStates, setLoadingStates] = useState({});
    const [errorMessage, setErrorMessage] = useState(null);
    const [textFileContent, setTextFileContent] = useState(null);
    const [textFileName, setTextFileName] = useState(null);
    const [showTextContent, setShowTextContent] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const handleUpload = async (file = null) => {
        const formData = new FormData();
        if (file) formData.append('file', file);
        else fileList.forEach(f => formData.append('file', f));

        setUploading(true);
        setCurrentProgress(0);

        try {
            const uploadResponse = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setCurrentProgress(progress);
                },
            });

            message.success('Fichier .dxf téléchargé avec succès !');

            setLoadingStates(prev => ({ ...prev, [file?.name || 'upload']: true }));
            const extractResponse = await axios.post('/api/extract-data', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                withCredentials: true,
            });
            setExtractedData(extractResponse.data);
            setIsModalVisible(true);
        } catch (error) {
            console.error('Erreur lors du téléchargement ou de l\'extraction:', error.response?.data || error.message);
            message.error('Erreur : ' + (error.response?.data?.error || 'Veuillez réessayer.'));
        } finally {
            setUploading(false);
            setLoadingStates(prev => ({ ...prev, [file?.name || 'upload']: false }));
        }
    };

    // Nouvelle fonction spécifique pour extraire les fichiers visa.txt du dossier Output
    const handleExtractOutputFile = async (filename, folderPath = "") => {
        try {
            console.log(`Tentative de téléchargement du fichier Output:`, filename);
            console.log(`Chemin complet:`, `${folderPath}/${filename}`);
            
            // Pour les fichiers txt et xlsx, on utilise directement le service de téléchargement
            if (filename.toLowerCase().endsWith('.txt') || filename.toLowerCase().endsWith('.xlsx')) {
                // Extraire l'email du token JWT
                let email = '';
                try {
                    const token = localStorage.getItem('token');
                    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                    email = tokenPayload.email || tokenPayload.sub || '';
                } catch (e) {
                    console.error('Erreur lors de l\'extraction de l\'email du token:', e);
                    message.error('Erreur lors de l\'extraction des informations utilisateur');
                    return;
                }
                
                // Pour les fichiers Excel, utiliser directement le service de téléchargement de fichier
                if (filename.toLowerCase().endsWith('.xlsx')) {
                    // URL pour télécharger le fichier Excel avec l'email de l'utilisateur
                    const downloadUrl = `${API_URL}/download-excel-file?filePath=${encodeURIComponent(`${folderPath}/${filename}`)}&email=${encodeURIComponent(email)}`;
                    
                    // Créer un lien temporaire pour le téléchargement
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                    message.success(`Le fichier ${filename} a été téléchargé avec succès`);
                    return;
                }
                
                // Pour les fichiers txt, récupérer le contenu
                const response = await axios.post(`${API_URL}/get-visa-content`, {
                    filePath: `${folderPath}/${filename}`,
                    email: email
                });
                
                // Créer un blob avec le contenu
                const blob = new Blob([response.data.content], { type: 'text/plain' });
                
                // Créer un URL pour le blob
                const url = window.URL.createObjectURL(blob);
                
                // Créer un lien pour télécharger le fichier
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                
                // Nettoyer
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                message.success(`Le fichier ${filename} a été téléchargé avec succès`);
            } else {
                message.warning(`Le fichier ${filename} n'est pas un fichier pris en charge pour le téléchargement direct.`);
            }
        } catch (error) {
            console.error('Erreur lors du téléchargement du fichier:', error);
            message.error('Erreur lors du téléchargement du fichier. Veuillez réessayer.');
        }
    };
    
    const handleExtractFromFolder = async (filename, folderPath = "") => {
        setLoadingStates(prev => ({ ...prev, [`${folderPath}/${filename}`]: true }));
        setExtractedData(null);
        setCurrentProgress(0);
        
        // Vérifier si le fichier est dans un dossier Output
        if (folderPath.includes('Output') || filename === 'visa.txt' || filename.startsWith('visa_')) {
            // Pour les fichiers dans Output, utiliser la fonction spécifique
            await handleExtractOutputFile(filename, folderPath);
            setLoadingStates(prev => ({ ...prev, [`${folderPath}/${filename}`]: false }));
            return;
        }
        
        console.log(`Extraction pour fichier ${fileType}:`, filename);
        console.log(`Chemin du dossier:`, folderPath);

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
                message.error('Erreur lors de l\'extraction des informations utilisateur');
                setLoadingStates(prev => ({ ...prev, [`${folderPath}/${filename}`]: false }));
                return;
            }
            
            // Utiliser le service dédié pour l'extraction de données
            const extractResponse = await axios.post(`${API_URL}/extract-data-from-file`, 
                { filename, folder: folderPath, email, fileType },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setCurrentProgress(progress);
                    }
                }
            );
            setExtractedData(extractResponse.data);
            message.success({
                content: `Données extraites avec succès pour ${filename} !`,
                icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            });
            setIsModalVisible(true);
        } catch (error) {
            console.error('Extraction error:', error.response?.data || error.message);
            
            // Afficher un message d'erreur plus détaillé
            const errorMsg = error.response?.data?.error || 'Erreur lors de l\'extraction.';
            message.error({
                content: 'Erreur : ' + errorMsg,
                duration: 5,
                style: {
                    marginTop: '20px'
                }
            });
            
            setErrorMessage(errorMsg);
            setExtractedData(null);
            
            // Afficher des informations de débogage dans la console
            console.log('Détails du fichier en tentative d\'extraction:');
            console.log('- Nom:', filename);
            console.log('- Chemin du dossier:', folderPath);
            console.log('- Type de fichier:', fileType);
        } finally {
            setLoadingStates(prev => ({ ...prev, [`${folderPath}/${filename}`]: false }));
        }
    };

    const resetUploadState = () => {
        setFileList([]);
        setUploading(false);
        setCurrentProgress(0);
        setLoadingStates({});
        setErrorMessage(null);
        setIsModalVisible(false);
        if (type === 'upload') message.info('Fichier supprimé. Prêt pour un nouveau téléchargement.');
        setExtractedData(null);
    };

    const uploadProps = {
        onRemove: () => resetUploadState(),
        beforeUpload: file => {
            const isDXF = file.name.toLowerCase().endsWith('.dxf');
            if (!isDXF) {
                setErrorMessage('Seuls les fichiers .dxf sont acceptés !');
                return false;
            }
            const isLt50M = file.size / 1024 / 1024 < 50;
            if (!isLt50M) {
                setErrorMessage('Le fichier doit faire moins de 50MB !');
                return false;
            }
            if (fileList.length >= 1) {
                setErrorMessage('Vous ne pouvez télécharger qu\'un seul fichier à la fois');
                return false;
            }
            setFileList([file]);
            setErrorMessage(null);
            setCurrentProgress(0);
            setExtractedData(null);
            return false;
        },
        fileList,
        maxCount: 1,
        multiple: false,
    };

    // Build Tree Data for Folder Structure
    const buildTreeData = (structure, parentPath = "") => {
        if (!structure) {
            console.warn('Structure undefined in buildTreeData');
            return [];
        }
        
        const { folders = [], files = [] } = structure;
        const treeData = [];

        folders.forEach(folder => {
            treeData.push({
                title: (
                    <Space>
                        <FolderOutlined style={{ color: '#faad14' }} />
                        <Text strong>{folder.name}</Text>
                    </Space>
                ),
                key: folder.path,
                children: folder.sub_structure ? buildTreeData(folder.sub_structure, folder.path) : [],
            });
        });

        files.forEach(file => {
            // Vérifier si le fichier est un .txt ou .dxf
            const isTextFile = file.name.toLowerCase().endsWith('.txt');
            
            treeData.push({
                title: (
                    <Tooltip
                        title={
                            <Space direction="vertical" size={4}>
                                <Text>Taille: {(file.size / 1024 / 1024).toFixed(2)} MB</Text>
                                {file.last_modified && (
                                    <Text>Dernière modification: {new Date(file.last_modified).toLocaleString()}</Text>
                                )}
                            </Space>
                        }
                    >
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Space>
                                <FileOutlined style={{ color: isTextFile ? '#722ed1' : '#1a73e8' }} />
                                <Text>{file.name}</Text>
                            </Space>
                            <Space>
                                {isTextFile || (file.name.toLowerCase().endsWith('.xlsx') && parentPath.includes('Output')) ? (
                                    // Pour les fichiers .txt, afficher uniquement le bouton Télécharger
                                    <Button
                                        type="link"
                                        size="small"
                                        icon={<DownloadOutlined />}
                                        onClick={() => {
                                            // Pour les fichiers Excel, utiliser la fonction handleExtractOutputFile
                                            if (file.name.toLowerCase().endsWith('.xlsx')) {
                                                handleExtractOutputFile(file.name, parentPath);
                                                return;
                                            }
                                            
                                            // Pour les fichiers texte, utiliser la fonction handleExtractOutputFile
                                            if (file.name.toLowerCase().endsWith('.txt')) {
                                                handleExtractOutputFile(file.name, parentPath);
                                                return;
                                            }
                                            
                                            message.error('Type de fichier non pris en charge pour le téléchargement direct.');
                                        }}
                                        className="download-button"
                                    >
                                        Télécharger
                                    </Button>
                                ) : (
                                    // Pour les fichiers .dxf, garder le bouton Extraire
                                    <Button
                                        type="link"
                                        size="small"
                                        icon={<CheckCircleOutlined />}
                                        onClick={() => {
                                            // Assurer que nous utilisons le chemin complet du fichier
                                            const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
                                            console.log('Chemin complet pour extraction:', fullPath);
                                            // Pour les fichiers .dxf, extraction normale
                                            handleExtractFromFolder(file.name, parentPath);
                                        }}
                                        loading={loadingStates[`${parentPath}/${file.name}`]}
                                        className="extract-button"
                                    >
                                        Extraire
                                    </Button>
                                )}
                            </Space>
                        </Space>
                    </Tooltip>
                ),
                key: `${parentPath}/${file.name}`,
                isLeaf: true,
            });
        });

        return treeData;
    };

    const treeData = buildTreeData(folderStructure);

    // Entity Table Columns
    const entityColumns = [
        { title: 'Type', dataIndex: 'type', key: 'type', sorter: (a, b) => a.type.localeCompare(b.type), width: 120 },
        { title: 'Calque', dataIndex: 'layer', key: 'layer', sorter: (a, b) => a.layer.localeCompare(b.layer), width: 150 },
        { 
            title: 'Détails', 
            dataIndex: 'details', 
            key: 'details', 
            render: text => <Text ellipsis={{ tooltip: text }}>{text}</Text>,
            width: 200,
        },
    ];

    const renderEntityDataSource = (entities) => entities.map((entity, index) => ({
        key: `${index}`,
        type: entity.type || 'N/A',
        layer: entity.layer || 'N/A',
        details: JSON.stringify(entity),
    }));

    return (
        <div style={{ textAlign: 'left' }}>
            <style>{buttonStyles}</style>
            {type === 'folder' ? (
                loading ? (
                    <Spin tip="Chargement des fichiers..." size="large" style={{ display: 'block', textAlign: 'center', padding: '20px' }} />
                ) : error ? (
                    <Paragraph type="danger" style={{ fontSize: '14px', textAlign: 'center', padding: '20px' }}>{error}</Paragraph>
                ) : treeData.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Tree
                            treeData={treeData}
                            showLine
                            blockNode
                            style={{ background: '#fff', borderRadius: '8px', padding: '8px' }}
                        />
                        
                        {/* Affichage du contenu du fichier texte */}
                        {showTextContent && textFileContent && (
                            <Card
                                id="text-content-card"
                                title={
                                    <Space>
                                        <FileTextOutlined style={{ color: '#722ed1' }} />
                                        <Text strong>Contenu du fichier: {textFileName}</Text>
                                    </Space>
                                }
                                style={{ marginTop: '16px', borderRadius: '8px' }}
                                extra={
                                    <Button 
                                        type="text" 
                                        icon={<CloseOutlined />} 
                                        onClick={() => setShowTextContent(false)}
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
                                    {textFileContent}
                                </div>
                            </Card>
                        )}
                    </motion.div>
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<Text type="secondary">Aucun dossier ou fichier .dxf trouvé</Text>}
                        style={{ padding: '20px' }}
                    />
                )
            ) : (
                <>
                    <Dragger {...uploadProps} style={{
                        padding: '16px',
                        background: fileList.length === 0 ? '#fafafa' : '#f0f5ff',
                        border: '2px dashed #1a73e8',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                    }}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ color: '#1a73e8', fontSize: '40px', opacity: fileList.length === 0 ? 1 : 0.5 }} />
                        </p>
                        <p className="ant-upload-text" style={{ fontSize: '14px', fontWeight: 500, color: fileList.length === 0 ? '#000000d9' : '#1a73e8' }}>
                            {fileList.length === 0 ? 'Glissez votre fichier .dxf ici' : 'Fichier prêt à être téléchargé'}
                        </p>
                        <p className="ant-upload-hint" style={{ fontSize: '12px', color: '#666' }}>
                            Formats acceptés : .dxf (Max: 50MB)
                        </p>
                    </Dragger>

                    {errorMessage && (
                        <Paragraph type="danger" style={{ marginTop: '12px', textAlign: 'center', fontSize: '14px' }}>{errorMessage}</Paragraph>
                    )}

                    {fileList.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <List
                                size="small"
                                dataSource={fileList}
                                renderItem={file => (
                                    <List.Item
                                        style={{ padding: '8px', background: '#f0f5ff', borderRadius: '4px', border: '1px solid #e8e8e8' }}
                                        actions={[
                                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => uploadProps.onRemove(file)} size="small" />,
                                        ]}
                                    >
                                        <Space>
                                            <FileOutlined style={{ color: '#1a73e8', fontSize: '16px' }} />
                                            <Text strong style={{ fontSize: '14px' }}>{file.name}</Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                            </Text>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </div>
                    )}

                    {currentProgress > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <Progress percent={currentProgress} strokeColor="#1a73e8" trailColor="#f0f0f0" size="small" />
                        </div>
                    )}

                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        <Button
                            type="primary"
                            onClick={handleUpload}
                            disabled={fileList.length === 0}
                            loading={uploading || loadingStates['upload']}
                            icon={<CheckCircleOutlined />}
                            size="middle"
                            style={{ borderRadius: '4px', padding: '4px 16px' }}
                        >
                            {uploading ? 'Téléchargement...' : loadingStates['upload'] ? 'Extraction...' : 'Extraire les données'}
                        </Button>
                    </div>
                </>
            )}

            <Modal
                title={<Title level={4} style={{ margin: 0, color: '#0052cc' }}>Données extraites du fichier .dxf</Title>}
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsModalVisible(false)} style={{ borderRadius: '4px' }}>
                        Fermer
                    </Button>,
                ]}
                width={900}
                bodyStyle={{ padding: '16px', maxHeight: '70vh', overflowY: 'auto' }}
                style={{ top: 20 }}
            >
                {extractedData && !extractedData.error ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Tabs defaultActiveKey="stats" type="card" style={{ marginTop: '16px' }}>
                            <TabPane tab="Statistiques" key="stats">
                                <Card bordered={false} style={{ background: '#f9fafb', borderRadius: '8px' }}>
                                    <Space direction="vertical" size={8}>
                                        <Text strong>Statistiques générales :</Text>
                                        <List
                                            size="small"
                                            dataSource={[
                                                { label: 'Calques', value: extractedData.statistics.layer_count },
                                                { label: 'Polylignes', value: extractedData.statistics.polyline_count },
                                                { label: 'Lignes', value: extractedData.statistics.line_count },
                                                { label: 'Cercles', value: extractedData.statistics.circle_count },
                                                { label: 'Arcs', value: extractedData.statistics.arc_count },
                                                { label: 'Textes', value: extractedData.statistics.text_count },
                                                { label: 'Total d’entités', value: extractedData.statistics.total_entities },
                                            ]}
                                            renderItem={item => (
                                                <List.Item style={{ padding: '4px 0' }}>
                                                    <Text>{item.label}: <Text strong>{item.value}</Text></Text>
                                                </List.Item>
                                            )}
                                        />
                                    </Space>
                                </Card>
                            </TabPane>
                            <TabPane tab="Calques" key="layers">
                                <Table
                                    dataSource={extractedData.layers.map((layer, idx) => ({
                                        key: idx,
                                        name: layer.name,
                                        color: layer.color || 'N/A',
                                    }))}
                                    columns={[
                                        { title: 'Nom', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
                                        { title: 'Couleur', dataIndex: 'color' },
                                    ]}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                />
                            </TabPane>
                            <TabPane tab="Polylignes" key="polylines">
                                <Table
                                    dataSource={renderEntityDataSource(extractedData.polylines || [])}
                                    columns={entityColumns}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            </TabPane>
                            <TabPane tab="Lignes" key="lines">
                                <Table
                                    dataSource={renderEntityDataSource(extractedData.lines || [])}
                                    columns={entityColumns}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            </TabPane>
                            <TabPane tab="Cercles" key="circles">
                                <Table
                                    dataSource={renderEntityDataSource(extractedData.circles || [])}
                                    columns={entityColumns}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            </TabPane>
                            <TabPane tab="Arcs" key="arcs">
                                <Table
                                    dataSource={renderEntityDataSource(extractedData.arcs || [])}
                                    columns={entityColumns}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            </TabPane>
                            <TabPane tab="Textes" key="texts">
                                <Table
                                    dataSource={renderEntityDataSource(extractedData.texts || [])}
                                    columns={entityColumns}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            </TabPane>
                        </Tabs>
                    </motion.div>
                ) : (
                    <Empty description={<Text>Aucune donnée disponible</Text>} />
                )}
            </Modal>
        </div>
    );
};

export default FileUpload;