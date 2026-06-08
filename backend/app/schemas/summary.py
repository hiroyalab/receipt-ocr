from typing import List
from pydantic import BaseModel
from app.schemas.receipt import Category


class CategoryTotal(BaseModel):
    category: Category
    total: int


class MonthlyTrend(BaseModel):
    month: str
    label: str
    total: int


class MonthData(BaseModel):
    month: str
    total: int
    count: int


class MonthDataWithCategory(MonthData):
    by_category: List[CategoryTotal]


class MonthlySummary(BaseModel):
    this_month: MonthDataWithCategory
    last_month: MonthData
    trend: List[MonthlyTrend]
