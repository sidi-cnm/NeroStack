"""
Modèle User - Gestion des utilisateurs
"""
from datetime import datetime
from models import db
import bcrypt


class User(db.Model):
    """Modèle utilisateur pour l'authentification"""
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    
    # Informations utilisateur
    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    
    # Rôle: admin ou user
    role = db.Column(db.String(20), default='user', nullable=False)
    
    # Statut du compte
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Token Mayan (pour SSO)
    mayan_token = db.Column(db.String(255), nullable=True)
    mayan_user_id = db.Column(db.Integer, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Relations
    temporary_accesses = db.relationship('TemporaryAccess', foreign_keys='TemporaryAccess.user_id', backref='user', lazy='dynamic')
    document_analyses = db.relationship('DocumentAnalysis', backref='user', lazy='dynamic')
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def set_password(self, password: str) -> None:
        """Hash et stocke le mot de passe"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password: str) -> bool:
        """Vérifie le mot de passe"""
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            self.password_hash.encode('utf-8')
        )
    
    def is_admin(self) -> bool:
        """Vérifie si l'utilisateur est admin"""
        return self.role == 'admin'
    
    def update_last_login(self) -> None:
        """Met à jour la date de dernière connexion"""
        self.last_login = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self, include_sensitive: bool = False) -> dict:
        """Convertit l'utilisateur en dictionnaire"""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        
        if include_sensitive:
            data['mayan_user_id'] = self.mayan_user_id
            
        return data
    
    @staticmethod
    def create_user(username: str, email: str, password: str, **kwargs) -> 'User':
        """Crée un nouvel utilisateur"""
        user = User(
            username=username,
            email=email,
            **kwargs
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user

