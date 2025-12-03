"""
Service d'intégration avec Ollama (IA Locale)
Génère des résumés et extrait les informations clés des documents
"""
import requests
import json
import time
import logging
from flask import current_app
from typing import Optional, Dict, List, Any

logger = logging.getLogger(__name__)


class AIService:
    """
    Service pour interagir avec Ollama (IA Locale).
    Privacy first: les données ne sortent jamais du serveur.
    """
    
    def __init__(self, base_url: str = None, model: str = None):
        """
        Initialise le service IA.
        
        Args:
            base_url: URL de base d'Ollama (ex: http://service_ia_locale:11434)
            model: Modèle à utiliser (ex: llama3.2, mistral)
        """
        self.base_url = base_url or current_app.config.get('OLLAMA_URL', 'http://service_ia_locale:11434')
        self.model = model or current_app.config.get('OLLAMA_MODEL', 'llama3.2')
    
    def _generate(self, prompt: str, system: str = None, 
                  stream: bool = False) -> Optional[str]:
        """
        Génère une réponse avec Ollama.
        
        Args:
            prompt: Prompt utilisateur
            system: Prompt système (optionnel)
            stream: Activer le streaming (non implémenté)
        
        Returns:
            Réponse générée ou None
        """
        try:
            payload = {
                'model': self.model,
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.7,
                    'top_p': 0.9,
                    'num_predict': 2048
                }
            }
            
            if system:
                payload['system'] = system
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=120  # Timeout plus long pour la génération
            )
            
            if response.status_code == 200:
                return response.json().get('response', '')
            
            logger.error(f"Erreur Ollama generate: {response.status_code} - {response.text}")
            return None
            
        except requests.RequestException as e:
            logger.error(f"Erreur requête Ollama: {e}")
            return None
    
    def analyze_document(self, content: str, language: str = 'fr') -> Dict[str, Any]:
        """
        Analyse un document et génère un résumé + mots-clés + points clés.
        
        Args:
            content: Contenu texte du document
            language: Langue du document (fr, en)
        
        Returns:
            Dict avec summary, keywords, key_points
        """
        start_time = time.time()
        
        # Limiter le contenu si trop long (pour éviter les timeouts)
        max_chars = 15000
        if len(content) > max_chars:
            content = content[:max_chars] + "\n\n[... contenu tronqué ...]"
        
        # Prompt système adapté à la langue
        if language == 'fr':
            system_prompt = """Tu es un assistant expert en analyse documentaire. 
Tu dois analyser le document fourni et produire:
1. Un résumé concis (3-5 phrases)
2. Une liste de 5-10 mots-clés pertinents
3. Les 3-5 points clés les plus importants

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
    "summary": "Le résumé ici...",
    "keywords": ["mot1", "mot2", "mot3"],
    "key_points": ["Point 1", "Point 2", "Point 3"]
}

N'ajoute aucun texte avant ou après le JSON."""
        else:
            system_prompt = """You are an expert document analyst.
Analyze the provided document and produce:
1. A concise summary (3-5 sentences)
2. A list of 5-10 relevant keywords
3. The 3-5 most important key points

Respond ONLY with valid JSON in this exact structure:
{
    "summary": "The summary here...",
    "keywords": ["word1", "word2", "word3"],
    "key_points": ["Point 1", "Point 2", "Point 3"]
}

Do not add any text before or after the JSON."""
        
        prompt = f"Analyse ce document:\n\n{content}"
        
        response = self._generate(prompt, system=system_prompt)
        
        processing_time = time.time() - start_time
        
        if not response:
            return {
                'success': False,
                'error': 'Aucune réponse du modèle IA',
                'processing_time': processing_time
            }
        
        # Parser la réponse JSON
        try:
            # Nettoyer la réponse (enlever les backticks markdown si présents)
            clean_response = response.strip()
            if clean_response.startswith('```'):
                clean_response = clean_response.split('```')[1]
                if clean_response.startswith('json'):
                    clean_response = clean_response[4:]
            if clean_response.endswith('```'):
                clean_response = clean_response[:-3]
            
            result = json.loads(clean_response.strip())
            
            return {
                'success': True,
                'summary': result.get('summary', ''),
                'keywords': result.get('keywords', []),
                'key_points': result.get('key_points', []),
                'processing_time': processing_time,
                'model': self.model
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Erreur parsing JSON: {e}")
            logger.debug(f"Réponse brute: {response}")
            
            # Essayer d'extraire les informations manuellement
            return {
                'success': True,
                'summary': response[:500] if len(response) > 500 else response,
                'keywords': [],
                'key_points': [],
                'processing_time': processing_time,
                'model': self.model,
                'raw_response': True
            }
    
    def generate_summary(self, content: str, language: str = 'fr') -> Optional[str]:
        """
        Génère uniquement un résumé du document.
        
        Args:
            content: Contenu texte du document
            language: Langue du document
        
        Returns:
            Résumé ou None
        """
        # Limiter le contenu
        max_chars = 15000
        if len(content) > max_chars:
            content = content[:max_chars] + "\n\n[... contenu tronqué ...]"
        
        if language == 'fr':
            prompt = f"""Génère un résumé concis (3-5 phrases) de ce document:

{content}

Résumé:"""
        else:
            prompt = f"""Generate a concise summary (3-5 sentences) of this document:

{content}

Summary:"""
        
        return self._generate(prompt)
    
    def extract_keywords(self, content: str, count: int = 10, 
                         language: str = 'fr') -> List[str]:
        """
        Extrait les mots-clés d'un document.
        
        Args:
            content: Contenu texte du document
            count: Nombre de mots-clés à extraire
            language: Langue du document
        
        Returns:
            Liste de mots-clés
        """
        max_chars = 15000
        if len(content) > max_chars:
            content = content[:max_chars]
        
        if language == 'fr':
            prompt = f"""Extrais les {count} mots-clés les plus importants de ce document.
Réponds uniquement avec les mots-clés séparés par des virgules, sans numérotation.

Document:
{content}

Mots-clés:"""
        else:
            prompt = f"""Extract the {count} most important keywords from this document.
Respond only with keywords separated by commas, without numbering.

Document:
{content}

Keywords:"""
        
        response = self._generate(prompt)
        
        if response:
            # Parser la réponse
            keywords = [kw.strip() for kw in response.split(',')]
            return [kw for kw in keywords if kw][:count]
        
        return []
    
    def ask_question(self, content: str, question: str, 
                     language: str = 'fr') -> Optional[str]:
        """
        Pose une question sur le contenu d'un document.
        
        Args:
            content: Contenu texte du document
            question: Question à poser
            language: Langue du document
        
        Returns:
            Réponse à la question
        """
        max_chars = 15000
        if len(content) > max_chars:
            content = content[:max_chars] + "\n\n[... contenu tronqué ...]"
        
        if language == 'fr':
            prompt = f"""Basé sur le document suivant, réponds à cette question.

Document:
{content}

Question: {question}

Réponse:"""
        else:
            prompt = f"""Based on the following document, answer this question.

Document:
{content}

Question: {question}

Answer:"""
        
        return self._generate(prompt)
    
    def check_connection(self) -> bool:
        """Vérifie la connexion à Ollama"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=10
            )
            return response.status_code == 200
        except requests.RequestException:
            return False
    
    def list_models(self) -> List[str]:
        """Liste les modèles disponibles"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return [m['name'] for m in data.get('models', [])]
            return []
        except requests.RequestException:
            return []
    
    def pull_model(self, model_name: str) -> bool:
        """
        Télécharge un modèle (peut être long).
        
        Args:
            model_name: Nom du modèle à télécharger
        
        Returns:
            True si succès
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={'name': model_name, 'stream': False},
                timeout=600  # 10 minutes pour le téléchargement
            )
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Erreur pull modèle: {e}")
            return False
    
    def get_model_info(self) -> Optional[Dict]:
        """Récupère les informations du modèle actuel"""
        try:
            response = requests.post(
                f"{self.base_url}/api/show",
                json={'name': self.model},
                timeout=10
            )
            if response.status_code == 200:
                return response.json()
            return None
        except requests.RequestException:
            return None

