from app import db
from datetime import datetime

class Folder(db.Model):
    __tablename__ = 'folder'
    
    id = db.Column(db.Integer, primary_key=True)
    id_user = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    nom_dossier = db.Column(db.String(100), nullable=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationship to User
    user = db.relationship('User', backref=db.backref('folders', lazy=True))

    def __init__(self, id_user, nom_dossier, date_creation=None):
        self.id_user = id_user
        self.nom_dossier = nom_dossier
        if date_creation:
            self.date_creation = date_creation