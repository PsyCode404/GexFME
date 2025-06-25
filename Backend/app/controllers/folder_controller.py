from flask import request
from flask_restx import Namespace, Resource, fields, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.folder_service import create_folder, get_folders_by_user, delete_folder,get_folder_by_id
from app import db

# Création du namespace pour la gestion des dossiers
ns = Namespace('folders', description='Gestion des dossiers utilisateurs')

# Modèle pour la documentation Swagger
folder_model = ns.model('Folder', {
    'id': fields.Integer(readonly=True, description='Identifiant du dossier'),
    'id_user': fields.Integer(required=True, description='ID de l’utilisateur'),
    'nom_dossier': fields.String(required=True, description='Nom du dossier'),
    'date_creation': fields.DateTime(readonly=True, description='Date de création')
})

@ns.route('')
class FolderList(Resource):
    @jwt_required()
    @ns.marshal_list_with(folder_model)
    def get(self):
        """Récupère tous les dossiers de l'utilisateur authentifié."""
        user_id = get_jwt_identity()
        folders = get_folders_by_user(user_id)
        return [folder.to_dict() for folder in folders]

    @jwt_required()
    @ns.expect(folder_model)
    @ns.marshal_with(folder_model, code=201)
    def post(self):
        """Crée un nouveau dossier pour l'utilisateur authentifié."""
        user_id = get_jwt_identity()
        data = request.json
        if not data.get('nom_dossier'):
            abort(400, "Le nom du dossier est requis")
        folder = create_folder(id_user=user_id, nom_dossier=data['nom_dossier'])
        return folder.to_dict(), 201

@ns.route('/<int:folder_id>')
@ns.param('folder_id', 'L’identifiant du dossier')
class FolderResource(Resource):
    @jwt_required()
    @ns.marshal_with(folder_model)
    def get(self, folder_id):
        """Récupère un dossier spécifique par son ID."""
        user_id = get_jwt_identity()
        folder = get_folder_by_id(folder_id)
        if not folder or folder.id_user != user_id:
            abort(404, "Dossier non trouvé ou non autorisé")
        return folder.to_dict()

    @jwt_required()
    def delete(self, folder_id):
        """Supprime un dossier par son ID."""
        user_id = get_jwt_identity()
        folder = get_folder_by_id(folder_id)
        if not folder or folder.id_user != user_id:
            abort(404, "Dossier non trouvé ou non autorisé")
        if delete_folder(folder_id):
            return {"message": "Dossier supprimé avec succès"}, 200
        abort(500, "Échec de la suppression du dossier")