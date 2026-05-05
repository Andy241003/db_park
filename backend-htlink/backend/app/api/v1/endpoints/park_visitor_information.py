from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models.restaurant import (
    RestaurantVisitorInfoCategory,
    RestaurantVisitorInfoCategoryTranslation,
    RestaurantVisitorInfoItem,
    RestaurantVisitorInfoItemTranslation,
)
from app.utils.delete_helpers import delete_related_rows

router = APIRouter()


class VisitorInfoCategoryTranslationSchema(BaseModel):
    locale: str
    title: str
    description: Optional[str] = None


class VisitorInfoItemTranslationSchema(BaseModel):
    locale: str
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None


class VisitorInfoItemSchema(BaseModel):
    id: int
    item_type: str
    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    translations: List[VisitorInfoItemTranslationSchema] = []


class VisitorInfoCategoryResponse(BaseModel):
    id: int
    page_code: str
    category_code: str
    title: str
    icon: Optional[str] = None
    item_layout: Optional[str] = None
    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = None
    translations: List[VisitorInfoCategoryTranslationSchema] = []
    items: List[VisitorInfoItemSchema] = []


class VisitorInfoCategoryCreate(BaseModel):
    category_code: str
    title: Optional[str] = None
    icon: Optional[str] = None
    item_layout: Optional[str] = None
    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = None
    translations: Optional[List[VisitorInfoCategoryTranslationSchema]] = None


class VisitorInfoCategoryUpdate(BaseModel):
    category_code: Optional[str] = None
    title: Optional[str] = None
    icon: Optional[str] = None
    item_layout: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    attributes_json: Optional[dict] = None
    translations: Optional[List[VisitorInfoCategoryTranslationSchema]] = None


class VisitorInfoItemCreate(BaseModel):
    item_type: str = "text"
    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = None
    translations: List[VisitorInfoItemTranslationSchema]


class VisitorInfoItemUpdate(BaseModel):
    item_type: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    attributes_json: Optional[dict] = None
    translations: Optional[List[VisitorInfoItemTranslationSchema]] = None


def _pick_category_title(category: RestaurantVisitorInfoCategory) -> str:
    for preferred_locale in ("en", "vi"):
        translation = next((entry for entry in category.translations if entry.locale == preferred_locale), None)
        if translation and translation.title:
            return translation.title
    if category.translations:
        return category.translations[0].title
    return category.title


def _serialize_category(category: RestaurantVisitorInfoCategory) -> VisitorInfoCategoryResponse:
    items = sorted(category.items, key=lambda item: (item.display_order, item.id or 0))
    return VisitorInfoCategoryResponse(
        id=category.id,
        page_code=category.page_code,
        category_code=category.category_code,
        title=_pick_category_title(category),
        icon=category.icon,
        item_layout=category.item_layout,
        is_active=category.is_active,
        display_order=category.display_order,
        attributes_json=category.attributes_json,
        translations=[
            VisitorInfoCategoryTranslationSchema(
                locale=translation.locale,
                title=translation.title,
                description=translation.description,
            )
            for translation in category.translations
        ],
        items=[
            VisitorInfoItemSchema(
                id=item.id,
                item_type=item.item_type,
                is_active=item.is_active,
                display_order=item.display_order,
                attributes_json=item.attributes_json,
                created_at=item.created_at.isoformat() if item.created_at else None,
                updated_at=item.updated_at.isoformat() if item.updated_at else None,
                translations=[
                    VisitorInfoItemTranslationSchema(
                        locale=translation.locale,
                        title=translation.title,
                        subtitle=translation.subtitle,
                        description=translation.description,
                        content=translation.content,
                    )
                    for translation in item.translations
                ],
            )
            for item in items
        ],
    )


@router.get("/categories", response_model=List[VisitorInfoCategoryResponse])
def get_categories(current_user: CurrentUser, db: SessionDep):
    statement = (
        select(RestaurantVisitorInfoCategory)
        .where(RestaurantVisitorInfoCategory.tenant_id == current_user.tenant_id)
        .options(
            selectinload(RestaurantVisitorInfoCategory.translations),
            selectinload(RestaurantVisitorInfoCategory.items).selectinload(RestaurantVisitorInfoItem.translations),
        )
        .order_by(RestaurantVisitorInfoCategory.display_order, RestaurantVisitorInfoCategory.id)
    )
    categories = db.exec(statement).all()
    return [_serialize_category(category) for category in categories]


@router.post("/categories", response_model=VisitorInfoCategoryResponse)
def create_category(payload: VisitorInfoCategoryCreate, current_user: CurrentUser, db: SessionDep):
    translations = payload.translations or []
    if not translations and not payload.title:
        raise HTTPException(status_code=400, detail="Category title or translations are required")

    existing = db.exec(
        select(RestaurantVisitorInfoCategory).where(
            RestaurantVisitorInfoCategory.tenant_id == current_user.tenant_id,
            RestaurantVisitorInfoCategory.page_code == "visitor_info",
            RestaurantVisitorInfoCategory.category_code == payload.category_code,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category code already exists")

    category = RestaurantVisitorInfoCategory(
        tenant_id=current_user.tenant_id,
        page_code="visitor_info",
        category_code=payload.category_code,
        title=payload.title or translations[0].title,
        icon=payload.icon,
        item_layout=payload.item_layout,
        is_active=payload.is_active,
        display_order=payload.display_order,
        attributes_json=payload.attributes_json,
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    for translation in translations:
        db.add(
            RestaurantVisitorInfoCategoryTranslation(
                category_id=category.id,
                locale=translation.locale,
                title=translation.title,
                description=translation.description,
            )
        )
    db.commit()

    category = db.exec(
        select(RestaurantVisitorInfoCategory)
        .where(RestaurantVisitorInfoCategory.id == category.id)
        .options(
            selectinload(RestaurantVisitorInfoCategory.translations),
            selectinload(RestaurantVisitorInfoCategory.items).selectinload(RestaurantVisitorInfoItem.translations),
        )
    ).first()
    return _serialize_category(category)


@router.put("/categories/{category_id}", response_model=VisitorInfoCategoryResponse)
def update_category(category_id: int, payload: VisitorInfoCategoryUpdate, current_user: CurrentUser, db: SessionDep):
    category = db.get(RestaurantVisitorInfoCategory, category_id)
    if not category or category.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = payload.model_dump(exclude_unset=True, exclude={"translations"})
    for key, value in update_data.items():
        setattr(category, key, value)

    if payload.translations is not None:
        existing_translations = db.exec(
            select(RestaurantVisitorInfoCategoryTranslation).where(RestaurantVisitorInfoCategoryTranslation.category_id == category_id)
        ).all()
        for translation in existing_translations:
            db.delete(translation)
        db.flush()

        for translation in payload.translations:
            db.add(
                RestaurantVisitorInfoCategoryTranslation(
                    category_id=category_id,
                    locale=translation.locale,
                    title=translation.title,
                    description=translation.description,
                )
            )
        if payload.translations:
            category.title = payload.translations[0].title

    db.add(category)
    db.commit()
    db.refresh(category)
    category = db.exec(
        select(RestaurantVisitorInfoCategory)
        .where(RestaurantVisitorInfoCategory.id == category_id)
        .options(
            selectinload(RestaurantVisitorInfoCategory.translations),
            selectinload(RestaurantVisitorInfoCategory.items).selectinload(RestaurantVisitorInfoItem.translations),
        )
    ).first()
    return _serialize_category(category)


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, current_user: CurrentUser, db: SessionDep):
    category = db.get(RestaurantVisitorInfoCategory, category_id)
    if not category or category.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return {"ok": True}


@router.post("/categories/{category_id}/items", response_model=VisitorInfoCategoryResponse)
def create_item(category_id: int, payload: VisitorInfoItemCreate, current_user: CurrentUser, db: SessionDep):
    category = db.get(RestaurantVisitorInfoCategory, category_id)
    if not category or category.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Category not found")

    item = RestaurantVisitorInfoItem(
        category_id=category_id,
        item_type=payload.item_type,
        is_active=payload.is_active,
        display_order=payload.display_order,
        attributes_json=payload.attributes_json,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    for translation in payload.translations:
        db.add(
            RestaurantVisitorInfoItemTranslation(
                item_id=item.id,
                locale=translation.locale,
                title=translation.title,
                subtitle=translation.subtitle,
                description=translation.description,
                content=translation.content,
            )
        )
    db.commit()

    category = db.exec(
        select(RestaurantVisitorInfoCategory)
        .where(RestaurantVisitorInfoCategory.id == category_id)
        .options(
            selectinload(RestaurantVisitorInfoCategory.translations),
            selectinload(RestaurantVisitorInfoCategory.items).selectinload(RestaurantVisitorInfoItem.translations),
        )
    ).first()
    return _serialize_category(category)


@router.put("/items/{item_id}", response_model=VisitorInfoCategoryResponse)
def update_item(item_id: int, payload: VisitorInfoItemUpdate, current_user: CurrentUser, db: SessionDep):
    item = db.get(RestaurantVisitorInfoItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    category = db.get(RestaurantVisitorInfoCategory, item.category_id)
    if not category or category.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = payload.model_dump(exclude_unset=True, exclude={"translations"})
    for key, value in update_data.items():
        setattr(item, key, value)
    db.add(item)

    if payload.translations is not None:
        existing = db.exec(select(RestaurantVisitorInfoItemTranslation).where(RestaurantVisitorInfoItemTranslation.item_id == item_id)).all()
        for translation in existing:
            db.delete(translation)
        db.flush()
        for translation in payload.translations:
            db.add(
                RestaurantVisitorInfoItemTranslation(
                    item_id=item_id,
                    locale=translation.locale,
                    title=translation.title,
                    subtitle=translation.subtitle,
                    description=translation.description,
                    content=translation.content,
                )
            )

    db.commit()
    category = db.exec(
        select(RestaurantVisitorInfoCategory)
        .where(RestaurantVisitorInfoCategory.id == item.category_id)
        .options(
            selectinload(RestaurantVisitorInfoCategory.translations),
            selectinload(RestaurantVisitorInfoCategory.items).selectinload(RestaurantVisitorInfoItem.translations),
        )
    ).first()
    return _serialize_category(category)


@router.delete("/items/{item_id}")
def delete_item(item_id: int, current_user: CurrentUser, db: SessionDep):
    item = db.get(RestaurantVisitorInfoItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    category = db.get(RestaurantVisitorInfoCategory, item.category_id)
    if not category or category.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Category not found")

    delete_related_rows(db, RestaurantVisitorInfoItemTranslation, RestaurantVisitorInfoItemTranslation.item_id == item_id)

    db.flush()
    db.delete(item)
    db.commit()
    return {"ok": True}

