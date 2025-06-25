from app import db
from Crypto.Cipher import AES
import base64
import os
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes

# Une clé secrète (peut être stockée dans une variable d'environnement pour plus de sécurité)
SECRET_KEY = os.getenv('SECRET_KEY', 'my_secret_key')  # A remplacer par une clé plus sécurisée

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(50), nullable=False)
    prenom = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)

    def __init__(self, nom, prenom, email, password, role):
        self.nom = nom
        self.prenom = prenom
        self.email = email
        self.password = self.encrypt_password(password)
        self.role = role

    def encrypt_password(self, password):
        """Encrypts the password using AES encryption with a derived key"""
        salt = get_random_bytes(16)  # Salt aléatoire pour l'unicité
        key = PBKDF2(SECRET_KEY.encode('utf-8'), salt, dkLen=32)
        
        cipher = AES.new(key, AES.MODE_EAX)
        ciphertext, tag = cipher.encrypt_and_digest(password.encode('utf-8'))
        
        # Stocker le nonce, le tag et le ciphertext dans la base de données (encodé en base64)
        encrypted_password = base64.b64encode(salt + cipher.nonce + tag + ciphertext).decode('utf-8')
        return encrypted_password

    def decrypt_password(self, encrypted_password):
        """Decrypts the encrypted password"""
        # Décoder les données encodées en base64
        data = base64.b64decode(encrypted_password.encode('utf-8'))
        
        salt = data[:16]
        nonce = data[16:32]
        tag = data[32:48]
        ciphertext = data[48:]
        
        # Générer la clé avec le même secret et le même salt
        key = PBKDF2(SECRET_KEY.encode('utf-8'), salt, dkLen=32)
        
        cipher = AES.new(key, AES.MODE_EAX, nonce=nonce)
        try:
            password = cipher.decrypt_and_verify(ciphertext, tag)
            return password.decode('utf-8')
        except (ValueError, KeyError):
            raise ValueError("Incorrect decryption or key")