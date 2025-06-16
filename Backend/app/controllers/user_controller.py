from flask import request, jsonify
from flask_restx import Namespace, Resource, fields, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.services.user_service import create_user, get_users, get_user_by_id, update_user, delete_user, get_users_with_folders
from app.services.folder_service import populate_folders_from_resources
from app.models.user import User
from app.models.folder import Folder
from app import db
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ns = Namespace("users", description="Gestion des utilisateurs")

user_model = ns.model("User", {
    "id": fields.Integer(readonly=True),
    "nom": fields.String(required=True),
    "prenom": fields.String(required=True),
    "email": fields.String(required=True, description="L'email de l'utilisateur", example="user@example.com"),
    "password": fields.String(required=True, description="Le mot de passe de l'utilisateur", example="motdepasse123"),
    "role": fields.String(required=True, description="Le rôle de l'utilisateur", example="user")
})

@ns.route("/")
class UserList(Resource):
    @ns.marshal_list_with(user_model)
    def get(self):
        """Récupère la liste des utilisateurs"""
        logger.info("GET request received for user list")
        return get_users()

    @ns.expect(user_model)
    @ns.marshal_with(user_model, code=201)
    def post(self):
        """Crée un nouvel utilisateur"""
        logger.info("POST request received to create a new user")
        data = request.json
        if not data.get("email"):
            abort(400, "Email requis")
        if not data.get("password"):
            abort(400, "Mot de passe requis")
        return create_user(data["nom"], data["prenom"], data["email"], data["password"], data["role"]), 201

@ns.route("/<int:user_id>")
@ns.param("user_id", "L'identifiant de l'utilisateur")
class UserResource(Resource):
    @ns.marshal_with(user_model)
    def get(self, user_id):
        """Récupère un utilisateur par son identifiant"""
        logger.info(f"GET request received for user ID {user_id}")
        user = get_user_by_id(user_id)
        if user:
            return user
        abort(404, "Utilisateur non trouvé")

    def put(self, user_id):
        """Met à jour les informations d'un utilisateur ou son dossier"""
        logger.info(f"PUT request received for user ID {user_id}")
        
        # Log des headers pour débogage
        logger.info(f"Headers reçus: {request.headers}")
        
        # Version ultra simplifiée - méthode la plus basique possible
        try:
            # Vérifier si les données sont au format JSON
            if not request.is_json:
                return {"message": "Les données doivent être au format JSON"}, 400
            
            # Récupérer les données JSON
            data = request.get_json()
            logger.info(f"Données reçues: {data}")
            
            # Vérifier si l'utilisateur existe
            user = User.query.get(user_id)
            if not user:
                return {"message": "Utilisateur non trouvé"}, 404
                
            # Mise à jour directe et simple
            if 'nom' in data:
                user.nom = data['nom']
            if 'prenom' in data:
                user.prenom = data['prenom']
            if 'email' in data:
                user.email = data['email']
                
            # Sauvegarder
            db.session.commit()
            
            # Réponse simple
            return {"message": "Profil mis à jour avec succès"}, 200
            
        except Exception as e:
            db.session.rollback()
            logger.exception("Erreur lors de la mise à jour:")
            return {"message": "Erreur serveur"}, 500

    @jwt_required()
    def delete(self, user_id):
        """Supprime un utilisateur et son dossier personnel dans la base de données et dans Ressources."""
        # Récupérer l'identité JWT (qui est maintenant une chaîne de caractères)
        jwt_identity = get_jwt_identity()
        logger.info(f"DELETE request received for user ID {user_id} by user ID {jwt_identity}")
        
        try:
            # Convertir l'identité JWT en entier
            current_user_id = int(jwt_identity)
            current_user = get_user_by_id(current_user_id)
            if not current_user:
                logger.error(f"Current user ID {current_user_id} not found")
                abort(404, "Utilisateur authentifié non trouvé")
        except (ValueError, TypeError) as e:
            logger.error(f"Error converting JWT identity to integer: {str(e)}")
            abort(401, "Problème d'authentification")

        # Autoriser les admins ou l'utilisateur lui-même
        if current_user.role != 'admin' and current_user_id != user_id:
            logger.warning(f"Permission denied for user ID {current_user_id} to delete user ID {user_id}")
            abort(403, "Seul un admin ou l'utilisateur lui-même peut supprimer ce compte")

        user = get_user_by_id(user_id)
        if not user:
            logger.error(f"User ID {user_id} not found")
            abort(404, "Utilisateur non trouvé")

        try:
            success = delete_user(user_id)  # Supprime l'utilisateur et son dossier
            if success:
                logger.info(f"Utilisateur ID {user_id} et son dossier supprimés avec succès")
                return {"message": "Utilisateur et dossier supprimés avec succès"}, 200
            else:
                logger.error(f"Failed to delete user ID {user_id}")
                abort(500, "Échec de la suppression de l'utilisateur")
        except Exception as e:
            logger.error(f"Erreur lors de la suppression pour l'utilisateur ID {user_id}: {str(e)}")
            abort(500, f"Erreur lors de la suppression: {str(e)}")

@ns.route("/<int:user_id>/password")
@ns.param("user_id", "L'identifiant de l'utilisateur")
class UserPasswordResource(Resource):
    @ns.expect(ns.model("PasswordUpdate", {
        "currentPassword": fields.String(required=True, description="Mot de passe actuel"),
        "newPassword": fields.String(required=True, description="Nouveau mot de passe")
    }))
    @jwt_required()
    def put(self, user_id):
        """Met à jour le mot de passe d'un utilisateur"""
        logger.info(f"PUT request received to update password for user ID {user_id}")
        
        try:
            # Convertir l'identité JWT en entier
            current_user_id = int(get_jwt_identity())
        except (ValueError, TypeError) as e:
            logger.error(f"Error converting JWT identity to integer: {str(e)}")
            abort(401, "Problème d'authentification")
            
        if current_user_id != user_id:
            abort(403, "Vous n'êtes pas autorisé à modifier ce compte")

        data = request.json
        user = get_user_by_id(user_id)
        if not user:
            abort(404, "Utilisateur non trouvé")

        try:
            decrypted_password = user.decrypt_password(user.password)
            if decrypted_password != data["currentPassword"]:
                abort(400, "Mot de passe actuel incorrect")
        except ValueError:
            abort(400, "Erreur lors de la vérification du mot de passe")

        user.password = user.encrypt_password(data["newPassword"])
        db.session.commit()
        return {"message": "Mot de passe mis à jour avec succès"}, 200

@ns.route("/users-with-folders")
class UsersWithFolders(Resource):
    @jwt_required(optional=True)
    def get(self):
        """Récupère tous les utilisateurs avec leurs dossiers après synchronisation avec Ressources."""
        try:
            # Vérifier l'authentification mais la rendre optionnelle
            jwt_identity = get_jwt_identity()
            logger.info(f"GET request received for users-with-folders by user ID: {jwt_identity}")
            
            # Corriger le chemin pour pointer vers Backend/app/Ressources
            base_resource_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Ressources'))
            logger.info(f"Chemin du dossier Ressources: {base_resource_path}")
            
            # Vérifier si le dossier Ressources existe, sinon le créer
            if not os.path.exists(base_resource_path):
                logger.info(f"Création du dossier Ressources: {base_resource_path}")
                os.makedirs(base_resource_path)
            
            # Appeler la fonction de synchronisation des dossiers
            logger.info(f"Appel de populate_folders_from_resources avec le chemin: {base_resource_path}")
            populate_folders_from_resources(base_resource_path)
            
            # Récupérer les utilisateurs avec leurs dossiers
            result = get_users_with_folders()
            logger.info(f"Nombre d'utilisateurs avec dossiers retournés: {len(result)}")
            return result
            
        except Exception as e:
            logger.error(f"Erreur dans users-with-folders: {str(e)}")
            return {"error": f"Erreur lors de la récupération des utilisateurs et dossiers: {str(e)}"}, 500

@ns.route("/simple-users-folders")
class SimpleUsersFolders(Resource):
    def get(self):
        """Version simplifiée pour récupérer les utilisateurs et leurs dossiers avec synchronisation automatique."""
        try:
            # Synchroniser automatiquement les dossiers physiques avec la base de données
            self._synchronize_folders()
            
            # Récupérer tous les utilisateurs
            users = User.query.all()
            logger.info(f"Nombre d'utilisateurs trouvés: {len(users)}")
            
            # Récupérer les dossiers existants (après synchronisation)
            folders = Folder.query.all()
            logger.info(f"Nombre de dossiers trouvés après synchronisation: {len(folders)}")
            
            # Créer un dictionnaire pour associer les dossiers aux utilisateurs
            user_folders = {}
            for folder in folders:
                user_folders[folder.id_user] = {
                    "folder_id": folder.id,
                    "nom_dossier": folder.nom_dossier,
                    "date_creation": folder.date_creation.isoformat() if folder.date_creation else datetime.now().isoformat()
                }
            
            # Créer la liste de résultats
            result = []
            for user in users:
                folder_info = user_folders.get(user.id, {
                    "folder_id": None,
                    "nom_dossier": None,
                    "date_creation": None
                })
                
                result.append({
                    "user_id": user.id,
                    "nom": user.nom,
                    "prenom": user.prenom,
                    "email": user.email,
                    "folder_id": folder_info["folder_id"],
                    "nom_dossier": folder_info["nom_dossier"],
                    "date_creation": folder_info["date_creation"]
                })
            
            logger.info(f"Nombre d'entrées retournées: {len(result)}")
            return result
            
        except Exception as e:
            logger.error(f"Erreur dans simple-users-folders: {str(e)}")
            return {"error": f"Erreur lors de la récupération des utilisateurs et dossiers: {str(e)}"}, 500
    
    def _synchronize_folders(self):
        """Synchronise automatiquement les dossiers physiques avec la base de données."""
        try:
            # Chemin du dossier Ressources
            base_resource_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Ressources'))
            logger.info(f"Synchronisation automatique - Chemin du dossier Ressources: {base_resource_path}")
            
            # Vérifier si le dossier Ressources existe
            if not os.path.exists(base_resource_path):
                logger.info(f"Création du dossier Ressources: {base_resource_path}")
                os.makedirs(base_resource_path)
            
            # Récupérer tous les utilisateurs
            users = User.query.all()
            
            # Récupérer les dossiers existants dans la base de données
            existing_folders = Folder.query.all()
            existing_folder_names = {f.nom_dossier for f in existing_folders}
            
            # Récupérer les dossiers physiques
            physical_folders = [d for d in os.listdir(base_resource_path) if os.path.isdir(os.path.join(base_resource_path, d))]
            logger.info(f"Dossiers physiques trouvés: {physical_folders}")
            
            # Créer un dictionnaire pour associer les noms de dossiers aux utilisateurs
            user_folder_names = {}
            for user in users:
                # Essayer les deux formats : avec point et avec underscore
                user_folder_name_dot = user.email.split('@')[0]  # Format avec point (ex: raslen.2908)
                user_folder_name_underscore = user_folder_name_dot.replace('.', '_')  # Format avec underscore (ex: raslen_2908)
                
                user_folder_names[user_folder_name_dot] = user.id
                user_folder_names[user_folder_name_underscore] = user.id
            
            folders_added = 0
            folders_removed = 0
            
            # Ajouter les dossiers physiques qui ne sont pas dans la base de données
            for folder_name in physical_folders:
                if folder_name not in existing_folder_names:
                    # Trouver l'utilisateur correspondant
                    user_id = user_folder_names.get(folder_name)
                    if user_id:
                        # Créer le dossier dans la base de données
                        folder_path = os.path.join(base_resource_path, folder_name)
                        creation_time = datetime.fromtimestamp(os.path.getctime(folder_path))
                        new_folder = Folder(id_user=user_id, nom_dossier=folder_name, date_creation=creation_time)
                        db.session.add(new_folder)
                        folders_added += 1
                        logger.info(f"Dossier {folder_name} ajouté à la base de données pour l'utilisateur ID {user_id}")
            
            # Supprimer les dossiers de la base de données qui n'existent plus physiquement
            for folder in existing_folders:
                if folder.nom_dossier not in physical_folders:
                    logger.info(f"Suppression du dossier {folder.nom_dossier} de la base de données car il n'existe plus physiquement")
                    db.session.delete(folder)
                    folders_removed += 1
            
            # Enregistrer les modifications
            if folders_added > 0 or folders_removed > 0:
                db.session.commit()
                logger.info(f"Synchronisation automatique terminée : {folders_added} dossier(s) ajouté(s), {folders_removed} dossier(s) supprimé(s)")
            
        except Exception as e:
            logger.error(f"Erreur lors de la synchronisation automatique des dossiers: {str(e)}")
            db.session.rollback()

@ns.route("/sync-folders")
class SyncFolders(Resource):
    def get(self):
        """Synchronise les dossiers physiques avec la base de données."""
        try:
            # Chemin du dossier Ressources
            base_resource_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Ressources'))
            logger.info(f"Chemin du dossier Ressources: {base_resource_path}")
            
            # Vérifier si le dossier Ressources existe
            if not os.path.exists(base_resource_path):
                logger.info(f"Création du dossier Ressources: {base_resource_path}")
                os.makedirs(base_resource_path)
            
            # Récupérer tous les utilisateurs
            users = User.query.all()
            logger.info(f"Nombre d'utilisateurs trouvés: {len(users)}")
            
            # Récupérer les dossiers existants dans la base de données
            existing_folders = Folder.query.all()
            existing_folder_names = {f.nom_dossier for f in existing_folders}
            existing_folder_users = {f.id_user: f.nom_dossier for f in existing_folders}
            logger.info(f"Dossiers existants dans la base de données: {existing_folder_names}")
            
            # Récupérer les dossiers physiques
            physical_folders = [d for d in os.listdir(base_resource_path) if os.path.isdir(os.path.join(base_resource_path, d))]
            logger.info(f"Dossiers physiques trouvés: {physical_folders}")
            
            # Créer un dictionnaire pour associer les noms de dossiers aux utilisateurs
            user_folder_names = {}
            for user in users:
                user_folder_name = user.email.split('@')[0].replace('.', '_')
                user_folder_names[user_folder_name] = user.id
            
            # Synchroniser les dossiers physiques avec la base de données
            folders_added = 0
            folders_removed = 0
            
            # Ajouter les dossiers physiques qui ne sont pas dans la base de données
            for folder_name in physical_folders:
                if folder_name not in existing_folder_names:
                    # Trouver l'utilisateur correspondant
                    user_id = user_folder_names.get(folder_name)
                    if user_id:
                        # Créer le dossier dans la base de données
                        folder_path = os.path.join(base_resource_path, folder_name)
                        creation_time = datetime.fromtimestamp(os.path.getctime(folder_path))
                        new_folder = Folder(id_user=user_id, nom_dossier=folder_name, date_creation=creation_time)
                        db.session.add(new_folder)
                        folders_added += 1
                        logger.info(f"Dossier {folder_name} ajouté à la base de données pour l'utilisateur ID {user_id}")
            
            # Supprimer les dossiers de la base de données qui n'existent plus physiquement
            for folder in existing_folders:
                if folder.nom_dossier not in physical_folders:
                    db.session.delete(folder)
                    folders_removed += 1
                    logger.info(f"Dossier {folder.nom_dossier} supprimé de la base de données")
            
            # Enregistrer les modifications
            db.session.commit()
            
            return {
                "message": "Synchronisation terminée avec succès",
                "folders_added": folders_added,
                "folders_removed": folders_removed,
                "physical_folders": physical_folders,
                "database_folders": list(existing_folder_names)
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de la synchronisation des dossiers: {str(e)}")
            db.session.rollback()
            return {"error": f"Erreur lors de la synchronisation des dossiers: {str(e)}"}, 500

@ns.route("/register-folder")
class RegisterFolder(Resource):
    def post(self):
        """Enregistre un dossier dans la base de données lorsqu'il est créé physiquement."""
        try:
            # Récupérer les données de la requête
            data = request.get_json()
            logger.info(f"Données reçues pour l'enregistrement du dossier: {data}")
            
            email = data.get('email')
            folder_name = data.get('folder_name')
            
            if not email or not folder_name:
                logger.error("Email ou nom de dossier non fourni")
                return {"error": "Email ou nom de dossier non fourni"}, 400
            
            # Trouver l'utilisateur correspondant à l'email
            user = User.query.filter_by(email=email).first()
            if not user:
                logger.error(f"Utilisateur avec l'email {email} non trouvé")
                return {"error": "Utilisateur non trouvé"}, 404
            
            # Vérifier si le dossier existe déjà dans la base de données
            existing_folder = Folder.query.filter_by(id_user=user.id).first()
            if existing_folder:
                logger.info(f"Le dossier existe déjà pour l'utilisateur ID {user.id}")
                return {"message": "Le dossier existe déjà dans la base de données"}, 200
            
            # Créer le chemin du dossier Ressources
            base_resource_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Ressources'))
            folder_path = os.path.join(base_resource_path, folder_name)
            
            # Vérifier si le dossier existe physiquement
            if not os.path.exists(folder_path):
                logger.error(f"Le dossier physique {folder_path} n'existe pas")
                return {"error": "Le dossier physique n'existe pas"}, 404
            
            # Créer l'entrée dans la base de données
            creation_time = datetime.fromtimestamp(os.path.getctime(folder_path))
            new_folder = Folder(id_user=user.id, nom_dossier=folder_name, date_creation=creation_time)
            db.session.add(new_folder)
            db.session.commit()
            
            logger.info(f"Dossier {folder_name} enregistré dans la base de données pour l'utilisateur ID {user.id}")
            return {"message": "Dossier enregistré avec succès dans la base de données"}, 201
            
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement du dossier: {str(e)}")
            db.session.rollback()
            return {"error": f"Erreur lors de l'enregistrement du dossier: {str(e)}"}, 500

@ns.route("/delete-folder/<int:folder_id>")
class DeleteFolder(Resource):
    @jwt_required()
    def delete(self, folder_id):
        """Supprime un dossier de la base de données et physiquement sans supprimer l'utilisateur."""
        try:
            # Récupérer l'identité JWT (qui est maintenant une chaîne de caractères)
            jwt_identity = get_jwt_identity()
            logger.info(f"DELETE request received for folder ID {folder_id} by user ID {jwt_identity}")
            
            try:
                # Convertir l'identité JWT en entier
                current_user_id = int(jwt_identity)
                current_user = get_user_by_id(current_user_id)
                if not current_user:
                    logger.error(f"Current user ID {current_user_id} not found")
                    abort(404, "Utilisateur authentifié non trouvé")
            except (ValueError, TypeError) as e:
                logger.error(f"Error converting JWT identity to integer: {str(e)}")
                abort(401, "Problème d'authentification")
            
            # Récupérer le dossier
            folder = Folder.query.get(folder_id)
            if not folder:
                logger.error(f"Folder ID {folder_id} not found")
                return {"error": "Dossier non trouvé"}, 404
            
            # Vérifier les permissions (seul l'admin ou le propriétaire du dossier peut le supprimer)
            if current_user.role != 'admin' and current_user.id != folder.id_user:
                logger.error(f"User ID {current_user.id} not authorized to delete folder ID {folder_id}")
                return {"error": "Vous n'avez pas les permissions nécessaires pour supprimer ce dossier"}, 403
            
            # Supprimer le dossier physiquement
            base_resource_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Ressources'))
            folder_path = os.path.join(base_resource_path, folder.nom_dossier)
            
            if os.path.exists(folder_path):
                try:
                    import shutil
                    shutil.rmtree(folder_path)
                    logger.info(f"Physical folder {folder_path} deleted successfully")
                except Exception as e:
                    logger.error(f"Error deleting physical folder {folder_path}: {str(e)}")
                    return {"error": f"Erreur lors de la suppression du dossier physique: {str(e)}"}, 500
            else:
                logger.warning(f"Physical folder {folder_path} does not exist")
            
            # Supprimer le dossier de la base de données
            db.session.delete(folder)
            db.session.commit()
            
            logger.info(f"Folder ID {folder_id} deleted successfully")
            return {"message": "Dossier supprimé avec succès"}, 200
            
        except Exception as e:
            logger.error(f"Error in delete-folder: {str(e)}")
            db.session.rollback()
            return {"error": f"Erreur lors de la suppression du dossier: {str(e)}"}, 500