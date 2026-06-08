from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


ALLOWED_USERS = {"しほ", "ひろや"}


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    if req.username not in ALLOWED_USERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalars().first()

    if not user:
        user = User(username=req.username)
        db.add(user)
        await db.flush()
        await db.refresh(user)

    token = create_access_token({"sub": user.id, "username": user.username})
    return LoginResponse(
        user=UserOut(user_id=user.id, username=user.username),
        token=token,
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut(user_id=current_user.id, username=current_user.username)
