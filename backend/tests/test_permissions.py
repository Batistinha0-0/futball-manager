from app.domain.permissions import Permission, permissions_for
from app.domain.user import UserRole


def test_super_admin_has_full_permission_set() -> None:
    perms = permissions_for(UserRole.SUPER_ADMIN)
    assert Permission.USERS_MANAGE in perms
    assert perms == frozenset(Permission)
