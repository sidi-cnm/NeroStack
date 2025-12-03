"""
Service d'intégration avec Mayan EDMS
Gère toutes les communications avec l'API Mayan
"""
import requests
from flask import current_app
from typing import Optional, Dict, List, Any
import base64
import logging

logger = logging.getLogger(__name__)


class MayanService:
    """
    Service pour interagir avec l'API Mayan EDMS.
    Documentation API Mayan: https://docs.mayan-edms.com/api.html
    """
    
    def __init__(self, base_url: str = None, username: str = None, password: str = None):
        """
        Initialise le service Mayan.
        
        Args:
            base_url: URL de base de Mayan (ex: http://mayan:8000)
            username: Nom d'utilisateur admin Mayan
            password: Mot de passe admin Mayan
        """
        self.base_url = base_url or current_app.config.get('MAYAN_URL', 'http://mayan:8000')
        self.username = username or current_app.config.get('MAYAN_ADMIN_USER', 'admin')
        self.password = password or current_app.config.get('MAYAN_ADMIN_PASSWORD', 'admin')
        self._token = None
        self.api_url = f"{self.base_url}/api/v4"
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Retourne les headers d'authentification Basic"""
        credentials = base64.b64encode(
            f"{self.username}:{self.password}".encode()
        ).decode()
        return {
            'Authorization': f'Basic {credentials}',
            'Content-Type': 'application/json'
        }
    
    def _get_token_headers(self, token: str) -> Dict[str, str]:
        """Retourne les headers avec un token utilisateur"""
        return {
            'Authorization': f'Token {token}',
            'Content-Type': 'application/json'
        }
    
    def _request(self, method: str, endpoint: str, 
                 token: str = None, **kwargs) -> requests.Response:
        """
        Effectue une requête vers l'API Mayan.
        
        Args:
            method: Méthode HTTP (GET, POST, PUT, DELETE)
            endpoint: Endpoint de l'API (ex: /documents/)
            token: Token utilisateur (optionnel, utilise auth admin sinon)
            **kwargs: Arguments supplémentaires pour requests
        
        Returns:
            Response object
        """
        url = f"{self.api_url}{endpoint}"
        headers = self._get_token_headers(token) if token else self._get_auth_headers()
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                timeout=30,
                **kwargs
            )
            return response
        except requests.RequestException as e:
            logger.error(f"Erreur requête Mayan: {e}")
            raise
    
    # =========== Authentification ===========
    
    def authenticate_user(self, username: str, password: str) -> Optional[str]:
        """
        Authentifie un utilisateur et retourne son token Mayan.
        
        Args:
            username: Nom d'utilisateur
            password: Mot de passe
        
        Returns:
            Token d'authentification ou None si échec
        """
        try:
            response = requests.post(
                f"{self.api_url}/auth/token/obtain/",
                json={'username': username, 'password': password},
                timeout=30
            )
            if response.status_code == 200:
                return response.json().get('token')
            return None
        except requests.RequestException as e:
            logger.error(f"Erreur authentification Mayan: {e}")
            return None
    
    def create_mayan_user(self, username: str, email: str, 
                          password: str, first_name: str = '', 
                          last_name: str = '') -> Optional[Dict]:
        """
        Crée un utilisateur dans Mayan EDMS.
        
        Args:
            username: Nom d'utilisateur
            email: Email
            password: Mot de passe
            first_name: Prénom
            last_name: Nom
        
        Returns:
            Données de l'utilisateur créé ou None
        """
        try:
            response = self._request(
                'POST',
                '/users/',
                json={
                    'username': username,
                    'email': email,
                    'password': password,
                    'first_name': first_name,
                    'last_name': last_name
                }
            )
            if response.status_code == 201:
                return response.json()
            logger.warning(f"Échec création utilisateur Mayan: {response.text}")
            return None
        except requests.RequestException as e:
            logger.error(f"Erreur création utilisateur Mayan: {e}")
            return None
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Récupère un utilisateur Mayan par son username"""
        try:
            response = self._request('GET', f'/users/?username={username}')
            if response.status_code == 200:
                results = response.json().get('results', [])
                return results[0] if results else None
            return None
        except requests.RequestException as e:
            logger.error(f"Erreur récupération utilisateur Mayan: {e}")
            return None
    
    # =========== Documents ===========
    
    def get_documents(self, token: str = None, page: int = 1, 
                      page_size: int = 20) -> Dict:
        """
        Liste tous les documents.
        
        Args:
            token: Token utilisateur
            page: Numéro de page
            page_size: Taille de page
        
        Returns:
            Liste paginée des documents
        """
        try:
            response = self._request(
                'GET',
                f'/documents/?page={page}&page_size={page_size}',
                token=token
            )
            if response.status_code == 200:
                return response.json()
            return {'count': 0, 'results': []}
        except requests.RequestException as e:
            logger.error(f"Erreur liste documents: {e}")
            return {'count': 0, 'results': []}
    
    def get_document(self, document_id: int, token: str = None) -> Optional[Dict]:
        """
        Récupère les détails d'un document.
        
        Args:
            document_id: ID du document
            token: Token utilisateur
        
        Returns:
            Détails du document ou None
        """
        try:
            response = self._request('GET', f'/documents/{document_id}/', token=token)
            if response.status_code == 200:
                return response.json()
            return None
        except requests.RequestException as e:
            logger.error(f"Erreur récupération document: {e}")
            return None
    
    def get_document_content(self, document_id: int, token: str = None) -> Optional[str]:
        """
        Récupère le contenu texte d'un document (OCR).
        
        Args:
            document_id: ID du document
            token: Token utilisateur
        
        Returns:
            Contenu texte du document
        """
        try:
            # Récupérer la dernière version du document
            response = self._request(
                'GET',
                f'/documents/{document_id}/versions/',
                token=token
            )
            if response.status_code != 200:
                return None
            
            versions = response.json().get('results', [])
            if not versions:
                return None
            
            latest_version = versions[0]
            version_id = latest_version.get('id')
            
            # Récupérer les pages de la version
            response = self._request(
                'GET',
                f'/documents/{document_id}/versions/{version_id}/pages/',
                token=token
            )
            if response.status_code != 200:
                return None
            
            pages = response.json().get('results', [])
            content_parts = []
            
            # Récupérer le contenu OCR de chaque page
            for page in pages:
                page_id = page.get('id')
                ocr_response = self._request(
                    'GET',
                    f'/documents/{document_id}/versions/{version_id}/pages/{page_id}/ocr/',
                    token=token
                )
                if ocr_response.status_code == 200:
                    ocr_data = ocr_response.json()
                    content = ocr_data.get('content', '')
                    if content:
                        content_parts.append(content)
            
            return '\n\n'.join(content_parts) if content_parts else None
            
        except requests.RequestException as e:
            logger.error(f"Erreur récupération contenu document: {e}")
            return None
    
    def search_documents(self, query: str, token: str = None, 
                         page: int = 1, page_size: int = 20) -> Dict:
        """
        Recherche dans les documents (OCR full-text).
        
        Args:
            query: Termes de recherche
            token: Token utilisateur
            page: Numéro de page
            page_size: Taille de page
        
        Returns:
            Résultats de recherche paginés
        """
        try:
            response = self._request(
                'GET',
                f'/search/documents/?q={query}&page={page}&page_size={page_size}',
                token=token
            )
            if response.status_code == 200:
                return response.json()
            return {'count': 0, 'results': []}
        except requests.RequestException as e:
            logger.error(f"Erreur recherche documents: {e}")
            return {'count': 0, 'results': []}
    
    def upload_document(self, file_data: bytes, filename: str, 
                        document_type_id: int = 1, token: str = None) -> Optional[Dict]:
        """
        Upload un nouveau document.
        
        Args:
            file_data: Données binaires du fichier
            filename: Nom du fichier
            document_type_id: ID du type de document
            token: Token utilisateur
        
        Returns:
            Détails du document créé ou None
        """
        try:
            headers = self._get_token_headers(token) if token else self._get_auth_headers()
            # Supprimer Content-Type pour multipart
            del headers['Content-Type']
            
            response = requests.post(
                f"{self.api_url}/documents/",
                headers=headers,
                files={'file': (filename, file_data)},
                data={'document_type_id': document_type_id},
                timeout=60
            )
            if response.status_code == 201:
                return response.json()
            logger.warning(f"Échec upload document: {response.text}")
            return None
        except requests.RequestException as e:
            logger.error(f"Erreur upload document: {e}")
            return None
    
    # =========== Cabinets ===========
    
    def get_cabinets(self, token: str = None) -> List[Dict]:
        """Liste tous les cabinets/dossiers"""
        try:
            response = self._request('GET', '/cabinets/', token=token)
            if response.status_code == 200:
                return response.json().get('results', [])
            return []
        except requests.RequestException as e:
            logger.error(f"Erreur liste cabinets: {e}")
            return []
    
    def get_cabinet_documents(self, cabinet_id: int, token: str = None) -> List[Dict]:
        """Liste les documents d'un cabinet"""
        try:
            response = self._request(
                'GET',
                f'/cabinets/{cabinet_id}/documents/',
                token=token
            )
            if response.status_code == 200:
                return response.json().get('results', [])
            return []
        except requests.RequestException as e:
            logger.error(f"Erreur liste documents cabinet: {e}")
            return []
    
    # =========== Types de documents ===========
    
    def get_document_types(self, token: str = None) -> List[Dict]:
        """Liste tous les types de documents"""
        try:
            response = self._request('GET', '/document_types/', token=token)
            if response.status_code == 200:
                return response.json().get('results', [])
            return []
        except requests.RequestException as e:
            logger.error(f"Erreur liste types documents: {e}")
            return []
    
    # =========== Tags ===========
    
    def get_document_tags(self, document_id: int, token: str = None) -> List[Dict]:
        """Récupère les tags d'un document"""
        try:
            response = self._request(
                'GET',
                f'/documents/{document_id}/tags/',
                token=token
            )
            if response.status_code == 200:
                return response.json().get('results', [])
            return []
        except requests.RequestException as e:
            logger.error(f"Erreur récupération tags: {e}")
            return []
    
    # =========== Utilitaires ===========
    
    def check_connection(self) -> bool:
        """Vérifie la connexion à Mayan"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v4/",
                timeout=10
            )
            return response.status_code in [200, 401]
        except requests.RequestException:
            return False
    
    def get_api_info(self) -> Optional[Dict]:
        """Récupère les informations de l'API Mayan"""
        try:
            response = self._request('GET', '/')
            if response.status_code == 200:
                return response.json()
            return None
        except requests.RequestException as e:
            logger.error(f"Erreur info API: {e}")
            return None

