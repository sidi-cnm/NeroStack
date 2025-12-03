"""
Modèle TemporaryAccess - Gestion des accès temporaires aux documents
"""
from datetime import datetime
from models import db


class TemporaryAccess(db.Model):
    """
    Modèle pour gérer les droits d'accès temporaires.
    L'administrateur définit une fenêtre de temps durant laquelle
    un utilisateur peut accéder à certains documents.
    """
    
    __tablename__ = 'temporary_accesses'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Utilisateur concerné
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Document Mayan concerné (null = accès global)
    document_id = db.Column(db.Integer, nullable=True, index=True)
    
    # Cabinet/Dossier Mayan (null = tous les cabinets)
    cabinet_id = db.Column(db.Integer, nullable=True)
    
    # Fenêtre d'accès temporaire
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    
    # Type d'accès: read, write, admin
    access_type = db.Column(db.String(20), default='read', nullable=False)
    
    # Statut de l'accès
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Raison de l'accès (optionnel)
    reason = db.Column(db.Text, nullable=True)
    
    # Administrateur qui a créé l'accès
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relation vers l'admin créateur
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_accesses')
    
    def __repr__(self):
        return f'<TemporaryAccess user={self.user_id} doc={self.document_id}>'
    
    def is_valid(self) -> bool:
        """Vérifie si l'accès est actuellement valide"""
        now = datetime.utcnow()
        return (
            self.is_active and 
            self.start_date <= now <= self.end_date
        )
    
    def is_expired(self) -> bool:
        """Vérifie si l'accès a expiré"""
        return datetime.utcnow() > self.end_date
    
    def is_pending(self) -> bool:
        """Vérifie si l'accès n'a pas encore commencé"""
        return datetime.utcnow() < self.start_date
    
    def time_remaining(self) -> int:
        """Retourne le temps restant en secondes (0 si expiré)"""
        if self.is_expired():
            return 0
        delta = self.end_date - datetime.utcnow()
        return max(0, int(delta.total_seconds()))
    
    def to_dict(self) -> dict:
        """Convertit l'accès en dictionnaire"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'document_id': self.document_id,
            'cabinet_id': self.cabinet_id,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'access_type': self.access_type,
            'is_active': self.is_active,
            'is_valid': self.is_valid(),
            'is_expired': self.is_expired(),
            'is_pending': self.is_pending(),
            'time_remaining': self.time_remaining(),
            'reason': self.reason,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def get_user_valid_accesses(user_id: int) -> list:
        """Récupère tous les accès valides d'un utilisateur"""
        now = datetime.utcnow()
        return TemporaryAccess.query.filter(
            TemporaryAccess.user_id == user_id,
            TemporaryAccess.is_active == True,
            TemporaryAccess.start_date <= now,
            TemporaryAccess.end_date >= now
        ).all()
    
    @staticmethod
    def check_document_access(user_id: int, document_id: int) -> bool:
        """Vérifie si un utilisateur a accès à un document spécifique"""
        now = datetime.utcnow()
        
        # Vérifier l'accès spécifique au document ou l'accès global
        access = TemporaryAccess.query.filter(
            TemporaryAccess.user_id == user_id,
            TemporaryAccess.is_active == True,
            TemporaryAccess.start_date <= now,
            TemporaryAccess.end_date >= now,
            db.or_(
                TemporaryAccess.document_id == document_id,
                TemporaryAccess.document_id == None  # Accès global
            )
        ).first()
        
        return access is not None
    
    @staticmethod
    def create_access(
        user_id: int,
        created_by: int,
        start_date: datetime,
        end_date: datetime,
        document_id: int = None,
        cabinet_id: int = None,
        access_type: str = 'read',
        reason: str = None
    ) -> 'TemporaryAccess':
        """Crée un nouvel accès temporaire"""
        access = TemporaryAccess(
            user_id=user_id,
            document_id=document_id,
            cabinet_id=cabinet_id,
            start_date=start_date,
            end_date=end_date,
            access_type=access_type,
            reason=reason,
            created_by=created_by
        )
        db.session.add(access)
        db.session.commit()
        return access

