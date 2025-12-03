"""
Modèle DocumentAnalysis - Stockage des analyses IA des documents
"""
from datetime import datetime
from models import db
import json


class DocumentAnalysis(db.Model):
    """
    Modèle pour stocker les résultats d'analyse IA des documents.
    Permet de mettre en cache les résumés et mots-clés générés.
    """
    
    __tablename__ = 'document_analyses'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Document Mayan analysé
    document_id = db.Column(db.Integer, nullable=False, index=True)
    
    # Version du document (pour invalider le cache si le doc change)
    document_version = db.Column(db.String(50), nullable=True)
    
    # Utilisateur qui a demandé l'analyse
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Résultat de l'analyse
    summary = db.Column(db.Text, nullable=True)
    keywords = db.Column(db.Text, nullable=True)  # Stocké en JSON
    key_points = db.Column(db.Text, nullable=True)  # Stocké en JSON
    
    # Métadonnées de l'analyse
    model_used = db.Column(db.String(50), nullable=True)
    analysis_type = db.Column(db.String(50), default='full', nullable=False)
    language = db.Column(db.String(10), default='fr', nullable=False)
    
    # Statistiques
    processing_time = db.Column(db.Float, nullable=True)  # En secondes
    token_count = db.Column(db.Integer, nullable=True)
    
    # Statut: pending, processing, completed, failed
    status = db.Column(db.String(20), default='pending', nullable=False)
    error_message = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    def __repr__(self):
        return f'<DocumentAnalysis doc={self.document_id} status={self.status}>'
    
    def get_keywords(self) -> list:
        """Retourne la liste des mots-clés"""
        if self.keywords:
            try:
                return json.loads(self.keywords)
            except json.JSONDecodeError:
                return []
        return []
    
    def set_keywords(self, keywords: list) -> None:
        """Définit les mots-clés"""
        self.keywords = json.dumps(keywords, ensure_ascii=False)
    
    def get_key_points(self) -> list:
        """Retourne la liste des points clés"""
        if self.key_points:
            try:
                return json.loads(self.key_points)
            except json.JSONDecodeError:
                return []
        return []
    
    def set_key_points(self, key_points: list) -> None:
        """Définit les points clés"""
        self.key_points = json.dumps(key_points, ensure_ascii=False)
    
    def mark_completed(self, summary: str, keywords: list, key_points: list, 
                       processing_time: float = None) -> None:
        """Marque l'analyse comme terminée"""
        self.summary = summary
        self.set_keywords(keywords)
        self.set_key_points(key_points)
        self.status = 'completed'
        self.completed_at = datetime.utcnow()
        if processing_time:
            self.processing_time = processing_time
        db.session.commit()
    
    def mark_failed(self, error_message: str) -> None:
        """Marque l'analyse comme échouée"""
        self.status = 'failed'
        self.error_message = error_message
        self.completed_at = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self) -> dict:
        """Convertit l'analyse en dictionnaire"""
        return {
            'id': self.id,
            'document_id': self.document_id,
            'document_version': self.document_version,
            'user_id': self.user_id,
            'summary': self.summary,
            'keywords': self.get_keywords(),
            'key_points': self.get_key_points(),
            'model_used': self.model_used,
            'analysis_type': self.analysis_type,
            'language': self.language,
            'processing_time': self.processing_time,
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
    
    @staticmethod
    def get_cached_analysis(document_id: int, document_version: str = None) -> 'DocumentAnalysis':
        """Récupère une analyse en cache pour un document"""
        query = DocumentAnalysis.query.filter(
            DocumentAnalysis.document_id == document_id,
            DocumentAnalysis.status == 'completed'
        )
        
        if document_version:
            query = query.filter(DocumentAnalysis.document_version == document_version)
        
        return query.order_by(DocumentAnalysis.created_at.desc()).first()
    
    @staticmethod
    def create_analysis(document_id: int, user_id: int, 
                        document_version: str = None,
                        model_used: str = None,
                        analysis_type: str = 'full',
                        language: str = 'fr') -> 'DocumentAnalysis':
        """Crée une nouvelle analyse"""
        analysis = DocumentAnalysis(
            document_id=document_id,
            user_id=user_id,
            document_version=document_version,
            model_used=model_used,
            analysis_type=analysis_type,
            language=language,
            status='pending'
        )
        db.session.add(analysis)
        db.session.commit()
        return analysis

