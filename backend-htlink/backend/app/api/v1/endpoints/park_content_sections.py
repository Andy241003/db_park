"""
Restaurant Content Sections API endpoints.

Handles content sections for Home/About pages with multi-language support
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.api.deps import CurrentUser, SessionDep
from app.models.restaurant import (
    CafeContentSection,
    CafeContentSectionTranslation
)
from app.utils.delete_helpers import delete_related_rows

router = APIRouter()


# ==========================================
# Pydantic Schemas
# ==========================================

class ContentSectionTranslationSchema(BaseModel):
    """Content section translation schema"""
    locale: str
    title: str
    description: Optional[str] = None
    content: Optional[str] = None


class CafeContentSectionResponse(BaseModel):
    """Restaurant Content Section Response"""
    id: int
    tenant_id: int
    section_type: str
    page_code: str
    icon: Optional[str] = None
    image_media_id: Optional[int] = None
    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = None
    translations: List[ContentSectionTranslationSchema] = []


class CafeContentSectionCreate(BaseModel):
    """Restaurant Content Section Create"""
    section_type: str
    page_code: str
    icon: Optional[str] = None
    image_media_id: Optional[int] = None
    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = None
    translations: List[ContentSectionTranslationSchema]


class CafeContentSectionUpdate(BaseModel):
    """Restaurant Content Section Update"""
    section_type: Optional[str] = None
    page_code: Optional[str] = None
    icon: Optional[str] = None
    image_media_id: Optional[int] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    attributes_json: Optional[dict] = None
    translations: Optional[List[ContentSectionTranslationSchema]] = None


# ==========================================
# Helper Functions
# ==========================================

def get_section_with_relations(section_id: int, db: Session) -> dict:
    """Get content section with all relations"""
    statement = (
        select(CafeContentSection)
        .where(CafeContentSection.id == section_id)
        .options(selectinload(CafeContentSection.translations))
    )
    section = db.exec(statement).first()
    if not section:
        return None
    
    return {
        **section.model_dump(),
        "translations": [
            ContentSectionTranslationSchema(
                locale=t.locale,
                title=t.title,
                description=t.description,
                content=t.content
            ) for t in section.translations
        ]
    }


def build_section_response(
    section: CafeContentSection | dict,
    translations: List[ContentSectionTranslationSchema],
) -> CafeContentSectionResponse:
    payload = section if isinstance(section, dict) else {
        "id": section.id,
        "tenant_id": section.tenant_id,
        "section_type": section.section_type,
        "page_code": section.page_code,
        "icon": section.icon,
        "image_media_id": section.image_media_id,
        "is_active": section.is_active,
        "display_order": section.display_order,
        "attributes_json": section.attributes_json,
    }
    return CafeContentSectionResponse(
        id=payload["id"],
        tenant_id=payload["tenant_id"],
        section_type=payload["section_type"],
        page_code=payload["page_code"],
        icon=payload["icon"],
        image_media_id=payload["image_media_id"],
        is_active=payload["is_active"],
        display_order=payload["display_order"],
        attributes_json=payload["attributes_json"],
        translations=translations,
    )


# ==========================================
# API Endpoints
# ==========================================

@router.get("/", response_model=List[CafeContentSectionResponse])
def get_content_sections(
    current_user: CurrentUser,
    db: SessionDep,
    page_code: Optional[str] = None,
    section_type: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """Get all content sections"""
    statement = select(CafeContentSection).where(
        CafeContentSection.tenant_id == current_user.tenant_id
    )
    
    if page_code:
        statement = statement.where(CafeContentSection.page_code == page_code)
    
    if section_type:
        statement = statement.where(CafeContentSection.section_type == section_type)
    
    if is_active is not None:
        statement = statement.where(CafeContentSection.is_active == is_active)
    
    statement = statement.options(selectinload(CafeContentSection.translations))
    statement = statement.order_by(CafeContentSection.page_code, CafeContentSection.display_order)
    sections = db.exec(statement).all()

    return [
        CafeContentSectionResponse(
            id=section.id,
            tenant_id=section.tenant_id,
            section_type=section.section_type,
            page_code=section.page_code,
            icon=section.icon,
            image_media_id=section.image_media_id,
            is_active=section.is_active,
            display_order=section.display_order,
            attributes_json=section.attributes_json,
            translations=[
                ContentSectionTranslationSchema(
                    locale=t.locale,
                    title=t.title,
                    description=t.description,
                    content=t.content,
                ) for t in section.translations
            ],
        )
        for section in sections
    ]


@router.get("/{section_id}", response_model=CafeContentSectionResponse)
def get_content_section(
    section_id: int,
    current_user: CurrentUser,
    db: SessionDep
):
    """Get specific content section"""
    section = db.exec(
        select(CafeContentSection).where(CafeContentSection.id == section_id)
    ).first()
    
    if not section or section.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Content section not found")
    
    section_data = get_section_with_relations(section_id, db)
    return CafeContentSectionResponse(**section_data)


@router.post("/", response_model=CafeContentSectionResponse)
def create_content_section(
    section_data: CafeContentSectionCreate,
    current_user: CurrentUser,
    db: SessionDep
):
    """Create new content section"""
    new_section = CafeContentSection(
        tenant_id=current_user.tenant_id,
        **section_data.model_dump(exclude={'translations'})
    )
    
    db.add(new_section)
    db.flush()
    
    # Add translations
    for trans in section_data.translations:
        translation = CafeContentSectionTranslation(
            section_id=new_section.id,
            locale=trans.locale,
            title=trans.title,
            description=trans.description,
            content=trans.content
        )
        db.add(translation)

    response_payload = {
        "id": new_section.id,
        "tenant_id": new_section.tenant_id,
        "section_type": new_section.section_type,
        "page_code": new_section.page_code,
        "icon": new_section.icon,
        "image_media_id": new_section.image_media_id,
        "is_active": new_section.is_active,
        "display_order": new_section.display_order,
        "attributes_json": new_section.attributes_json,
    }
    db.commit()

    response_translations = [
        ContentSectionTranslationSchema(
            locale=trans.locale,
            title=trans.title,
            description=trans.description,
            content=trans.content,
        )
        for trans in section_data.translations
    ]
    return build_section_response(response_payload, response_translations)


@router.put("/{section_id}", response_model=CafeContentSectionResponse)
def update_content_section(
    section_id: int,
    section_data: CafeContentSectionUpdate,
    current_user: CurrentUser,
    db: SessionDep
):
    """Update content section"""
    section = db.get(CafeContentSection, section_id)
    
    if not section or section.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Content section not found")
    
    for key, value in section_data.model_dump(
        exclude_unset=True,
        exclude={'translations'}
    ).items():
        if value is not None:
            setattr(section, key, value)
            if key == 'attributes_json':
                flag_modified(section, key)
    
    db.add(section)
    
    if section_data.translations is not None:
        existing_translations = db.exec(
            select(CafeContentSectionTranslation).where(
                CafeContentSectionTranslation.section_id == section_id
            )
        ).all()

        existing_by_locale = {translation.locale: translation for translation in existing_translations}
        incoming_locales = {translation.locale for translation in section_data.translations}

        # Remove only translations that are no longer present.
        for translation in existing_translations:
            if translation.locale not in incoming_locales:
                db.delete(translation)

        # Update existing translations in place and add missing locales.
        for trans_data in section_data.translations:
            translation = existing_by_locale.get(trans_data.locale)
            if translation:
                translation.title = trans_data.title
                translation.description = trans_data.description
                translation.content = trans_data.content
                db.add(translation)
                continue

            db.add(
                CafeContentSectionTranslation(
                    section_id=section_id,
                    locale=trans_data.locale,
                    title=trans_data.title,
                    description=trans_data.description,
                    content=trans_data.content,
                )
            )
    
    response_payload = {
        "id": section.id,
        "tenant_id": section.tenant_id,
        "section_type": section.section_type,
        "page_code": section.page_code,
        "icon": section.icon,
        "image_media_id": section.image_media_id,
        "is_active": section.is_active,
        "display_order": section.display_order,
        "attributes_json": section.attributes_json,
    }
    db.commit()

    response_translations = (
        [
            ContentSectionTranslationSchema(
                locale=trans.locale,
                title=trans.title,
                description=trans.description,
                content=trans.content,
            )
            for trans in section_data.translations
        ]
        if section_data.translations is not None
        else [
            ContentSectionTranslationSchema(
                locale=translation.locale,
                title=translation.title,
                description=translation.description,
                content=translation.content,
            )
            for translation in db.exec(
                select(CafeContentSectionTranslation).where(
                    CafeContentSectionTranslation.section_id == section_id
                )
            ).all()
        ]
    )
    return build_section_response(response_payload, response_translations)


@router.delete("/{section_id}")
def delete_content_section(
    section_id: int,
    current_user: CurrentUser,
    db: SessionDep
):
    """Delete content section"""
    section = db.get(CafeContentSection, section_id)
    
    if not section or section.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Content section not found")

    delete_related_rows(db, CafeContentSectionTranslation, CafeContentSectionTranslation.section_id == section_id)
    db.flush()
    db.delete(section)
    db.commit()
    
    return {"success": True, "message": "Content section deleted"}


@router.post("/reorder")
def reorder_content_sections(
    section_ids: List[int],
    current_user: CurrentUser,
    db: SessionDep
):
    """Reorder content sections"""
    for idx, section_id in enumerate(section_ids):
        section = db.get(CafeContentSection, section_id)
        if section and section.tenant_id == current_user.tenant_id:
            section.display_order = idx
            db.add(section)
    
    db.commit()
    return {"success": True, "message": "Content sections reordered"}





