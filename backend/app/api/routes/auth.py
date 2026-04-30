from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_auth_service, get_current_user, get_settings, get_writable_db
from app.application.auth.auth_service import AuthService
from app.core.config import Settings
from app.domain.exceptions import AuthenticationError
from app.domain.permissions import permissions_for
from app.domain.user import User, UserRole

router = APIRouter()


class LoginBody(BaseModel):
    user_name: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class UserPublic(BaseModel):
    id: str
    user_name: str
    phone: str
    role: UserRole
    permissions: list[str]


def _user_public(user: User) -> UserPublic:
    perms = permissions_for(user.role)
    return UserPublic(
        id=user.id,
        user_name=user.user_name,
        phone=user.phone,
        role=user.role,
        permissions=[p.value for p in sorted(perms, key=lambda p: p.value)],
    )


def _cookie_common(settings: Settings) -> dict:
    return {
        "httponly": True,
        "secure": settings.auth_cookie_secure,
        "samesite": settings.auth_cookie_samesite,
        "path": "/",
    }


def _set_auth_cookies(response: Response, settings: Settings, access: str, refresh_raw: str) -> None:
    common = _cookie_common(settings)
    access_max = max(60, settings.jwt_access_expires_minutes * 60)
    refresh_max = max(60, settings.jwt_refresh_expires_days * 86400)
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=access,
        max_age=access_max,
        **common,
    )
    response.set_cookie(
        key=settings.auth_refresh_cookie_name,
        value=refresh_raw,
        max_age=refresh_max,
        **common,
    )


def _clear_auth_cookies(response: Response, settings: Settings) -> None:
    common = _cookie_common(settings)
    response.delete_cookie(key=settings.auth_cookie_name, **common)
    response.delete_cookie(key=settings.auth_refresh_cookie_name, **common)


@router.post("/auth/login", status_code=status.HTTP_200_OK)
def login(
    response: Response,
    body: LoginBody,
    auth: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[Session, Depends(get_writable_db)],
) -> dict[str, UserPublic]:
    try:
        user, access, refresh_raw = auth.login(user_name=body.user_name, plain_password=body.password)
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        ) from None

    _set_auth_cookies(response, settings, access, refresh_raw)
    db.commit()
    return {"user": _user_public(user)}


@router.post("/auth/refresh", status_code=status.HTTP_200_OK)
def refresh_session(
    request: Request,
    response: Response,
    auth: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[Session, Depends(get_writable_db)],
) -> dict[str, UserPublic]:
    refresh_raw = request.cookies.get(settings.auth_refresh_cookie_name)
    if not refresh_raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    try:
        user, access, new_refresh = auth.exchange_refresh(refresh_raw=refresh_raw)
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        ) from None

    _set_auth_cookies(response, settings, access, new_refresh)
    db.commit()
    return {"user": _user_public(user)}


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    settings: Annotated[Settings, Depends(get_settings)],
    auth: Annotated[AuthService, Depends(get_auth_service)],
    db: Annotated[Session, Depends(get_writable_db)],
) -> None:
    access = request.cookies.get(settings.auth_cookie_name)
    refresh_raw = request.cookies.get(settings.auth_refresh_cookie_name)
    auth.logout(access_token=access, refresh_raw=refresh_raw)
    db.commit()
    _clear_auth_cookies(response, settings)


@router.get("/auth/me", status_code=status.HTTP_200_OK)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserPublic:
    return _user_public(user)
