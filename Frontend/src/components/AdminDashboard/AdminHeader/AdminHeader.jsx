import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { Tooltip } from 'primereact/tooltip';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './AdminHeader.css';
import logo from '../../../assets/logo.png';

const AdminHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-left">
        <img src={logo} className="header-logo" alt="Logo" />
        <span className="brand-name">TA-SDP Tool</span>
      </div>
      <div className="header-right">
        <a className="header-link home-icon" onClick={() => navigate('/admin-dashboard')}>
          <i className="pi pi-home"></i>
          <span className="link-text">Accueil</span>
        </a>
        <a href="#" className="header-link notifications">
          <i className="pi pi-bell"></i>
          <Badge value="2" severity="info" className="notification-badge"></Badge>
        </a>
        <a href="#" className="header-link support-link static">
          <span className="link-text">Support</span>
        </a>
        <div className="user-profile" onClick={() => navigate('/admin-dashboard/configuration')}>
          <Avatar icon="pi pi-user" shape="circle" size="small" className="profile-avatar" />
          <span className="profile-text">Mon Profil</span>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
