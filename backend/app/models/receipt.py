import uuid
from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy import String, Date, DateTime, Integer, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    username: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    store: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    items: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    category: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
