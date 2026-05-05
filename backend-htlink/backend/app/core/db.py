from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.models import AdminUser
from app.schemas.core import AdminUserCreate

# Sync engine for MySQL with pymysql
engine = create_engine(
    str(settings.SQLALCHEMY_DATABASE_URI),
    echo=False,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_pre_ping=True,
)


def get_db() -> Session:
    """Get database session"""
    with Session(engine) as session:
        yield session


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # from sqlmodel import SQLModel

    # This works because the models are already imported and registered from app.models
    # SQLModel.metadata.create_all(engine)

    from app.models import Plan, Tenant, Locale
    
    # 1. Create tourism locales (25+ languages for international tourists)
    locales_data = [
        # 🌏 Châu Á - Nguồn khách lớn nhất
        {"code": "zh-CN", "name": "Chinese (Simplified)", "native_name": "中文（简体）"},
        {"code": "zh-TW", "name": "Chinese (Traditional)", "native_name": "中文（繁體）"},
        {"code": "ko", "name": "Korean", "native_name": "한국어"},
        {"code": "ja", "name": "Japanese", "native_name": "日本語"},
        {"code": "th", "name": "Thai", "native_name": "ภาษาไทย"},
        {"code": "ms", "name": "Malay", "native_name": "Bahasa Melayu"},
        {"code": "id", "name": "Indonesian", "native_name": "Bahasa Indonesia"},
        {"code": "tl", "name": "Filipino (Tagalog)", "native_name": "Tagalog"},
        {"code": "yue", "name": "Cantonese", "native_name": "粵語"},

        # 🌍 Châu Âu
        {"code": "en", "name": "English", "native_name": "English"},
        {"code": "fr", "name": "French", "native_name": "Français"},
        {"code": "de", "name": "German", "native_name": "Deutsch"},
        {"code": "ru", "name": "Russian", "native_name": "Русский"},
        {"code": "es", "name": "Spanish", "native_name": "Español"},
        {"code": "it", "name": "Italian", "native_name": "Italiano"},

        # 🌎 Châu Mỹ & Châu Đại Dương
        {"code": "en-US", "name": "English (US)", "native_name": "English (US)"},
        {"code": "en-AU", "name": "English (Australia)", "native_name": "English (AU)"},
        {"code": "en-CA", "name": "English (Canada)", "native_name": "English (CA)"},
        {"code": "fr-CA", "name": "French (Canada)", "native_name": "Français (CA)"},
        {"code": "pt-BR", "name": "Portuguese (Brazil)", "native_name": "Português (BR)"},

        # 🌍 Trung Đông & Nam Á
        {"code": "hi", "name": "Hindi", "native_name": "हिन्दी"},
        {"code": "ar", "name": "Arabic", "native_name": "العربية"},
        {"code": "ta", "name": "Tamil", "native_name": "தமிழ்"},

        # 🇻🇳 Việt Nam
        {"code": "vi", "name": "Vietnamese", "native_name": "Tiếng Việt"},
    ]
    
    for locale_data in locales_data:
        existing_locale = session.exec(
            select(Locale).where(Locale.code == locale_data["code"])
        ).first()
        if not existing_locale:
            locale = Locale(**locale_data)
            session.add(locale)
    
    session.commit()
    
    # 2. Reuse bootstrap plan when present, otherwise create the default restaurant plan
    plan = session.exec(
        select(Plan).where(Plan.code == "restaurant-basic")
    ).first()
    if not plan:
        plan = session.exec(
            select(Plan).where(Plan.code == "basic")
        ).first()
    if not plan:
        plan = Plan(
            name="Restaurant Basic",
            code="restaurant-basic",
            features_json={"core": True, "analytics": False}
        )
        session.add(plan)
        session.commit()
        session.refresh(plan)
    
    # 3. Create demo tenant
    demo_tenant = session.exec(
        select(Tenant).where(Tenant.code == "demo")
    ).first()
    if not demo_tenant:
        demo_tenant = Tenant(
            plan_id=plan.id,
            name="Demo Restaurant",
            code="demo",
            default_locale="vi",
            fallback_locale="en",
            settings_json={"theme": "default"},
            is_active=True
        )
        session.add(demo_tenant)
        session.commit()

    # 3b. Create production tenant
    prod_tenant = session.exec(
        select(Tenant).where(Tenant.code == "premier_admin")
    ).first()
    if not prod_tenant:
        prod_tenant = Tenant(
            plan_id=plan.id,
            name="Premier Restaurant Admin",
            code="premier_admin",
            default_locale="vi",
            fallback_locale="en",
            settings_json={"theme": "default"},
            is_active=True
        )
        session.add(prod_tenant)
        session.commit()

    # Use demo tenant as default for initial setup
    tenant = demo_tenant

    # 4. Create admin users for both tenants
    superuser_email = str(settings.FIRST_SUPERUSER)
    email_local, _, email_domain = superuser_email.partition("@")
    prod_superuser_email = (
        f"{email_local}+premier@{email_domain}"
        if email_domain
        else f"{superuser_email}.premier"
    )

    # Demo tenant admin
    demo_user = session.exec(
        select(AdminUser).where(
            AdminUser.email == superuser_email,
            AdminUser.tenant_id == demo_tenant.id
        )
    ).first()
    if not demo_user:
        user_in = AdminUserCreate(
            tenant_id=demo_tenant.id,
            email=superuser_email,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            full_name="System Administrator",
            role="OWNER"
        )
        demo_user = crud.create_admin_user(session=session, user_create=user_in)

    # Production tenant admin
    prod_user = session.exec(
        select(AdminUser).where(
            AdminUser.email == prod_superuser_email,
            AdminUser.tenant_id == prod_tenant.id
        )
    ).first()
    if not prod_user:
        user_in = AdminUserCreate(
            tenant_id=prod_tenant.id,
            email=prod_superuser_email,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            full_name="Premier Admin",
            role="OWNER"
        )
        prod_user = crud.create_admin_user(session=session, user_create=user_in)

    session.commit()

