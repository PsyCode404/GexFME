import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "primereact/button";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsersCog,
  faFolderTree,
  faBuilding,
  faTools,
  faSignOutAlt
} from "@fortawesome/free-solid-svg-icons";
import "./AdminSidebar.css";
import logo from "../../../assets/logo.png";
import { logout } from "../../../services/authService";

const AdminSidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(-1);
  const fullText = "GEXPERTISE";
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!isSidebarOpen) {
      // Réinitialise seulement quand la sidebar se ferme
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    const currentPath = location.pathname;
    const foundIndex = menuItems.findIndex((item) => item.path === currentPath);
    setActiveIndex(foundIndex);
  }, [location.pathname]);

  const handleItemClick = (index, path) => {
    setActiveIndex(index);
    navigate(path);
  };

  const handleOutsideClick = (event) => {
    if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const menuItems = [
    { 
      icon: faUsersCog, 
      label: "Gestion Utilisateurs", 
      path: "/admin-dashboard/gestion-utilisateurs" 
    },
    { 
      icon: faFolderTree, 
      label: "Gestion Ressources", 
      path: "/admin-dashboard/gestion-ressources" 
    },
    { 
      icon: faTools, 
      label: "Configuration", 
      path: "/admin-dashboard/configuration" 
    },
  ];

  return (
    <div ref={sidebarRef} className={`sidebar ${isSidebarOpen ? "expanded" : "collapsed"}`}>
      <div className="sidebar-header">
        {isSidebarOpen ? (
          <Link to="/admin-dashboard" className="sidebar-title-link">
            <h1 className="sidebar-title">
              {fullText.split("").map((char, index) => (
                <span 
                  key={index} 
                  className="letter"
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    display: 'inline-block'
                  }}
                >
                  {char}
                </span>
              ))}
            </h1>
          </Link>
        ) : (
          <Link to="/admin-dashboard" className="sidebar-title-link collapsed">
            <h1 className="sidebar-title collapsed"></h1>
          </Link>
        )}
      </div>

      <Button
        icon={isSidebarOpen ? "pi pi-angle-left" : "pi pi-angle-right"}
        className="toggle-button"
        onClick={(e) => {
          e.stopPropagation();
          setIsSidebarOpen(!isSidebarOpen);
        }}
      />

      <ul className="menu-list">
        {menuItems.map((item, index) => (
          <li
            key={index}
            className={`menu-item ${activeIndex === index ? "active" : ""}`}
            onClick={() => handleItemClick(index, item.path)}
          >
            <FontAwesomeIcon icon={item.icon} className="menu-icon" />
            {isSidebarOpen && <span className="menu-label">{item.label}</span>}
          </li>
        ))}
      </ul>

      <div className="logout-sidebar-container">
        <div className="logout-sidebar-button" onClick={handleLogout}>
          <FontAwesomeIcon icon={faSignOutAlt} className="logout-sidebar-icon" />
          {isSidebarOpen && <span className="logout-sidebar-text">Se déconnecter</span>}
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;