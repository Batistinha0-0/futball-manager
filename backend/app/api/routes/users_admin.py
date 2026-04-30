from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_user_admin_service, get_writable_db, require_super_admin
from app.application.users.user_admin_service import UserAdminService
from app.domain.exceptions import ConflictError, ValidationError
from app.domain.user import User, UserRole

router = APIRouter()


class UserAdminPublic(BaseModel):
    id: str
    user_name: str
    phone: str
    role: UserRole


class CreateOrganizerBody(BaseModel):
    user_name: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)
    phone: str = Field(min_length=1, max_length=32)


class UpdateUserBody(BaseModel):
    user_name: str | None = Field(default=None, min_length=1, max_length=64)
    phone: str | None = Field(default=None, min_length=1, max_length=32)
    role: UserRole | None = None
    password: str | None = Field(default=None, min_length=1, max_length=256)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "UpdateUserBody":
        if self.user_name is None and self.phone is None and self.role is None and self.password is None:
            raise ValueError("At least one field must be provided.")
        if self.role is not None and self.role not in (UserRole.ORGANIZER, UserRole.ADMIN):
            raise ValueError("role must be organizer or admin.")
        return self


def _http_for_validation(exc: ValidationError) -> HTTPException:
    code = exc.code
    if code in ("user_not_found",):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/users", response_model=list[UserAdminPublic])
def list_users(
    _: Annotated[User, Depends(require_super_admin)],
    svc: Annotated[UserAdminService, Depends(get_user_admin_service)],
) -> list[UserAdminPublic]:
    users = svc.list_users()
    return [UserAdminPublic(id=u.id, user_name=u.user_name, phone=u.phone, role=u.role) for u in users]


@router.post("/users", response_model=UserAdminPublic, status_code=status.HTTP_201_CREATED)
def create_organizer(
    body: CreateOrganizerBody,
    _: Annotated[User, Depends(require_super_admin)],
    svc: Annotated[UserAdminService, Depends(get_user_admin_service)],
    db: Annotated[Session, Depends(get_writable_db)],
) -> UserAdminPublic:
    try:
        user = svc.create_organizer(
            user_name=body.user_name,
            plain_password=body.password,
            phone=body.phone,
        )
        db.commit()
    except ConflictError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValidationError as exc:
        db.rollback()
        raise _http_for_validation(exc) from exc
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists.",
        ) from None
    return UserAdminPublic(id=user.id, user_name=user.user_name, phone=user.phone, role=user.role)


@router.patch("/users/{user_id}", response_model=UserAdminPublic)
def update_user(
    user_id: UUID,
    body: UpdateUserBody,
    actor: Annotated[User, Depends(require_super_admin)],
    svc: Annotated[UserAdminService, Depends(get_user_admin_service)],
    db: Annotated[Session, Depends(get_writable_db)],
) -> UserAdminPublic:
    try:
        user = svc.update_user(
            actor=actor,
            user_id=user_id,
            user_name=body.user_name,
            phone=body.phone,
            role=body.role,
            plain_password=body.password,
        )
        db.commit()
    except ConflictError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValidationError as exc:
        db.rollback()
        raise _http_for_validation(exc) from exc
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists.",
        ) from None
    return UserAdminPublic(id=user.id, user_name=user.user_name, phone=user.phone, role=user.role)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    actor: Annotated[User, Depends(require_super_admin)],
    svc: Annotated[UserAdminService, Depends(get_user_admin_service)],
    db: Annotated[Session, Depends(get_writable_db)],
) -> None:
    try:
        svc.delete_user(actor=actor, user_id=user_id)
        db.commit()
    except ValidationError as exc:
        db.rollback()
        raise _http_for_validation(exc) from exc
