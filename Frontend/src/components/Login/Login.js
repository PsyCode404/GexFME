import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import logo from '../../assets/logo.png';
import Notification from '../common/Notification';
import { saveToken, getUser } from '../../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const user = getUser();
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin-dashboard', { replace: true });
      } else if (user.role === 'user') {
        navigate('/user-dashboard', { replace: true });
      }
    }
  }, [navigate]);

  // Vérifier si l'utilisateur vient d'être redirigé après une inscription réussie
  useEffect(() => {
    const signupSuccess = sessionStorage.getItem('signupSuccess');
    if (signupSuccess) {
      setNotification({
        message: 'Inscription réussie ! Vous pouvez maintenant vous connecter.',
        type: 'success'
      });
      sessionStorage.removeItem('signupSuccess');
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setNotification({
        message: 'Veuillez remplir tous les champs',
        type: 'error'
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await fetch('https://gexfme.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (response.ok) {
        // Extract user data
        const userData = {
          role: data.role || data.user?.role,
          email: data.email || data.user?.email,
          nom: data.nom || data.user?.nom,
          prenom: data.prenom || data.user?.prenom,
          id: data.id || data.user?.id
        };

        // Save user data and token
        saveToken(data.access_token, userData);
        console.log('Stored user data:', userData);

        setFormData({
          email: '',
          password: '',
          rememberMe: false
        });

        setNotification({ message: 'Connexion réussie !', type: 'success' });

        // Immediate navigation based on role
        if (userData.role === 'admin') {
          console.log('Redirecting to admin dashboard');
          navigate('/admin-dashboard', { replace: true });
        } else if (userData.role === 'user') {
          console.log('Redirecting to user dashboard');
          navigate('/user-dashboard', { replace: true });
        }
      } else {
        setNotification({
          message: data.message || 'Erreur lors de la connexion',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setNotification({
        message: 'Erreur de connexion au serveur',
        type: 'error'
      });
    }
  };

  const handleMicrosoftLogin = () => {
    // Logique de connexion Microsoft
  };

  return (
    <div className="page-container">
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <header className="header header-modern">
        <div className="header-left">
          <img src={logo} className="header-logo" alt="Logo" />
          <span className="brand-name">Gexpertise</span>
        </div>
        <div className="header-right">
          <a href="#" className="header-link support">
            <div className="support-icon-container">
              <i className="uil uil-headphones-alt"></i>
              <i className="uil uil-comment-verify support-icon-overlay"></i>
            </div>
            <span>Support</span>
          </a>
        </div>
      </header>

      <div className="login-page">
        <div className="form card">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="logo">
              <img src={logo} alt="Gexpertise" />
            </div>
            <h2>Connectez-vous à votre compte</h2>

            <div className="input-icon">
              <i className="uil uil-at"></i>
              <input
                type="email"
                placeholder="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-icon">
              <i className="uil uil-keyhole-circle"></i>
              <input
                type="password"
                placeholder="Mot de passe"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="forgot-password">
              <Link to="/forgot-password" className="link">Mot de passe oublié ?</Link>
            
            </div>

            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <span>Se souvenir de moi</span>
            </label>

            <button type="submit" className="btn btn-icon">
              <i className="uil uil-arrow-circle-right"></i>
              Se connecter
            </button>

            <p className="message">
              Vous n'avez pas de compte ? <Link to="/signup" className="link">S'inscrire</Link>
            </p>

            <div className="alternative-login">
              <p>Ou se connecter avec</p>
              <button 
                type="button" 
                className="btn-icon login-icon microsoft"
                onClick={handleMicrosoftLogin}
              >
                <i className="uil uil-windows"></i>
                Microsoft
              </button>
            </div>
          </form>
        </div>
      </div>

      <footer className="footer">
        <p>
          <i className="uil uil-copyright"></i>
          Copyright {new Date().getFullYear()} Gexpertise
        </p>
      </footer>
    </div>
  );
};

export default Login;
