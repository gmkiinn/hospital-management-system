import uuid
from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, set_hospital_context
from app.core.security import decode_token
from app.models.enums import UserRole
from app.models.user import User
from app.services import auth_service

bearer_scheme = HTTPBearer()

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(credentials.credentials)
    except ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        ) from exc
    except InvalidTokenError as exc:
        raise _CREDENTIALS_EXC from exc

    if payload.get("type") != "access":
        raise _CREDENTIALS_EXC

    user_id = payload.get("sub")
    hospital_id = payload.get("hospital_id")
    if user_id is None or hospital_id is None:
        raise _CREDENTIALS_EXC

    # Read the hospital straight off the token and scope RLS before any query.
    await set_hospital_context(db, uuid.UUID(hospital_id))
    user = await auth_service.get_user_by_id(db, uuid.UUID(user_id))
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXC
    return user


def require_roles(
    *roles: UserRole,
) -> Callable[..., Coroutine[Any, Any, User]]:
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return checker
