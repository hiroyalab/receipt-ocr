from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.receipt import Receipt
from app.models.user import User
from app.schemas.receipt import Category, ReceiptCreate, ReceiptListResponse, ReceiptOut

router = APIRouter(prefix="/receipts", tags=["receipts"])


def _build_filters(
    query,
    month: Optional[str],
    category: Optional[Category],
    q: Optional[str],
):
    if month:
        year, mon = int(month[:4]), int(month[5:7])
        query = query.where(
            func.extract("year", Receipt.date) == year,
            func.extract("month", Receipt.date) == mon,
        )
    if category:
        query = query.where(Receipt.category == category.value)
    if q:
        query = query.where(
            or_(
                Receipt.store.ilike(f"%{q}%"),
                func.cast(Receipt.items, String).ilike(f"%{q}%"),
            )
        )
    return query


@router.get("", response_model=ReceiptListResponse)
async def list_receipts(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    category: Optional[Category] = None,
    q: Optional[str] = None,
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    base = select(Receipt).order_by(Receipt.date.desc(), Receipt.created_at.desc())
    base = _build_filters(base, month, category, q)

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    rows = (await db.execute(base.offset(offset).limit(limit))).scalars().all()
    return ReceiptListResponse(
        items=[ReceiptOut.model_validate(r) for r in rows],
        total_count=total,
    )


@router.post("", response_model=ReceiptOut, status_code=status.HTTP_201_CREATED)
async def create_receipt(
    body: ReceiptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = sum(item.price for item in body.items)
    receipt = Receipt(
        username=body.username,
        store=body.store,
        date=body.date,
        items=[item.model_dump() for item in body.items],
        category=body.category.value,
        total=total,
        image_base64=body.image_base64,
    )
    db.add(receipt)
    await db.flush()
    await db.refresh(receipt)
    return ReceiptOut.model_validate(receipt)


@router.get("/{receipt_id}", response_model=ReceiptOut)
async def get_receipt(receipt_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Receipt).where(Receipt.id == receipt_id))
    receipt = result.scalars().first()
    if not receipt:
        raise HTTPException(status_code=404, detail="指定されたIDのレシートが見つかりません")
    return ReceiptOut.model_validate(receipt)


@router.put("/{receipt_id}", response_model=ReceiptOut)
async def update_receipt(
    receipt_id: str,
    body: ReceiptCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Receipt).where(Receipt.id == receipt_id))
    receipt = result.scalars().first()
    if not receipt:
        raise HTTPException(status_code=404, detail="指定されたIDのレシートが見つかりません")

    receipt.username = body.username
    receipt.store = body.store
    receipt.date = body.date
    receipt.items = [item.model_dump() for item in body.items]
    receipt.category = body.category.value
    receipt.total = sum(item.price for item in body.items)
    receipt.image_base64 = body.image_base64

    await db.flush()
    await db.refresh(receipt)
    return ReceiptOut.model_validate(receipt)


@router.delete("/{receipt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_receipt(receipt_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Receipt).where(Receipt.id == receipt_id))
    receipt = result.scalars().first()
    if not receipt:
        raise HTTPException(status_code=404, detail="指定されたIDのレシートが見つかりません")
    await db.delete(receipt)
