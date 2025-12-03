"""
Routes pour l'analyse IA des documents
Utilise Ollama pour générer des résumés et extraire les informations clés
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.user import User
from models.temporary_access import TemporaryAccess
from models.document_analysis import DocumentAnalysis
from services.mayan_service import MayanService
from services.ai_service import AIService
import logging

logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')


def check_document_access(user: User, document_id: int) -> bool:
    """Vérifie l'accès de l'utilisateur au document"""
    if user.is_admin():
        return True
    return TemporaryAccess.check_document_access(user.id, document_id)


# =========== Routes ===========

@ai_bp.route('/analyze/<int:document_id>', methods=['POST'])
@jwt_required()
def analyze_document(document_id):
    """
    Lance une analyse IA complète d'un document.
    Génère: résumé, mots-clés, points clés.
    
    Body JSON (optionnel):
        language: Langue du document (fr, en) - défaut: fr
        force_refresh: Ignorer le cache (défaut: false)
    
    Returns:
        200: Résultat de l'analyse
        403: Accès refusé
        404: Document non trouvé
        503: Service IA indisponible
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Vérifier l'accès
    if not check_document_access(user, document_id):
        return jsonify({
            'error': 'Accès refusé',
            'message': 'Vous n\'avez pas accès à ce document'
        }), 403
    
    data = request.json or {}
    language = data.get('language', 'fr')
    force_refresh = data.get('force_refresh', False)
    
    # Vérifier le cache
    if not force_refresh:
        cached = DocumentAnalysis.get_cached_analysis(document_id)
        if cached:
            return jsonify({
                'analysis': cached.to_dict(),
                'cached': True
            }), 200
    
    # Récupérer le contenu du document
    mayan = MayanService()
    content = mayan.get_document_content(document_id, token=user.mayan_token)
    
    if not content:
        return jsonify({
            'error': 'Contenu non disponible',
            'message': 'Impossible de récupérer le contenu du document. OCR peut-être en cours.'
        }), 404
    
    # Vérifier la connexion IA
    ai = AIService()
    if not ai.check_connection():
        return jsonify({
            'error': 'Service IA indisponible',
            'message': 'Le service Ollama n\'est pas accessible'
        }), 503
    
    # Créer l'entrée d'analyse
    analysis = DocumentAnalysis.create_analysis(
        document_id=document_id,
        user_id=user.id,
        model_used=ai.model,
        language=language
    )
    
    # Lancer l'analyse
    try:
        analysis.status = 'processing'
        db.session.commit()
        
        result = ai.analyze_document(content, language=language)
        
        if result.get('success'):
            analysis.mark_completed(
                summary=result.get('summary', ''),
                keywords=result.get('keywords', []),
                key_points=result.get('key_points', []),
                processing_time=result.get('processing_time')
            )
            
            return jsonify({
                'analysis': analysis.to_dict(),
                'cached': False
            }), 200
        else:
            analysis.mark_failed(result.get('error', 'Erreur inconnue'))
            return jsonify({
                'error': 'Analyse échouée',
                'message': result.get('error', 'Erreur lors de l\'analyse')
            }), 500
            
    except Exception as e:
        logger.error(f"Erreur analyse IA: {e}")
        analysis.mark_failed(str(e))
        return jsonify({
            'error': 'Erreur interne',
            'message': str(e)
        }), 500


@ai_bp.route('/summary/<int:document_id>', methods=['POST'])
@jwt_required()
def generate_summary(document_id):
    """
    Génère uniquement un résumé du document.
    Plus rapide que l'analyse complète.
    
    Body JSON (optionnel):
        language: Langue du document (fr, en) - défaut: fr
    
    Returns:
        200: Résumé généré
        403: Accès refusé
        404: Document non trouvé
        503: Service IA indisponible
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Vérifier l'accès
    if not check_document_access(user, document_id):
        return jsonify({
            'error': 'Accès refusé',
            'message': 'Vous n\'avez pas accès à ce document'
        }), 403
    
    data = request.json or {}
    language = data.get('language', 'fr')
    
    # Récupérer le contenu
    mayan = MayanService()
    content = mayan.get_document_content(document_id, token=user.mayan_token)
    
    if not content:
        return jsonify({
            'error': 'Contenu non disponible',
            'message': 'Impossible de récupérer le contenu du document'
        }), 404
    
    # Générer le résumé
    ai = AIService()
    if not ai.check_connection():
        return jsonify({
            'error': 'Service IA indisponible'
        }), 503
    
    summary = ai.generate_summary(content, language=language)
    
    if summary:
        return jsonify({
            'document_id': document_id,
            'summary': summary
        }), 200
    else:
        return jsonify({
            'error': 'Impossible de générer le résumé'
        }), 500


@ai_bp.route('/keywords/<int:document_id>', methods=['POST'])
@jwt_required()
def extract_keywords(document_id):
    """
    Extrait les mots-clés du document.
    
    Body JSON (optionnel):
        language: Langue du document (fr, en) - défaut: fr
        count: Nombre de mots-clés (défaut: 10)
    
    Returns:
        200: Mots-clés extraits
        403: Accès refusé
        404: Document non trouvé
        503: Service IA indisponible
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Vérifier l'accès
    if not check_document_access(user, document_id):
        return jsonify({
            'error': 'Accès refusé',
            'message': 'Vous n\'avez pas accès à ce document'
        }), 403
    
    data = request.json or {}
    language = data.get('language', 'fr')
    count = data.get('count', 10)
    
    # Récupérer le contenu
    mayan = MayanService()
    content = mayan.get_document_content(document_id, token=user.mayan_token)
    
    if not content:
        return jsonify({
            'error': 'Contenu non disponible'
        }), 404
    
    # Extraire les mots-clés
    ai = AIService()
    if not ai.check_connection():
        return jsonify({
            'error': 'Service IA indisponible'
        }), 503
    
    keywords = ai.extract_keywords(content, count=count, language=language)
    
    return jsonify({
        'document_id': document_id,
        'keywords': keywords
    }), 200


@ai_bp.route('/ask/<int:document_id>', methods=['POST'])
@jwt_required()
def ask_question(document_id):
    """
    Pose une question sur le contenu du document.
    
    Body JSON:
        question: La question à poser (requis)
        language: Langue (fr, en) - défaut: fr
    
    Returns:
        200: Réponse à la question
        400: Question manquante
        403: Accès refusé
        404: Document non trouvé
        503: Service IA indisponible
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Vérifier l'accès
    if not check_document_access(user, document_id):
        return jsonify({
            'error': 'Accès refusé'
        }), 403
    
    data = request.json or {}
    question = data.get('question', '').strip()
    language = data.get('language', 'fr')
    
    if not question:
        return jsonify({
            'error': 'La question est requise'
        }), 400
    
    # Récupérer le contenu
    mayan = MayanService()
    content = mayan.get_document_content(document_id, token=user.mayan_token)
    
    if not content:
        return jsonify({
            'error': 'Contenu non disponible'
        }), 404
    
    # Poser la question
    ai = AIService()
    if not ai.check_connection():
        return jsonify({
            'error': 'Service IA indisponible'
        }), 503
    
    answer = ai.ask_question(content, question, language=language)
    
    if answer:
        return jsonify({
            'document_id': document_id,
            'question': question,
            'answer': answer
        }), 200
    else:
        return jsonify({
            'error': 'Impossible de générer une réponse'
        }), 500


@ai_bp.route('/history', methods=['GET'])
@jwt_required()
def get_analysis_history():
    """
    Récupère l'historique des analyses de l'utilisateur.
    
    Query params:
        page: Numéro de page
        per_page: Éléments par page
        document_id: Filtrer par document
        status: Filtrer par statut (pending, processing, completed, failed)
    
    Returns:
        200: Liste des analyses
    """
    user_id = get_jwt_identity()
    
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    document_id = request.args.get('document_id', type=int)
    status = request.args.get('status')
    
    query = DocumentAnalysis.query.filter_by(user_id=user_id)
    
    if document_id:
        query = query.filter_by(document_id=document_id)
    
    if status:
        query = query.filter_by(status=status)
    
    pagination = query.order_by(DocumentAnalysis.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'analyses': [a.to_dict() for a in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }), 200


@ai_bp.route('/analysis/<int:analysis_id>', methods=['GET'])
@jwt_required()
def get_analysis(analysis_id):
    """
    Récupère une analyse spécifique.
    
    Returns:
        200: Détails de l'analyse
        404: Analyse non trouvée
    """
    user_id = get_jwt_identity()
    
    analysis = DocumentAnalysis.query.filter_by(
        id=analysis_id,
        user_id=user_id
    ).first()
    
    if not analysis:
        return jsonify({'error': 'Analyse non trouvée'}), 404
    
    return jsonify({'analysis': analysis.to_dict()}), 200


# =========== Routes Status ===========

@ai_bp.route('/status', methods=['GET'])
@jwt_required()
def ai_status():
    """
    Vérifie le statut du service IA.
    
    Returns:
        200: Statut du service
    """
    ai = AIService()
    connected = ai.check_connection()
    models = ai.list_models() if connected else []
    
    return jsonify({
        'status': 'available' if connected else 'unavailable',
        'current_model': ai.model,
        'available_models': models
    }), 200


@ai_bp.route('/models', methods=['GET'])
@jwt_required()
def list_models():
    """
    Liste les modèles IA disponibles.
    
    Returns:
        200: Liste des modèles
        503: Service indisponible
    """
    ai = AIService()
    if not ai.check_connection():
        return jsonify({
            'error': 'Service IA indisponible'
        }), 503
    
    models = ai.list_models()
    
    return jsonify({
        'models': models,
        'current_model': ai.model
    }), 200

