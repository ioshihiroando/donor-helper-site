import os

from fastapi.middleware.cors import CORSMiddleware

from datetime import date

from fastapi import (
    Request,
    FastAPI,
    HTTPException,
    Depends,
    APIRouter,
)

from fastapi.responses import JSONResponse

from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db, check_database_connection

from app.models import (
    Center,
    Event,
    DonationRule,
    DonationInterval,
)

from app.schemas import (
    CenterCreate,
    EventCreate,
    EventResponse,
    DonationRuleResponse,
    DonationRuleCreate,
    DonationRuleAdminResponse,
    DonationIntervalMatrixResponse,
    DonationIntervalMatrixCreate,
)

from app.auth import require_admin_key

FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

app = FastAPI(
    title="Донор-напарник API",
    description="Backend приложения для доноров крови",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(
    request: Request,
    exc: IntegrityError,
):
    return JSONResponse(
        status_code=409,
        content={
            "detail": (
                "Операция нарушает ограничения "
                "целостности базы данных"
            )
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(
    request: Request,
    exc: SQLAlchemyError,
):
    return JSONResponse(
        status_code=503,
        content={
            "detail": (
                "Не удалось выполнить операцию "
                "с базой данных"
            )
        },
    )

centers_router = APIRouter(prefix="/api/centers", tags=["Центры сдачи крови"])
events_router = APIRouter(prefix="/api/events", tags=["Мероприятия"])
rules_router = APIRouter(prefix="/api/rules", tags=["Правила донорства"])
intervals_router = APIRouter(prefix="/api/donation-intervals", tags=["Интервалы между донациями"])


DONATION_TYPES = [
    {
        "code": "whole_blood",
        "name": "Цельная кровь",
    },
    {
        "code": "rbc_1_unit",
        "name": "Эритроцитная взвесь (1 единица)",
    },
    {
        "code": "rbc_2_units",
        "name": "Эритроцитная взвесь (2 единицы)",
    },
    {
        "code": "plasma",
        "name": "Плазма",
    },
    {
        "code": "platelets",
        "name": "Тромбоциты",
    },
    {
        "code": "granulocytes",
        "name": "Гранулоциты",
    },
]


@app.get(
    "/api/health",
    summary="Проверить состояние backend",
    description=(
        "Проверяет доступность API и соединение с базой данных."
    ),
)
def health_check():
    try:
        check_database_connection()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="База данных временно недоступна",
        )

    return {
        "status": "ok",
        "database": "connected",
    }


@centers_router.get(
    "",
    summary="Получить список центров",
    description=(
        "Возвращает список всех центров сдачи крови, "
        "сохранённых в базе данных. Авторизация не требуется."
    ),
)
def get_centers(db: Session = Depends(get_db)):
    return db.query(Center).all()


@centers_router.get(
    "/{center_id}",
    summary="Получить центр по ID",
    description=(
        "Возвращает информацию о конкретном центре сдачи крови. "
        "Параметр center_id — уникальный идентификатор центра. "
        "Если центр не найден, возвращает ошибку 404."
    ),
)
def get_center(
    center_id: int,
    db: Session = Depends(get_db),
):
    center = db.query(Center).filter(
        Center.id == center_id
    ).first()

    if center is None:
        raise HTTPException(
            status_code=404,
            detail="Центр не найден",
        )

    return center


@centers_router.post(
    "",
    status_code=201,
    summary="Добавить центр",
    description=(
        "Создаёт новый центр сдачи крови и сохраняет его в базе данных. "
        "В теле запроса передаются название, город, адрес "
        "и необязательная ссылка на сайт центра. "
        "При успешном создании возвращает данные центра."
    ),
    dependencies=[Depends(require_admin_key)],
)
def create_center(
    center_data: CenterCreate,
    db: Session = Depends(get_db),
):
    center = Center(**center_data.model_dump())

    db.add(center)
    db.commit()
    db.refresh(center)

    return center


@centers_router.put(
    "/{center_id}",
    summary="Обновить центр",
    description=(
        "Обновляет данные существующего центра сдачи крови. "
        "Параметр center_id указывает, какой центр необходимо изменить. "
        "В теле запроса передаются новые данные центра. "
        "Если центр не найден, возвращает ошибку 404."
    ),
    dependencies=[Depends(require_admin_key)],
)
def update_center(
    center_id: int,
    center_data: CenterCreate,
    db: Session = Depends(get_db),
):
    center = db.query(Center).filter(
        Center.id == center_id
    ).first()

    if center is None:
        raise HTTPException(
            status_code=404,
            detail="Центр не найден",
        )

    center.name = center_data.name
    center.city = center_data.city
    center.address = center_data.address
    center.website_url = center_data.website_url

    db.commit()
    db.refresh(center)

    return center


@centers_router.delete(
    "/{center_id}",
    summary="Удалить центр",
    description=(
        "Удаляет центр сдачи крови из базы данных по его идентификатору. "
        "Если центр не найден, возвращает ошибку 404. "
        "При успешном удалении возвращает сообщение о результате операции."
    ),
    dependencies=[Depends(require_admin_key)],
)
def delete_center(
    center_id: int,
    db: Session = Depends(get_db),
):
    center = db.query(Center).filter(
        Center.id == center_id
    ).first()

    if center is None:
        raise HTTPException(
            status_code=404,
            detail="Центр не найден",
        )

    db.delete(center)
    db.commit()

    return {"detail": "Центр успешно удалён"}


@events_router.get(
    "",
    response_model=list[EventResponse],
    summary="Получить список мероприятий",
    description=(
        "Возвращает список всех мероприятий, отсортированных "
        "по дате начала от ближайших к более поздним. "
        "Авторизация не требуется."
    ),
)
def get_events(db: Session = Depends(get_db)):
    return (
        db.query(Event)
        .order_by(Event.starts_at.asc())
        .all()
    )


@events_router.get(
    "/{event_id}",
    response_model=EventResponse,
    summary="Получить мероприятие по ID",
    description=(
        "Возвращает информацию о конкретном мероприятии. "
        "Если мероприятие не найдено, возвращает ошибку 404."
    ),
)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Мероприятие не найдено",
        )

    return event


@events_router.post(
    "",
    status_code=201,
    response_model=EventResponse,
    summary="Создать мероприятие",
    description=(
        "Создаёт мероприятие и сохраняет его в базе данных. "
        "Можно указать название, описание, даты начала и окончания, "
        "ссылку на запись и ID центра сдачи крови. "
        "Если указанный центр не существует, возвращает ошибку 404."
    ),
    dependencies=[Depends(require_admin_key)],
)
def create_event(
    event_data: EventCreate,
    db: Session = Depends(get_db),
):
    if event_data.center_id is not None:
        center = (
            db.query(Center)
            .filter(Center.id == event_data.center_id)
            .first()
        )

        if center is None:
            raise HTTPException(
                status_code=404,
                detail="Центр сдачи крови не найден",
            )

    event = Event(**event_data.model_dump())

    db.add(event)
    db.commit()
    db.refresh(event)

    return event


@events_router.put(
    "/{event_id}",
    response_model=EventResponse,
    summary="Обновить мероприятие",
    description=(
        "Полностью обновляет данные существующего мероприятия. "
        "В теле запроса передаются новые значения всех полей схемы "
        "EventCreate. Если мероприятие или указанный центр не найдены, "
        "возвращает ошибку 404."
    ),
    dependencies=[Depends(require_admin_key)],
)
def update_event(
    event_id: int,
    event_data: EventCreate,
    db: Session = Depends(get_db),
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Мероприятие не найдено",
        )

    if event_data.center_id is not None:
        center = (
            db.query(Center)
            .filter(Center.id == event_data.center_id)
            .first()
        )

        if center is None:
            raise HTTPException(
                status_code=404,
                detail="Центр сдачи крови не найден",
            )

    for field, value in event_data.model_dump().items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)

    return event


@events_router.delete(
    "/{event_id}",
    summary="Удалить мероприятие",
    description=(
        "Удаляет мероприятие из базы данных по его ID. "
        "Если мероприятие не найдено, возвращает ошибку 404."
    ),
    dependencies=[Depends(require_admin_key)],
)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Мероприятие не найдено",
        )

    db.delete(event)
    db.commit()

    return {"detail": "Мероприятие успешно удалено"}


@rules_router.get(
    "",
    response_model=list[DonationRuleResponse],
    summary="Получить список правил донорства",
    description=(
        "Возвращает список всех активных правил донорства. "
        "Правила отсортированы по категориям и порядку отображения."
    ),
)
def get_donation_rules(db: Session = Depends(get_db)):
    return (
        db.query(DonationRule)
        .filter(DonationRule.is_active.is_(True))
        .order_by(
            DonationRule.category.asc(),
            DonationRule.sort_order.asc(),
        )
        .all()
    )


@rules_router.get(
    "/{rule_id}",
    response_model=DonationRuleResponse,
    summary="Получить правило донорства по ID",
    description=(
        "Возвращает информацию об активном правиле донорства. "
        "Если правило не найдено или неактивно, возвращает ошибку 404."
    ),
)
def get_donation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    rule = (
        db.query(DonationRule)
        .filter(
            DonationRule.id == rule_id,
            DonationRule.is_active.is_(True),
        )
        .first()
    )

    if rule is None:
        raise HTTPException(
            status_code=404,
            detail="Правило донорства не найдено",
        )

    return rule


@rules_router.post(
    "",
    status_code=201,
    response_model=DonationRuleAdminResponse,
    summary="Создать правило донорства",
    description=(
        "Создаёт новое правило донорства. "
        "Доступно только администратору."
    ),
    dependencies=[Depends(require_admin_key)],
)
def create_donation_rule(
    rule_data: DonationRuleCreate,
    db: Session = Depends(get_db),
):
    rule = DonationRule(**rule_data.model_dump())

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule


@rules_router.put(
    "/{rule_id}",
    response_model=DonationRuleAdminResponse,
    summary="Обновить правило донорства",
    description=(
        "Полностью обновляет данные существующего правила. "
        "Доступно только администратору."
    ),
    dependencies=[Depends(require_admin_key)],
)
def update_donation_rule(
    rule_id: int,
    rule_data: DonationRuleCreate,
    db: Session = Depends(get_db),
):
    rule = (
        db.query(DonationRule)
        .filter(DonationRule.id == rule_id)
        .first()
    )

    if rule is None:
        raise HTTPException(
            status_code=404,
            detail="Правило донорства не найдено",
        )

    for field, value in rule_data.model_dump().items():
        setattr(rule, field, value)

    db.commit()
    db.refresh(rule)

    return rule


@rules_router.delete(
    "/{rule_id}",
    summary="Удалить правило донорства",
    description=(
        "Удаляет правило донорства из базы данных по его ID. "
        "Доступно только администратору."
    ),
    dependencies=[Depends(require_admin_key)],
)
def delete_donation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    rule = (
        db.query(DonationRule)
        .filter(DonationRule.id == rule_id)
        .first()
    )

    if rule is None:
        raise HTTPException(
            status_code=404,
            detail="Правило донорства не найдено",
        )

    db.delete(rule)
    db.commit()

    return {"detail": "Правило донорства успешно удалено"}


@intervals_router.get(
    "/matrix",
    response_model=DonationIntervalMatrixResponse,
    summary="Получить матрицу интервалов между донациями",
    description=(
        "Возвращает полную матрицу минимальных интервалов "
        "между видами донаций, действующую на указанную дату. "
        "Если дата не передана, используется текущая дата."
    ),
)
def get_donation_interval_matrix(
    for_date: date | None = None,
    db: Session = Depends(get_db),
):
    target_date = for_date or date.today()

    rows = (
        db.query(DonationInterval)
        .filter(
            DonationInterval.valid_from <= target_date,
            or_(
                DonationInterval.valid_to.is_(None),
                DonationInterval.valid_to >= target_date,
            ),
        )
        .order_by(DonationInterval.valid_from.desc())
        .all()
    )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Матрица интервалов на указанную дату не найдена",
        )

    version_date = rows[0].valid_from

    rows = [
        row for row in rows
        if row.valid_from == version_date
    ]

    expected_codes = {
        item["code"] for item in DONATION_TYPES
    }

    matrix = {
        code: {}
        for code in expected_codes
    }

    for row in rows:
        if (
            row.previous_type not in expected_codes
            or row.next_type not in expected_codes
        ):
            raise HTTPException(
                status_code=500,
                detail="В матрице обнаружен неизвестный тип донации",
            )

        matrix[row.previous_type][row.next_type] = row.days

    missing_pairs = [
        (previous, next_)
        for previous in expected_codes
        for next_ in expected_codes
        if next_ not in matrix[previous]
    ]

    if missing_pairs:
        raise HTTPException(
            status_code=500,
            detail="Матрица интервалов заполнена не полностью",
        )

    valid_to_values = {row.valid_to for row in rows}
    source_values = {row.source_url for row in rows}

    if len(valid_to_values) != 1 or len(source_values) != 1:
        raise HTTPException(
            status_code=500,
            detail="У записей матрицы различаются данные версии",
        )

    return {
        "valid_from": version_date,
        "valid_to": rows[0].valid_to,
        "source_url": rows[0].source_url,
        "donation_types": DONATION_TYPES,
        "matrix": matrix,
    }


@intervals_router.post(
    "/matrix",
    status_code=201,
    response_model=DonationIntervalMatrixResponse,
    summary="Создать версию матрицы интервалов",
    description=(
        "Сохраняет новую версию матрицы интервалов между донациями. "
        "Каждая матрица должна содержать все 36 комбинаций. "
        "Доступно только администратору."
    ),
    dependencies=[Depends(require_admin_key)],
)
def create_donation_interval_matrix(
    matrix_data: DonationIntervalMatrixCreate,
    db: Session = Depends(get_db),
):
    overlapping_version = (
        db.query(DonationInterval)
        .filter(
            or_(
                DonationInterval.valid_to.is_(None),
                DonationInterval.valid_to >= matrix_data.valid_from,
            ),
            or_(
                matrix_data.valid_to is None,
                DonationInterval.valid_from <= matrix_data.valid_to,
            ),
        )
        .first()
    )

    if overlapping_version is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Период действия новой матрицы пересекается "
                "с уже существующей версией"
            ),
        )

    intervals = []

    for previous_type, row in matrix_data.matrix.items():
        for next_type, days in row.items():
            intervals.append(
                DonationInterval(
                    previous_type=previous_type,
                    next_type=next_type,
                    days=days,
                    valid_from=matrix_data.valid_from,
                    valid_to=matrix_data.valid_to,
                    source_url=matrix_data.source_url,
                )
            )

    try:
        db.add_all(intervals)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "valid_from": matrix_data.valid_from,
        "valid_to": matrix_data.valid_to,
        "source_url": matrix_data.source_url,
        "donation_types": DONATION_TYPES,
        "matrix": matrix_data.matrix,
    }


app.include_router(centers_router)
app.include_router(events_router)
app.include_router(rules_router)
app.include_router(intervals_router)
