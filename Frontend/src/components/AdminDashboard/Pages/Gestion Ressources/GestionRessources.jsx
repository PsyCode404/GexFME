import React, { useEffect, useState, useCallback } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { 
  Button, 
  Card, 
  Space, 
  Typography, 
  message, 
  Spin, 
  Modal, 
  Form, 
  Input, 
  DatePicker,
  ConfigProvider,
  Tooltip,
  Empty,
  Badge,
  Tag,
  Avatar,
  App
} from 'antd';
import { 
  FolderOutlined, 
  InboxOutlined, 
  MailOutlined, 
  CalendarOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  CrownOutlined,
  FileOutlined,
  TeamOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './GestionRessources.css';

const { Title, Text, Paragraph } = Typography;

const API_URL = process.env.REACT_APP_API_URL || 'https://gexfme.onrender.com';
axios.defaults.baseURL = API_URL;

const GestionRessources = () => {
  const [usersWithFolders, setUsersWithFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const fetchUsersWithFolders = useCallback(() => {
    setLoading(true);
    setError(null);
    console.log('Chargement des utilisateurs et dossiers...');
    
    // Utiliser XMLHttpRequest pour éviter les problèmes CORS
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_URL}/api/users/simple-users-folders`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Ajouter le token d'authentification
    const token = localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    } else {
      console.warn('Token d\'authentification manquant');
      message.warning('Session non authentifiée, veuillez vous reconnecter');
    }
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log('Réponse du serveur:', data);
          
          if (Array.isArray(data)) {
            const formattedData = data.map(item => ({
              userId: item.user_id,
              fullName: `${item.nom} ${item.prenom}`,
              nom: item.nom,
              prenom: item.prenom,
              email: item.email,
              role: item.role || 'user',
              folderId: item.folder_id || null,
              folderName: item.nom_dossier || 'Aucun dossier',
              creationDate: item.date_creation
                ? moment(item.date_creation).format('DD/MM/YYYY HH:mm:ss')
                : 'N/A',
              lastLogin: item.last_login 
                ? moment(item.last_login).format('DD/MM/YYYY HH:mm:ss')
                : 'Jamais',
            }));
            
            setUsersWithFolders(formattedData);
            if (formattedData.length === 0) {
              message.info('Aucun utilisateur trouvé');
            } else {
              message.success(`${formattedData.length} utilisateur(s) chargé(s) avec succès`);
            }
          } else {
            console.warn('Format de réponse invalide:', data);
            setUsersWithFolders([]);
            setError('Format de réponse invalide');
            message.warning('Format de données incorrect reçu du serveur');
          }
        } catch (e) {
          console.error('Erreur lors du traitement des données:', e);
          setUsersWithFolders([]);
          setError('Erreur de traitement des données');
          message.error('Erreur lors du traitement des données');
        }
      } else {
        console.error(`Erreur ${xhr.status}: ${xhr.statusText}`);
        setUsersWithFolders([]);
        setError(`Erreur serveur: ${xhr.status}`);
        
        if (xhr.status === 401) {
          message.error('Session expirée, veuillez vous reconnecter');
        } else if (xhr.status === 403) {
          message.error('Accès refusé. Vous n\'avez pas les permissions nécessaires');
        } else {
          message.error(`Erreur lors du chargement des données (${xhr.status})`);
        }
      }
      setLoading(false);
    };
    
    xhr.onerror = function() {
      console.error('Erreur réseau lors de la récupération des données');
      setLoading(false);
      setUsersWithFolders([]);
      setError('Erreur de connexion au serveur');
      message.error('Erreur de connexion au serveur. Vérifiez votre connexion internet');
    };
    
    xhr.send();
  }, []);

  // La synchronisation est maintenant automatique dans le backend

  const handleDeleteFolder = (folderId, e) => {
    // Empêcher la propagation de l'événement pour éviter de déclencher d'autres actions
    e.stopPropagation();
    
    if (window.confirm(`Voulez-vous vraiment supprimer ce dossier ?`)) {
      console.log(`Confirmation reçue, suppression du dossier ID ${folderId}`);
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Token manquant, veuillez vous reconnecter.');
        setLoading(false);
        return;
      }
      axios.delete(`/api/users/delete-folder/${folderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then(response => {
          console.log('Réponse de la suppression du dossier:', response.data);
          message.success(response.data.message || 'Dossier supprimé avec succès');
          fetchUsersWithFolders();
        })
        .catch(error => {
          console.error('Erreur lors de handleDeleteFolder:', error);
          const errorMessage = error.response?.data?.message || error.message;
          if (error.response?.status === 401) {
            message.error('Session expirée, veuillez vous reconnecter.');
          } else if (error.response?.status === 403) {
            message.error('Vous n\'avez pas les permissions nécessaires pour supprimer ce dossier.');
          } else if (error.response?.status === 404) {
            message.error('Dossier non trouvé.');
          } else {
            message.error('Erreur lors de la suppression du dossier: ' + errorMessage);
          }
        })
        .finally(() => setLoading(false));
    } else {
      console.log('Suppression du dossier annulée');
    }
  };

  const showEditModal = (rowData) => {
    console.log(`Affichage de la fenêtre d'édition pour l'utilisateur ID ${rowData.userId}`);
    setEditingUser(rowData);
    form.setFieldsValue({
      fullName: rowData.fullName,
      email: rowData.email,
      folderName: rowData.folderName === 'Aucun dossier' ? '' : rowData.folderName,
      creationDate: rowData.creationDate !== 'N/A' ? moment(rowData.creationDate, 'DD/MM/YYYY HH:mm:ss') : null,
    });
    setIsEditModalVisible(true);
  };

  const handleEdit = async (values) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { fullName, email, folderName } = values;
      const [nom, prenom] = fullName.split(' ');

      await axios.put(`/api/users/${editingUser.userId}`, {
        nom,
        prenom,
        email,
        folderName: folderName || null,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      message.success('Utilisateur et dossier mis à jour avec succès');
      setIsEditModalVisible(false);
      fetchUsersWithFolders();
    } catch (error) {
      console.error('Erreur lors de handleEdit:', error);
      message.error('Erreur lors de la mise à jour: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (userId, folderId = null) => {
    console.log(`Tentative de suppression de l'utilisateur ID ${userId} et son dossier personnel (folderId: ${folderId})`);
    
    // Vérifier que userId est bien défini
    if (!userId) {
      console.error("ID utilisateur non défini");
      message.error("Impossible de supprimer : ID utilisateur manquant");
      return;
    }
    
    if (window.confirm(`Voulez-vous vraiment supprimer l'utilisateur ID ${userId} et son dossier personnel ?`)) {
      console.log(`Confirmation reçue, suppression de l'utilisateur ID ${userId} et son dossier personnel`);
      setLoading(true);
      
      // Récupérer le token à chaque fois pour éviter les problèmes d'expiration
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Token manquant, veuillez vous reconnecter.');
        setLoading(false);
        return;
      }
      
      // Ajouter un log pour voir l'URL complète
      const deleteUrl = `${API_URL}/api/users/${userId}`;
      console.log(`URL de suppression: ${deleteUrl}`);
      
      // Utiliser XMLHttpRequest pour être cohérent avec le reste de l'application
      const xhr = new XMLHttpRequest();
      xhr.open('DELETE', deleteUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('Réponse de la suppression:', response);
            message.success(response.message || 'Utilisateur et dossier supprimés avec succès');
            fetchUsersWithFolders(); // Rafraîchir la liste après suppression
          } catch (e) {
            console.error('Erreur lors du parsing de la réponse de suppression:', e);
            message.success('Suppression effectuée avec succès');
            fetchUsersWithFolders();
          }
        } else {
          console.error(`Erreur ${xhr.status}: ${xhr.statusText}`);
          let errorMessage = "Erreur lors de la suppression";
          
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.message || errorMessage;
          } catch (e) {
            console.error('Erreur lors du parsing de la réponse d\'erreur:', e);
          }
          
          if (xhr.status === 401) {
            message.error('Session expirée, veuillez vous reconnecter.');
          } else if (xhr.status === 403) {
            message.error('Vous n\'avez pas les permissions nécessaires pour supprimer cet utilisateur.');
          } else if (xhr.status === 404) {
            message.error('Utilisateur non trouvé.');
          } else {
            message.error('Erreur lors de la suppression: ' + errorMessage);
          }
        }
        setLoading(false);
      };
      
      xhr.onerror = function() {
        console.error('Erreur réseau lors de la suppression');
        message.error('Erreur réseau lors de la suppression');
        setLoading(false);
      };
      
      xhr.send();
    } else {
      console.log('Suppression annulée');
    }
  };

  const actionBodyTemplate = (rowData) => {
    return (
      <Space size="middle">
        <Tooltip title="Modifier l'utilisateur">
          <Button
            type="primary"
            shape="round"
            icon={<i className="pi pi-pencil" style={{ fontSize: '14px' }} />}
            onClick={() => showEditModal(rowData)}
            className="modern-edit-button"
          />
        </Tooltip>
        <Tooltip title="Supprimer l'utilisateur et son dossier">
          <Button
            danger
            shape="round"
            icon={<i className="pi pi-trash delete-icon" style={{ fontSize: '14px' }} />}
            onClick={(e) => {
              // Empêcher la propagation de l'événement
              e.stopPropagation();
              // Appeler handleDelete avec les bons paramètres
              handleDelete(rowData.userId, rowData.folderId);
            }}
            className="modern-delete-button"
          />
        </Tooltip>
      </Space>
    );
  };

  // This function is now replaced by the enhanced version below
  // and will be removed to avoid duplication

  // Fonction de filtrage des utilisateurs
  const getFilteredUsers = useCallback(() => {
    if (!searchText) return usersWithFolders;
    
    return usersWithFolders.filter(user => {
      const searchLower = searchText.toLowerCase();
      return (
        user.fullName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.folderName && user.folderName.toLowerCase().includes(searchLower))
      );
    });
  }, [usersWithFolders, searchText]);

  // Template pour la colonne utilisateur
  const userTemplate = (rowData) => {
    const firstLetter = rowData.fullName.charAt(0).toUpperCase();
    const isAdmin = rowData.role === 'admin';
    const randomColor = `hsl(${Math.floor(rowData.userId * 137.5) % 360}, 70%, 50%)`;
    
    return (
      <div className="user-column">
        <Avatar 
          style={{ 
            backgroundColor: isAdmin ? '#1890ff' : randomColor,
            marginRight: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '600'
          }}
          size="large"
        >
          {firstLetter}
        </Avatar>
        <div className="user-details">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Text strong style={{ fontSize: '15px' }}>{rowData.fullName}</Text>
            {isAdmin && (
              <Tag color="blue" style={{ marginLeft: '8px', borderRadius: '12px', padding: '0 8px' }}>
                <CrownOutlined style={{ marginRight: '4px' }} />
                Admin
              </Tag>
            )}
          </div>
          <div className="user-email">
            <MailOutlined style={{ marginRight: '6px', fontSize: '12px', color: '#8c8c8c' }} />
            <Text type="secondary" style={{ fontSize: '13px' }}>{rowData.email}</Text>
          </div>
        </div>
      </div>
    );
  };

  // Template pour la colonne dossier
  const folderNameTemplate = (rowData) => {
    return (
      <div className="folder-container">
        {rowData.folderName === 'Aucun dossier' ? (
          <div className="empty-folder">
            <InboxOutlined style={{ marginRight: '8px', color: '#bfbfbf', fontSize: '16px' }} />
            <Text type="secondary" italic style={{ fontStyle: 'italic' }}>
              Aucun dossier
            </Text>
          </div>
        ) : (
          <div className="active-folder">
            <Badge status="success" style={{ marginRight: '4px' }} />
            <div className="folder-content">
              <div className="folder-name-container">
                <FolderOutlined style={{ color: '#1890ff', fontSize: '18px', marginRight: '8px' }} />
                <Text strong style={{ color: '#262626' }}>{rowData.folderName}</Text>
                <Tag color="cyan" style={{ marginLeft: '8px', fontSize: '11px', borderRadius: '10px', padding: '0 6px' }}>
                  <FileOutlined style={{ marginRight: '4px' }} />
                  Actif
                </Tag>
              </div>
              <Tooltip title="Supprimer le dossier">
                <Button
                  danger
                  size="small"
                  shape="circle"
                  icon={<i className="pi pi-trash delete-icon" style={{ fontSize: '12px' }} />}
                  onClick={(e) => handleDeleteFolder(rowData.folderId, e)}
                  className="delete-folder-button"
                />
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Template pour la colonne date
  const dateTemplate = (rowData) => {
    if (rowData.creationDate === 'N/A') {
      return (
        <div className="date-unavailable">
          <CalendarOutlined style={{ marginRight: '8px', color: '#d9d9d9' }} />
          <Text type="secondary" italic>Non disponible</Text>
        </div>
      );
    }
    
    const date = moment(rowData.creationDate, 'DD/MM/YYYY HH:mm:ss');
    const isRecent = moment().diff(date, 'days') < 7;
    const isVeryRecent = moment().diff(date, 'hours') < 24;
    
    return (
      <div className="date-container">
        <div className="date-badge" style={{ backgroundColor: isVeryRecent ? '#52c41a' : isRecent ? '#1890ff' : '#f0f0f0' }}>
          <CalendarOutlined style={{ color: isVeryRecent || isRecent ? '#fff' : '#8c8c8c' }} />
        </div>
        <div className="date-info">
          <Text strong style={{ color: isVeryRecent ? '#52c41a' : isRecent ? '#1890ff' : 'inherit', fontSize: '14px' }}>
            {rowData.creationDate}
          </Text>
          {isVeryRecent && (
            <Tag color="success" style={{ marginLeft: '8px', fontSize: '11px', borderRadius: '10px' }}>
              Nouveau
            </Tag>
          )}
          {!isVeryRecent && isRecent && (
            <Tag color="processing" style={{ marginLeft: '8px', fontSize: '11px', borderRadius: '10px' }}>
              Récent
            </Tag>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchUsersWithFolders();
  }, [fetchUsersWithFolders]);

  return (
    <App>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
            colorBgContainer: '#ffffff',
            colorText: '#1f2a44',
            borderRadius: 8,
            fontFamily: "'Inter', sans-serif",
          },
        }}
      >
      <div className="gestion-ressources-container">
        <div className="page-header">
          <Title level={2} className="page-title">Gestion des Ressources</Title>
          <p className="page-description">Gérez les dossiers personnels et les ressources des utilisateurs de la plateforme</p>
        </div>
        <Card
          title={
            <div className="card-header">
              <Title level={3} className="card-title">
                <TeamOutlined style={{ marginRight: '12px' }} />
                Gestion des Utilisateurs
              </Title>
              <Badge count={usersWithFolders.length} style={{ backgroundColor: '#52c41a' }} />
            </div>
          }
          extra={
            <Space>
              <Input.Search
                placeholder="Rechercher un utilisateur..."
                allowClear
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
              />
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={fetchUsersWithFolders}
                loading={loading}
                className="refresh-button"
              >
                Actualiser
              </Button>
            </Space>
          }
          className="gestion-card"
        >
          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
              <Text className="loading-text">Chargement des données...</Text>
            </div>
          ) : error ? (
            <div className="empty-state">
              <FileExcelOutlined className="empty-icon" />
              <Text strong style={{ fontSize: '16px', marginBottom: '8px' }}>
                Erreur lors du chargement des données
              </Text>
              <Paragraph type="secondary">{error}</Paragraph>
              <Button type="primary" onClick={fetchUsersWithFolders}>
                Réessayer
              </Button>
            </div>
          ) : usersWithFolders.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary">
                  Aucun utilisateur trouvé. Ajoutez des utilisateurs pour les voir ici.
                </Text>
              }
            />
          ) : (
            <>
              <DataTable
                value={getFilteredUsers()}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                dataKey="userId"
                responsiveLayout="scroll"
                emptyMessage={
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Aucun résultat ne correspond à votre recherche"
                  />
                }
                className="custom-datatable"
                header={
                  <div className="table-header-container">
                    <Text strong className="table-header">
                      <UserOutlined style={{ marginRight: '8px' }} />
                      Liste des utilisateurs et leurs ressources
                    </Text>
                    <Text type="secondary">
                      {getFilteredUsers().length} utilisateur(s) affiché(s)
                    </Text>
                  </div>
                }
                sortField="userId"
                sortOrder={1}
              >
                <Column
                  field="userId"
                  header="ID"
                  sortable
                  style={{ width: '70px' }}
                  className="table-column"
                />
                <Column
                  field="fullName"
                  header="Utilisateur"
                  body={userTemplate}
                  sortable
                  style={{ minWidth: '250px' }}
                  className="table-column"
                />
                <Column
                  field="folderName"
                  header="Dossier Personnel"
                  body={folderNameTemplate}
                  sortable
                  style={{ minWidth: '200px' }}
                  className="table-column"
                />
                <Column
                  field="creationDate"
                  header="Date de Création"
                  body={dateTemplate}
                  sortable
                  style={{ minWidth: '180px' }}
                  className="table-column"
                />
                <Column
                  body={actionBodyTemplate}
                  header="Actions"
                  style={{ width: '150px' }}
                  className="table-column"
                />
              </DataTable>
            </>
          )}
        </Card>

        <Modal
          title="Modifier les Informations"
          open={isEditModalVisible}
          onOk={() => form.submit()}
          onCancel={() => setIsEditModalVisible(false)}
          okText="Enregistrer"
          cancelText="Annuler"
          confirmLoading={loading}
          className="edit-modal"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleEdit}
            initialValues={editingUser}
            className="edit-form"
          >
            <Form.Item
              name="fullName"
              label="Nom Complet"
              rules={[{ required: true, message: 'Veuillez entrer le nom complet!' }]}
            >
              <Input placeholder="Ex: Jean Dupont" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email', message: 'Veuillez entrer un email valide!' }]}
            >
              <Input placeholder="Ex: jean.dupont@example.com" />
            </Form.Item>
            {/* Afficher le champ "Nom du Dossier" uniquement si un dossier existe */}
            {editingUser && editingUser.folderName !== 'Aucun dossier' && (
              <Form.Item
                name="folderName"
                label="Nom du Dossier"
              >
                <Input placeholder="Ex: dossier_projet" />
              </Form.Item>
            )}
            <Form.Item
              name="creationDate"
              label="Date de Création"
            >
              <DatePicker showTime format="DD/MM/YYYY HH:mm:ss" style={{ width: '100%' }} disabled />
            </Form.Item>
          </Form>
        </Modal>
      </div>
      </ConfigProvider>
    </App>
  );
};

export default GestionRessources;