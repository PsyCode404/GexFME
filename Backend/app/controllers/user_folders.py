import os
import logging
from flask import jsonify, current_app, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models.user import User

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création d'un blueprint Flask standard
user_folders_blueprint = Blueprint('user_folders', __name__, url_prefix='/api')

def get_user_email():
    """Récupère l'email de l'utilisateur depuis le JWT ou la base de données."""
    try:
        # Récupérer l'identité de l'utilisateur depuis le token JWT
        logger.info("Tentative de récupération de l'identité utilisateur depuis le JWT")
        user_id = get_jwt_identity()
        logger.info(f"JWT identity récupérée: {user_id}")
        
        if not user_id:
            logger.error("Aucun user_id trouvé dans le JWT")
            return None

        # Récupérer les claims du JWT
        logger.info("Récupération des claims du JWT")
        claims = get_jwt()
        logger.info(f"Claims du JWT: {claims}")
        
        # Essayer de récupérer l'email depuis les claims
        email = claims.get('email')
        logger.info(f"Email depuis les claims: {email}")

        # Si l'email n'est pas dans les claims, essayer de le récupérer depuis la base de données
        if not email:
            logger.info(f"Email non trouvé dans les claims, recherche dans la base de données pour l'utilisateur ID: {user_id}")
            user = User.query.get(user_id)
            if not user:
                logger.error(f"Utilisateur avec ID {user_id} non trouvé dans la base de données")
                return None
            email = user.email
            logger.info(f"Email récupéré depuis la base de données: {email}")

        if not email:
            logger.error(f"Aucun email trouvé pour l'utilisateur ID {user_id}")
            return None

        logger.info(f"Email utilisateur récupéré avec succès: {email}")
        return email
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'email utilisateur: {str(e)}", exc_info=True)
        return None

# Route GET pour vérifier si le dossier utilisateur existe
@user_folders_blueprint.route('/user-folders/check', methods=['GET'])
@jwt_required()
def check_user_folder():
    logger.info("Requête GET reçue pour vérifier le dossier utilisateur")
    logger.info(f"Headers: {request.headers}")
    
    email = get_user_email()
    if not email:
        logger.error("Utilisateur non trouvé ou token invalide")
        return jsonify({'error': 'Utilisateur non trouvé ou token invalide'}), 401
    
    logger.info(f"Email de l'utilisateur: {email}")
    
    # Vérifier si le dossier Ressources existe, sinon le créer
    resource_dir = os.path.join(current_app.root_path, 'Ressources')
    if not os.path.exists(resource_dir):
        logger.info(f"Création du dossier Ressources: {resource_dir}")
        os.makedirs(resource_dir)
    
    # Créer le nom du dossier utilisateur basé sur l'email
    folder_name = email.split('@')[0]
    resource_path = os.path.join(resource_dir, folder_name)
    
    logger.info(f"Vérification du dossier: {resource_path}")
    folder_exists = os.path.exists(resource_path)
    
    return jsonify({
        'folderExists': folder_exists, 
        'folderName': folder_name,
        'message': 'Dossier vérifié avec succès'
    }), 200

# Route POST pour créer le dossier utilisateur
@user_folders_blueprint.route('/user-folders/create', methods=['POST'])
@jwt_required()
def create_user_folder():
    logger.info("Requête POST reçue pour créer le dossier utilisateur")
    logger.info(f"Headers: {request.headers}")
    logger.info(f"Données reçues: {request.data if request.data else 'Aucune donnée'}")
    
    email = get_user_email()
    if not email:
        logger.error("Utilisateur non trouvé ou token invalide")
        return jsonify({'error': 'Utilisateur non trouvé ou token invalide'}), 401
    
    logger.info(f"Email de l'utilisateur: {email}")
    
    # Vérifier si le dossier Ressources existe, sinon le créer
    resource_dir = os.path.join(current_app.root_path, 'Ressources')
    if not os.path.exists(resource_dir):
        logger.info(f"Création du dossier Ressources: {resource_dir}")
        os.makedirs(resource_dir)
    
    # Créer le nom du dossier utilisateur basé sur l'email
    folder_name = email.split('@')[0]
    resource_path = os.path.join(resource_dir, folder_name)
    
    # Vérifier si le dossier existe déjà
    if os.path.exists(resource_path):
        logger.info(f"Le dossier existe déjà: {resource_path}")
        return jsonify({
            'message': 'Le dossier existe déjà', 
            'folderName': folder_name,
            'folderExists': True
        }), 200
    
    # Créer le dossier
    try:
        os.makedirs(resource_path)
        logger.info(f"Dossier créé avec succès: {resource_path}")
        return jsonify({
            'message': 'Dossier créé avec succès', 
            'folderName': folder_name,
            'folderExists': True
        }), 201
    except Exception as e:
        logger.error(f"Erreur lors de la création du dossier: {str(e)}")
        return jsonify({'error': f'Erreur lors de la création du dossier: {str(e)}'}), 500
