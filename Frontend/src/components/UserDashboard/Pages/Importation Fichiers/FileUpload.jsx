import React, { useState, useEffect } from 'react';
import { Upload, message, Button, Space, List } from 'antd';
import { InboxOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

const { Dragger } = Upload;
const { Text, Paragraph } = Typography;

const FileUpload = ({ onFileUploaded }) => {
    const [fileList, setFileList] = useState([]);
    const [errorMessage, setErrorMessage] = useState(null);

    const resetUploadState = () => {
        setFileList([]);
        setErrorMessage(null);
        message.info('Fichier supprimé. Prêt pour un nouveau téléchargement.');
    };

    const props = {
        onRemove: () => {
            resetUploadState();
        },
        beforeUpload: (file) => {
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
            return false;
        },
        fileList,
        maxCount: 1,
        multiple: false,
    };

    useEffect(() => {
        if (fileList.length > 0 && onFileUploaded) {
            onFileUploaded(fileList[0]);
        }
    }, [fileList, onFileUploaded]);

    return (
        <div style={{ textAlign: 'center', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <Dragger
                {...props}
                style={{
                    padding: '20px',
                    background: fileList.length === 0 ? '#fafafa' : '#eff6ff',
                    border: '2px dashed #0052cc',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease',
                }}
            >
                <p className="ant-upload-drag-icon">
                    <InboxOutlined
                        style={{
                            color: '#0052cc',
                            fontSize: '32px',
                            opacity: fileList.length === 0 ? 1 : 0.5,
                        }}
                    />
                </p>
                <p
                    className="ant-upload-text"
                    style={{
                        fontSize: '16px',
                        fontWeight: 500,
                        color: fileList.length === 0 ? '#000000d9' : '#0052cc',
                    }}
                >
                    {fileList.length === 0
                        ? 'Glissez votre fichier .dxf ici'
                        : 'Fichier prêt pour l’extraction'}
                </p>
                <p className="ant-upload-hint" style={{ color: '#6b7280' }}>
                    Formats acceptés : .dxf (Max: 50MB)
                </p>
            </Dragger>

            {errorMessage && (
                <Paragraph
                    type="danger"
                    style={{ marginTop: '16px', textAlign: 'center', color: '#dc2626' }}
                >
                    {errorMessage}
                </Paragraph>
            )}

            {fileList.length > 0 && (
                <div style={{ marginTop: '16px', textAlign: 'left' }}>
                    <List
                        size="small"
                        dataSource={fileList}
                        renderItem={(file) => (
                            <List.Item
                                style={{
                                    padding: '12px',
                                    background: '#f9fafb',
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb',
                                    animation: 'fadeIn 0.3s ease-in',
                                }}
                                actions={[
                                    <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => props.onRemove(file)}
                                    />,
                                ]}
                            >
                                <Space>
                                    <FileOutlined style={{ color: '#0052cc' }} />
                                    <Text strong>{file.name}</Text>
                                    <Text type="secondary">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </Text>
                                </Space>
                            </List.Item>
                        )}
                    />
                </div>
            )}

            {fileList.length === 0 && (
                <div style={{ marginTop: '24px', textAlign: 'left' }}>
                    <Paragraph type="secondary">
                        <Text strong>Comment préparer votre fichier .dxf :</Text>
                        <ul style={{ marginTop: '8px', listStyle: 'none', padding: 0, color: '#6b7280' }}>
                            <li>Utilisez un fichier .dxf propre et bien structuré</li>
                            <li>Assurez-vous que les calques sont correctement nommés</li>
                            <li>Vérifiez que toutes les polylignes et entités sont correctement définies</li>
                            <li>Taille maximale : 50 MB</li>
                        </ul>
                    </Paragraph>
                </div>
            )}

            <style jsx>{`
                .ant-upload-dragger:hover {
                    border-color: #0052cc !important;
                    background-color: #eff6ff !important;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default FileUpload;