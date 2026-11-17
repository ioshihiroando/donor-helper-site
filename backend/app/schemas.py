from datetime import date, datetime
from pydantic import (
    BaseModel,
    Field,
    field_validator,
    ConfigDict,
    model_validator,
)
from typing import Annotated
from urllib.parse import urlsplit


def validate_optional_http_url(value: str | None) -> str | None:
    if value is None:
        return None

    value = value.strip()

    if not value:
        return None

    if any(char.isspace() for char in value):
        raise ValueError("Ссылка не должна содержать пробелы")

    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        parsed.port
    except ValueError:
        raise ValueError("Некорректный URL")

    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or not hostname
    ):
        raise ValueError(
            "Ссылка должна начинаться с http:// или https://"
        )

    return value


class CenterCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    city: str = Field(default="Москва", max_length=100)
    address: str = Field(min_length=1, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)

    @field_validator("name", "city", "address")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Поле не может быть пустым")

        return value

    @field_validator("website_url")
    @classmethod
    def validate_website_url(cls, value: str | None) -> str | None:
        return validate_optional_http_url(value)


class EventCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    center_id: int | None = Field(default=None, gt=0)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    starts_at: datetime
    ends_at: datetime | None = None
    signup_url: str | None = Field(default=None, max_length=500)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Название мероприятия не может быть пустым")

        return value

    @field_validator("starts_at", "ends_at")
    @classmethod
    def validate_timezone(
        cls,
        value: datetime | None,
    ) -> datetime | None:
        if value is not None and (
            value.tzinfo is None or value.utcoffset() is None
        ):
            raise ValueError(
                "Дата и время должны содержать часовой пояс, "
                "например +03:00 или Z"
            )

        return value

    @model_validator(mode="after")
    def validate_event_dates(self):
        if (
            self.ends_at is not None
            and self.ends_at <= self.starts_at
        ):
            raise ValueError(
                "Дата окончания должна быть позже даты начала"
            )

        return self

    @field_validator("signup_url")
    @classmethod
    def validate_signup_url(cls, value: str | None) -> str | None:
        return validate_optional_http_url(value)


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    center_id: int | None
    title: str
    description: str | None
    starts_at: datetime
    ends_at: datetime | None
    signup_url: str | None


class DonationRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    content: str
    source_url: str | None


class DonationRuleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1)
    source_url: str | None = Field(default=None, max_length=500)
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True

    @field_validator("title", "category", "content")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Поле не может быть пустым")

        return value

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str | None) -> str | None:
        return validate_optional_http_url(value)


class DonationRuleAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    content: str
    source_url: str | None
    sort_order: int
    is_active: bool


class DonationTypeResponse(BaseModel):
    code: str
    name: str


class DonationIntervalMatrixResponse(BaseModel):
    valid_from: date
    valid_to: date | None
    source_url: str | None
    donation_types: list[DonationTypeResponse]
    matrix: dict[str, dict[str, int]]


DONATION_TYPE_CODES = {
    "whole_blood",
    "rbc_1_unit",
    "rbc_2_units",
    "plasma",
    "platelets",
    "granulocytes",
}


class DonationIntervalMatrixCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    valid_from: date
    valid_to: date | None = None
    source_url: str | None = Field(default=None, max_length=500)

    matrix: dict[
        str,
        dict[str, Annotated[int, Field(strict=True, ge=1)]]
    ]

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str | None) -> str | None:
        return validate_optional_http_url(value)

    @model_validator(mode="after")
    def validate_matrix(self):
        if (
            self.valid_to is not None
            and self.valid_to < self.valid_from
        ):
            raise ValueError(
                "Дата окончания не может быть раньше даты начала"
            )

        expected = DONATION_TYPE_CODES

        if set(self.matrix) != expected:
            raise ValueError(
                "Матрица должна содержать все 6 видов предыдущей донации"
            )

        for previous_type, row in self.matrix.items():
            if set(row) != expected:
                raise ValueError(
                    f"Для типа {previous_type} указаны не все виды донаций"
                )

        return self
