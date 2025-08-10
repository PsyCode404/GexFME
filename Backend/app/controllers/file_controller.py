from flask import Blueprint, request, jsonify, send_from_directory, send_file
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.file_service import extract_file_data
from app.storage import storage_service
import logging
import os
from app.models.user import User
from datetime import datetime
import shutil
import json
from werkzeug.datastructures import FileStorage
import io
import tempfile

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

file_blueprint = Blueprint("file", __name__)

def get_user_email_local():
    """Récupère la partie locale de l'email utilisateur pour les clés S3."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    email = claims.get('email')

    if not email:
        user = User.query.get(user_id)
        if not user:
            return None
        email = user.email

    return email.split('@')[0]

def get_user_storage_prefix():
    """Récupère le préfixe de stockage S3 pour l'utilisateur."""
    email_local = get_user_email_local()
    if not email_local:
        return None
    return storage_service.ensure_user_prefix(email_local)

def get_folder_structure_from_s3(user_prefix, relative_path=""):
    """Récupère récursivement la structure des dossiers et fichiers depuis S3."""
    folder_structure = {"folders": [], "files": []}
    
    try:
        # Construct the full prefix
        search_prefix = user_prefix
        if relative_path:
            search_prefix = f"{user_prefix}{relative_path}/"
        
        # List all objects with the prefix
        all_files = storage_service.list_files(search_prefix)
        
        # Process files to build folder structure
        folders_set = set()
        files_list = []
        
        for file_key in all_files:
            # Remove the user prefix to get relative path
            relative_file_path = file_key[len(user_prefix):]
            
            # Skip if this is not in the current directory level
            if relative_path and not relative_file_path.startswith(f"{relative_path}/"):
                continue
            
            # Remove the current relative path prefix
            if relative_path:
                remaining_path = relative_file_path[len(f"{relative_path}/"):]
            else:
                remaining_path = relative_file_path
            
            # Skip empty paths
            if not remaining_path:
                continue
            
            # Check if this is a direct file or in a subfolder
            path_parts = remaining_path.split('/')
            
            if len(path_parts) == 1:
                # Direct file
                file_info = {
                    "name": path_parts[0],
                    "path": relative_file_path,
                    "type": "file",
                    "size": 0  # S3 doesn't provide size in list operation
                }
                files_list.append(file_info)
            else:
                # File in subfolder - add folder to set
                folder_name = path_parts[0]
                folders_set.add(folder_name)
        
        # Convert folders set to list with proper structure
        for folder_name in sorted(folders_set):
            folder_path = f"{relative_path}/{folder_name}" if relative_path else folder_name
            folder_info = {
                "name": folder_name,
                "path": folder_path,
                "type": "folder",
                "children": get_folder_structure_from_s3(user_prefix, folder_path)
            }
            folder_structure["folders"].append(folder_info)
        
        folder_structure["files"] = files_list
        
    except Exception as e:
        logger.error(f"Error getting folder structure from S3: {str(e)}")
    
    return folder_structure

@file_blueprint.route("/api/upload", methods=["POST"])
@cross_origin()
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        logger.error("Aucun fichier reçu dans la requête")
        return jsonify({"error": "Aucun fichier reçu"}), 400
    
    file = request.files['file']
    if file.filename == '':
        logger.error("Nom de fichier invalide")
        return jsonify({"error": "Nom de fichier invalide"}), 400
    
    logger.debug(f"Fichier reçu : {file.filename}")
    if not file.filename.lower().endswith('.dxf'):
        logger.error(f"Format non supporté : {file.filename}")
        return jsonify({"error": "Seuls les fichiers .dxf sont acceptés"}), 400

    user_prefix = get_user_storage_prefix()
    if not user_prefix:
        logger.error("Impossible de déterminer le préfixe utilisateur")
        return jsonify({"error": "Erreur d'authentification utilisateur"}), 400

    # Upload file to S3
    s3_key = f"{user_prefix}{file.filename}"
    success = storage_service.upload_file_obj(file, s3_key)
    
    if not success:
        logger.error(f"Échec de l'upload vers S3: {s3_key}")
        return jsonify({"error": "Erreur lors de la sauvegarde du fichier"}), 500
    
    logger.debug(f"Fichier sauvegardé dans S3: {s3_key}")
    return jsonify({"message": "Fichier .dxf reçu et sauvegardé", "filename": file.filename, "s3_key": s3_key}), 200

@file_blueprint.route("/api/extract-data", methods=["POST"])
@cross_origin()
@jwt_required()
def extract_data():
    if 'file' not in request.files:
        logger.error("Aucun fichier reçu dans la requête")
        return jsonify({"error": "Aucun fichier reçu"}), 400
    
    file = request.files['file']
    if file.filename == '':
        logger.error("Nom de fichier invalide")
        return jsonify({"error": "Nom de fichier invalide"}), 400
    
    logger.debug(f"Extraction des données pour : {file.filename}")
    if not file.filename.lower().endswith('.dxf'):
        logger.error(f"Format non supporté : {file.filename}")
        return jsonify({"error": "Seuls les fichiers .dxf sont acceptés"}), 400
    
    result = extract_file_data(file)
    if "error" in result:
        logger.error(f"Erreur d'extraction : {result['error']}")
        return jsonify(result), 400
    
    logger.debug("Données extraites avec succès")
    return jsonify(result), 200

@file_blueprint.route("/api/transfer-files", methods=["POST"])
@cross_origin()
@jwt_required()
def transfer_files():
    try:
        if 'file1' not in request.files or 'file2' not in request.files:
            logger.error("Deux fichiers sont requis")
            return jsonify({"error": "Deux fichiers sont requis pour le transfert"}), 400

        file1 = request.files['file1']
        file2 = request.files['file2']
        filename1 = request.form.get('filename1')
        filename2 = request.form.get('filename2')
        custom_folder_name = request.form.get('customFolderName')

        if not filename1 or not filename2 or not custom_folder_name:
            logger.error("Noms de fichiers ou nom de dossier personnalisé manquants")
            return jsonify({"error": "Noms de fichiers et nom de dossier personnalisé requis"}), 400

        user_prefix = get_user_storage_prefix()
        if not user_prefix:
            logger.error("Impossible de déterminer le préfixe utilisateur")
            return jsonify({"error": "Erreur d'authentification utilisateur"}), 400

        # Upload files to S3 in custom folder
        s3_key1 = f"{user_prefix}{custom_folder_name}/{filename1}"
        s3_key2 = f"{user_prefix}{custom_folder_name}/{filename2}"
        
        success1 = storage_service.upload_file_obj(file1, s3_key1)
        success2 = storage_service.upload_file_obj(file2, s3_key2)
        
        if not success1 or not success2:
            logger.error(f"Échec de l'upload vers S3: {s3_key1}, {s3_key2}")
            return jsonify({"error": "Erreur lors de la sauvegarde des fichiers"}), 500
        
        logger.debug(f"Fichiers sauvegardés dans S3: {s3_key1}, {s3_key2}")
        return jsonify({"message": f"Fichiers transférés avec succès dans {custom_folder_name}"}), 200

    except Exception as e:
        logger.error(f"Erreur lors du transfert : {str(e)}", exc_info=True)
        return jsonify({"error": f"Erreur lors du transfert : {str(e)}"}), 500

@file_blueprint.route("/api/user-folder/files", methods=["GET"])
@cross_origin()
@jwt_required()
def get_user_folder_files():
    try:
        user_prefix = get_user_storage_prefix()
        if not user_prefix:
            logger.error("Impossible de déterminer le préfixe utilisateur")
            return jsonify({"error": "Erreur d'authentification utilisateur"}), 400

        folder_structure = get_folder_structure_from_s3(user_prefix)
        logger.debug(f"Folder structure returned: {json.dumps(folder_structure, indent=2)}")
        return jsonify(folder_structure), 200

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des fichiers : {str(e)}", exc_info=True)
        return jsonify({"error": f"Erreur serveur : {str(e)}"}), 500

@file_blueprint.route("/api/user-folder/download-file", methods=["POST", "OPTIONS"])
@cross_origin()
@jwt_required()
def download_file():
    try:
        # Print all request information for debugging
        logger.info("------- DOWNLOAD REQUEST DEBUG INFO -------")
        logger.info(f"Request method: {request.method}")
        logger.info(f"Request headers: {request.headers}")
        logger.info(f"Request data: {request.data}")
        logger.info(f"Request form: {request.form}")
        logger.info(f"Request files: {request.files}")
        logger.info(f"Request args: {request.args}")
        logger.info(f"Request cookies: {request.cookies}")
        logger.info(f"Request is_json: {request.is_json}")
        logger.info("----------------------------------------")
        
        # Get the user JWT identity for debugging
        try:
            user_id = get_jwt_identity()
            claims = get_jwt()
            email = claims.get('email')
            logger.info(f"User ID: {user_id}, Email: {email}")
        except Exception as e:
            logger.error(f"Error getting user identity: {str(e)}")
        
        # Try to parse JSON data
        try:
            data = request.get_json(silent=True)
            logger.info(f"Parsed JSON data: {data}")
            
            if data is None:
                logger.error("No JSON data in request or invalid JSON format")
                return jsonify({"error": "Données de requête invalides ou format JSON incorrect"}), 400
                
            filename = data.get("filename")
            folder = data.get("folder", "")  # Path relative to user folder
            
            logger.info(f"Extracted filename: {filename}, folder: {folder}")
        except Exception as e:
            logger.error(f"Error parsing request data: {str(e)}")
            return jsonify({"error": f"Erreur de format de données: {str(e)}"}), 400

        if not filename:
            logger.error("Nom de fichier manquant")
            return jsonify({"error": "Nom de fichier requis"}), 400

        # Get user folder path
        try:
            user_folder_path = get_user_folder_path()
            logger.info(f"User folder path: {user_folder_path}")
            
            if not user_folder_path:
                logger.error("Impossible de déterminer le chemin du dossier utilisateur")
                return jsonify({"error": "Impossible de déterminer le chemin du dossier utilisateur"}), 400
                
            if not os.path.exists(user_folder_path):
                logger.error(f"Dossier utilisateur non trouvé: {user_folder_path}")
                return jsonify({"error": "Dossier utilisateur non trouvé"}), 400
        except Exception as e:
            logger.error(f"Error getting user folder path: {str(e)}")
            return jsonify({"error": f"Erreur lors de l'accès au dossier utilisateur: {str(e)}"}), 500

        # Construct the file path
        try:
            file_path = os.path.join(user_folder_path, folder, filename) if folder else os.path.join(user_folder_path, filename)
            logger.info(f"Constructed file path: {file_path}")
            
            # List directory contents for debugging
            dir_path = os.path.dirname(file_path)
            if os.path.exists(dir_path):
                logger.info(f"Directory contents of {dir_path}: {os.listdir(dir_path)}")
            else:
                logger.error(f"Directory does not exist: {dir_path}")
                
            # Check if file exists
            if not os.path.exists(file_path):
                logger.error(f"Fichier non trouvé: {file_path}")
                return jsonify({"error": f"Fichier non trouvé: {filename}"}), 404
                
            # Check file permissions and size
            file_size = os.path.getsize(file_path)
            file_readable = os.access(file_path, os.R_OK)
            logger.info(f"File size: {file_size} bytes, Readable: {file_readable}")
        except Exception as e:
            logger.error(f"Error checking file path: {str(e)}")
            return jsonify({"error": f"Erreur lors de la vérification du fichier: {str(e)}"}), 500
            
        # Send the file directly
        try:
            logger.info(f"Attempting to send file: {file_path}")
            response = send_file(
                file_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/octet-stream'
            )
            logger.info("File sending successful")
            return response
        except Exception as e:
            logger.error(f"Error sending file: {str(e)}", exc_info=True)
            return jsonify({"error": f"Erreur lors de l'envoi du fichier: {str(e)}"}), 500

    except Exception as e:
        logger.error(f"Erreur lors du téléchargement : {str(e)}", exc_info=True)
        return jsonify({"error": f"Erreur serveur : {str(e)}"}), 500

@file_blueprint.route("/api/user-folder/download-file", methods=["GET"])
@cross_origin()
@jwt_required()
def download_file_get():
    try:
        # Get query parameters
        filename = request.args.get("filename")
        folder = request.args.get("folder", "")  # Path relative to user folder
        
        logger.info(f"GET Download request - filename: {filename}, folder: {folder}")
        
        if not filename:
            logger.error("Nom de fichier manquant")
            return jsonify({"error": "Nom de fichier requis"}), 400
            
        # Get user folder path
        user_folder_path = get_user_folder_path()
        if not user_folder_path or not os.path.exists(user_folder_path):
            logger.error("Dossier utilisateur non trouvé ou inaccessible")
            return jsonify({"error": "Dossier utilisateur non trouvé"}), 400
            
        # Construct file path
        file_path = os.path.join(user_folder_path, folder, filename) if folder else os.path.join(user_folder_path, filename)
        logger.info(f"File path for download: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"Fichier non trouvé : {file_path}")
            return jsonify({"error": f"Fichier non trouvé : {filename}"}), 404
            
        # Send file
        try:
            return send_file(
                file_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/octet-stream'
            )
        except Exception as e:
            logger.error(f"Error sending file: {str(e)}")
            return jsonify({"error": f"Erreur d'envoi du fichier: {str(e)}"}), 500
            
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement : {str(e)}", exc_info=True)
        return jsonify({"error": f"Erreur serveur : {str(e)}"}), 500

@file_blueprint.route("/api/user-folder/extract-data-from-file", methods=["POST"])
@cross_origin()
@jwt_required()
def extract_data_from_file():
    try:
        data = request.get_json()
        filename = data.get("filename")
        folder = data.get("folder", "")  # Path relative to user folder

        if not filename:
            logger.error("Nom de fichier manquant")
            return jsonify({"error": "Nom de fichier requis"}), 400

        user_folder_path = get_user_folder_path()
        if not user_folder_path or not os.path.exists(user_folder_path):
            logger.error("Dossier utilisateur non trouvé ou inaccessible")
            return jsonify({"error": "Dossier utilisateur non trouvé"}), 400

        file_path = os.path.join(user_folder_path, folder, filename) if folder else os.path.join(user_folder_path, filename)
        logger.debug(f"Received filename: {filename}, folder: {folder}")
        logger.debug(f"Constructed file path: {file_path}")

        if not os.path.exists(file_path):
            logger.error(f"Fichier non trouvé : {file_path}")
            return jsonify({"error": f"Fichier non trouvé : {filename}"}), 404

        # Open the file and wrap it as a FileStorage object
        with open(file_path, 'rb') as f:
            file_content = f.read()  # Read the entire file content
            file_obj = FileStorage(
                stream=io.BytesIO(file_content),  # Wrap in BytesIO for FileStorage
                filename=filename,
                content_type='application/octet-stream'  # Generic binary type
            )
            result = extract_file_data(file_obj)

        if "error" in result:
            logger.error(f"Erreur d'extraction : {result['error']}")
            return jsonify(result), 400

        logger.debug(f"Données extraites pour : {filename}")
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Erreur lors de l'extraction : {str(e)}", exc_info=True)
        return jsonify({"error": f"Erreur serveur : {str(e)}"}), 500