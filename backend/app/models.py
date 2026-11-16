from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """ Базовый класс для всех моделей. """
    pass


class Center(Base):
    __tablename__ = "centers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(
        String(100),
        default="Москва",
    )
    address: Mapped[str] = mapped_column(String(500))
    website_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    center_id: Mapped[int | None] = mapped_column(
        ForeignKey("centers.id"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    signup_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )


class DonationRule(Base):
    __tablename__ = "donation_rules"

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(String(255))

    category: Mapped[str] = mapped_column(String(100))

    content: Mapped[str] = mapped_column(Text)

    source_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    sort_order: Mapped[int] = mapped_column(default=0)

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )


class DonationInterval(Base):
    __tablename__ = "donation_intervals"

    __table_args__ = (
        UniqueConstraint(
            "previous_type",
            "next_type",
            "valid_from",
            name="uq_donation_interval_version",
        ),
        CheckConstraint(
            "days > 0",
            name="ck_donation_intervals_days_positive",
        ),
        CheckConstraint(
            "valid_to IS NULL OR valid_to >= valid_from",
            name="ck_donation_intervals_dates",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    previous_type: Mapped[str] = mapped_column(String(50))
    next_type: Mapped[str] = mapped_column(String(50))

    days: Mapped[int] = mapped_column(Integer)

    valid_from: Mapped[date] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    source_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
