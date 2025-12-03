"""
Routes de gestion des accès temporaires
Permet aux admins de définir des fenêtres d'accès pour les utilisateurs
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, fields, validate, ValidationError
from models import db
from models.user import User
from models.temporary_access import TemporaryAccess
from datetime import datetime
from functools import wraps
import logging

logger = logging.getLogger(__name__)

access_bp = Blueprint('access', __name__, url_prefix='/api/access')


# =========== Décorateurs ===========

def admin_required(fn):
    """Décorateur pour restreindre l'accès aux admins"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_admin():
            return jsonify({'error': 'Accès refusé. Droits administrateur requis.'}), 403
        
        return fn(*args, **kwargs)
    return wrapper


# =========== Schémas ===========

class CreateAccessSchema(Schema):
    """Schéma pour créer un accès temporaire"""
    user_id = fields.Integer(required=True)
    document_id = fields.Integer(allow_none=True)  # null = accès global
    cabinet_id = fields.Integer(allow_none=True)
    start_date = fields.DateTime(required=True)
    end_date = fields.DateTime(required=True)
    access_type = fields.String(
        validate=validate.OneOf(['read', 'write', 'admin']),
        load_default='read'
    )
    reason = fields.String(validate=validate.Length(max=500))


class UpdateAccessSchema(Schema):
    """Schéma pour mettre à jour un accès"""
    start_date = fields.DateTime()
    end_date = fields.DateTime()
    access_type = fields.String(validate=validate.OneOf(['read', 'write', 'admin']))
    is_active = fields.Boolean()
    reason = fields.String(validate=validate.Length(max=500))


# =========== Routes Admin ===========

@access_bp.route('', methods=['GET'])
@admin_required
def list_accesses():
    """
    Liste tous les accès temporaires (admin seulement).
    
    Query params:
        page: Numéro de page
        per_page: Éléments par page
        user_id: Filtrer par utilisateur
        document_id: Filtrer par document
        active: Filtrer par statut actif (true/false)
        valid: Filtrer les accès actuellement valides (true/false)
    
    Returns:
        200: Liste paginée des accès
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    user_id = request.args.get('user_id', type=int)
    document_id = request.args.get('document_id', type=int)
    active = request.args.get('active')
    valid = request.args.get('valid')
    
    query = TemporaryAccess.query
    
    # Filtres
    if user_id:
        query = query.filter(TemporaryAccess.user_id == user_id)
    
    if document_id:
        query = query.filter(TemporaryAccess.document_id == document_id)
    
    if active is not None:
        is_active = active.lower() == 'true'
        query = query.filter(TemporaryAccess.is_active == is_active)
    
    if valid is not None and valid.lower() == 'true':
        now = datetime.utcnow()
        query = query.filter(
            TemporaryAccess.is_active == True,
            TemporaryAccess.start_date <= now,
            TemporaryAccess.end_date >= now
        )
    
    # Pagination
    pagination = query.order_by(TemporaryAccess.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    # Enrichir avec les infos utilisateur
    accesses = []
    for access in pagination.items:
        access_dict = access.to_dict()
        user = User.query.get(access.user_id)
        if user:
            access_dict['user'] = {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        accesses.append(access_dict)
    
    return jsonify({
        'accesses': accesses,
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }), 200


@access_bp.route('/<int:access_id>', methods=['GET'])
@admin_required
def get_access(access_id):
    """
    Récupère un accès par son ID.
    
    Returns:
        200: Détails de l'accès
        404: Accès non trouvé
    """
    access = TemporaryAccess.query.get(access_id)
    
    if not access:
        return jsonify({'error': 'Accès non trouvé'}), 404
    
    access_dict = access.to_dict()
    
    # Ajouter les infos utilisateur
    user = User.query.get(access.user_id)
    if user:
        access_dict['user'] = user.to_dict()
    
    return jsonify({'access': access_dict}), 200


@access_bp.route('', methods=['POST'])
@admin_required
def create_access():
    """
    Crée un nouvel accès temporaire (admin seulement).
    
    Body JSON:
        user_id: ID de l'utilisateur
        document_id: ID du document (null = accès global)
        cabinet_id: ID du cabinet (optionnel)
        start_date: Date de début (ISO format)
        end_date: Date de fin (ISO format)
        access_type: Type d'accès (read, write, admin)
        reason: Raison de l'accès (optionnel)
    
    Returns:
        201: Accès créé
        400: Données invalides
        404: Utilisateur non trouvé
    """
    try:
        data = CreateAccessSchema().load(request.json)
    except ValidationError as e:
        return jsonify({'error': 'Données invalides', 'details': e.messages}), 400
    
    # Vérifier que l'utilisateur existe
    user = User.query.get(data['user_id'])
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    # Vérifier les dates
    if data['start_date'] >= data['end_date']:
        return jsonify({'error': 'La date de début doit être avant la date de fin'}), 400
    
    admin_id = get_jwt_identity()
    
    try:
        access = TemporaryAccess.create_access(
            user_id=data['user_id'],
            created_by=admin_id,
            start_date=data['start_date'],
            end_date=data['end_date'],
            document_id=data.get('document_id'),
            cabinet_id=data.get('cabinet_id'),
            access_type=data.get('access_type', 'read'),
            reason=data.get('reason')
        )
        
        return jsonify({
            'message': 'Accès temporaire créé',
            'access': access.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur création accès: {e}")
        return jsonify({'error': 'Erreur lors de la création'}), 500


@access_bp.route('/<int:access_id>', methods=['PUT', 'PATCH'])
@admin_required
def update_access(access_id):
    """
    Met à jour un accès temporaire.
    
    Body JSON (tous optionnels):
        start_date: Nouvelle date de début
        end_date: Nouvelle date de fin
        access_type: Nouveau type d'accès
        is_active: Nouveau statut
        reason: Nouvelle raison
    
    Returns:
        200: Accès mis à jour
        400: Données invalides
        404: Accès non trouvé
    """
    access = TemporaryAccess.query.get(access_id)
    
    if not access:
        return jsonify({'error': 'Accès non trouvé'}), 404
    
    try:
        data = UpdateAccessSchema().load(request.json)
    except ValidationError as e:
        return jsonify({'error': 'Données invalides', 'details': e.messages}), 400
    
    # Vérifier les dates si modifiées
    start = data.get('start_date', access.start_date)
    end = data.get('end_date', access.end_date)
    if start >= end:
        return jsonify({'error': 'La date de début doit être avant la date de fin'}), 400
    
    # Mettre à jour
    for key, value in data.items():
        setattr(access, key, value)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Accès mis à jour',
        'access': access.to_dict()
    }), 200


@access_bp.route('/<int:access_id>', methods=['DELETE'])
@admin_required
def delete_access(access_id):
    """
    Supprime un accès temporaire.
    
    Returns:
        200: Accès supprimé
        404: Accès non trouvé
    """
    access = TemporaryAccess.query.get(access_id)
    
    if not access:
        return jsonify({'error': 'Accès non trouvé'}), 404
    
    db.session.delete(access)
    db.session.commit()
    
    return jsonify({'message': 'Accès supprimé'}), 200


@access_bp.route('/<int:access_id>/revoke', methods=['POST'])
@admin_required
def revoke_access(access_id):
    """
    Révoque (désactive) un accès temporaire sans le supprimer.
    
    Returns:
        200: Accès révoqué
        404: Accès non trouvé
    """
    access = TemporaryAccess.query.get(access_id)
    
    if not access:
        return jsonify({'error': 'Accès non trouvé'}), 404
    
    access.is_active = False
    db.session.commit()
    
    return jsonify({
        'message': 'Accès révoqué',
        'access': access.to_dict()
    }), 200


# =========== Routes Utilisateur ===========

@access_bp.route('/my-accesses', methods=['GET'])
@jwt_required()
def my_accesses():
    """
    Liste les accès de l'utilisateur connecté.
    
    Query params:
        valid_only: Afficher uniquement les accès valides (true/false)
    
    Returns:
        200: Liste des accès de l'utilisateur
    """
    user_id = get_jwt_identity()
    valid_only = request.args.get('valid_only', 'false').lower() == 'true'
    
    if valid_only:
        accesses = TemporaryAccess.get_user_valid_accesses(user_id)
    else:
        accesses = TemporaryAccess.query.filter_by(user_id=user_id).all()
    
    return jsonify({
        'accesses': [a.to_dict() for a in accesses]
    }), 200


@access_bp.route('/check/<int:document_id>', methods=['GET'])
@jwt_required()
def check_access(document_id):
    """
    Vérifie si l'utilisateur a accès à un document spécifique.
    
    Returns:
        200: Résultat de la vérification
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Les admins ont toujours accès
    if user.is_admin():
        return jsonify({
            'has_access': True,
            'reason': 'admin',
            'access_type': 'admin'
        }), 200
    
    # Vérifier l'accès temporaire
    has_access = TemporaryAccess.check_document_access(user_id, document_id)
    
    if has_access:
        # Récupérer les détails de l'accès
        now = datetime.utcnow()
        access = TemporaryAccess.query.filter(
            TemporaryAccess.user_id == user_id,
            TemporaryAccess.is_active == True,
            TemporaryAccess.start_date <= now,
            TemporaryAccess.end_date >= now,
            db.or_(
                TemporaryAccess.document_id == document_id,
                TemporaryAccess.document_id == None
            )
        ).first()
        
        return jsonify({
            'has_access': True,
            'reason': 'temporary_access',
            'access_type': access.access_type if access else 'read',
            'expires_at': access.end_date.isoformat() if access else None,
            'time_remaining': access.time_remaining() if access else 0
        }), 200
    
    return jsonify({
        'has_access': False,
        'reason': 'no_access'
    }), 200


@access_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def access_dashboard():
    """
    Tableau de bord des accès pour l'utilisateur.
    Montre les accès actifs, en attente et expirés.
    
    Returns:
        200: Statistiques des accès
    """
    user_id = get_jwt_identity()
    now = datetime.utcnow()
    
    # Tous les accès de l'utilisateur
    all_accesses = TemporaryAccess.query.filter_by(user_id=user_id).all()
    
    active = []
    pending = []
    expired = []
    revoked = []
    
    for access in all_accesses:
        if not access.is_active:
            revoked.append(access.to_dict())
        elif access.is_expired():
            expired.append(access.to_dict())
        elif access.is_pending():
            pending.append(access.to_dict())
        elif access.is_valid():
            active.append(access.to_dict())
    
    return jsonify({
        'dashboard': {
            'active': {
                'count': len(active),
                'accesses': active
            },
            'pending': {
                'count': len(pending),
                'accesses': pending
            },
            'expired': {
                'count': len(expired),
                'accesses': expired
            },
            'revoked': {
                'count': len(revoked),
                'accesses': revoked
            },
            'total': len(all_accesses)
        }
    }), 200

