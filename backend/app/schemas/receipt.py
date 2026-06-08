from datetime import date, datetime
from enum import Enum
from typing import List
from pydantic import BaseModel, field_validator


class Category(str, Enum):
    食費 = "食費"
    外食 = "外食"
    日用品 = "日用品"
    交通費 = "交通費"
    医療費 = "医療費"
    娯楽 = "娯楽"
    衣類 = "衣類"
    その他 = "その他"


class ReceiptItem(BaseModel):
    name: str
    price: int


class ReceiptCreate(BaseModel):
    username: str
    store: str
    date: date
    items: List[ReceiptItem]
    category: Category


class ReceiptOut(BaseModel):
    id: str
    username: str
    store: str
    date: date
    items: List[ReceiptItem]
    category: Category
    total: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("items", mode="before")
    @classmethod
    def parse_items(cls, v: object) -> object:
        if isinstance(v, list) and v and isinstance(v[0], dict):
            return [ReceiptItem(**item) for item in v]
        return v


class ReceiptListResponse(BaseModel):
    items: List[ReceiptOut]
    total_count: int
