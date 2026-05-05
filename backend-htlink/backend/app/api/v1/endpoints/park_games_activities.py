"""
Park Games & Activities API.

This module mirrors the event editing flow but persists to dedicated
games/activities tables instead of park_events.
"""
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from sqlmodel import Session, select

from app.api.deps import CurrentUser, SessionDep
from app.models.activity_log import ActivityType
from app.models.restaurant import (
    CafeGameActivity,
    CafeGameActivityMedia,
    CafeGameActivityTranslation,
)
from app.utils.activity_logger import log_user_activity
from app.utils.delete_helpers import delete_related_rows

router = APIRouter()


class GameActivityTranslationSchema(BaseModel):
    locale: str
    title: str
    description: Optional[str] = None
    details: Optional[str] = None


class GameActivityMediaSchema(BaseModel):
    media_id: int
    is_primary: bool = False
    sort_order: int = 0


class GameActivityResponse(BaseModel):
    id: int
    tenant_id: int
    code: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    branch_id: Optional[int] = None
    space_id: Optional[int] = None
    location_text: Optional[str] = None
    registration_url: Optional[str] = None
    max_participants: Optional[int] = None
    primary_image_media_id: Optional[int] = None
    status: str = "upcoming"
    is_featured: bool = False
    display_order: int = 0
    attributes_json: Optional[dict] = None
    translations: List[GameActivityTranslationSchema] = []
    media: List[GameActivityMediaSchema] = []


class GameActivityCreate(BaseModel):
    code: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    branch_id: Optional[int] = None
    space_id: Optional[int] = None
    location_text: Optional[str] = None
    registration_url: Optional[str] = None
    max_participants: Optional[int] = None
    primary_image_media_id: Optional[int] = None
    status: str = "upcoming"
    is_featured: bool = False
    display_order: int = 0
    attributes_json: Optional[dict] = None
    translations: List[GameActivityTranslationSchema]
    media_ids: Optional[List[int]] = None


class GameActivityUpdate(BaseModel):
    code: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    branch_id: Optional[int] = None
    space_id: Optional[int] = None
    location_text: Optional[str] = None
    registration_url: Optional[str] = None
    max_participants: Optional[int] = None
    primary_image_media_id: Optional[int] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None
    attributes_json: Optional[dict] = None
    translations: Optional[List[GameActivityTranslationSchema]] = None
    media_ids: Optional[List[int]] = None


def _get_game_activity_with_relations(game_activity_id: int, db: Session) -> Optional[dict]:
    statement = (
        select(CafeGameActivity)
        .where(CafeGameActivity.id == game_activity_id)
        .options(
            selectinload(CafeGameActivity.translations),
            selectinload(CafeGameActivity.media),
        )
    )
    item = db.exec(statement).first()
    if not item:
        return None

    return {
        **item.model_dump(),
        "branch_id": item.location_id,
        "translations": [
            GameActivityTranslationSchema(
                locale=translation.locale,
                title=translation.title,
                description=translation.description,
                details=translation.details,
            )
            for translation in item.translations
        ],
        "media": [
            GameActivityMediaSchema(
                media_id=media.media_id,
                is_primary=media.is_primary,
                sort_order=media.sort_order,
            )
            for media in sorted(item.media, key=lambda media_row: media_row.sort_order)
        ],
    }


@router.get("/", response_model=List[GameActivityResponse])
def get_game_activities(
    current_user: CurrentUser,
    db: SessionDep,
    status: Optional[str] = None,
    is_featured: Optional[bool] = None,
):
    statement = select(CafeGameActivity).where(CafeGameActivity.tenant_id == current_user.tenant_id)

    if status:
        statement = statement.where(CafeGameActivity.status == status)
    if is_featured is not None:
        statement = statement.where(CafeGameActivity.is_featured == is_featured)

    statement = statement.options(
        selectinload(CafeGameActivity.translations),
        selectinload(CafeGameActivity.media),
    ).order_by(CafeGameActivity.start_date.desc(), CafeGameActivity.display_order)

    items = db.exec(statement).all()
    return [GameActivityResponse(**_get_game_activity_with_relations(item.id, db)) for item in items]


@router.get("/{game_activity_id}", response_model=GameActivityResponse)
def get_game_activity(
    game_activity_id: int,
    current_user: CurrentUser,
    db: SessionDep,
):
    item = db.get(CafeGameActivity, game_activity_id)
    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Game/activity not found")

    item_data = _get_game_activity_with_relations(game_activity_id, db)
    return GameActivityResponse(**item_data)


@router.post("/", response_model=GameActivityResponse)
def create_game_activity(
    game_activity_data: GameActivityCreate,
    current_user: CurrentUser,
    db: SessionDep,
):
    existing = db.exec(
        select(CafeGameActivity).where(
            CafeGameActivity.tenant_id == current_user.tenant_id,
            CafeGameActivity.code == game_activity_data.code,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Game/activity code already exists")

    payload = game_activity_data.model_dump(exclude={"translations", "media_ids"})
    payload["location_id"] = payload.pop("branch_id", None)
    item = CafeGameActivity(tenant_id=current_user.tenant_id, **payload)
    db.add(item)
    db.commit()
    db.refresh(item)

    for translation in game_activity_data.translations:
        db.add(
            CafeGameActivityTranslation(
                game_activity_id=item.id,
                locale=translation.locale,
                title=translation.title,
                description=translation.description,
                details=translation.details,
            )
        )

    if game_activity_data.media_ids:
        for idx, media_id in enumerate(game_activity_data.media_ids):
            db.add(
                CafeGameActivityMedia(
                    game_activity_id=item.id,
                    media_id=media_id,
                    is_primary=media_id == game_activity_data.primary_image_media_id,
                    sort_order=idx,
                )
            )

    db.commit()

    title = next((translation.title for translation in game_activity_data.translations if translation.title), item.code)
    log_user_activity(
        db,
        current_user,
        ActivityType.CREATE_POST,
        f'Game/activity "{title}" created',
        resource_type="park_game_activity",
        resource_id=item.id,
        extra_details={"title": title, "code": item.code},
    )

    item_data = _get_game_activity_with_relations(item.id, db)
    return GameActivityResponse(**item_data)


@router.put("/{game_activity_id}", response_model=GameActivityResponse)
def update_game_activity(
    game_activity_id: int,
    game_activity_data: GameActivityUpdate,
    current_user: CurrentUser,
    db: SessionDep,
):
    item = db.get(CafeGameActivity, game_activity_id)
    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Game/activity not found")

    update_data = game_activity_data.model_dump(
        exclude_unset=True,
        exclude={"translations", "media_ids"},
    )
    if "branch_id" in update_data:
        update_data["location_id"] = update_data.pop("branch_id")

    for key, value in update_data.items():
        if value is not None:
            setattr(item, key, value)
            if key == "attributes_json":
                flag_modified(item, key)

    db.add(item)

    if game_activity_data.translations is not None:
        delete_related_rows(
            db,
            CafeGameActivityTranslation,
            CafeGameActivityTranslation.game_activity_id == game_activity_id,
        )
        db.flush()
        for translation in game_activity_data.translations:
            db.add(
                CafeGameActivityTranslation(
                    game_activity_id=game_activity_id,
                    locale=translation.locale,
                    title=translation.title,
                    description=translation.description,
                    details=translation.details,
                )
            )

    if game_activity_data.media_ids is not None:
        delete_related_rows(
            db,
            CafeGameActivityMedia,
            CafeGameActivityMedia.game_activity_id == game_activity_id,
        )
        db.flush()
        for idx, media_id in enumerate(game_activity_data.media_ids):
            db.add(
                CafeGameActivityMedia(
                    game_activity_id=game_activity_id,
                    media_id=media_id,
                    is_primary=media_id == game_activity_data.primary_image_media_id,
                    sort_order=idx,
                )
            )

    db.commit()

    title = next(
        (translation.title for translation in (game_activity_data.translations or []) if translation.title),
        item.code,
    )
    log_user_activity(
        db,
        current_user,
        ActivityType.UPDATE_POST,
        f'Game/activity "{title}" updated',
        resource_type="park_game_activity",
        resource_id=game_activity_id,
        extra_details={"title": title, "code": item.code},
    )

    item_data = _get_game_activity_with_relations(game_activity_id, db)
    return GameActivityResponse(**item_data)


@router.delete("/{game_activity_id}")
def delete_game_activity(
    game_activity_id: int,
    current_user: CurrentUser,
    db: SessionDep,
):
    item = db.get(CafeGameActivity, game_activity_id)
    if not item or item.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Game/activity not found")

    delete_related_rows(db, CafeGameActivityTranslation, CafeGameActivityTranslation.game_activity_id == game_activity_id)
    delete_related_rows(db, CafeGameActivityMedia, CafeGameActivityMedia.game_activity_id == game_activity_id)

    db.flush()
    db.delete(item)
    db.commit()
    return {"success": True, "message": "Game/activity deleted"}
