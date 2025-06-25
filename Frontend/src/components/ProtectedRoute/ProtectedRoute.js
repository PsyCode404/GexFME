import { Navigate } from 'react-router-dom';
import { getUser } from '../../services/authService';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const user = getUser();
    
    // Si pas d'utilisateur ou pas de token, rediriger vers login
    if (!user || !localStorage.getItem('token')) {
        return <Navigate to="/login" replace />;
    }
    
    // Vérifier si le rôle de l'utilisateur est autorisé
    if (!allowedRoles.includes(user.role)) {
        // Rediriger vers le dashboard approprié selon le rôle
        if (user.role === 'admin') {
            return <Navigate to="/admin-dashboard" replace />;
        } else if (user.role === 'user') {
            return <Navigate to="/user-dashboard" replace />;
        }
        // Si le rôle n'est pas reconnu, rediriger vers login
        return <Navigate to="/login" replace />;
    }
    
    return children;
};

export default ProtectedRoute;