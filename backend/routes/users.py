"""
Routes de gestion des utilisateurs
Réservées aux administrateurs
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, fields, validate, ValidationError
from models import db
from models.user import User
from functools import wraps
import logging

logger = logging.getLogger(__name__)

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


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

class UpdateUserSchema(Schema):
    """Schéma pour la mise à jour d'un utilisateur"""
    email = fields.Email()
    first_name = fields.String(validate=validate.Length(max=50))
    last_name = fields.String(validate=validate.Length(max=50))
    role = fields.String(validate=validate.OneOf(['user', 'admin']))
    is_active = fields.Boolean()


class CreateUserSchema(Schema):
    """Schéma pour la création d'un utilisateur par un admin"""
    username = fields.String(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6))
    first_name = fields.String(validate=validate.Length(max=50))
    last_name = fields.String(validate=validate.Length(max=50))
    role = fields.String(validate=validate.OneOf(['user', 'admin']), load_default='user')


# =========== Routes ===========

@users_bp.route('', methods=['GET'])
@admin_required
def list_users():
    """
    Liste tous les utilisateurs (admin seulement).
    
    Query params:
        page: Numéro de page (défaut: 1)
        per_page: Éléments par page (défaut: 20, max: 100)
        role: Filtrer par rôle (user, admin)
        active: Filtrer par statut (true, false)
        search: Rechercher par username ou email
    
    Returns:
        200: Liste paginée des utilisateurs
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    role = request.args.get('role')
    active = request.args.get('active')
    search = request.args.get('search')
    
    query = User.query
    
    # Filtres
    if role:
        query = query.filter(User.role == role)
    
    if active is not None:
        is_active = active.lower() == 'true'
        query = query.filter(User.is_active == is_active)
    
    if search:
        query = query.filter(
            (User.username.ilike(f'%{search}%')) |
            (User.email.ilike(f'%{search}%'))
        )
    
    # Pagination
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'users': [u.to_dict() for u in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }), 200


@users_bp.route('/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    """
    Récupère un utilisateur par son ID (admin seulement).
    
    Returns:
        200: Détails de l'utilisateur
        404: Utilisateur non trouvé
    """
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    return jsonify({
        'user': user.to_dict(include_sensitive=True)
    }), 200


@users_bp.route('', methods=['POST'])
@admin_required
def create_user():
    """
    Crée un nouvel utilisateur (admin seulement).
    
    Body JSON:
        username: Nom d'utilisateur
        email: Email
        password: Mot de passe
        first_name: Prénom (optionnel)
        last_name: Nom (optionnel)
        role: Rôle (user, admin) - défaut: user
    
    Returns:
        201: Utilisateur créé
        400: Données invalides
        409: Username ou email déjà utilisé
    """
    try:
        data = CreateUserSchema().load(request.json)
    except ValidationError as e:
        return jsonify({'error': 'Données invalides', 'details': e.messages}), 400
    
    # Vérifier unicité
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Ce nom d\'utilisateur est déjà utilisé'}), 409
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Cet email est déjà utilisé'}), 409
    
    try:
        user = User.create_user(**data)
        
        return jsonify({
            'message': 'Utilisateur créé',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur création utilisateur: {e}")
        return jsonify({'error': 'Erreur lors de la création'}), 500


@users_bp.route('/<int:user_id>', methods=['PUT', 'PATCH'])
@admin_required
def update_user(user_id):
    """
    Met à jour un utilisateur (admin seulement).
    
    Body JSON (tous optionnels):
        email: Nouvel email
        first_name: Nouveau prénom
        last_name: Nouveau nom
        role: Nouveau rôle
        is_active: Nouveau statut
    
    Returns:
        200: Utilisateur mis à jour
        400: Données invalides
        404: Utilisateur non trouvé
    """
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    try:
        data = UpdateUserSchema().load(request.json)
    except ValidationError as e:
        return jsonify({'error': 'Données invalides', 'details': e.messages}), 400
    
    # Vérifier unicité de l'email si modifié
    if 'email' in data and data['email'] != user.email:
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Cet email est déjà utilisé'}), 409
    
    # Mettre à jour les champs
    for key, value in data.items():
        setattr(user, key, value)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Utilisateur mis à jour',
        'user': user.to_dict()
    }), 200


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """
    Supprime un utilisateur (admin seulement).
    Ne permet pas de se supprimer soi-même.
    
    Returns:
        200: Utilisateur supprimé
        400: Impossible de se supprimer soi-même
        404: Utilisateur non trouvé
    """
    current_user_id = get_jwt_identity()
    
    if user_id == current_user_id:
        return jsonify({'error': 'Vous ne pouvez pas supprimer votre propre compte'}), 400
    
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    username = user.username
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({
        'message': f'Utilisateur {username} supprimé'
    }), 200


@users_bp.route('/<int:user_id>/activate', methods=['POST'])
@admin_required
def activate_user(user_id):
    """
    Active un compte utilisateur.
    
    Returns:
        200: Compte activé
        404: Utilisateur non trouvé
    """
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    user.is_active = True
    db.session.commit()
    
    return jsonify({
        'message': 'Compte activé',
        'user': user.to_dict()
    }), 200


@users_bp.route('/<int:user_id>/deactivate', methods=['POST'])
@admin_required
def deactivate_user(user_id):
    """
    Désactive un compte utilisateur.
    
    Returns:
        200: Compte désactivé
        400: Impossible de se désactiver soi-même
        404: Utilisateur non trouvé
    """
    current_user_id = get_jwt_identity()
    
    if user_id == current_user_id:
        return jsonify({'error': 'Vous ne pouvez pas désactiver votre propre compte'}), 400
    
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    user.is_active = False
    db.session.commit()
    
    return jsonify({
        'message': 'Compte désactivé',
        'user': user.to_dict()
    }), 200


@users_bp.route('/<int:user_id>/reset-password', methods=['POST'])
@admin_required
def reset_password(user_id):
    """
    Réinitialise le mot de passe d'un utilisateur (admin seulement).
    
    Body JSON:
        new_password: Nouveau mot de passe
    
    Returns:
        200: Mot de passe réinitialisé
        400: Données invalides
        404: Utilisateur non trouvé
    """
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    data = request.json
    if not data or 'new_password' not in data:
        return jsonify({'error': 'new_password requis'}), 400
    
    if len(data['new_password']) < 6:
        return jsonify({'error': 'Le mot de passe doit faire au moins 6 caractères'}), 400
    
    user.set_password(data['new_password'])
    db.session.commit()
    
    return jsonify({
        'message': 'Mot de passe réinitialisé'
    }), 200

