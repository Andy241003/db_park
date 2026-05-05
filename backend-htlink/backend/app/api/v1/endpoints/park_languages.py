"""
Restaurant Languages API.
Manage supported languages for Restaurant (stored in Restaurant settings JSON).
"""
from typing import List
from fastapi import APIRouter, HTTPException
from sqlmodel import select
from pydantic import BaseModel
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import SessionDep, CurrentUser
from app.models.restaurant import CafeSettings

router = APIRouter()


# ==========================================
# Request/Response Schemas
# ==========================================

class LanguageResponse(BaseModel):
    """Simple language response"""
    locale: str
    is_default: bool = False
    
    class Config:
        from_attributes = True


class LanguageCreate(BaseModel):
    """Add language request"""
    locale: str


# ==========================================
# Helper Functions
# ==========================================

def get_or_create_settings(db: SessionDep, tenant_id: int) -> CafeSettings:
    """Get existing settings or create default"""
    stmt = select(CafeSettings).where(CafeSettings.tenant_id == tenant_id).limit(1)
    settings = db.exec(stmt).first()
    
    if not settings:
        settings = CafeSettings(
            tenant_id=tenant_id,
            park_name="My Restaurant",
            primary_color="#6f4e37",
            secondary_color="#d4a574",
            background_color="#ffffff",
            settings_json={"supported_languages": ["vi", "en"]}
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


def get_supported_languages(settings: CafeSettings) -> List[str]:
    """Extract supported languages from settings_json"""
    if not settings.settings_json:
        return ["vi", "en"]
    return settings.settings_json.get("supported_languages", ["vi", "en"])


def save_supported_languages(db: SessionDep, settings: CafeSettings, languages: List[str]):
    """Save languages to settings_json"""
    if not settings.settings_json:
        settings.settings_json = {}
    
    settings.settings_json["supported_languages"] = languages
    flag_modified(settings, "settings_json")
    db.add(settings)
    db.commit()
    db.refresh(settings)


# ==========================================
# API Endpoints
# ==========================================

@router.get("/languages", response_model=List[LanguageResponse])
def get_restaurant_languages(
    *,
    db: SessionDep,
    current_user: CurrentUser
):
    """
    Get all supported languages for the Restaurant.
    Languages are stored in Restaurant settings JSON.
    """
    settings = get_or_create_settings(db, current_user.tenant_id)
    languages = get_supported_languages(settings)
    
    # Return with first language as default
    return [
        LanguageResponse(locale=lang, is_default=(i == 0))
        for i, lang in enumerate(languages)
    ]


@router.post("/languages", response_model=LanguageResponse)
def add_restaurant_language(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    language_in: LanguageCreate
):
    """
    Add a new language to the Restaurant.
    """
    settings = get_or_create_settings(db, current_user.tenant_id)
    languages = get_supported_languages(settings)
    
    # Check if language already exists
    if language_in.locale in languages:
        raise HTTPException(
            status_code=409,
            detail=f"Language '{language_in.locale}' already exists"
        )
    
    # Validate locale code (basic check)
    if not language_in.locale or len(language_in.locale) < 2:
        raise HTTPException(
            status_code=400,
            detail="Invalid locale code"
        )
    
    # Add language
    languages.append(language_in.locale)
    save_supported_languages(db, settings, languages)
    
    return LanguageResponse(
        locale=language_in.locale,
        is_default=False
    )


@router.delete("/languages/{locale}")
def remove_restaurant_language(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    locale: str
):
    """
    Remove a language from the Restaurant.
    Cannot remove if it's the only language
    """
    settings = get_or_create_settings(db, current_user.tenant_id)
    languages = get_supported_languages(settings)
    
    # Check if language exists
    if locale not in languages:
        raise HTTPException(
            status_code=404,
            detail=f"Language '{locale}' not found"
        )
    
    # Cannot remove if it's the only language
    if len(languages) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove the only language. At least one language is required."
        )
    
    # Cannot remove default (first) language
    if languages[0] == locale:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove default language. Set another language as default first."
        )
    
    # Remove language
    languages.remove(locale)
    save_supported_languages(db, settings, languages)
    
    return {"status": "success", "message": f"Language '{locale}' removed"}


@router.put("/languages/{locale}/set-default", response_model=LanguageResponse)
def set_default_restaurant_language(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    locale: str
):
    """
    Set the default Restaurant Language by moving it to the first position.
    """
    settings = get_or_create_settings(db, current_user.tenant_id)
    languages = get_supported_languages(settings)

    if locale not in languages:
        raise HTTPException(
            status_code=404,
            detail=f"Language '{locale}' not found"
        )

    reordered = [locale] + [lang for lang in languages if lang != locale]
    save_supported_languages(db, settings, reordered)

    return LanguageResponse(locale=locale, is_default=True)






