import re
from datetime import date, datetime
from typing import Literal
from pydantic import (
    BaseModel,
    Field,
    EmailStr,
    field_validator,
    ConfigDict,
    model_validator,
)


class CenterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    city: str = Field(default="Москва", max_length=100)
    address: str = Field(min_length=1, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)


class DonationCreate(BaseModel):
    donation_date: date
    volume_ml: int | None = Field(default=None, ge=1, le=2000)

    @field_validator("donation_date")
    @classmethod
    def validate_donation_date(cls, donation_date: date) -> date:
        if donation_date > date.today():
            raise ValueError("Дата донации не может быть в будущем")
        return donation_date


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, password: str) -> str:
        if password.isspace():
            raise ValueError("Пароль не должен состоять только из пробелов")

        if not re.search(r"[A-Za-zА-Яа-яЁё]", password):
            raise ValueError("Пароль должен содержать хотя бы одну букву")

        if not re.search(r"\d", password):
            raise ValueError("Пароль должен содержать хотя бы одну цифру")

        return password


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class DonorProfileUpdate(BaseModel):
    birth_date: date | None = None
    blood_group: Literal["I", "II", "III", "IV"] | None = None
    rh_factor: Literal["+", "-"] | None = None

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, birth_date: date | None) -> date | None:
        if birth_date is not None and birth_date > date.today():
            raise ValueError("Дата рождения не может быть в будущем")
        return birth_date


class DonorProfileResponse(BaseModel):
    birth_date: date | None
    blood_group: str | None
    rh_factor: str | None


class EventCreate(BaseModel):
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


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    center_id: int | None
    title: str
    description: str | None
    starts_at: datetime
    ends_at: datetime | None
    signup_url: str | None
