import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Switch, Modal, message, Form, Input as AntInput, Select, Tooltip, Spin, Typography } from 'antd';
import 'antd/dist/reset.css';
import './GestionUtilisateurs.css';
import axios from 'axios';

const { Title } = Typography;

const { Option } = Select;
const { Search } = Input;

const GestionUtilisateurs = ({ sidebarOpen = false }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchUsers = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      // Utiliser XMLHttpRequest pour être cohérent avec le reste de l'application
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://localhost:5000/api/users/', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      // Ajouter le token d'authentification si disponible
      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            console.log('Utilisateurs récupérés:', data);
            
            if (Array.isArray(data)) {
              const formattedUsers = data.map((user) => ({
                id: user.id,
                fullName: `${user.prenom.toUpperCase()} ${user.nom.toUpperCase()}`,
                email: user.email,
                role: user.role,
                locked: user.role !== 'admin',
                active: user.role === 'admin',
                key: user.id,
              }));
              
              setUsers(formattedUsers);
              setFilteredUsers(formattedUsers);
              console.log('Liste des utilisateurs mise à jour:', formattedUsers);
            } else {
              console.warn('Réponse reçue mais pas un tableau:', data);
              setUsers([]);
              setFilteredUsers([]);
            }
          } catch (e) {
            console.error('Erreur lors du parsing de la réponse:', e);
            setUsers([]);
            setFilteredUsers([]);
          }
        } else {
          console.error(`Erreur ${xhr.status}: ${xhr.statusText}`);
          message.error({
            content: `Impossible de charger les utilisateurs. Erreur: ${xhr.status}`,
            duration: 3,
            style: { marginTop: '10vh' },
          });
          setUsers([]);
          setFilteredUsers([]);
        }
        if (showLoading) setLoading(false);
      };
      
      xhr.onerror = function() {
        console.error('Erreur réseau lors de la récupération des utilisateurs');
        message.error({
          content: 'Erreur réseau. Impossible de charger les utilisateurs.',
          duration: 3,
          style: { marginTop: '10vh' },
        });
        setUsers([]);
        setFilteredUsers([]);
        if (showLoading) setLoading(false);
      };
      
      xhr.send();
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      message.error({
        content: 'Impossible de charger les utilisateurs. Veuillez réessayer.',
        duration: 3,
        style: { marginTop: '10vh' },
      });
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let updatedFilteredUsers = [...users];
    if (showActiveOnly) {
      updatedFilteredUsers = updatedFilteredUsers.filter((user) => user.active);
    }
    if (searchValue) {
      const lowerValue = searchValue.toLowerCase();
      updatedFilteredUsers = updatedFilteredUsers.filter((user) =>
        String(user.id).includes(lowerValue) ||
        user.fullName.toLowerCase().includes(lowerValue) ||
        user.email.toLowerCase().includes(lowerValue) ||
        user.role.toLowerCase().includes(lowerValue)
      );
    }
    setFilteredUsers(updatedFilteredUsers);
  }, [users, showActiveOnly, searchValue]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onFilter = (value) => {
    if (!value) {
      fetchUsers(false);
    }
    setSearchValue(value);
  };

  const handleAction = (action, user) => {
    setSelectedUser(user);
    setModalAction(action);
    if (action === 'edit') {
      editForm.setFieldsValue({
        nom: user.fullName.split(' ')[1],
        prenom: user.fullName.split(' ')[0],
        email: user.email,
        role: user.role,
      });
      setIsEditModalVisible(true);
    } else {
      setIsModalVisible(true);
    }
  };

  const handleModalConfirm = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Token manquant, veuillez vous reconnecter.');
        setActionLoading(false);
        setIsModalVisible(false);
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      };

      if (modalAction === 'lock') {
        const updatedUser = {
          nom: selectedUser.fullName.split(' ')[1],
          prenom: selectedUser.fullName.split(' ')[0],
          email: selectedUser.email,
          role: selectedUser.locked ? 'admin' : 'user',
        };
        await axios.put(`http://localhost:5000/api/users/${selectedUser.id}`, updatedUser, config);
        message.success({
          content: `Utilisateur ${selectedUser.locked ? 'déverrouillé' : 'verrouillé'} : ${selectedUser.fullName}`,
          duration: 2,
          style: { marginTop: '10vh' },
        });
        fetchUsers();
      } else if (modalAction === 'delete') {
        console.log(`Tentative de suppression de l'utilisateur ID ${selectedUser.id} avec token JWT`);
        
        // Utiliser XMLHttpRequest au lieu d'axios pour la suppression
        const xhr = new XMLHttpRequest();
        xhr.open('DELETE', `http://localhost:5000/api/users/${selectedUser.id}`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('Suppression réussie:', xhr.responseText);
            message.success({
              content: `Utilisateur ${selectedUser.fullName} supprimé`,
              duration: 2,
              style: { marginTop: '10vh' },
            });
            fetchUsers();
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
          setActionLoading(false);
          setIsModalVisible(false);
        };
        
        xhr.onerror = function() {
          console.error('Erreur réseau lors de la suppression');
          message.error('Erreur réseau lors de la suppression');
          setActionLoading(false);
          setIsModalVisible(false);
        };
        
        xhr.send();
        return; // Sortir de la fonction car la requête est asynchrone
      }
      setIsModalVisible(false);
    } catch (error) {
      console.error('Erreur lors de l\'action:', error);
      let errorMessage = 'Une erreur est survenue lors de l\'action.';
      
      if (error.response) {
        console.log('Détails de l\'erreur:', error.response.status, error.response.data);
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.response.status === 403) {
          errorMessage = 'Vous n\'avez pas les permissions nécessaires.';
        }
      }
      
      message.error({
        content: errorMessage,
        duration: 3,
        style: { marginTop: '10vh' },
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (values) => {
    setActionLoading(true);
    try {
      const updatedUser = {
        nom: values.nom,
        prenom: values.prenom,
        email: values.email,
        role: values.role,
      };
      await axios.put(`http://localhost:5000/api/users/${selectedUser.id}`, updatedUser);
      message.success({
        content: `Utilisateur ${selectedUser.fullName} mis à jour avec succès !`,
        duration: 2,
        style: { marginTop: '10vh' },
      });
      setIsEditModalVisible(false);
      editForm.resetFields();
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l’utilisateur:', error);
      message.error({
        content: 'Erreur lors de la mise à jour. Veuillez réessayer.',
        duration: 3,
        style: { marginTop: '10vh' },
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddUser = () => {
    setIsAddModalVisible(true);
    form.resetFields();
  };

  const handleAddSubmit = async (values) => {
    setActionLoading(true);
    try {
      const newUser = {
        nom: values.nom,
        prenom: values.prenom,
        email: values.email,
        password: values.password,
        role: values.role,
      };
      await axios.post('http://localhost:5000/api/users/', newUser);
      message.success({
        content: 'Utilisateur ajouté avec succès !',
        duration: 2,
        style: { marginTop: '10vh' },
      });
      setIsAddModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de l’ajout de l’utilisateur:', error);
      message.error({
        content: 'Erreur lors de l’ajout. Veuillez réessayer.',
        duration: 3,
        style: { marginTop: '10vh' },
      });
    } finally {
      setActionLoading(false);
    }
  };

  const actionBodyTemplate = (rowData) => (
    <div className="actions" role="toolbar" aria-label="Actions sur l'utilisateur">
      <Tooltip title="Éditer" placement="top">
        <Button
          className="action-btn edit"
          icon={<i className="pi pi-pencil" />}
          onClick={() => handleAction('edit', rowData)}
          aria-label="Éditer l'utilisateur"
        />
      </Tooltip>
      <Tooltip title={rowData.locked ? 'Déverrouiller' : 'Verrouiller'} placement="top">
        <Button
          className="action-btn lock"
          icon={<i className={`pi ${rowData.locked ? 'pi-lock' : 'pi-unlock'}`} />}
          onClick={() => handleAction('lock', rowData)}
          aria-label={rowData.locked ? 'Déverrouiller l’utilisateur' : 'Verrouiller l’utilisateur'}
        />
      </Tooltip>
      <Tooltip title="Supprimer" placement="top">
        <Button
          className="action-btn delete"
          icon={<i className="pi pi-trash" />}
          onClick={() => handleAction('delete', rowData)}
          aria-label="Supprimer l'utilisateur"
        />
      </Tooltip>
    </div>
  );

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id, width: '8%', align: 'center', className: 'table-column' },
    { title: 'Nom complet', dataIndex: 'fullName', key: 'fullName', sorter: (a, b) => a.fullName.localeCompare(b.fullName), width: '20%', align: 'center', className: 'table-column' },
    { title: 'Courriel', dataIndex: 'email', key: 'email', sorter: (a, b) => a.email.localeCompare(b.email), width: '25%', align: 'center', className: 'table-column' },
    {
      title: 'Rôle',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <span style={{ color: role === 'admin' ? '#1890ff' : '#000', fontWeight: 500 }}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
      ),
      sorter: (a, b) => a.role.localeCompare(b.role),
      width: '10%',
      align: 'center',
      className: 'table-column',
    },
    {
      title: 'Verrouillé',
      dataIndex: 'locked',
      key: 'locked',
      render: (locked) => (
        <span style={{ color: locked ? '#ff4d4f' : '#52c41a', fontSize: '16px' }}>
          {locked ? '✗' : '✓'}
        </span>
      ),
      sorter: (a, b) => Number(a.locked) - Number(b.locked),
      width: '10%',
      align: 'center',
      className: 'table-column',
    },
    {
      title: 'Actif',
      dataIndex: 'active',
      key: 'active',
      render: (active) => (
        <span style={{ color: active ? '#52c41a' : '#ff4d4f', fontSize: '16px' }}>
          {active ? '✓' : '✗'}
        </span>
      ),
      sorter: (a, b) => Number(a.active) - Number(b.active),
      width: '10%',
      align: 'center',
      className: 'table-column',
    },
    { title: 'Actions', key: 'actions', render: actionBodyTemplate, width: '17%', align: 'center', className: 'table-column' },
  ];

  return (
    <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} role="main" aria-label="Gestion des utilisateurs">
      <div className="gestion-utilisateurs-container">
        <div className="page-header">
          <Title level={2} className="page-title">Gestion des Utilisateurs</Title>
          <p className="page-description">Créez, modifiez et gérez les comptes utilisateurs de la plateforme</p>
        </div>
        <div className="filter-section">
          <div className="filter-group-left">
            <div className="filter-group" role="group" aria-label="Filtres">
              <span className="filter-label enhanced-filter-label">Afficher uniquement les actifs</span>
              <Switch
                checked={showActiveOnly}
                onChange={(checked) => setShowActiveOnly(checked)}
                checkedChildren={<span style={{ fontSize: '12px', fontWeight: 500 }}>Oui</span>}
                unCheckedChildren={<span style={{ fontSize: '12px', fontWeight: 500 }}>Non</span>}
                className="filter-switch enhanced-filter-switch"
                aria-label="Basculer l'affichage des utilisateurs actifs"
              />
            </div>
          </div>
          <div className="filter-actions">
            <Input.Search
              placeholder="Rechercher (ID, nom, email, rôle)..."
              allowClear
              onChange={(e) => onFilter(e.target.value)}
              style={{ width: 250 }}
              aria-label="Rechercher dans la liste des utilisateurs"
            />
            <Tooltip title="Ajouter un nouvel utilisateur" placement="top">
              <Button type="primary" className="add-button" icon={<i className="pi pi-plus" />} onClick={handleAddUser} aria-label="Ajouter un utilisateur">
                Ajouter utilisateur
              </Button>
            </Tooltip>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          pagination={{
            pageSize: 10,
            pageSizeOptions: ['10'],
            showSizeChanger: false,
            className: 'pagination-modern',
            showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total} utilisateurs`,
          }}
          rowKey="key"
          bordered
          scroll={{ y: 500 }}
          className="ant-table-modern"
          rowClassName={(record, index) => (index % 2 === 0 ? 'table-row-even' : 'table-row-odd')}
          aria-label="Tableau des utilisateurs"
        />
      </div>

      <Modal
        title={
          <span className="modal-title">
            <i className={`pi ${modalAction === 'delete' ? 'pi-trash' : 'pi-lock'} modal-icon`} style={{ marginRight: 8 }} />
            {modalAction === 'delete' ? 'Supprimer utilisateur' : 'Verrouiller/Déverrouiller'}
          </span>
        }
        visible={isModalVisible}
        onOk={handleModalConfirm}
        onCancel={() => setIsModalVisible(false)}
        okText={modalAction === 'delete' ? 'Supprimer' : selectedUser?.locked ? 'Déverrouiller' : 'Verrouiller'}
        cancelText="Annuler"
        confirmLoading={actionLoading}
        okButtonProps={{ danger: modalAction === 'delete', disabled: actionLoading }}
        className="modern-modal animate-modal"
        bodyStyle={{ overflowY: 'auto', padding: '24px' }}
        getContainer={false}
        destroyOnClose
        maskClosable={false}
        aria-label={`Confirmation pour ${modalAction} l'utilisateur ${selectedUser?.fullName || ''}`}
      >
        <Spin spinning={actionLoading} tip="Traitement en cours...">
          <p className="modal-text">
            {modalAction === 'delete'
              ? `Voulez-vous vraiment supprimer ${selectedUser?.fullName} ? Cette action est irréversible.`
              : `Voulez-vous ${selectedUser?.locked ? 'déverrouiller' : 'verrouiller'} ${selectedUser?.fullName} ?`}
          </p>
        </Spin>
      </Modal>

      <Modal
        title={
          <span className="modal-title">
            <i className="pi pi-plus modal-icon" style={{ marginRight: 8 }} />
            Ajouter un nouvel utilisateur
          </span>
        }
        visible={isAddModalVisible}
        onCancel={() => {
          setIsAddModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        className="modern-modal animate-modal"
        bodyStyle={{ overflowY: 'auto', padding: '24px' }}
        getContainer={false}
        destroyOnClose
        maskClosable={false}
        aria-label="Ajouter un nouvel utilisateur"
      >
        <Spin spinning={actionLoading} tip="Ajout en cours...">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddSubmit}
            initialValues={{ nom: '', prenom: '', email: '', password: '', role: 'user' }}
            className="modern-form"
            aria-label="Formulaire d'ajout d'utilisateur"
          >
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: 'Veuillez entrer le nom !' }]} className="modern-form-item">
              <AntInput placeholder="Entrez le nom" className="modern-input" aria-label="Nom de l'utilisateur" disabled={actionLoading} />
            </Form.Item>
            <Form.Item name="prenom" label="Prénom" rules={[{ required: true, message: 'Veuillez entrer le prénom !' }]} className="modern-form-item">
              <AntInput placeholder="Entrez le prénom" className="modern-input" aria-label="Prénom de l'utilisateur" disabled={actionLoading} />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Veuillez entrer l’email !' },
                { type: 'email', message: 'Veuillez entrer un email valide !' },
              ]}
              className="modern-form-item"
            >
              <AntInput placeholder="Entrez l’email" className="modern-input" aria-label="Email de l'utilisateur" disabled={actionLoading} />
            </Form.Item>
            <Form.Item
              name="password"
              label="Mot de passe"
              rules={[{ required: true, message: 'Veuillez entrer le mot de passe !' }]}
              className="modern-form-item"
            >
              <AntInput.Password
                placeholder="Entrez le mot de passe"
                className="modern-input"
                autoComplete="new-password"
                aria-label="Mot de passe de l'utilisateur"
                disabled={actionLoading}
              />
            </Form.Item>
            <Form.Item name="role" label="Rôle" rules={[{ required: true, message: 'Veuillez sélectionner un rôle !' }]} className="modern-form-item">
              <Select placeholder="Sélectionnez un rôle" className="modern-select" aria-label="Rôle de l'utilisateur" disabled={actionLoading}>
                <Option value="admin">Administrateur</Option>
                <Option value="user">Utilisateur</Option>
              </Select>
            </Form.Item>
            <Form.Item className="modern-form-item">
              <div className="modal-actions">
                <Button type="primary" htmlType="submit" className="modern-submit" loading={actionLoading} aria-label="Soumettre l'ajout" disabled={actionLoading}>
                  Ajouter
                </Button>
                <Button className="modern-cancel" onClick={() => { setIsAddModalVisible(false); form.resetFields(); }} aria-label="Annuler l'ajout" disabled={actionLoading}>
                  Annuler
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>

      <Modal
        title={
          <span className="modal-title">
            <i className="pi pi-pencil modal-icon" style={{ marginRight: 8 }} />
            Éditer un utilisateur
          </span>
        }
        visible={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
        className="modern-modal animate-modal"
        bodyStyle={{ overflowY: 'auto', padding: '24px' }}
        getContainer={false}
        destroyOnClose
        maskClosable={false}
        aria-label={`Éditer l'utilisateur ${selectedUser?.fullName || ''}`}
      >
        <Spin spinning={actionLoading} tip="Mise à jour en cours...">
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleEditSubmit}
            className="modern-form"
            aria-label="Formulaire d'édition d'utilisateur"
          >
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: 'Veuillez entrer le nom !' }]} className="modern-form-item">
              <AntInput placeholder="Entrez le nom" className="modern-input" aria-label="Nom de l'utilisateur" disabled={actionLoading} />
            </Form.Item>
            <Form.Item name="prenom" label="Prénom" rules={[{ required: true, message: 'Veuillez entrer le prénom !' }]} className="modern-form-item">
              <AntInput placeholder="Entrez le prénom" className="modern-input" aria-label="Prénom de l'utilisateur" disabled={actionLoading} />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Veuillez entrer l’email !' },
                { type: 'email', message: 'Veuillez entrer un email valide !' },
              ]}
              className="modern-form-item"
            >
              <AntInput placeholder="Entrez l’email" className="modern-input" aria-label="Email de l'utilisateur" disabled={actionLoading} />
            </Form.Item>
            <Form.Item name="role" label="Rôle" rules={[{ required: true, message: 'Veuillez sélectionner un rôle !' }]} className="modern-form-item">
              <Select placeholder="Sélectionnez un rôle" className="modern-select" aria-label="Rôle de l'utilisateur" disabled={actionLoading}>
                <Option value="admin">Administrateur</Option>
                <Option value="user">Utilisateur</Option>
              </Select>
            </Form.Item>
            <Form.Item className="modern-form-item">
              <div className="modal-actions">
                <Button type="primary" htmlType="submit" className="modern-submit" loading={actionLoading} aria-label="Soumettre les modifications" disabled={actionLoading}>
                  Sauvegarder
                </Button>
                <Button className="modern-cancel" onClick={() => { setIsEditModalVisible(false); editForm.resetFields(); }} aria-label="Annuler les modifications" disabled={actionLoading}>
                  Annuler
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  );
};

export default GestionUtilisateurs;