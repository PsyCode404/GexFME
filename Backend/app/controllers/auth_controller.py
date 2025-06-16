from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from datetime import datetime, timezone
from app import db
from app.models.user import User

auth_ns = Namespace("auth", description="Gestion de l'authentification")

# Modèle pour l'authentification
login_model = auth_ns.model('Login', {
    'email': fields.String(required=True, description="Email de l'utilisateur"),
    'password': fields.String(required=True, description="Mot de passe de l'utilisateur")
})

# Modèle pour l'inscription
signup_model = auth_ns.model('Signup', {
    'firstName': fields.String(required=True, description="Prénom de l'utilisateur"),
    'lastName': fields.String(required=True, description="Nom de l'utilisateur"),
    'email': fields.String(required=True, description="Email de l'utilisateur"),
    'password': fields.String(required=True, description="Mot de passe de l'utilisateur")
})

@auth_ns.route("/login")
class Login(Resource):
    @auth_ns.expect(login_model)
    def post(self):
        data = auth_ns.payload
        email = data['email']
        password = data['password']
        
        # Vérifier si l'utilisateur existe
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return {"message": "Utilisateur non trouvé"}, 404
        
        # Vérifier si le mot de passe est correct
        try:
            if user.decrypt_password(user.password) != password:
                return {"message": "Mot de passe incorrect"}, 401
        except ValueError:
            return {"message": "Erreur lors de la décryption du mot de passe"}, 500
        
        # Création du token JWT avec des informations supplémentaires
        additional_claims = {
            'email': user.email,
            'role': user.role,
            'nom': user.nom,
            'prenom': user.prenom,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Convertir l'ID utilisateur en chaîne de caractères pour éviter l'erreur 'Subject must be a string'
        access_token = create_access_token(
            identity=str(user.id),  # Conversion en chaîne de caractères
            additional_claims=additional_claims
        )
        
        return {
            "message": "Connexion réussie",
            "access_token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "nom": user.nom,
                "prenom": user.prenom,
                "role": user.role
            }
        }, 200

@auth_ns.route("/signup")
class Signup(Resource):
    @auth_ns.expect(signup_model)
    def post(self):
        data = auth_ns.payload
        
        # Vérifier si l'email existe déjà
        if User.query.filter_by(email=data['email']).first():
            return {"message": "Cet email est déjà utilisé"}, 400
            
        try:
            # Créer un nouvel utilisateur avec tous les champs requis
            new_user = User(
                nom=data['lastName'],
                prenom=data['firstName'],
                email=data['email'],
                password=data['password'],  # Le mot de passe sera chiffré dans le constructeur
                role='user'  # rôle par défaut
            )
            
            # Sauvegarder dans la base de données
            db.session.add(new_user)
            db.session.commit()
            
            return {"message": "Inscription réussie"}, 201
            
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erreur lors de l'inscription: {str(e)}"}, 500

@auth_ns.route("/me")
class UserProfile(Resource):
    @jwt_required()
    def get(self):
        # Get the user identity from JWT
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return {"message": "Utilisateur non trouvé"}, 404
            
        return {
            "id": user.id,
            "email": user.email,
            "nom": user.nom,
            "prenom": user.prenom,
            "role": user.role
        }, 200
