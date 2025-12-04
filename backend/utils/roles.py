"""
Role-Based Access Control (RBAC) utilities
"""
from enum import Enum
from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User


class Role(str, Enum):
    """User roles enum"""
    ADMIN = 'admin'
    USER = 'user'

    @classmethod
    def values(cls):
        return [role.value for role in cls]


def get_current_user():
    """Get the current authenticated user"""
    user_id = get_jwt_identity()
    return User.query.get(user_id)


def role_required(*roles: Role):
    """
    Decorator to restrict access to specific roles.

    Usage:
        @role_required(Role.ADMIN)
        def admin_only_route():
            ...

        @role_required(Role.ADMIN, Role.USER)
        def multi_role_route():
            ...
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = get_current_user()

            if not user:
                return jsonify({'error': 'Utilisateur non trouvé'}), 404

            if not user.is_active:
                return jsonify({'error': 'Compte désactivé'}), 403

            # Convert roles to their string values for comparison
            allowed_roles = [r.value if isinstance(r, Role) else r for r in roles]

            if user.role not in allowed_roles:
                return jsonify({
                    'error': 'Accès refusé',
                    'message': f'Rôle requis: {", ".join(allowed_roles)}'
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(fn):
    """Shortcut decorator for admin-only routes"""
    return role_required(Role.ADMIN)(fn)


def authenticated_user(fn):
    """Decorator that injects the current user into the function"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = get_current_user()

        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404

        if not user.is_active:
            return jsonify({'error': 'Compte désactivé'}), 403

        return fn(user, *args, **kwargs)
    return wrapper

