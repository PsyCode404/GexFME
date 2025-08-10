import os
import logging
from flask import jsonify, current_app, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models.user import User
from app.storage import storage_service

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
    
    # Get user storage prefix for S3
    email_local = email.split('@')[0]
    user_prefix = storage_service.ensure_user_prefix(email_local)
    
    # Check if user has any files in S3 (indicates folder exists)
    user_files = storage_service.list_files(user_prefix)
    folder_exists = len(user_files) > 0
    
    logger.info(f"Vérification du préfixe S3: {user_prefix}, fichiers trouvés: {len(user_files)}")
    
    return jsonify({
        'folderExists': folder_exists, 
        'folderName': email_local,
        'message': 'Dossier vérifié avec succès',
        'storagePrefix': user_prefix
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
    
    # Get user storage prefix for S3
    email_local = email.split('@')[0]
    user_prefix = storage_service.ensure_user_prefix(email_local)
    
    # Check if user already has files in S3
    user_files = storage_service.list_files(user_prefix)
    folder_exists = len(user_files) > 0
    
    if folder_exists:
        logger.info(f"Le dossier S3 existe déjà: {user_prefix}")
        return jsonify({
            'message': 'Le dossier existe déjà', 
            'folderName': email_local,
            'folderExists': True,
            'storagePrefix': user_prefix
        }), 200
    
    # For S3, we don't need to "create" folders explicitly
    # They are created when the first file is uploaded
    # So we just return success with the prefix
    try:
        logger.info(f"Préfixe S3 préparé: {user_prefix}")
        return jsonify({
            'message': 'Dossier S3 préparé avec succès', 
            'folderName': email_local,
            'folderExists': True,
            'storagePrefix': user_prefix
        }), 201
    except Exception as e:
        logger.error(f"Erreur lors de la préparation du dossier S3: {str(e)}")
        return jsonify({'error': f'Erreur lors de la préparation du dossier: {str(e)}'}), 500
