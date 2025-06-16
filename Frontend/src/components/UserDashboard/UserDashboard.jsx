import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import UserHeader from "./UserHeader/UserHeader";
import UserSidebar from "./UserSidebar/UserSidebar";
import { Card } from "primereact/card";
import "./UserDashboard.css";

const UserDashboard = ({ showNotification }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="User-dashboard">
      <UserHeader />
      <div className="dashboard-body">
        <UserSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <div className={`dashboard-content ${isSidebarOpen ? "shifted" : ""}`}>
          <div className="content">
            <Outlet /> {/* Affiche les sous-pages ici */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
