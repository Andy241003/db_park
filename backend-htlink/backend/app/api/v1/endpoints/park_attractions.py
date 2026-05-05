"""
Restaurant Attractions API endpoints.

Used by the adventure Restaurant admin to manage attractions, rides, shows,
and points of interest while reusing the current Restaurant router namespace.
"""
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from sqlmodel import Session, select

from app.api.deps import CurrentUser, SessionDep
from app.models.activity_log import ActivityType
from app.models.restaurant import (
    CafeAttraction,
    CafeAttractionMedia,
    CafeAttractionTranslation,
    ParkAttractionCategory,
    ParkAttractionCategoryTranslation,
)
from app.utils.activity_logger import log_user_activity
from app.utils.delete_helpers import delete_related_rows

router = APIRouter()


class AttractionTranslationSchema(BaseModel):
    locale: str
    name: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    safety_notes: Optional[str] = None
    experience_notes: Optional[str] = None


class AttractionMediaSchema(BaseModel):
    media_id: int
    is_primary: bool = False
    sort_order: int = 0


class AttractionCategoryTranslationSchema(BaseModel):
    locale: str
    title: str
    description: Optional[str] = None


class AttractionCategoryResponse(BaseModel):
    id: int
    code: str
    is_active: bool = True
    display_order: int = 0
    translations: List[AttractionCategoryTranslationSchema] = []


class AttractionCategoryCreate(BaseModel):
    code: str
    is_active: bool = True
    display_order: int = 0
    translations: List[AttractionCategoryTranslationSchema]


class AttractionCategoryUpdate(BaseModel):
    code: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    translations: Optional[List[AttractionCategoryTranslationSchema]] = None


class AttractionResponse(BaseModel):
    id: int
    tenant_id: int
    space_id: Optional[int] = None
    category_id: Optional[int] = None
    code: str
    attraction_type: str
    experience_type: Optional[str] = None
    thrill_level: Optional[str] = None
    min_height_cm: Optional[int] = None
    max_height_cm: Optional[int] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    duration_minutes: Optional[int] = None
    operating_hours: Optional[str] = None
    queue_notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    vr360_link: Optional[str] = None
    primary_image_media_id: Optional[int] = None
    is_active: bool = True
    is_featured: bool = False
    display_order: int = 0
    attributes_json: Optional[Any] = None
    translations: List[AttractionTranslationSchema] = []
    media: List[AttractionMediaSchema] = []


class AttractionCreate(BaseModel):
    space_id: Optional[int] = None
    category_id: Optional[int] = None
    code: str
    attraction_type: str
    experience_type: Optional[str] = None
    thrill_level: Optional[str] = None
    min_height_cm: Optional[int] = None
    max_height_cm: Optional[int] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    duration_minutes: Optional[int] = None
    operating_hours: Optional[str] = None
    queue_notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    vr360_link: Optional[str] = None
    primary_image_media_id: Optional[int] = None
    is_active: bool = True
    is_featured: bool = False
    display_order: int = 0
    attributes_json: Optional[Any] = None
    translations: List[AttractionTranslationSchema]
    media_ids: Optional[List[int]] = None


class AttractionUpdate(BaseModel):
    space_id: Optional[int] = None
    category_id: Optional[int] = None
    code: Optional[str] = None
    attraction_type: Optional[str] = None
    experience_type: Optional[str] = None
    thrill_level: Optional[str] = None
    min_height_cm: Optional[int] = None
    max_height_cm: Optional[int] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    duration_minutes: Optional[int] = None
    operating_hours: Optional[str] = None
    queue_notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    vr360_link: Optional[str] = None
    primary_image_media_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None
    attributes_json: Optional[Any] = None
    translations: Optional[List[AttractionTranslationSchema]] = None
    media_ids: Optional[List[int]] = None


def _get_attraction_record(attraction_id: int, db: Session) -> Optional[CafeAttraction]:
    statement = (
        select(CafeAttraction)
        .where(CafeAttraction.id == attraction_id)
        .options(
            selectinload(CafeAttraction.translations),
            selectinload(CafeAttraction.media),
        )
    )
    return db.exec(statement).first()


def _serialize_attraction(attraction: CafeAttraction) -> AttractionResponse:
    return AttractionResponse(
        **attraction.model_dump(),
        translations=[
            AttractionTranslationSchema(
                locale=t.locale,
                name=t.name,
                short_description=t.short_description,
                description=t.description,
                safety_notes=t.safety_notes,
                experience_notes=t.experience_notes,
            )
            for t in attraction.translations
        ],
        media=[
            AttractionMediaSchema(
                media_id=m.media_id,
                is_primary=m.is_primary,
                sort_order=m.sort_order,
            )
            for m in sorted(attraction.media, key=lambda media_row: media_row.sort_order)
        ],
    )


def _ensure_unique_locales(translations: List[BaseModel], entity_name: str) -> None:
    locales = [translation.locale for translation in translations]
    duplicate_locales = sorted({locale for locale in locales if locales.count(locale) > 1})
    if duplicate_locales:
        duplicate_text = ", ".join(duplicate_locales)
        raise HTTPException(
            status_code=400,
            detail=f"Duplicate translation locales for {entity_name}: {duplicate_text}",
        )


def _get_category_with_translations(category_id: int, db: Session) -> dict:
    category = db.get(ParkAttractionCategory, category_id)
    if not category:
        return None

    translations = db.exec(
        select(ParkAttractionCategoryTranslation).where(
            ParkAttractionCategoryTranslation.category_id == category_id
        )
    ).all()

    return {
        **category.model_dump(),
        "translations": [
            AttractionCategoryTranslationSchema(
                locale=t.locale,
                title=t.title,
                description=t.description,
            ) for t in translations
        ],
    }


def _serialize_category(category: ParkAttractionCategory) -> AttractionCategoryResponse:
    return AttractionCategoryResponse(
        id=category.id,
        code=category.code,
        is_active=category.is_active,
        display_order=category.display_order,
        translations=[
            AttractionCategoryTranslationSchema(
                locale=t.locale,
                title=t.title,
                description=t.description,
            ) for t in category.translations
        ],
    )


@router.get("/categories", response_model=List[AttractionCategoryResponse])
def get_categories(
    current_user: CurrentUser,
    db: SessionDep,
    is_active: Optional[bool] = None,
):
    statement = select(ParkAttractionCategory).where(ParkAttractionCategory.tenant_id == current_user.tenant_id)
    if is_active is not None:
        statement = statement.where(ParkAttractionCategory.is_active == is_active)
    statement = statement.options(selectinload(ParkAttractionCategory.translations)).order_by(ParkAttractionCategory.display_order)
    categories = db.exec(statement).all()

    return [_serialize_category(category) for category in categories]


@router.get("/categories/{category_id}", response_model=AttractionCategoryResponse)
def get_category(
    category_id: int,
    current_user: CurrentUser,
    db: SessionDep,
):
    category = db.get(ParkAttractionCategory, category_id)
    if not category or category.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Category not found")
    return _serialize_category(category)


@router.post("/categories", response_model=AttractionCategoryResponse)
def create_category(
    category_data: AttractionCategoryCreate,
    current_user: CurrentUser,
    db: SessionDep,
):
    _ensure_unique_locales(category_data.translations, "category")

    existing = db.exec(
        select(ParkAttractionCategory).where(
            ParkAttractionCategory.tenant_id == current_user.tenant_id,
            ParkAttractionCategory.code == category_data.code,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category code already exists")

    category = ParkAttractionCategory(
        tenant_id=current_user.tenant_id,
        code=category_data.code,
        is_active=category_data.is_active,
        display_order=category_data.display_order,
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    for trans in category_data.translations:
        db.add(
            ParkAttractionCategoryTranslation(
                category_id=category.id,
                locale=trans.locale,
                title=trans.title,
                description=trans.description,
            )
        )

    db.commit()

    category_title = next((trans.title for trans in category_data.translations if trans.title), category_data.code)
    log_user_activity(
        db,
        current_user,
        ActivityType.CREATE_CATEGORY,
        f'Attraction category "{category_title}" created',
        resource_type="park_attraction_category",
        resource_id=category.id,
        extra_details={"title": category_title, "code": category.code},
    )

    created = _get_category_with_translations(category.id, db)
    return AttractionCategoryResponse(**created)


@router.put("/categories/{category_id}", response_model=AttractionCategoryResponse)
def update_category(
    category_id: int,
    category_data: AttractionCategoryUpdate,
    current_user: CurrentUser,
    db: SessionDep,
):
    category = db.get(ParkAttractionCategory, category_id)
    if not category or category.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Category not found")

    for key, value in category_data.model_dump(exclude_unset=True, exclude={"translations"}).items():
        if value is not None:
            setattr(category, key, value)

    db.add(category)

    if category_data.translations is not None:
        _ensure_unique_locales(category_data.translations, "category")
        for existing_trans in db.exec(
            select(ParkAttractionCategoryTranslation).where(
                ParkAttractionCategoryTranslation.category_id == category_id
            )
        ).all():
            db.delete(existing_trans)
        db.flush()

        for trans in category_data.translations:
            db.add(
                ParkAttractionCategoryTranslation(
                    category_id=category_id,
                    locale=trans.locale,
                    title=trans.title,
                    description=trans.description,
                )
            )

    db.commit()

    category_title = next(
        (trans.title for trans in (category_data.translations or []) if trans.title),
        category.code,
    )
    log_user_activity(
        db,
        current_user,
        ActivityType.UPDATE_CATEGORY,
        f'Attraction category "{category_title}" updated',
        resource_type="park_attraction_category",
        resource_id=category_id,
        extra_details={"title": category_title, "code": category.code},
    )

    updated = _get_category_with_translations(category_id, db)
    return AttractionCategoryResponse(**updated)


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    current_user: CurrentUser,
    db: SessionDep,
):
    category = db.get(ParkAttractionCategory, category_id)
    if not category or category.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Category not found")

    items = db.exec(
        select(CafeAttraction).where(CafeAttraction.category_id == category_id)
    ).all()
    if items:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category with attractions. Please move or delete attractions first.",
        )

    for translation in db.exec(
        select(ParkAttractionCategoryTranslation).where(
            ParkAttractionCategoryTranslation.category_id == category_id
        )
    ).all():
        db.delete(translation)

    db.flush()
    db.delete(category)
    db.commit()

    log_user_activity(
        db,
        current_user,
        ActivityType.DELETE_CATEGORY,
        f'Attraction category "{category.code}" deleted',
        resource_type="park_attraction_category",
        resource_id=category_id,
        extra_details={"title": category.code, "code": category.code},
    )

    return {"message": "Category deleted successfully"}


@router.get("/", response_model=List[AttractionResponse])
def get_attractions(
    current_user: CurrentUser,
    db: SessionDep,
    is_active: Optional[bool] = None,
    attraction_type: Optional[str] = None,
    space_id: Optional[int] = None,
):
    statement = select(CafeAttraction).where(CafeAttraction.tenant_id == current_user.tenant_id)

    if is_active is not None:
        statement = statement.where(CafeAttraction.is_active == is_active)
    if attraction_type:
        statement = statement.where(CafeAttraction.attraction_type == attraction_type)
    if space_id is not None:
        statement = statement.where(CafeAttraction.space_id == space_id)

    statement = statement.options(
        selectinload(CafeAttraction.translations),
        selectinload(CafeAttraction.media),
    ).order_by(CafeAttraction.display_order, CafeAttraction.created_at)

    attractions = db.exec(statement).all()
    return [_serialize_attraction(attraction) for attraction in attractions]


@router.get("/{attraction_id}", response_model=AttractionResponse)
def get_attraction(
    attraction_id: int,
    current_user: CurrentUser,
    db: SessionDep,
):
    attraction = _get_attraction_record(attraction_id, db)
    if not attraction or attraction.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Attraction not found")
    return _serialize_attraction(attraction)


@router.post("/", response_model=AttractionResponse)
def create_attraction(
    attraction_data: AttractionCreate,
    current_user: CurrentUser,
    db: SessionDep,
):
    existing = db.exec(
        select(CafeAttraction).where(
            CafeAttraction.tenant_id == current_user.tenant_id,
            CafeAttraction.code == attraction_data.code,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Attraction code already exists")

    attraction = CafeAttraction(
        tenant_id=current_user.tenant_id,
        **attraction_data.model_dump(exclude={"translations", "media_ids"}),
    )
    db.add(attraction)
    db.commit()
    db.refresh(attraction)

    for trans in attraction_data.translations:
        db.add(
            CafeAttractionTranslation(
                attraction_id=attraction.id,
                locale=trans.locale,
                name=trans.name,
                short_description=trans.short_description,
                description=trans.description,
                safety_notes=trans.safety_notes,
                experience_notes=trans.experience_notes,
            )
        )

    if attraction_data.media_ids:
        for idx, media_id in enumerate(attraction_data.media_ids):
            db.add(
                CafeAttractionMedia(
                    attraction_id=attraction.id,
                    media_id=media_id,
                    sort_order=idx,
                )
            )

    db.commit()

    attraction_name = next((trans.name for trans in attraction_data.translations if trans.name), attraction.code)
    log_user_activity(
        db,
        current_user,
        ActivityType.CREATE_PROPERTY,
        f'Attraction "{attraction_name}" created',
        resource_type="restaurant_attraction",
        resource_id=attraction.id,
        extra_details={"title": attraction_name, "code": attraction.code},
    )

    created = _get_attraction_record(attraction.id, db)
    return _serialize_attraction(created)


@router.put("/{attraction_id}", response_model=AttractionResponse)
def update_attraction(
    attraction_id: int,
    attraction_data: AttractionUpdate,
    current_user: CurrentUser,
    db: SessionDep,
):
    attraction = db.get(CafeAttraction, attraction_id)
    if not attraction or attraction.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Attraction not found")

    update_data = attraction_data.model_dump(
        exclude_unset=True,
        exclude={"translations", "media_ids"},
    )

    if "code" in update_data and update_data["code"] != attraction.code:
        existing = db.exec(
            select(CafeAttraction).where(
                CafeAttraction.tenant_id == current_user.tenant_id,
                CafeAttraction.code == update_data["code"],
                CafeAttraction.id != attraction_id,
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Attraction code already exists")

    for key, value in update_data.items():
        setattr(attraction, key, value)
        if key == "attributes_json":
            flag_modified(attraction, key)

    db.add(attraction)

    if attraction_data.translations is not None:
        for existing_trans in db.exec(
            select(CafeAttractionTranslation).where(CafeAttractionTranslation.attraction_id == attraction_id)
        ).all():
            db.delete(existing_trans)
        db.flush()

        for trans in attraction_data.translations:
            db.add(
                CafeAttractionTranslation(
                    attraction_id=attraction_id,
                    locale=trans.locale,
                    name=trans.name,
                    short_description=trans.short_description,
                    description=trans.description,
                    safety_notes=trans.safety_notes,
                    experience_notes=trans.experience_notes,
                )
            )

    if attraction_data.media_ids is not None:
        for existing_media in db.exec(
            select(CafeAttractionMedia).where(CafeAttractionMedia.attraction_id == attraction_id)
        ).all():
            db.delete(existing_media)
        db.flush()

        for idx, media_id in enumerate(attraction_data.media_ids):
            db.add(
                CafeAttractionMedia(
                    attraction_id=attraction_id,
                    media_id=media_id,
                    sort_order=idx,
                )
            )

    db.commit()

    attraction_name = next(
        (trans.name for trans in (attraction_data.translations or []) if trans.name),
        attraction.code,
    )
    log_user_activity(
        db,
        current_user,
        ActivityType.UPDATE_PROPERTY,
        f'Attraction "{attraction_name}" updated',
        resource_type="restaurant_attraction",
        resource_id=attraction_id,
        extra_details={"title": attraction_name, "code": attraction.code},
    )

    updated = _get_attraction_record(attraction_id, db)
    return _serialize_attraction(updated)


@router.delete("/{attraction_id}")
def delete_attraction(
    attraction_id: int,
    current_user: CurrentUser,
    db: SessionDep,
):
    attraction = db.get(CafeAttraction, attraction_id)
    if not attraction or attraction.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Attraction not found")

    delete_related_rows(db, CafeAttractionTranslation, CafeAttractionTranslation.attraction_id == attraction_id)
    delete_related_rows(db, CafeAttractionMedia, CafeAttractionMedia.attraction_id == attraction_id)

    db.flush()
    db.delete(attraction)
    db.commit()
    return {"message": "Attraction deleted successfully"}


@router.post("/reorder")
def reorder_attractions(
    attraction_ids: List[int],
    current_user: CurrentUser,
    db: SessionDep,
):
    attractions = db.exec(
        select(CafeAttraction).where(
            CafeAttraction.tenant_id == current_user.tenant_id,
            CafeAttraction.id.in_(attraction_ids),
        )
    ).all()

    attraction_map = {attraction.id: attraction for attraction in attractions}
    if len(attraction_map) != len(attraction_ids):
        raise HTTPException(status_code=404, detail="One or more attractions not found")

    for idx, attraction_id in enumerate(attraction_ids):
        attraction_map[attraction_id].display_order = idx + 1
        db.add(attraction_map[attraction_id])

    db.commit()
    return {"message": "Attractions reordered successfully"}

