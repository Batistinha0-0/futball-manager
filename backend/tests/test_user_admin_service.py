import uuid
from uuid import UUID

import pytest

from app.application.users.user_admin_service import UserAdminService
from app.domain.exceptions import ConflictError, ValidationError
from app.domain.user import User, UserAuthRecord, UserRole
from app.infrastructure.security.bcrypt_password_hasher import BcryptPasswordHasher


class FakeUserRepo:
    def __init__(self) -> None:
        self._by_id: dict[UUID, User] = {}
        self._by_name: dict[str, UserAuthRecord] = {}

    def seed(self, user: User, password_hash: str) -> None:
        uid = UUID(user.id)
        self._by_id[uid] = user
        self._by_name[user.user_name] = UserAuthRecord(user=user, password_hash=password_hash)

    def get_auth_record_by_username(self, user_name: str) -> UserAuthRecord | None:
        return self._by_name.get(user_name)

    def get_by_id(self, user_id: UUID) -> User | None:
        return self._by_id.get(user_id)

    def create(
        self,
        *,
        user_name: str,
        phone: str,
        role: UserRole,
        password_hash: str,
    ) -> User:
        u = User(id=str(uuid.uuid4()), user_name=user_name, phone=phone, role=role)
        self.seed(u, password_hash)
        return u

    def list_all(self) -> list[User]:
        return sorted(self._by_id.values(), key=lambda u: u.user_name)

    def update(
        self,
        user_id: UUID,
        *,
        user_name: str | None = None,
        phone: str | None = None,
        role: UserRole | None = None,
        password_hash: str | None = None,
    ) -> User | None:
        old = self._by_id.get(user_id)
        if old is None:
            return None
        new_name = user_name if user_name is not None else old.user_name
        new_phone = phone if phone is not None else old.phone
        new_role = role if role is not None else old.role
        new_hash = password_hash if password_hash is not None else self._by_name[old.user_name].password_hash
        del self._by_name[old.user_name]
        nu = User(id=old.id, user_name=new_name, phone=new_phone, role=new_role)
        self._by_id[user_id] = nu
        self._by_name[new_name] = UserAuthRecord(user=nu, password_hash=new_hash)
        return nu

    def delete_by_id(self, user_id: UUID) -> bool:
        u = self._by_id.pop(user_id, None)
        if u is None:
            return False
        del self._by_name[u.user_name]
        return True


@pytest.fixture
def hasher() -> BcryptPasswordHasher:
    return BcryptPasswordHasher()


def test_create_organizer(hasher: BcryptPasswordHasher) -> None:
    repo = FakeUserRepo()
    svc = UserAdminService(users=repo, passwords=hasher)
    u = svc.create_organizer(user_name="org1", plain_password="pw", phone="+3511")
    assert u.role is UserRole.ORGANIZER
    assert u.user_name == "org1"


def test_cannot_delete_super_admin(hasher: BcryptPasswordHasher) -> None:
    repo = FakeUserRepo()
    sa = User(id=str(uuid.uuid4()), user_name="sa", phone="+1", role=UserRole.SUPER_ADMIN)
    org = User(id=str(uuid.uuid4()), user_name="o", phone="+2", role=UserRole.ORGANIZER)
    repo.seed(sa, hasher.hash("x"))
    repo.seed(org, hasher.hash("y"))
    svc = UserAdminService(users=repo, passwords=hasher)
    with pytest.raises(ValidationError) as e:
        svc.delete_user(actor=org, user_id=UUID(sa.id))
    assert e.value.code == "cannot_delete_super_admin"


def test_cannot_modify_other_super_admin(hasher: BcryptPasswordHasher) -> None:
    repo = FakeUserRepo()
    a = User(id=str(uuid.uuid4()), user_name="a", phone="+1", role=UserRole.SUPER_ADMIN)
    b = User(id=str(uuid.uuid4()), user_name="b", phone="+2", role=UserRole.SUPER_ADMIN)
    repo.seed(a, hasher.hash("x"))
    repo.seed(b, hasher.hash("y"))
    svc = UserAdminService(users=repo, passwords=hasher)
    with pytest.raises(ValidationError) as e:
        svc.update_user(actor=a, user_id=UUID(b.id), phone="+99")
    assert e.value.code == "forbidden_target"


def test_duplicate_username_on_create(hasher: BcryptPasswordHasher) -> None:
    repo = FakeUserRepo()
    svc = UserAdminService(users=repo, passwords=hasher)
    svc.create_organizer(user_name="dup", plain_password="a", phone="+1")
    with pytest.raises(ConflictError):
        svc.create_organizer(user_name="dup", plain_password="b", phone="+2")
