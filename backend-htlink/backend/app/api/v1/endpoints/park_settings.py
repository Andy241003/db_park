"""
Restaurant Settings API endpoints

Handles Restaurant settings, contact, branding, and page configurations.
"""
import time
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from sqlmodel import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel

from app.api.deps import CurrentUser, SessionDep
from app.models.restaurant import CafeSettings, CafePageSettings

router = APIRouter()


def commit_with_retry(db, retries: int = 3, delay: float = 0.5):
    """Commit with retry on MySQL lock wait timeout."""
    attempt = 0
    while True:
        try:
            db.commit()
            return
        except OperationalError as exc:
            # MySQL lock wait timeout error code
            if getattr(exc.orig, 'args', None) and exc.orig.args[0] == 1205 and attempt < retries:
                db.rollback()
                time.sleep(delay * (attempt + 1))
                attempt += 1
                continue
            raise


# ==========================================
# Pydantic Schemas
# ==========================================

class CafeSettingsResponse(BaseModel):
    """Restaurant Settings Response"""
    id: Optional[int] = None
    tenant_id: Optional[int] = None
    park_name: str
    slogan: Optional[str] = None
    primary_color: str = "#6f4e37"
    secondary_color: str = "#d4a574"
    background_color: str = "#ffffff"
    booking_url: Optional[str] = None
    messenger_url: Optional[str] = None
    phone_number: Optional[str] = None
    logo_media_id: Optional[int] = None
    favicon_media_id: Optional[int] = None
    cover_image_media_id: Optional[int] = None
    meta_image_media_id: Optional[int] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    business_hours: Optional[Dict[str, Any]] = None
    settings_json: Optional[Dict[str, Any]] = None


class CafeSettingsUpdate(BaseModel):
    """Restaurant Settings Update"""
    park_name: Optional[str] = None
    slogan: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    background_color: Optional[str] = None
    logo_media_id: Optional[int] = None
    favicon_media_id: Optional[int] = None
    booking_url: Optional[str] = None
    messenger_url: Optional[str] = None
    phone_number: Optional[str] = None
    cover_image_media_id: Optional[int] = None
    meta_image_media_id: Optional[int] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    business_hours: Optional[Dict[str, Any]] = None
    settings_json: Optional[Dict[str, Any]] = None


class CafePageSettingsResponse(BaseModel):
    """Restaurant Page Settings Response"""
    id: Optional[int] = None
    tenant_id: Optional[int] = None
    page_code: str
    is_displaying: bool = True
    vr360_link: Optional[str] = None
    vr_title: Optional[str] = None
    settings_json: Optional[Dict[str, Any]] = None


class CafePageSettingsUpdate(BaseModel):
    """Restaurant Page Settings Update"""
    page_code: str
    is_displaying: Optional[bool] = None
    vr360_link: Optional[str] = None
    vr_title: Optional[str] = None
    settings_json: Optional[Dict[str, Any]] = None


# ==========================================
# Helper Functions
# ==========================================

def get_restaurant_settings_record(db: SessionDep, tenant_id: int) -> Optional[CafeSettings]:
    return db.exec(
        select(CafeSettings).where(CafeSettings.tenant_id == tenant_id).limit(1)
    ).first()


def to_restaurant_settings_response(
    settings: CafeSettings | CafeSettingsResponse,
    tenant_id: int,
) -> CafeSettingsResponse:
    if isinstance(settings, CafeSettingsResponse):
        payload = settings.model_dump()
    else:
        payload = {
            "id": settings.id,
            "tenant_id": tenant_id,
            "park_name": settings.park_name,
            "slogan": settings.slogan,
            "primary_color": settings.primary_color,
            "secondary_color": settings.secondary_color,
            "background_color": settings.background_color,
            "booking_url": settings.booking_url,
            "messenger_url": settings.messenger_url,
            "phone_number": settings.support_phone,
            "logo_media_id": settings.logo_media_id,
            "favicon_media_id": settings.favicon_media_id,
            "cover_image_media_id": settings.cover_image_media_id,
            "meta_image_media_id": settings.meta_image_media_id,
            "meta_title": settings.meta_title,
            "meta_description": settings.meta_description,
            "meta_keywords": settings.meta_keywords,
            "business_hours": settings.operating_hours,
            "settings_json": settings.settings_json,
        }
    payload["tenant_id"] = tenant_id
    return CafeSettingsResponse(**payload)


def to_page_settings_response(
    page_settings: CafePageSettings | CafePageSettingsResponse,
    tenant_id: int,
) -> CafePageSettingsResponse:
    payload = page_settings.model_dump()
    payload["tenant_id"] = tenant_id
    return CafePageSettingsResponse(**payload)


def get_page_settings_record(db: SessionDep, tenant_id: int, page_code: str) -> Optional[CafePageSettings]:
    return db.exec(
        select(CafePageSettings).where(
            CafePageSettings.tenant_id == tenant_id,
            CafePageSettings.page_code == page_code,
        )
    ).first()


# ==========================================
# API Endpoints
# ==========================================

@router.get("/", response_model=CafeSettingsResponse)
def get_restaurant_settings(
    current_user: CurrentUser,
    db: SessionDep
):
    """
    Get Restaurant settings for current tenant
    """
    settings = get_restaurant_settings_record(db, current_user.tenant_id)

    if not settings:
        return CafeSettingsResponse(
            tenant_id=current_user.tenant_id,
            park_name="My Restaurant",
            primary_color="#6f4e37",
            secondary_color="#d4a574",
            background_color="#ffffff"
        )

    return to_restaurant_settings_response(settings, current_user.tenant_id)


@router.post("/", response_model=CafeSettingsResponse)
def create_or_update_restaurant_settings(
    settings_data: CafeSettingsUpdate,
    current_user: CurrentUser,
    db: SessionDep
):
    """
    Create or update Restaurant settings
    """
    existing = get_restaurant_settings_record(db, current_user.tenant_id)

    if existing:
        update_data = settings_data.model_dump(exclude_unset=True)
        if "park_name" in update_data:
            update_data["park_name"] = update_data.pop("park_name")
        if "phone_number" in update_data:
            update_data["support_phone"] = update_data.pop("phone_number")
        if "business_hours" in update_data:
            update_data["operating_hours"] = update_data.pop("business_hours")

        for key, value in update_data.items():
            if hasattr(existing, key):
                setattr(existing, key, value)
                if key in ['operating_hours', 'settings_json']:
                    flag_modified(existing, key)

        db.add(existing)
        db.commit()
        db.refresh(existing)
        return to_restaurant_settings_response(existing, current_user.tenant_id)

    settings_dict = settings_data.model_dump(exclude_unset=True)
    if 'park_name' in settings_dict:
        settings_dict['park_name'] = settings_dict.pop('park_name')
    if 'phone_number' in settings_dict:
        settings_dict['support_phone'] = settings_dict.pop('phone_number')
    if 'business_hours' in settings_dict:
        settings_dict['operating_hours'] = settings_dict.pop('business_hours')
    if 'park_name' not in settings_dict or settings_dict.get('park_name') is None:
        settings_dict['park_name'] = 'My Restaurant'

    new_settings = CafeSettings(
        tenant_id=current_user.tenant_id,
        **settings_dict,
    )
    db.add(new_settings)
    db.commit()
    db.refresh(new_settings)
    return to_restaurant_settings_response(new_settings, current_user.tenant_id)


@router.get("/pages", response_model=list[CafePageSettingsResponse])
def get_restaurant_page_settings(
    current_user: CurrentUser,
    db: SessionDep
):
    """
    Get all page settings for current tenant
    """
    statement = select(CafePageSettings).where(
        CafePageSettings.tenant_id == current_user.tenant_id
    )
    page_settings = db.exec(statement).all()
    return [
        to_page_settings_response(page, current_user.tenant_id)
        for page in page_settings
    ]


@router.get("/pages/{page_code}", response_model=CafePageSettingsResponse)
def get_page_setting(
    page_code: str,
    current_user: CurrentUser,
    db: SessionDep
):
    """
    Get specific page setting
    """
    page_setting = get_page_settings_record(db, current_user.tenant_id, page_code)

    if not page_setting:
        return CafePageSettingsResponse(
            tenant_id=current_user.tenant_id,
            page_code=page_code,
            is_displaying=True,
            vr360_link=None,
            vr_title=None,
            settings_json=None,
        )

    return to_page_settings_response(page_setting, current_user.tenant_id)


@router.post("/pages", response_model=CafePageSettingsResponse)
def create_or_update_page_setting(
    page_data: CafePageSettingsUpdate,
    current_user: CurrentUser,
    db: SessionDep
):
    """
    Create or update page setting
    """
    existing = get_page_settings_record(db, current_user.tenant_id, page_data.page_code)

    if existing:
        for key, value in page_data.model_dump(exclude_unset=True).items():
            if hasattr(existing, key) and key != 'page_code':
                setattr(existing, key, value)
                if key == 'settings_json':
                    flag_modified(existing, key)

        db.add(existing)
        commit_with_retry(db)
        db.refresh(existing)
        return to_page_settings_response(existing, current_user.tenant_id)

    new_page = CafePageSettings(
        tenant_id=current_user.tenant_id,
        **page_data.model_dump(exclude_unset=True),
    )
    db.add(new_page)
    commit_with_retry(db)
    db.refresh(new_page)
    return to_page_settings_response(new_page, current_user.tenant_id)


@router.delete("/pages/{page_code}")
def delete_page_setting(
    page_code: str,
    current_user: CurrentUser,
    db: SessionDep
):
    """
    Delete page setting
    """
    page_setting = get_page_settings_record(db, current_user.tenant_id, page_code)

    if not page_setting:
        raise HTTPException(status_code=404, detail="Page setting not found")

    db.delete(page_setting)
    db.commit()

    return {"success": True, "message": "Page setting deleted"}





