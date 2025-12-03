"""
Routes d'authentification
Gestion: inscription, connexion, déconnexion, refresh token
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, 
    jwt_required, get_jwt_identity, get_jwt
)
from marshmallow import Schema, fields, validate, ValidationError
from models import db
from models.user import User
from services.mayan_service import MayanService
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# =========== Schémas de validation ===========

class RegisterSchema(Schema):
    """Schéma de validation pour l'inscription"""
    username = fields.String(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6))
    first_name = fields.String(validate=validate.Length(max=50))
    last_name = fields.String(validate=validate.Length(max=50))


class LoginSchema(Schema):
    """Schéma de validation pour la connexion"""
    username = fields.String(required=True)
    password = fields.String(required=True)


# =========== Routes ===========

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Inscription d'un nouvel utilisateur.
    Crée également l'utilisateur dans Mayan EDMS.
    
    Body JSON:
        username: Nom d'utilisateur (unique)
        email: Email (unique)
        password: Mot de passe (min 6 caractères)
        first_name: Prénom (optionnel)
        last_name: Nom (optionnel)
    
    Returns:
        201: Utilisateur créé avec succès
        400: Erreur de validation
        409: Username ou email déjà utilisé
    """
    # Valider les données
    try:
        data = RegisterSchema().load(request.json)
    except ValidationError as e:
        return jsonify({'error': 'Données invalides', 'details': e.messages}), 400
    
    # Vérifier si l'utilisateur existe déjà
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Ce nom d\'utilisateur est déjà utilisé'}), 409
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Cet email est déjà utilisé'}), 409
    
    try:
        # Créer l'utilisateur dans notre base
        user = User.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', '')
        )
        
        # Créer l'utilisateur dans Mayan EDMS (pour SSO)
        try:
            mayan = MayanService()
            mayan_user = mayan.create_mayan_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', '')
            )
            
            if mayan_user:
                user.mayan_user_id = mayan_user.get('id')
                db.session.commit()
                logger.info(f"Utilisateur Mayan créé: {mayan_user.get('id')}")
        except Exception as e:
            logger.warning(f"Impossible de créer l'utilisateur Mayan: {e}")
            # Continue même si Mayan échoue
        
        # Générer les tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'message': 'Inscription réussie',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur inscription: {e}")
        return jsonify({'error': 'Erreur lors de l\'inscription'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Connexion d'un utilisateur.
    
    Body JSON:
        username: Nom d'utilisateur ou email
        password: Mot de passe
    
    Returns:
        200: Connexion réussie avec tokens
        401: Identifiants invalides
        403: Compte désactivé
    """
    try:
        data = LoginSchema().load(request.json)
    except ValidationError as e:
        return jsonify({'error': 'Données invalides', 'details': e.messages}), 400
    
    # Chercher l'utilisateur par username ou email
    user = User.query.filter(
        (User.username == data['username']) | (User.email == data['username'])
    ).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Ce compte a été désactivé'}), 403
    
    # Mettre à jour la dernière connexion
    user.update_last_login()
    
    # Obtenir le token Mayan pour SSO
    try:
        mayan = MayanService()
        mayan_token = mayan.authenticate_user(data['username'], data['password'])
        if mayan_token:
            user.mayan_token = mayan_token
            db.session.commit()
    except Exception as e:
        logger.warning(f"Impossible d'obtenir le token Mayan: {e}")
    
    # Générer les tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return jsonify({
        'message': 'Connexion réussie',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token,
        'mayan_token': user.mayan_token
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Déconnexion de l'utilisateur.
    Invalide les tokens (côté client principalement).
    
    Returns:
        200: Déconnexion réussie
    """
    # Dans une implémentation complète, on ajouterait le token à une blacklist
    # Pour simplifier, le client doit simplement supprimer ses tokens
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user:
        # Supprimer le token Mayan
        user.mayan_token = None
        db.session.commit()
    
    return jsonify({'message': 'Déconnexion réussie'}), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Rafraîchit le token d'accès.
    
    Headers:
        Authorization: Bearer <refresh_token>
    
    Returns:
        200: Nouveau token d'accès
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'Utilisateur invalide'}), 401
    
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        'access_token': access_token
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """
    Retourne les informations de l'utilisateur connecté.
    
    Returns:
        200: Informations utilisateur
        404: Utilisateur non trouvé
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    return jsonify({
        'user': user.to_dict(include_sensitive=True)
    }), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """
    Change le mot de passe de l'utilisateur connecté.
    
    Body JSON:
        current_password: Mot de passe actuel
        new_password: Nouveau mot de passe (min 6 caractères)
    
    Returns:
        200: Mot de passe changé
        400: Données invalides
        401: Mot de passe actuel incorrect
    """
    data = request.json
    
    if not data or 'current_password' not in data or 'new_password' not in data:
        return jsonify({'error': 'current_password et new_password requis'}), 400
    
    if len(data['new_password']) < 6:
        return jsonify({'error': 'Le nouveau mot de passe doit faire au moins 6 caractères'}), 400
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.check_password(data['current_password']):
        return jsonify({'error': 'Mot de passe actuel incorrect'}), 401
    
    user.set_password(data['new_password'])
    db.session.commit()
    
    return jsonify({'message': 'Mot de passe modifié avec succès'}), 200


@auth_bp.route('/mayan-token', methods=['GET'])
@jwt_required()
def get_mayan_token():
    """
    Retourne le token Mayan de l'utilisateur pour le SSO.
    Permet au client de faire des requêtes directement à Mayan.
    
    Returns:
        200: Token Mayan
        404: Token non disponible
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    if not user.mayan_token:
        # Essayer de régénérer le token
        return jsonify({
            'error': 'Token Mayan non disponible',
            'message': 'Reconnectez-vous pour obtenir un nouveau token'
        }), 404
    
    return jsonify({
        'mayan_token': user.mayan_token,
        'mayan_user_id': user.mayan_user_id
    }), 200

