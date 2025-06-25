import React, { useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type = 'info', onClose, autoDismiss = true, duration = 5000 }) => {
  useEffect(() => {
    if (autoDismiss && message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, autoDismiss, onClose, duration]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <i className="uil uil-check-circle notification-icon"></i>;
      case 'error':
        return <i className="uil uil-exclamation-triangle notification-icon"></i>;
      case 'info':
        return <i className="uil uil-info-circle notification-icon"></i>;
      default:
        return null;
    }
  };

  if (!message) return null;
  
  return (
    <div className={`notification ${type}`}>
      {getIcon()}
      <span className="notification-message">{message}</span>
      <button className="notification-close" onClick={onClose}>×</button>
    </div>
  );
};

export default Notification;
