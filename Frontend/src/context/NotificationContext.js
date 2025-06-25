import React, { createContext, useState, useContext } from 'react';
import Notification from '../components/common/Notification';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({ message: '', type: '' });

  const showNotification = (message, type = 'info', duration = 5000) => {
    setNotification({ message, type, duration });
  };

  const hideNotification = () => {
    setNotification({ message: '', type: '' });
  };

  // Helper functions for common notification types
  const showSuccess = (message, duration = 5000) => {
    showNotification(message, 'success', duration);
  };

  const showError = (message, duration = 5000) => {
    showNotification(message, 'error', duration);
  };

  const showInfo = (message, duration = 5000) => {
    showNotification(message, 'info', duration);
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notification, 
        showNotification, 
        hideNotification,
        showSuccess,
        showError,
        showInfo
      }}
    >
      {children}
      {notification.message && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
          duration={notification.duration}
        />
      )}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
