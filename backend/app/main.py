from fastapi import (
    FastAPI,
    HTTPException,
    Depends,
    APIRouter,
    Form,
)
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Center,
    Donation,
    User,
    DonorProfile,
    Event,
)
from app.schemas import (
    CenterCreate,
    DonationCreate,
    UserRegister,
    UserLogin,
    TokenResponse,
    DonorProfileResponse,
    DonorProfileUpdate,
    EventCreate,
    EventResponse,
)
from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
    get_admin_user,
)

app = FastAPI(
    title="Донор-напарник API",
    description="Backend приложения для доноров крови",
    version="0.1.0",
)

auth_router = APIRouter(prefix="/api/auth", tags=["Авторизация"])
profiles_router = APIRouter(prefix="/api/profiles", tags=["Профиль донора"])
donations_router = APIRouter(prefix="/api/donations", tags=["Донации"])
centers_router = APIRouter(prefix="/api/centers", tags=["Центры сдачи крови"])
events_router = APIRouter(prefix="/api/events", tags=["Мероприятия"])


@app.get(
    "/api/health",
    summary="Проверить состояние API",
    description=(
        "Проверяет, запущен ли backend и отвечает ли он на HTTP-запросы. "
        "Используется для проверки доступности сервера."
    ),
)
def health_check():
    return {"status": "ok"}


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
    dependencies=[Depends(get_admin_user)],
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
    dependencies=[Depends(get_admin_user)],
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
    dependencies=[Depends(get_admin_user)],
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


@auth_router.post(
    "/register",
    status_code=201,
    summary="Зарегистрировать пользователя",
    description=(
        "Создаёт новую учётную запись по адресу электронной почты и паролю. "
        "Пароль сохраняется в виде хеша. "
        "Если пользователь с таким адресом уже существует, "
        "возвращает ошибку 409."
    ),
)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    email = user_data.email.strip().lower()

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user is not None:
        raise HTTPException(
            status_code=409,
            detail="Пользователь с такой почтой уже существует",
        )

    user = User(
        email=email,
        password_hash=hash_password(user_data.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "message": "Регистрация прошла успешно",
    }


@auth_router.post(
    "/login",
    response_model=TokenResponse,
    summary="Войти в аккаунт",
    description=(
        "Проверяет адрес электронной почты и пароль пользователя. "
        "При успешной авторизации возвращает JWT access-токен. "
        "Токен используется для доступа к защищённым эндпоинтам. "
        "Если данные неверны, возвращает ошибку 401."
    ),
)
def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db),
):
    email = user_data.email.strip().lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if user is None or not verify_password(
        user_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Неверная почта или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user.id)

    return TokenResponse(access_token=access_token)


@auth_router.get(
    "/me",
    summary="Получить данные текущего пользователя",
    description=(
        "Возвращает идентификатор, адрес электронной почты "
        "и дату создания аккаунта текущего авторизованного пользователя. "
        "Требуется действующий JWT access-токен."
    ),
)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
    }


@auth_router.post(
    "/token",
    response_model=TokenResponse,
    summary="Получить токен для Swagger",
    description=(
        "Принимает адрес электронной почты в поле username "
        "и пароль в поле password в формате формы. "
        "Возвращает JWT access-токен для авторизованных запросов. "
        "Этот эндпоинт используется кнопкой Authorize в Swagger UI."
    ),
)
def login_for_swagger(
    username: str = Form(),
    password: str = Form(),
    db: Session = Depends(get_db),
):
    email = username.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Неверная почта или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(access_token=create_access_token(user.id))


@donations_router.post(
    "",
    status_code=201,
    summary="Добавить донацию",
    description=(
        "Добавляет запись о донации в историю текущего пользователя. "
        "В теле запроса передаются дата донации и необязательный "
        "объём сданной крови в миллилитрах. "
        "Идентификатор пользователя определяется по JWT-токену. "
        "Требуется авторизация."
    ),
)
def create_donation(
    donation_data: DonationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    donation = Donation(
        user_id=current_user.id,
        donation_date=donation_data.donation_date,
        volume_ml=donation_data.volume_ml,
    )

    db.add(donation)
    db.commit()
    db.refresh(donation)

    return donation


@donations_router.get(
    "",
    summary="Получить историю донаций",
    description=(
        "Возвращает список донаций текущего пользователя, "
        "отсортированный по дате от новых к старым. "
        "Данные других пользователей не возвращаются. "
        "Требуется авторизация."
    ),
)
def get_donations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    donations = (
        db.query(Donation)
        .filter(Donation.user_id == current_user.id)
        .order_by(Donation.donation_date.desc())
        .all()
    )

    return donations


@profiles_router.get(
    "/me",
    response_model=DonorProfileResponse,
    summary="Получить профиль донора",
    description=(
        "Возвращает профиль текущего авторизованного пользователя: "
        "дату рождения, группу крови и резус-фактор. "
        "Если профиль ещё не заполнен, возвращает пустые поля. "
        "Требуется авторизация."
    ),
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(DonorProfile)
        .filter(DonorProfile.user_id == current_user.id)
        .first()
    )

    if profile is None:
        return DonorProfileResponse(
            birth_date=None,
            blood_group=None,
            rh_factor=None,
        )

    return DonorProfileResponse(
        birth_date=profile.birth_date,
        blood_group=profile.blood_group,
        rh_factor=profile.rh_factor,
    )


@profiles_router.put(
    "/me",
    response_model=DonorProfileResponse,
    summary="Создать или обновить профиль донора",
    description=(
        "Создаёт профиль текущего пользователя или обновляет существующий. "
        "Можно указать дату рождения, группу крови и резус-фактор. "
        "Передавать нужно только те поля, которые необходимо изменить. "
        "Требуется авторизация."
    ),
)
def update_my_profile(
    profile_data: DonorProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(DonorProfile)
        .filter(DonorProfile.user_id == current_user.id)
        .first()
    )

    update_data = profile_data.model_dump(exclude_unset=True)

    if profile is None:
        profile = DonorProfile(
            user_id=current_user.id,
            **update_data,
        )
        db.add(profile)
    else:
        for field, value in update_data.items():
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return DonorProfileResponse(
        birth_date=profile.birth_date,
        blood_group=profile.blood_group,
        rh_factor=profile.rh_factor,
    )

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
    dependencies=[Depends(get_admin_user)],
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
    dependencies=[Depends(get_admin_user)],
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
    dependencies=[Depends(get_admin_user)],
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


app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(donations_router)
app.include_router(centers_router)
app.include_router(events_router)
