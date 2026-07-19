from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.models.user import User
from app.services import medicine_service

router = APIRouter(prefix="/medicines", tags=["medicines"])


@router.get("", response_model=list[str])
async def search_medicines(
    q: str | None = None,
    limit: int = Query(default=10, ge=1, le=50),
    _user: User = Depends(get_current_user),
) -> list[str]:
    """Typeahead search over the medicine catalog."""
    return medicine_service.search_medicines(q, limit)
