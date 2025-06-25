import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AdminHeader from "./AdminHeader/AdminHeader";
import AdminSidebar from "./AdminSidebar/AdminSidebar";
import { Card } from "primereact/card";
import "./AdminDashboard.css";

const AdminDashboard = ({ showNotification }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="admin-dashboard">
      <AdminHeader />
      <div className="dashboard-body">
        <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <div className={`dashboard-content ${isSidebarOpen ? "shifted" : ""}`}>
          <div className="content">
            <Outlet /> {/* Affiche les sous-pages ici */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
