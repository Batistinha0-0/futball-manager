from uuid import UUID

from app.domain.exceptions import ConflictError, ValidationError
from app.domain.user import User, UserRole
from app.ports.password_hasher import PasswordHasher
from app.ports.user_repository import UserRepository


class UserAdminService:
    """User CRUD for super_admin (organizers and admins; protects other super_admin rows)."""

    def __init__(self, *, users: UserRepository, passwords: PasswordHasher) -> None:
        self._users = users
        self._passwords = passwords

    def list_users(self) -> list[User]:
        return self._users.list_all()

    def create_organizer(self, *, user_name: str, plain_password: str, phone: str) -> User:
        un = user_name.strip()
        ph = phone.strip()
        if not un or not plain_password or not ph:
            raise ValidationError("invalid_body", "user_name, password, and phone are required.")
        if self._users.get_auth_record_by_username(un) is not None:
            raise ConflictError("user_name_taken", "Username already exists.")
        return self._users.create(
            user_name=un,
            phone=ph,
            role=UserRole.ORGANIZER,
            password_hash=self._passwords.hash(plain_password),
        )

    def update_user(
        self,
        *,
        actor: User,
        user_id: UUID,
        user_name: str | None = None,
        phone: str | None = None,
        role: UserRole | None = None,
        plain_password: str | None = None,
    ) -> User:
        target = self._users.get_by_id(user_id)
        if target is None:
            raise ValidationError("user_not_found", "User not found.")

        is_self = str(actor.id) == str(target.id)
        is_target_super = target.role is UserRole.SUPER_ADMIN

        if is_target_super and not is_self:
            raise ValidationError("forbidden_target", "Cannot modify another super_admin.")

        if is_target_super and is_self:
            if role is not None:
                raise ValidationError("forbidden_role", "Cannot change super_admin role.")
            if user_name is not None and user_name.strip() != target.user_name:
                other = self._users.get_auth_record_by_username(user_name.strip())
                if other is not None and str(other.user.id) != str(target.id):
                    raise ConflictError("user_name_taken", "Username already exists.")
            return self._apply_update(
                user_id,
                user_name=user_name.strip() if user_name is not None else None,
                phone=phone.strip() if phone is not None else None,
                role=None,
                plain_password=plain_password,
            )

        if role is not None and role not in (UserRole.ORGANIZER, UserRole.ADMIN):
            raise ValidationError("invalid_role", "Role must be organizer or admin.")

        if user_name is not None:
            un = user_name.strip()
            other = self._users.get_auth_record_by_username(un)
            if other is not None and str(other.user.id) != str(target.id):
                raise ConflictError("user_name_taken", "Username already exists.")

        return self._apply_update(
            user_id,
            user_name=user_name.strip() if user_name is not None else None,
            phone=phone.strip() if phone is not None else None,
            role=role,
            plain_password=plain_password,
        )

    def _apply_update(
        self,
        user_id: UUID,
        *,
        user_name: str | None,
        phone: str | None,
        role: UserRole | None,
        plain_password: str | None,
    ) -> User:
        pw_hash = self._passwords.hash(plain_password) if plain_password else None
        updated = self._users.update(
            user_id,
            user_name=user_name,
            phone=phone,
            role=role,
            password_hash=pw_hash,
        )
        if updated is None:
            raise ValidationError("user_not_found", "User not found.")
        return updated

    def delete_user(self, *, actor: User, user_id: UUID) -> None:
        if str(actor.id) == str(user_id):
            raise ValidationError("cannot_delete_self", "Cannot delete your own account.")
        target = self._users.get_by_id(user_id)
        if target is None:
            raise ValidationError("user_not_found", "User not found.")
        if target.role is UserRole.SUPER_ADMIN:
            raise ValidationError("cannot_delete_super_admin", "Cannot delete a super_admin account.")
        if not self._users.delete_by_id(user_id):
            raise ValidationError("user_not_found", "User not found.")
