from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.receipt import Receipt
from app.schemas.receipt import Category
from app.schemas.summary import (
    CategoryTotal,
    MonthDataWithCategory,
    MonthData,
    MonthlyTrend,
    MonthlySummary,
)

router = APIRouter(tags=["summary"])


def _parse_month(month_str: Optional[str]) -> tuple[int, int]:
    if month_str:
        return int(month_str[:4]), int(month_str[5:7])
    today = date.today()
    return today.year, today.month


def _prev_month(year: int, mon: int) -> tuple[int, int]:
    if mon == 1:
        return year - 1, 12
    return year, mon - 1


@router.get("/summary", response_model=MonthlySummary)
async def get_monthly_summary(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    trend_months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
):
    year, mon = _parse_month(month)

    async def fetch_month(y: int, m: int):
        rows = (
            await db.execute(
                select(Receipt).where(
                    func.extract("year", Receipt.date) == y,
                    func.extract("month", Receipt.date) == m,
                )
            )
        ).scalars().all()
        total = sum(r.total for r in rows)
        count = len(rows)
        return rows, total, count

    this_rows, this_total, this_count = await fetch_month(year, mon)

    by_cat: dict[str, int] = {}
    for r in this_rows:
        by_cat[r.category] = by_cat.get(r.category, 0) + r.total

    prev_year, prev_mon = _prev_month(year, mon)
    _, last_total, last_count = await fetch_month(prev_year, prev_mon)

    trend: list[MonthlyTrend] = []
    cur_y, cur_m = year, mon
    for _ in range(trend_months):
        _, t, _ = await fetch_month(cur_y, cur_m)
        trend.append(
            MonthlyTrend(
                month=f"{cur_y}-{cur_m:02d}",
                label=f"{cur_m}月",
                total=t,
            )
        )
        cur_y, cur_m = _prev_month(cur_y, cur_m)

    trend.reverse()

    return MonthlySummary(
        this_month=MonthDataWithCategory(
            month=f"{year}-{mon:02d}",
            total=this_total,
            count=this_count,
            by_category=[
                CategoryTotal(category=Category(cat), total=tot)
                for cat, tot in sorted(by_cat.items(), key=lambda x: -x[1])
            ],
        ),
        last_month=MonthData(
            month=f"{prev_year}-{prev_mon:02d}",
            total=last_total,
            count=last_count,
        ),
        trend=trend,
    )
