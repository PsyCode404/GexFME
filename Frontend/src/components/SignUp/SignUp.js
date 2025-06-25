import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Notification from '../common/Notification';
import { signup } from '../../services/authService';
import logo from '../../assets/logo.png';
import './SignUp.css';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false
  });
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validatePassword = (password) => {
    const conditions = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*]/.test(password)
    };
    return conditions;
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setNotification({ message: 'Veuillez entrer votre prénom', type: 'error' });
      return false;
    }
    if (!formData.lastName.trim()) {
      setNotification({ message: 'Veuillez entrer votre nom', type: 'error' });
      return false;
    }
    if (!formData.email.trim()) {
      setNotification({ message: 'Veuillez entrer votre email', type: 'error' });
      return false;
    }
    
    const passwordConditions = validatePassword(formData.password);
    if (!Object.values(passwordConditions).every(condition => condition)) {
      setNotification({ message: 'Le mot de passe ne respecte pas toutes les conditions', type: 'error' });
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setNotification({ message: 'Les mots de passe ne correspondent pas', type: 'error' });
      return false;
    }
    if (!formData.terms) {
      setNotification({ message: 'Veuillez accepter les termes et conditions', type: 'error' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      };

      await signup(userData);
      
      setNotification({ 
        message: 'Inscription réussie ! Redirection vers la page de connexion...', 
        type: 'success' 
      });
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setNotification({ 
        message: error.message || "Une erreur est survenue lors de l'inscription", 
        type: 'error' 
      });
    }
  };

  return (
    <div className="page-container">
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <header className="header">
        <div className="header-left">
          <img src={logo} className="header-logo" alt="Logo" />
          <span className="brand-name">Gexpertise</span>
        </div>
        <div className="header-right">
          <button className="header-link support">
            <div className="support-icon-container">
              <i className="uil uil-headphones-alt"></i>
              <i className="uil uil-comment-verify support-icon-overlay"></i>
            </div>
            <span>Support</span>
          </button>
        </div>
      </header>

      <div className="signup-page">
        <div className="form card">
          <form className="register-form" onSubmit={handleSubmit}>
            <div className="logo">
              <img src={logo} alt="Gexpertise" />
            </div>
            <h2>Créer votre compte</h2>

            <div className="input-group-group">
              <div className="input-icon">
                <i className="uil uil-user"></i>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Nom"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-icon">
                <i className="uil uil-user"></i>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Prénom"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

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
                onFocus={() => setShowPasswordRules(true)}
                onBlur={() => setShowPasswordRules(false)}
                required
              />
              {showPasswordRules && (
                <div className="password-rules">
                  <h4>Exigences du mot de passe</h4>
                  <ul>
                    <li className={validatePassword(formData.password).length ? 'valid' : ''}>
                      <span>Au moins 8 caractères</span>
                    </li>
                    <li className={validatePassword(formData.password).uppercase ? 'valid' : ''}>
                      <span>Une lettre majuscule</span>
                    </li>
                    <li className={validatePassword(formData.password).lowercase ? 'valid' : ''}>
                      <span>Une lettre minuscule</span>
                    </li>
                    <li className={validatePassword(formData.password).number ? 'valid' : ''}>
                      <span>Un chiffre</span>
                    </li>
                    <li className={validatePassword(formData.password).special ? 'valid' : ''}>
                      <span>Un caractère spécial (!@#$%^&*)</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="input-icon">
              <i className="uil uil-check-circle"></i>
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                name="terms"
                checked={formData.terms}
                onChange={handleChange}
                required
              />
              <span>J'accepte les <Link to="#" className="link">Termes et conditions</Link></span>
            </label>

            <button type="submit" className="btn btn-icon">
              <i className="uil uil-user-plus"></i>
              S'inscrire
            </button>

            <p className="message">
              Déjà inscrit ? <Link to="/login" className="link">Se connecter</Link>
            </p>
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

export default SignUp;
