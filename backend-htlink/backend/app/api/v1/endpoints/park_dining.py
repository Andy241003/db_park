"""
Park Dining API.

Dining is intentionally stored in its own tables instead of reusing
park_services, because it is a separate public section and business domain.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.api.deps import CurrentUser, SessionDep
from app.models.activity_log import ActivityType
from app.models.restaurant import (
    CafeDiningItem,
    CafeDiningItemMedia,
    CafeDiningItemTranslation,
)
from app.utils.activity_logger import log_user_activity
from app.utils.delete_helpers import delete_related_rows

router = APIRouter()


class DiningTranslationSchema(BaseModel):
    locale: str
    name: str
    description: Optional[str] = None


class DiningCreateUpdate(BaseModel):
    code: str
    service_type: str
    availability: Optional[str] = None
    price_information: Optional[str] = None
    vr360_tour_url: Optional[str] = None
    booking_url: Optional[str] = None
    primary_image_media_id: Optional[int] = None
    is_active: bool = True
    display_order: int = 0
    translations: List[DiningTranslationSchema] = []


class DiningResponse(BaseModel):
    id: int
    code: str
    service_type: str
    availability: Optional[str] = None
    price_information: Optional[str] = None
    vr360_tour_url: Optional[str] = None
    booking_url: Optional[str] = None
    primary_image_media_id: Optional[int] = None
    is_active: bool
    display_order: int
    translations: List[DiningTranslationSchema]
    created_at: datetime
    updated_at: datetime


def _get_dining_record(dining_item_id: int, db: Session) -> Optional[CafeDiningItem]:
    statement = (
        select(CafeDiningItem)
        .where(CafeDiningItem.id == dining_item_id)
        .options(selectinload(CafeDiningItem.translations))
    )
    return db.exec(statement).first()


def _serialize_dining_item(item: CafeDiningItem) -> DiningResponse:
    return DiningResponse(
        id=item.id,
        code=item.code,
        service_type=item.dining_type,
        availability=item.availability,
        price_information=item.price_information,
        vr360_tour_url=item.vr360_tour_url,
        booking_url=item.booking_url,
        primary_image_media_id=item.primary_image_media_id,
        is_active=item.is_active,
        display_order=item.display_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
        translations=[
            DiningTranslationSchema(
                locale=translation.locale,
                name=translation.name,
                description=translation.description,
            )
            for translation in item.translations
        ],
    )


@router.get("", response_model=List[DiningResponse])
def get_dining_items(
    current_user: CurrentUser,
    db: SessionDep,
    is_active: Optional[bool] = None,
    service_type: Optional[str] = None,
):
    statement = select(CafeDiningItem).where(CafeDiningItem.tenant_id == current_user.tenant_id)

    if is_active is not None:
        statement = statement.where(CafeDiningItem.is_active == is_active)
    if service_type:
        statement = statement.where(CafeDiningItem.dining_type == service_type)

    statement = statement.options(selectinload(CafeDiningItem.translations))
    statement = statement.order_by(CafeDiningItem.display_order, CafeDiningItem.created_at)
    return [_serialize_dining_item(item) for item in db.exec(statement).all()]


@router.get("/{dining_item_id}", response_model=DiningResponse)
def get_dining_item(
    dining_item_id: int,
    current_user: CurrentUser,
    db: SessionDep,
):
    item = _get_dining_record(dining_item_id, db)
    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Dining item not found")
    return _serialize_dining_item(item)


@router.post("", response_model=DiningResponse)
def create_dining_item(
    dining_data: DiningCreateUpdate,
    current_user: CurrentUser,
    db: SessionDep,
):
    existing = db.exec(
        select(CafeDiningItem).where(
            CafeDiningItem.tenant_id == current_user.tenant_id,
            CafeDiningItem.code == dining_data.code,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Dining code already exists")

    item = CafeDiningItem(
        tenant_id=current_user.tenant_id,
        code=dining_data.code,
        dining_type=dining_data.service_type,
        availability=dining_data.availability,
        price_information=dining_data.price_information,
        vr360_tour_url=dining_data.vr360_tour_url,
        booking_url=dining_data.booking_url,
        primary_image_media_id=dining_data.primary_image_media_id,
        is_active=dining_data.is_active,
        display_order=dining_data.display_order,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    for translation_data in dining_data.translations:
        db.add(
            CafeDiningItemTranslation(
                dining_id=item.id,
                locale=translation_data.locale,
                name=translation_data.name,
                description=translation_data.description,
            )
        )

    if dining_data.primary_image_media_id:
        db.add(
            CafeDiningItemMedia(
                dining_id=item.id,
                media_id=dining_data.primary_image_media_id,
                is_primary=True,
                sort_order=0,
            )
        )

    db.commit()

    dining_name = next((translation.name for translation in dining_data.translations if translation.name), item.code)
    log_user_activity(
        db,
        current_user,
        ActivityType.CREATE_FEATURE,
        f'Dining item "{dining_name}" created',
        resource_type="park_dining_item",
        resource_id=item.id,
        extra_details={"name": dining_name, "code": item.code},
    )

    created = _get_dining_record(item.id, db)
    return _serialize_dining_item(created)


@router.put("/{dining_item_id}", response_model=DiningResponse)
def update_dining_item(
    dining_item_id: int,
    dining_data: DiningCreateUpdate,
    current_user: CurrentUser,
    db: SessionDep,
):
    item = db.get(CafeDiningItem, dining_item_id)
    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Dining item not found")

    if dining_data.code != item.code:
        existing = db.exec(
            select(CafeDiningItem).where(
                CafeDiningItem.tenant_id == current_user.tenant_id,
                CafeDiningItem.code == dining_data.code,
                CafeDiningItem.id != dining_item_id,
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Dining code already exists")

    item.code = dining_data.code
    item.dining_type = dining_data.service_type
    item.availability = dining_data.availability
    item.price_information = dining_data.price_information
    item.vr360_tour_url = dining_data.vr360_tour_url
    item.booking_url = dining_data.booking_url
    item.primary_image_media_id = dining_data.primary_image_media_id
    item.is_active = dining_data.is_active
    item.display_order = dining_data.display_order
    item.updated_at = datetime.utcnow()
    db.add(item)

    delete_related_rows(db, CafeDiningItemTranslation, CafeDiningItemTranslation.dining_id == dining_item_id)
    delete_related_rows(db, CafeDiningItemMedia, CafeDiningItemMedia.dining_id == dining_item_id)
    db.flush()

    for translation_data in dining_data.translations:
        db.add(
            CafeDiningItemTranslation(
                dining_id=item.id,
                locale=translation_data.locale,
                name=translation_data.name,
                description=translation_data.description,
            )
        )

    if dining_data.primary_image_media_id:
        db.add(
            CafeDiningItemMedia(
                dining_id=item.id,
                media_id=dining_data.primary_image_media_id,
                is_primary=True,
                sort_order=0,
            )
        )

    db.commit()

    dining_name = next((translation.name for translation in dining_data.translations if translation.name), item.code)
    log_user_activity(
        db,
        current_user,
        ActivityType.UPDATE_FEATURE,
        f'Dining item "{dining_name}" updated',
        resource_type="park_dining_item",
        resource_id=dining_item_id,
        extra_details={"name": dining_name, "code": item.code},
    )

    updated = _get_dining_record(dining_item_id, db)
    return _serialize_dining_item(updated)


@router.delete("/{dining_item_id}")
def delete_dining_item(
    dining_item_id: int,
    current_user: CurrentUser,
    db: SessionDep,
):
    item = db.get(CafeDiningItem, dining_item_id)
    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Dining item not found")

    delete_related_rows(db, CafeDiningItemTranslation, CafeDiningItemTranslation.dining_id == dining_item_id)
    delete_related_rows(db, CafeDiningItemMedia, CafeDiningItemMedia.dining_id == dining_item_id)

    item_name = item.code
    db.delete(item)
    db.commit()

    log_user_activity(
        db,
        current_user,
        ActivityType.DELETE_FEATURE,
        f'Dining item "{item_name}" deleted',
        resource_type="park_dining_item",
        resource_id=dining_item_id,
        extra_details={"name": item_name, "code": item.code},
    )
    return {"message": "Dining item deleted successfully"}


@router.patch("/{dining_item_id}/reorder")
def reorder_dining_item(
    dining_item_id: int,
    current_user: CurrentUser,
    db: SessionDep,
    new_order: int = Query(...),
):
    item = db.get(CafeDiningItem, dining_item_id)
    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Dining item not found")

    item.display_order = new_order
    item.updated_at = datetime.utcnow()
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "display_order": item.display_order}
