// Configuration centralisée pour les URLs d'API
// Détection automatique de l'environnement

const getBaseApiUrl = () => {
    // En production (sur Render), utiliser l'URL de production
    if (window.location.hostname === 'gexfme.onrender.com') {
        return 'https://gexfme.onrender.com';
    }
    
    // Utiliser la variable d'environnement si disponible
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    
    // En développement local, utiliser localhost
    return 'http://localhost:5000';
};

// URLs d'API centralisées
export const API_CONFIG = {
    BASE_URL: getBaseApiUrl(),
    AUTH: {
        LOGIN: `${getBaseApiUrl()}/api/auth/login`,
        SIGNUP: `${getBaseApiUrl()}/api/auth/signup`,
        ME: `${getBaseApiUrl()}/api/auth/me`,
        BASE: `${getBaseApiUrl()}/api/auth/`
    },
    USERS: {
        BASE: `${getBaseApiUrl()}/api/users/`,
        BY_ID: (id) => `${getBaseApiUrl()}/api/users/${id}`,
        PASSWORD: (id) => `${getBaseApiUrl()}/api/users/${id}/password`
    },
    FILES: {
        BASE: `${getBaseApiUrl()}/api/files/`,
        UPLOAD: `${getBaseApiUrl()}/api/files/upload`
    }
};

// Export de l'URL de base pour compatibilité
export const API_URL = getBaseApiUrl();

export default API_CONFIG;
