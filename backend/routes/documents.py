"""
Routes pour les documents
Proxy vers Mayan EDMS avec vérification des accès temporaires
"""
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.temporary_access import TemporaryAccess
from services.mayan_service import MayanService
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

documents_bp = Blueprint('documents', __name__, url_prefix='/api/documents')


def get_mayan_service(user: User = None) -> MayanService:
    """Crée un service Mayan avec le token utilisateur si disponible"""
    service = MayanService()
    return service


def check_user_access(user: User, document_id: int = None) -> tuple:
    """
    Vérifie si l'utilisateur a accès aux documents.
    
    Returns:
        (has_access: bool, error_response: Response or None)
    """
    if user.is_admin():
        return True, None
    
    # Si un document spécifique, vérifier l'accès
    if document_id:
        has_access = TemporaryAccess.check_document_access(user.id, document_id)
        if not has_access:
            return False, jsonify({
                'error': 'Accès refusé',
                'message': 'Vous n\'avez pas accès à ce document'
            }), 403
    else:
        # Pour la liste, vérifier s'il a au moins un accès valide
        accesses = TemporaryAccess.get_user_valid_accesses(user.id)
        if not accesses:
            return False, jsonify({
                'error': 'Accès refusé',
                'message': 'Aucun accès temporaire actif'
            }), 403
    
    return True, None


# =========== Routes ===========

@documents_bp.route('', methods=['GET'])
@jwt_required()
def list_documents():
    """
    Liste les documents accessibles.
    
    Query params:
        page: Numéro de page
        per_page: Éléments par page
    
    Returns:
        200: Liste des documents
        403: Accès refusé
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # Vérifier l'accès
    has_access, error = check_user_access(user)
    if not has_access:
        return error
    
    mayan = get_mayan_service(user)
    token = user.mayan_token
    
    documents = mayan.get_documents(token=token, page=page, page_size=per_page)
    
    # Pour les non-admins, filtrer selon les accès
    if not user.is_admin():
        accesses = TemporaryAccess.get_user_valid_accesses(user.id)
        allowed_doc_ids = set()
        has_global_access = False
        
        for access in accesses:
            if access.document_id is None:
                has_global_access = True
                break
            allowed_doc_ids.add(access.document_id)
        
        if not has_global_access:
            # Filtrer les documents
            filtered_results = [
                doc for doc in documents.get('results', [])
                if doc.get('id') in allowed_doc_ids
            ]
            documents['results'] = filtered_results
            documents['count'] = len(filtered_results)
    
    return jsonify(documents), 200


@documents_bp.route('/<int:document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    """
    Récupère les détails d'un document.
    
    Returns:
        200: Détails du document
        403: Accès refusé
        404: Document non trouvé
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Vérifier l'accès
    has_access, error = check_user_access(user, document_id)
    if not has_access:
        return error
    
    mayan = get_mayan_service(user)
    token = user.mayan_token
    
    document = mayan.get_document(document_id, token=token)
    
    if not document:
        return jsonify({'error': 'Document non trouvé'}), 404
    
    return jsonify(document), 200


@documents_bp.route('/<int:document_id>/content', methods=['GET'])
@jwt_required()
def get_document_content(document_id):
    """
    Récupère le contenu texte (OCR) d'un document.
    
    Returns:
        200: Contenu du document
        403: Accès refusé
        404: Document ou contenu non trouvé
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Vérifier l'accès
    has_access, error = check_user_access(user, document_id)
    if not has_access:
        return error
    
    mayan = get_mayan_service(user)
    token = user.mayan_token
    
    content = mayan.get_document_content(document_id, token=token)
    
    if content is None:
        return jsonify({
            'error': 'Contenu non disponible',
            'message': 'Le document n\'a pas encore été traité par OCR'
        }), 404
    
    return jsonify({
        'document_id': document_id,
        'content': content
    }), 200


@documents_bp.route('/search', methods=['GET'])
@jwt_required()
def search_documents():
    """
    Recherche dans les documents (OCR full-text).
    
    Query params:
        q: Termes de recherche
        page: Numéro de page
        per_page: Éléments par page
    
    Returns:
        200: Résultats de recherche
        400: Termes de recherche manquants
        403: Accès refusé
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'error': 'Paramètre q requis'}), 400
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # Vérifier l'accès
    has_access, error = check_user_access(user)
    if not has_access:
        return error
    
    mayan = get_mayan_service(user)
    token = user.mayan_token
    
    results = mayan.search_documents(query, token=token, page=page, page_size=per_page)
    
    # Filtrer selon les accès pour les non-admins
    if not user.is_admin():
        accesses = TemporaryAccess.get_user_valid_accesses(user.id)
        allowed_doc_ids = set()
        has_global_access = False
        
        for access in accesses:
            if access.document_id is None:
                has_global_access = True
                break
            allowed_doc_ids.add(access.document_id)
        
        if not has_global_access:
            filtered_results = [
                doc for doc in results.get('results', [])
                if doc.get('id') in allowed_doc_ids
            ]
            results['results'] = filtered_results
            results['count'] = len(filtered_results)
    
    return jsonify(results), 200


@documents_bp.route('/<int:document_id>/tags', methods=['GET'])
@jwt_required()
def get_document_tags(document_id):
    """
    Récupère les tags d'un document.
    
    Returns:
        200: Liste des tags
        403: Accès refusé
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Vérifier l'accès
    has_access, error = check_user_access(user, document_id)
    if not has_access:
        return error
    
    mayan = get_mayan_service(user)
    token = user.mayan_token
    
    tags = mayan.get_document_tags(document_id, token=token)
    
    return jsonify({'tags': tags}), 200


# =========== Routes Cabinets ===========

@documents_bp.route('/cabinets', methods=['GET'])
@jwt_required()
def list_cabinets():
    """
    Liste tous les cabinets/dossiers.
    
    Returns:
        200: Liste des cabinets
        403: Accès refusé
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Vérifier l'accès
    has_access, error = check_user_access(user)
    if not has_access:
        return error
    
    mayan = get_mayan_service(user)
    token = user.mayan_token
    
    cabinets = mayan.get_cabinets(token=token)
    
    return jsonify({'cabinets': cabinets}), 200


@documents_bp.route('/cabinets/<int:cabinet_id>/documents', methods=['GET'])
@jwt_required()
def get_cabinet_documents(cabinet_id):
    """
    Liste les documents d'un cabinet.
    
    Returns:
        200: Liste des documents
        403: Accès refusé
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Vérifier l'accès (TODO: vérifier l'accès au cabinet)
    has_access, error = check_user_access(user)
    if not has_access:
        return error
    
    mayan = get_mayan_service(user)
    token = user.mayan_token
    
    documents = mayan.get_cabinet_documents(cabinet_id, token=token)
    
    return jsonify({'documents': documents}), 200


# =========== Routes Types ===========

@documents_bp.route('/types', methods=['GET'])
@jwt_required()
def list_document_types():
    """
    Liste tous les types de documents.
    
    Returns:
        200: Liste des types
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    mayan = get_mayan_service(user)
    token = user.mayan_token
    
    types = mayan.get_document_types(token=token)
    
    return jsonify({'document_types': types}), 200


# =========== Routes Upload ===========

@documents_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_document():
    """
    Upload un nouveau document.
    Réservé aux utilisateurs avec accès en écriture.
    
    Form Data:
        file: Fichier à uploader
        document_type_id: ID du type de document (optionnel, défaut: 1)
    
    Returns:
        201: Document créé
        400: Fichier manquant
        403: Accès refusé
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    
    if 'file' not in request.files:
        return jsonify({'error': 'Fichier requis'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400
    
    document_type_id = request.form.get('document_type_id', 1, type=int)
    
    mayan = get_mayan_service(user)
    token = user.mayan_token
    
    result = mayan.upload_document(
        file_data=file.read(),
        filename=file.filename,
        document_type_id=document_type_id,
        token=token
    )
    
    if result:
        return jsonify({
            'message': 'Document uploadé',
            'document': result
        }), 201
    else:
        return jsonify({'error': 'Erreur lors de l\'upload'}), 500

