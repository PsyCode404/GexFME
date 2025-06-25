from app import db
from app.models.folder import Folder
import os
import shutil
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_folder(id_user, nom_dossier):
    """Crée un nouveau dossier pour un utilisateur."""
    folder = Folder(id_user=id_user, nom_dossier=nom_dossier)
    db.session.add(folder)
    db.session.commit()
    return folder

def get_folders_by_user(id_user):
    """Récupère tous les dossiers d'un utilisateur spécifique."""
    return Folder.query.filter_by(id_user=id_user).all()

def get_folder_by_id(folder_id):
    """Récupère un dossier par son ID."""
    return Folder.query.get(folder_id)

def delete_folder(folder_id):
    """Supprime un dossier par son ID dans la base de données uniquement."""
    folder = get_folder_by_id(folder_id)
    if folder:
        db.session.delete(folder)
        db.session.commit()
        return True
    return False

def delete_folder_with_physical(folder_id, folder_name=None, user_email=None):
    """Supprime un dossier dans la base de données et physiquement dans Ressources."""
    folder = get_folder_by_id(folder_id)
    # Corriger le chemin pour pointer vers Backend/app/Ressources au lieu de Backend/Ressources
    base_resource_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Ressources'))

    if folder:
        folder_name = folder.nom_dossier
        # Vérifier que le dossier appartient bien à l'utilisateur si user_email est fourni
        if user_email:
            expected_name = user_email.split('@')[0].replace('.', '_')
            if folder_name != expected_name:
                logger.error(f"Tentative de suppression d'un dossier non autorisé: {folder_name}")
                raise Exception("Vous n'êtes pas autorisé à supprimer ce dossier")
        db.session.delete(folder)
        db.session.commit()
        logger.info(f"Entrée du dossier {folder_name} supprimée de la base de données")
    elif user_email:
        folder_name = user_email.split('@')[0].replace('.', '_')
    else:
        raise Exception("Aucun dossier ou email fourni pour la suppression")

    folder_path = os.path.join(base_resource_path, folder_name)
    if os.path.exists(folder_path):
        try:
            shutil.rmtree(folder_path)
            logger.info(f"Dossier physique {folder_path} supprimé avec succès")
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du dossier physique {folder_path}: {str(e)}")
            raise Exception(f"Erreur lors de la suppression du dossier physique: {str(e)}")
    else:
        logger.warning(f"Dossier physique {folder_path} n'existe pas")

def populate_folders_from_resources(base_resource_path):
    from app.models.user import User
    logger.info(f"Base resource path: {base_resource_path}")
    
    try:
        # Vérifier si le dossier Ressources existe, sinon le créer
        if not os.path.exists(base_resource_path):
            logger.warning(f"Le répertoire {base_resource_path} n'existe pas. Création du répertoire.")
            os.makedirs(base_resource_path)
            logger.info(f"Répertoire {base_resource_path} créé avec succès.")
            return []
        
        # Step 1: Get all users and existing folders in the database
        users = User.query.all()
        logger.info(f"Nombre d'utilisateurs trouvés: {len(users)}")
        
        existing_folders = Folder.query.all()
        logger.info(f"Nombre de dossiers existants dans la base de données: {len(existing_folders)}")
        
        existing_folder_names = {f.nom_dossier for f in existing_folders}  # Folder names in DB
        existing_folder_users = {f.id_user: f.nom_dossier for f in existing_folders}  # Map user_id to folder name

        # Step 2: Get all folders in the Ressources directory
        resource_dirs = [d for d in os.listdir(base_resource_path) if os.path.isdir(os.path.join(base_resource_path, d))]
        logger.info(f"Dossiers trouvés dans Ressources: {resource_dirs}")
        
        if not resource_dirs:
            logger.warning(f"Aucun dossier trouvé dans {base_resource_path}")
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation de populate_folders_from_resources: {str(e)}")
        return []

    # Step 3: Remove entries from the folder table if the folder no longer exists in Ressources
    for folder in existing_folders:
        if folder.nom_dossier not in resource_dirs:
            logger.info(f"Folder {folder.nom_dossier} no longer exists in Ressources, removing from database.")
            db.session.delete(folder)

    # Step 4: Add or update folders in the database based on Ressources
    for folder_name in resource_dirs:
        matching_user = None
        for user in users:
            user_folder_name = user.email.split('@')[0].replace('.', '_')
            if user_folder_name == folder_name:
                matching_user = user
                break

        if matching_user:
            folder_path = os.path.join(base_resource_path, folder_name)
            creation_time = datetime.fromtimestamp(os.path.getctime(folder_path))
            logger.info(f"Processing folder for user {matching_user.email}, folder: {folder_name}, creation: {creation_time}")

            # Only create/update if the folder doesn't exist in the database or has a different name
            if matching_user.id not in existing_folder_users or existing_folder_users[matching_user.id] != folder_name:
                # Delete existing folder entry for this user to avoid duplicates
                existing_folder = Folder.query.filter_by(id_user=matching_user.id).first()
                if existing_folder:
                    db.session.delete(existing_folder)
                    logger.info(f"Removed old folder entry for user {matching_user.email} from database.")

                new_folder = Folder(id_user=matching_user.id, nom_dossier=folder_name)
                new_folder.date_creation = creation_time
                db.session.add(new_folder)
                logger.info(f"Created/Updated folder entry for user {matching_user.email}, folder: {folder_name}")
            else:
                logger.info(f"Folder {folder_name} already exists for user {matching_user.email}, skipping")
        else:
            logger.warning(f"No matching user found for folder: {folder_name}")

    try:
        db.session.commit()
        logger.info("Folder population completed successfully")
    except Exception as e:
        logger.error(f"Error during folder population commit: {str(e)}")
        db.session.rollback()