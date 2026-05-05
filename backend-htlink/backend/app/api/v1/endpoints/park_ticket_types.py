"""
Restaurant Ticket Types API endpoints.

Used by the adventure Restaurant admin to manage ticket products and pricing
while reusing the current Restaurant router namespace.
"""
from datetime import date
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from sqlmodel import Session, select

from app.api.deps import CurrentUser, SessionDep
from app.models.activity_log import ActivityType
from app.models.restaurant import (
    CafeTicketType,
    CafeTicketTypeMedia,
    CafeTicketTypeTranslation,
)
from app.utils.activity_logger import log_user_activity
from app.utils.delete_helpers import delete_related_rows

router = APIRouter()


class TicketTypeTranslationSchema(BaseModel):
    locale: str
    name: str
    description: Optional[str] = None
    terms_and_conditions: Optional[str] = None


class TicketTypeMediaSchema(BaseModel):
    media_id: int
    is_primary: bool = False
    sort_order: int = 0


class TicketTypeResponse(BaseModel):
    id: int
    tenant_id: int
    code: str
    ticket_type: str
    audience_type: Optional[str] = None
    validity_type: Optional[str] = None
    base_price: Optional[float] = None
    sale_price: Optional[float] = None
    currency_code: str
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    min_height_cm: Optional[int] = None
    max_height_cm: Optional[int] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    max_visits: Optional[int] = None
    primary_image_media_id: Optional[int] = None
    is_active: bool = True
    is_featured: bool = False
    display_order: int = 0
    attributes_json: Optional[Any] = None
    translations: List[TicketTypeTranslationSchema] = []
    media: List[TicketTypeMediaSchema] = []


class TicketTypeCreate(BaseModel):
    code: str
    ticket_type: str
    audience_type: Optional[str] = None
    validity_type: Optional[str] = None
    base_price: Optional[float] = None
    sale_price: Optional[float] = None
    currency_code: str = "VND"
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    min_height_cm: Optional[int] = None
    max_height_cm: Optional[int] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    max_visits: Optional[int] = None
    primary_image_media_id: Optional[int] = None
    is_active: bool = True
    is_featured: bool = False
    display_order: int = 0
    attributes_json: Optional[Any] = None
    translations: List[TicketTypeTranslationSchema]
    media_ids: Optional[List[int]] = None


class TicketTypeUpdate(BaseModel):
    code: Optional[str] = None
    ticket_type: Optional[str] = None
    audience_type: Optional[str] = None
    validity_type: Optional[str] = None
    base_price: Optional[float] = None
    sale_price: Optional[float] = None
    currency_code: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    min_height_cm: Optional[int] = None
    max_height_cm: Optional[int] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    max_visits: Optional[int] = None
    primary_image_media_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None
    attributes_json: Optional[Any] = None
    translations: Optional[List[TicketTypeTranslationSchema]] = None
    media_ids: Optional[List[int]] = None


def _get_ticket_type_record(ticket_type_id: int, db: Session) -> Optional[CafeTicketType]:
    statement = (
        select(CafeTicketType)
        .where(CafeTicketType.id == ticket_type_id)
        .options(
            selectinload(CafeTicketType.translations),
            selectinload(CafeTicketType.media),
        )
    )
    return db.exec(statement).first()


def _serialize_ticket_type(ticket_type: CafeTicketType) -> TicketTypeResponse:
    return TicketTypeResponse(
        **ticket_type.model_dump(),
        translations=[
            TicketTypeTranslationSchema(
                locale=t.locale,
                name=t.name,
                description=t.description,
                terms_and_conditions=t.terms_and_conditions,
            )
            for t in ticket_type.translations
        ],
        media=[
            TicketTypeMediaSchema(
                media_id=m.media_id,
                is_primary=m.is_primary,
                sort_order=m.sort_order,
            )
            for m in sorted(ticket_type.media, key=lambda media_row: media_row.sort_order)
        ],
    )


@router.get("/", response_model=List[TicketTypeResponse])
def get_ticket_types(
    current_user: CurrentUser,
    db: SessionDep,
    is_active: Optional[bool] = None,
    ticket_type: Optional[str] = None,
    audience_type: Optional[str] = None,
):
    statement = select(CafeTicketType).where(CafeTicketType.tenant_id == current_user.tenant_id)

    if is_active is not None:
        statement = statement.where(CafeTicketType.is_active == is_active)
    if ticket_type:
        statement = statement.where(CafeTicketType.ticket_type == ticket_type)
    if audience_type:
        statement = statement.where(CafeTicketType.audience_type == audience_type)

    statement = statement.options(
        selectinload(CafeTicketType.translations),
        selectinload(CafeTicketType.media),
    ).order_by(CafeTicketType.display_order, CafeTicketType.created_at)

    ticket_types = db.exec(statement).all()
    return [_serialize_ticket_type(item) for item in ticket_types]


@router.get("/{ticket_type_id}", response_model=TicketTypeResponse)
def get_ticket_type(
    ticket_type_id: int,
    current_user: CurrentUser,
    db: SessionDep,
):
    ticket_type = _get_ticket_type_record(ticket_type_id, db)
    if not ticket_type or ticket_type.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Ticket type not found")
    return _serialize_ticket_type(ticket_type)


@router.post("/", response_model=TicketTypeResponse)
def create_ticket_type(
    ticket_type_data: TicketTypeCreate,
    current_user: CurrentUser,
    db: SessionDep,
):
    existing = db.exec(
        select(CafeTicketType).where(
            CafeTicketType.tenant_id == current_user.tenant_id,
            CafeTicketType.code == ticket_type_data.code,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ticket type code already exists")

    ticket_type = CafeTicketType(
        tenant_id=current_user.tenant_id,
        **ticket_type_data.model_dump(exclude={"translations", "media_ids"}),
    )
    db.add(ticket_type)
    db.commit()
    db.refresh(ticket_type)

    for trans in ticket_type_data.translations:
        db.add(
            CafeTicketTypeTranslation(
                ticket_type_id=ticket_type.id,
                locale=trans.locale,
                name=trans.name,
                description=trans.description,
                terms_and_conditions=trans.terms_and_conditions,
            )
        )

    if ticket_type_data.media_ids:
        for idx, media_id in enumerate(ticket_type_data.media_ids):
            db.add(
                CafeTicketTypeMedia(
                    ticket_type_id=ticket_type.id,
                    media_id=media_id,
                    sort_order=idx,
                )
            )

    db.commit()

    ticket_name = next((trans.name for trans in ticket_type_data.translations if trans.name), ticket_type.code)
    log_user_activity(
        db,
        current_user,
        ActivityType.CREATE_CATEGORY,
        f'Ticket type "{ticket_name}" created',
        resource_type="park_ticket_type",
        resource_id=ticket_type.id,
        extra_details={"title": ticket_name, "code": ticket_type.code},
    )

    created = _get_ticket_type_record(ticket_type.id, db)
    return _serialize_ticket_type(created)


@router.put("/{ticket_type_id}", response_model=TicketTypeResponse)
def update_ticket_type(
    ticket_type_id: int,
    ticket_type_data: TicketTypeUpdate,
    current_user: CurrentUser,
    db: SessionDep,
):
    ticket_type = db.get(CafeTicketType, ticket_type_id)
    if not ticket_type or ticket_type.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Ticket type not found")

    update_data = ticket_type_data.model_dump(
        exclude_unset=True,
        exclude={"translations", "media_ids"},
    )

    if "code" in update_data and update_data["code"] != ticket_type.code:
        existing = db.exec(
            select(CafeTicketType).where(
                CafeTicketType.tenant_id == current_user.tenant_id,
                CafeTicketType.code == update_data["code"],
                CafeTicketType.id != ticket_type_id,
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ticket type code already exists")

    for key, value in update_data.items():
        setattr(ticket_type, key, value)
        if key == "attributes_json":
            flag_modified(ticket_type, key)

    db.add(ticket_type)

    if ticket_type_data.translations is not None:
        for existing_trans in db.exec(
            select(CafeTicketTypeTranslation).where(CafeTicketTypeTranslation.ticket_type_id == ticket_type_id)
        ).all():
            db.delete(existing_trans)
        db.flush()

        for trans in ticket_type_data.translations:
            db.add(
                CafeTicketTypeTranslation(
                    ticket_type_id=ticket_type_id,
                    locale=trans.locale,
                    name=trans.name,
                    description=trans.description,
                    terms_and_conditions=trans.terms_and_conditions,
                )
            )

    if ticket_type_data.media_ids is not None:
        for existing_media in db.exec(
            select(CafeTicketTypeMedia).where(CafeTicketTypeMedia.ticket_type_id == ticket_type_id)
        ).all():
            db.delete(existing_media)
        db.flush()

        for idx, media_id in enumerate(ticket_type_data.media_ids):
            db.add(
                CafeTicketTypeMedia(
                    ticket_type_id=ticket_type_id,
                    media_id=media_id,
                    sort_order=idx,
                )
            )

    db.commit()

    ticket_name = next(
        (trans.name for trans in (ticket_type_data.translations or []) if trans.name),
        ticket_type.code,
    )
    log_user_activity(
        db,
        current_user,
        ActivityType.UPDATE_CATEGORY,
        f'Ticket type "{ticket_name}" updated',
        resource_type="park_ticket_type",
        resource_id=ticket_type_id,
        extra_details={"title": ticket_name, "code": ticket_type.code},
    )

    updated = _get_ticket_type_record(ticket_type_id, db)
    return _serialize_ticket_type(updated)


@router.delete("/{ticket_type_id}")
def delete_ticket_type(
    ticket_type_id: int,
    current_user: CurrentUser,
    db: SessionDep,
):
    ticket_type = db.get(CafeTicketType, ticket_type_id)
    if not ticket_type or ticket_type.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Ticket type not found")

    delete_related_rows(db, CafeTicketTypeTranslation, CafeTicketTypeTranslation.ticket_type_id == ticket_type_id)
    delete_related_rows(db, CafeTicketTypeMedia, CafeTicketTypeMedia.ticket_type_id == ticket_type_id)

    db.flush()
    db.delete(ticket_type)
    db.commit()
    return {"message": "Ticket type deleted successfully"}


@router.post("/reorder")
def reorder_ticket_types(
    ticket_type_ids: List[int],
    current_user: CurrentUser,
    db: SessionDep,
):
    ticket_types = db.exec(
        select(CafeTicketType).where(
            CafeTicketType.tenant_id == current_user.tenant_id,
            CafeTicketType.id.in_(ticket_type_ids),
        )
    ).all()

    ticket_type_map = {ticket_type.id: ticket_type for ticket_type in ticket_types}
    if len(ticket_type_map) != len(ticket_type_ids):
        raise HTTPException(status_code=404, detail="One or more ticket types not found")

    for idx, ticket_type_id in enumerate(ticket_type_ids):
        ticket_type_map[ticket_type_id].display_order = idx + 1
        db.add(ticket_type_map[ticket_type_id])

    db.commit()
    return {"message": "Ticket types reordered successfully"}

