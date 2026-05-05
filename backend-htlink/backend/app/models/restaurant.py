"""
Restaurant Management System Models

Database models for restaurant management including:
- Settings and branding
- Branches
- Menu (categories and items)
- Events
- Careers
- Promotions
"""
from datetime import datetime, date
from typing import Optional, List
from enum import Enum
from sqlmodel import Field, SQLModel, JSON, Column, Relationship
from sqlalchemy import Index


# ==========================================
# Enums
# ==========================================

class MenuItemStatus(str, Enum):
    """Menu item availability status"""
    AVAILABLE = "available"
    SOLD_OUT = "sold_out"
    SEASONAL = "seasonal"
    DISCONTINUED = "discontinued"


class EventStatus(str, Enum):
    """Event status"""
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CareerStatus(str, Enum):
    """Career/job posting status"""
    OPEN = "open"
    CLOSED = "closed"
    ON_HOLD = "on_hold"


class PromotionType(str, Enum):
    """Promotion discount type"""
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    BUY_ONE_GET_ONE = "buy_one_get_one"
    GIFT = "gift"


# ==========================================
# Park Settings
# ==========================================

class ParkSettings(SQLModel, table=True):
    """
    Park general settings - branding, contact, business hours
    """
    __tablename__ = "park_settings"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    
    # Branding
    park_name: str
    slogan: Optional[str] = None
    primary_color: str = "#6f4e37"  # Coffee brown
    secondary_color: str = "#d4a574"  # Light coffee
    background_color: str = "#ffffff"  # White background
    
    # Contact
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    support_phone: Optional[str] = None  # Alternative phone/Zalo
    
    # Booking & Messaging
    booking_url: Optional[str] = None
    messenger_url: Optional[str] = None
    
    # Social media
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    youtube_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    
    # Media
    logo_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    favicon_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    cover_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    meta_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    
    # SEO
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    
    # Business hours and additional settings
    operating_hours: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    settings_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ParkPageSettings(SQLModel, table=True):
    """
    Per-page settings (VR360 links, display control)
    """
    __tablename__ = "park_page_settings"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    
    page_code: str = Field(index=True)  # e.g., 'menu', 'events', 'about'
    is_displaying: bool = True
    vr360_link: Optional[str] = None
    vr_title: Optional[str] = None
    settings_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ==========================================
# Park Locations
# ==========================================

class ParkLocation(SQLModel, table=True):
    """
    Park locations/branches
    """
    __tablename__ = "park_locations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(unique=True, index=True)
    name: Optional[str] = None
    address: Optional[str] = None
    opening_hours: Optional[str] = None
    
    # Contact
    phone: Optional[str] = None
    email: Optional[str] = None
    
    # Location
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_url: Optional[str] = None
    
    # Media
    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    vr360_link: Optional[str] = None
    
    # Status
    is_active: bool = True
    is_primary: bool = False
    display_order: int = 0
    
    # Additional attributes
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkLocationTranslation"] = Relationship(back_populates="location")
    media: List["ParkLocationMedia"] = Relationship(back_populates="location")


class ParkLocationTranslation(SQLModel, table=True):
    """
    Location translations
    """
    __tablename__ = "park_location_translations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    location_id: int = Field(foreign_key="park_locations.id", index=True)
    locale: str = Field(index=True)
    
    name: str
    address: Optional[str] = None
    description: Optional[str] = None
    amenities_text: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    location: Optional[ParkLocation] = Relationship(back_populates="translations")


class ParkLocationMedia(SQLModel, table=True):
    """
    Location media (photos)
    """
    __tablename__ = "park_location_media"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    location_id: int = Field(foreign_key="park_locations.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)
    
    is_primary: bool = False
    sort_order: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    location: Optional[ParkLocation] = Relationship(back_populates="media")


# ==========================================
# Restaurant Menu
# ==========================================

class ParkMenuCategory(SQLModel, table=True):
    """
    Menu categories (e.g., Coffee, Tea, Desserts)
    """
    __tablename__ = "park_menu_categories"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(unique=True, index=True)
    icon_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    display_order: int = 0
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkMenuCategoryTranslation"] = Relationship(back_populates="category")


class ParkMenuCategoryTranslation(SQLModel, table=True):
    """
    Menu category translations
    """
    __tablename__ = "park_menu_category_translations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    category_id: int = Field(foreign_key="park_menu_categories.id", index=True)
    locale: str = Field(index=True)
    
    name: str
    description: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    category: Optional[ParkMenuCategory] = Relationship(back_populates="translations")


class ParkMenuItem(SQLModel, table=True):
    """
    Menu items (dishes, drinks)
    """
    __tablename__ = "park_menu_items"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    category_id: int = Field(foreign_key="park_menu_categories.id", index=True)
    code: str = Field(unique=True, index=True)
    
    # Pricing
    price: Optional[float] = None
    original_price: Optional[float] = None
    
    # Status
    status: str = "available"  # MenuItemStatus enum
    
    # Variants (e.g., Small/Medium/Large)
    sizes: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    # Tags (e.g., vegetarian, gluten-free)
    tags: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    # Nutrition
    calories: Optional[int] = None
    
    # Media
    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    
    # Highlights
    is_bestseller: bool = False
    is_new: bool = False
    is_seasonal: bool = False
    
    display_order: int = 0
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkMenuItemTranslation"] = Relationship(back_populates="item")
    media: List["ParkMenuItemMedia"] = Relationship(back_populates="item")


class ParkMenuItemTranslation(SQLModel, table=True):
    """
    Menu item translations
    """
    __tablename__ = "park_menu_item_translations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="park_menu_items.id", index=True)
    locale: str = Field(index=True)
    
    name: str
    description: Optional[str] = None
    ingredients: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    item: Optional[ParkMenuItem] = Relationship(back_populates="translations")


class ParkMenuItemMedia(SQLModel, table=True):
    """
    Menu item media (photos)
    """
    __tablename__ = "park_menu_item_media"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="park_menu_items.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)
    
    is_primary: bool = False
    sort_order: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    item: Optional[ParkMenuItem] = Relationship(back_populates="media")


# ==========================================
# Park Events
# ==========================================

class ParkEvent(SQLModel, table=True):
    """
    Park events (shows, activities, special events)
    """
    __tablename__ = "park_events"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(unique=True, index=True)
    
    # Timing
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    
    # Location
    location_id: Optional[int] = Field(default=None, foreign_key="park_locations.id")
    space_id: Optional[int] = Field(default=None, foreign_key="park_spaces.id")
    location_text: Optional[str] = None
    
    # Registration
    registration_url: Optional[str] = None
    max_participants: Optional[int] = None
    
    # Media
    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    
    # Status
    status: str = "upcoming"  # EventStatus enum
    is_featured: bool = False
    display_order: int = 0
    
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkEventTranslation"] = Relationship(back_populates="event")
    media: List["ParkEventMedia"] = Relationship(back_populates="event")


class ParkEventTranslation(SQLModel, table=True):
    """
    Event translations
    """
    __tablename__ = "park_event_translations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="park_events.id", index=True)
    locale: str = Field(index=True)
    
    title: str
    description: Optional[str] = None
    details: Optional[str] = None  # Rich text
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    event: Optional[ParkEvent] = Relationship(back_populates="translations")


class ParkEventMedia(SQLModel, table=True):
    """
    Event media (photos)
    """
    __tablename__ = "park_event_media"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="park_events.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)
    
    is_primary: bool = False
    sort_order: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    event: Optional[ParkEvent] = Relationship(back_populates="media")


# ==========================================
# Park Games & Activities
# ==========================================

class ParkGameActivity(SQLModel, table=True):
    """
    Games and activity programs, stored separately from schedule/events.
    """
    __tablename__ = "park_games_activities"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(unique=True, index=True)

    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

    location_id: Optional[int] = Field(default=None, foreign_key="park_locations.id")
    space_id: Optional[int] = Field(default=None, foreign_key="park_spaces.id")
    location_text: Optional[str] = None

    registration_url: Optional[str] = None
    max_participants: Optional[int] = None

    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")

    status: str = "upcoming"
    is_featured: bool = False
    display_order: int = 0

    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkGameActivityTranslation"] = Relationship(back_populates="game_activity")
    media: List["ParkGameActivityMedia"] = Relationship(back_populates="game_activity")


class ParkGameActivityTranslation(SQLModel, table=True):
    __tablename__ = "park_game_activity_translations"

    id: Optional[int] = Field(default=None, primary_key=True)
    game_activity_id: int = Field(foreign_key="park_games_activities.id", index=True)
    locale: str = Field(index=True)

    title: str
    description: Optional[str] = None
    details: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    game_activity: Optional[ParkGameActivity] = Relationship(back_populates="translations")


class ParkGameActivityMedia(SQLModel, table=True):
    __tablename__ = "park_game_activity_media"

    id: Optional[int] = Field(default=None, primary_key=True)
    game_activity_id: int = Field(foreign_key="park_games_activities.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)

    is_primary: bool = False
    sort_order: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)

    game_activity: Optional[ParkGameActivity] = Relationship(back_populates="media")


# ==========================================
# Restaurant Careers
# ==========================================

class ParkCareer(SQLModel, table=True):
    """
    Career/job postings
    """
    __tablename__ = "park_careers"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(unique=True, index=True)
    
    # Job details
    job_type: Optional[str] = None  # Full-time, Part-time, Internship
    experience_required: Optional[str] = None
    
    # Salary
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_text: Optional[str] = None  # "Negotiable"
    
    # Application
    deadline: Optional[date] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    application_url: Optional[str] = None
    
    # Location
    location_id: Optional[int] = Field(default=None, foreign_key="park_locations.id")
    
    # Media
    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    
    # Status
    status: str = "open"  # CareerStatus enum
    display_order: int = 0
    is_urgent: bool = False
    
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkCareerTranslation"] = Relationship(back_populates="career")
    media: List["ParkCareerMedia"] = Relationship(back_populates="career")


class ParkCareerTranslation(SQLModel, table=True):
    """
    Career posting translations
    """
    __tablename__ = "park_career_translations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    career_id: int = Field(foreign_key="park_careers.id", index=True)
    locale: str = Field(index=True)
    
    title: str
    description: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    career: Optional[ParkCareer] = Relationship(back_populates="translations")


class ParkCareerMedia(SQLModel, table=True):
    """
    Career media (photos)
    """
    __tablename__ = "park_career_media"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    career_id: int = Field(foreign_key="park_careers.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)
    
    is_primary: bool = False
    sort_order: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)

    career: Optional[ParkCareer] = Relationship(back_populates="media")


# ==========================================
# Restaurant Promotions
# ==========================================

class ParkPromotion(SQLModel, table=True):
    """
    Promotions and special offers
    """
    __tablename__ = "park_promotions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(unique=True, index=True)
    
    # Discount
    promotion_type: str = "percentage"  # PromotionType enum
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    
    # Validity
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    
    min_order_value: Optional[float] = None
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    usage_count: int = 0
    
    # Media
    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    
    # Status
    status: str = "active"
    is_featured: bool = False
    display_order: int = 0
    
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkPromotionTranslation"] = Relationship(back_populates="promotion")
    media: List["ParkPromotionMedia"] = Relationship(back_populates="promotion")


class ParkPromotionTranslation(SQLModel, table=True):
    """
    Promotion translations
    """
    __tablename__ = "park_promotion_translations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    promotion_id: int = Field(foreign_key="park_promotions.id", index=True)
    locale: str = Field(index=True)
    
    title: str
    description: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    promotion: Optional[ParkPromotion] = Relationship(back_populates="translations")


class ParkPromotionMedia(SQLModel, table=True):
    """
    Promotion media (photos)
    """
    __tablename__ = "park_promotion_media"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    promotion_id: int = Field(foreign_key="park_promotions.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)
    
    is_primary: bool = False
    sort_order: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    promotion: Optional[ParkPromotion] = Relationship(back_populates="media")


# ==========================================
# Restaurant Achievements
# ==========================================

class ParkAchievement(SQLModel, table=True):
    """
    Restaurant achievements (awards, certifications, milestones)
    """
    __tablename__ = "park_achievements"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(unique=True, index=True)

    achievement_type: Optional[str] = Field(default=None, index=True)
    issuer: Optional[str] = None
    awarded_at: Optional[date] = None
    location_text: Optional[str] = None
    reference_url: Optional[str] = None

    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")

    is_active: bool = True
    is_featured: bool = False
    display_order: int = 0

    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkAchievementTranslation"] = Relationship(back_populates="achievement")
    media: List["ParkAchievementMedia"] = Relationship(back_populates="achievement")


class ParkAchievementTranslation(SQLModel, table=True):
    """
    Achievement translations
    """
    __tablename__ = "park_achievement_translations"

    id: Optional[int] = Field(default=None, primary_key=True)
    achievement_id: int = Field(foreign_key="park_achievements.id", index=True)
    locale: str = Field(index=True)

    title: str
    description: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    achievement: Optional[ParkAchievement] = Relationship(back_populates="translations")


class ParkAchievementMedia(SQLModel, table=True):
    """
    Achievement media (photos/certificates)
    """
    __tablename__ = "park_achievement_media"

    id: Optional[int] = Field(default=None, primary_key=True)
    achievement_id: int = Field(foreign_key="park_achievements.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)

    is_primary: bool = False
    sort_order: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)

    achievement: Optional[ParkAchievement] = Relationship(back_populates="media")


# ==========================================
# Park Spaces
# ==========================================

class ParkSpace(SQLModel, table=True):
    """
    Park spaces / areas
    """
    __tablename__ = "park_spaces"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(index=True)
    
    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    amenities_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    capacity: Optional[int] = None
    area_size: Optional[str] = None
    
    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkSpaceTranslation"] = Relationship(back_populates="space")
    media: List["ParkSpaceMedia"] = Relationship(back_populates="space")


class ParkSpaceTranslation(SQLModel, table=True):
    """
    Space translations
    """
    __tablename__ = "park_space_translations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    space_id: int = Field(foreign_key="park_spaces.id", index=True)
    locale: str = Field(index=True)
    
    name: str
    description: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    space: Optional[ParkSpace] = Relationship(back_populates="translations")


class ParkSpaceMedia(SQLModel, table=True):
    """
    Space media (photos)
    """
    __tablename__ = "park_space_media"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    space_id: int = Field(foreign_key="park_spaces.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)
    
    is_primary: bool = False
    sort_order: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    space: Optional[ParkSpace] = Relationship(back_populates="media")


# ==========================================
# Park Services
# ==========================================

class ParkService(SQLModel, table=True):
    """
    Park services (ticket booking, tours, facilities, etc.)
    """
    __tablename__ = "park_services"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    
    code: str = Field(index=True)  # Internal identifier (e.g., SV01, SPA-001)
    service_type: str = Field(index=True)  # room_service, laundry, concierge, airport_transfer, spa_service, tour_booking, car_rental, babysitting, other
    
    availability: Optional[str] = None  # e.g., "24/7", "9:00 AM - 10:00 PM", "09:00-21:00"
    price_information: Optional[str] = None  # e.g., "Starting from $50", "Free", "Upon request", numbers
    
    # Links
    vr360_tour_url: Optional[str] = None  # VR360 tour link
    booking_url: Optional[str] = None  # Direct booking/reservation URL
    
    # Media
    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    
    # Status
    is_active: bool = True
    display_order: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkServiceTranslation"] = Relationship(back_populates="service")
    media: List["ParkServiceMedia"] = Relationship(back_populates="service")


class ParkServiceTranslation(SQLModel, table=True):
    """
    Service translations
    """
    __tablename__ = "park_service_translations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    service_id: int = Field(foreign_key="park_services.id", index=True)
    locale: str = Field(index=True)
    
    name: str  # Service name
    description: Optional[str] = None  # Service description/details
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    service: Optional[ParkService] = Relationship(back_populates="translations")


class ParkServiceMedia(SQLModel, table=True):
    """
    Service media (photos/gallery)
    """
    __tablename__ = "park_service_media"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    service_id: int = Field(foreign_key="park_services.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)
    
    sort_order: int = 0
    is_primary: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    service: Optional[ParkService] = Relationship(back_populates="media")


# ==========================================
# Park Dining
# ==========================================

class ParkDiningItem(SQLModel, table=True):
    """
    Dining options in the park, stored separately from support services.
    """
    __tablename__ = "park_dining"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)

    code: str = Field(index=True)
    dining_type: str = Field(index=True)  # restaurant, cafe, food_court, snack_bar, beverage_kiosk, dessert_shop, other

    availability: Optional[str] = None
    price_information: Optional[str] = None

    vr360_tour_url: Optional[str] = None
    booking_url: Optional[str] = None

    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")

    is_active: bool = True
    display_order: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkDiningItemTranslation"] = Relationship(back_populates="dining_item")
    media: List["ParkDiningItemMedia"] = Relationship(back_populates="dining_item")


class ParkDiningItemTranslation(SQLModel, table=True):
    __tablename__ = "park_dining_translations"

    id: Optional[int] = Field(default=None, primary_key=True)
    dining_id: int = Field(foreign_key="park_dining.id", index=True)
    locale: str = Field(index=True)

    name: str
    description: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    dining_item: Optional[ParkDiningItem] = Relationship(back_populates="translations")


class ParkDiningItemMedia(SQLModel, table=True):
    __tablename__ = "park_dining_media"

    id: Optional[int] = Field(default=None, primary_key=True)
    dining_id: int = Field(foreign_key="park_dining.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)

    sort_order: int = 0
    is_primary: bool = False

    created_at: datetime = Field(default_factory=datetime.utcnow)

    dining_item: Optional[ParkDiningItem] = Relationship(back_populates="media")


# ==========================================
# Park Attractions
# ==========================================

class ParkAttraction(SQLModel, table=True):
    """
    Park attractions, rides, shows, and points of interest
    """
    __tablename__ = "park_attractions"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    space_id: Optional[int] = Field(default=None, foreign_key="park_spaces.id", index=True)
    category_id: Optional[int] = Field(default=None, foreign_key="park_attraction_categories.id", index=True)
    code: str = Field(index=True)

    attraction_type: str = Field(index=True)  # ride, show, poi, game, service_point, zone
    experience_type: Optional[str] = Field(default=None, index=True)  # thrill, family, kids, water, indoor
    thrill_level: Optional[str] = None  # low, medium, high, extreme

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

    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")

    is_active: bool = True
    is_featured: bool = False
    display_order: int = 0
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkAttractionTranslation"] = Relationship(back_populates="attraction")
    media: List["ParkAttractionMedia"] = Relationship(back_populates="attraction")
    category: Optional["ParkAttractionCategory"] = Relationship(back_populates="attractions")


class ParkAttractionCategory(SQLModel, table=True):
    """
    Point of interest categories for park attractions.
    """
    __tablename__ = "park_attraction_categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(index=True)
    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    attractions: List["ParkAttraction"] = Relationship(back_populates="category")
    translations: List["ParkAttractionCategoryTranslation"] = Relationship(back_populates="category")


class ParkAttractionCategoryTranslation(SQLModel, table=True):
    """
    Point of interest category translations.
    """
    __tablename__ = "park_attraction_category_translations"

    id: Optional[int] = Field(default=None, primary_key=True)
    category_id: int = Field(foreign_key="park_attraction_categories.id", index=True)
    locale: str = Field(index=True)

    title: str
    description: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    category: Optional[ParkAttractionCategory] = Relationship(back_populates="translations")


class ParkAttractionTranslation(SQLModel, table=True):
    """
    Attraction translations
    """
    __tablename__ = "park_attraction_translations"

    id: Optional[int] = Field(default=None, primary_key=True)
    attraction_id: int = Field(foreign_key="park_attractions.id", index=True)
    locale: str = Field(index=True)

    name: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    safety_notes: Optional[str] = None
    experience_notes: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    attraction: Optional[ParkAttraction] = Relationship(back_populates="translations")


class ParkAttractionMedia(SQLModel, table=True):
    """
    Attraction media (photos, posters, previews)
    """
    __tablename__ = "park_attraction_media"

    id: Optional[int] = Field(default=None, primary_key=True)
    attraction_id: int = Field(foreign_key="park_attractions.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)

    is_primary: bool = False
    sort_order: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)

    attraction: Optional[ParkAttraction] = Relationship(back_populates="media")


# ==========================================
# Park Ticket Types
# ==========================================

class ParkTicketType(SQLModel, table=True):
    """
    Ticket types, passes, combos, and admission products
    """
    __tablename__ = "park_ticket_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(index=True)

    ticket_type: str = Field(index=True)  # admission, combo, fast_pass, add_on, membership
    audience_type: Optional[str] = Field(default=None, index=True)  # adult, child, family, group, senior
    validity_type: Optional[str] = Field(default=None, index=True)  # single_day, date_range, time_slot, open_date

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

    primary_image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")

    is_active: bool = True
    is_featured: bool = False
    display_order: int = 0
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkTicketTypeTranslation"] = Relationship(back_populates="ticket_type_ref")
    media: List["ParkTicketTypeMedia"] = Relationship(back_populates="ticket_type_ref")


class ParkTicketTypeTranslation(SQLModel, table=True):
    """
    Ticket type translations
    """
    __tablename__ = "park_ticket_type_translations"

    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_type_id: int = Field(foreign_key="park_ticket_types.id", index=True)
    locale: str = Field(index=True)

    name: str
    description: Optional[str] = None
    terms_and_conditions: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    ticket_type_ref: Optional[ParkTicketType] = Relationship(back_populates="translations")


class ParkTicketTypeMedia(SQLModel, table=True):
    """
    Ticket type media (banners, cards, visuals)
    """
    __tablename__ = "park_ticket_type_media"

    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_type_id: int = Field(foreign_key="park_ticket_types.id", index=True)
    media_id: int = Field(foreign_key="media_files.id", index=True)

    is_primary: bool = False
    sort_order: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)

    ticket_type_ref: Optional[ParkTicketType] = Relationship(back_populates="media")


# ==========================================
# Restaurant Content Sections (Home/About)
# ==========================================

class ParkContentSection(SQLModel, table=True):
    """
    Content sections for Home/About pages (features, values, etc.)
    """
    __tablename__ = "park_content_sections"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    section_type: str = Field(index=True)  # 'feature', 'value', 'service', etc.
    page_code: str = Field(index=True)  # 'home', 'about'
    
    icon: Optional[str] = None
    image_media_id: Optional[int] = Field(default=None, foreign_key="media_files.id")
    
    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    translations: List["ParkContentSectionTranslation"] = Relationship(back_populates="section")


class ParkContentSectionTranslation(SQLModel, table=True):
    """
    Content section translations
    """
    __tablename__ = "park_content_section_translations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    section_id: int = Field(foreign_key="park_content_sections.id", index=True)
    locale: str = Field(index=True)
    
    title: str
    description: Optional[str] = None
    content: Optional[str] = None  # longtext for rich content
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    section: Optional[ParkContentSection] = Relationship(back_populates="translations")


# ==========================================
# Visitor Information
# ==========================================

class ParkVisitorInfoCategory(SQLModel, table=True):
    """
    Visitor information categories such as opening hours, rules, directions, and FAQ.
    """
    __tablename__ = "park_visitor_info_categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    page_code: str = Field(default="visitor_info", index=True)
    category_code: str = Field(index=True)  # opening_hours, rules, directions, faq
    title: str
    icon: Optional[str] = None
    item_layout: Optional[str] = None  # list, schedule, faq, transport

    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    items: List["ParkVisitorInfoItem"] = Relationship(back_populates="category")
    translations: List["ParkVisitorInfoCategoryTranslation"] = Relationship(back_populates="category")


class ParkVisitorInfoCategoryTranslation(SQLModel, table=True):
    """
    Visitor information category translations.
    """
    __tablename__ = "park_visitor_info_category_translations"

    id: Optional[int] = Field(default=None, primary_key=True)
    category_id: int = Field(foreign_key="park_visitor_info_categories.id", index=True)
    locale: str = Field(index=True)

    title: str
    description: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    category: Optional[ParkVisitorInfoCategory] = Relationship(back_populates="translations")


class ParkVisitorInfoItem(SQLModel, table=True):
    """
    Individual visitor information items within a category.
    """
    __tablename__ = "park_visitor_info_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    category_id: int = Field(foreign_key="park_visitor_info_categories.id", index=True)
    item_type: str = Field(default="text", index=True)  # schedule, rule, direction, faq

    is_active: bool = True
    display_order: int = 0
    attributes_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    category: Optional[ParkVisitorInfoCategory] = Relationship(back_populates="items")
    translations: List["ParkVisitorInfoItemTranslation"] = Relationship(back_populates="item")


class ParkVisitorInfoItemTranslation(SQLModel, table=True):
    """
    Visitor information item translations.
    """
    __tablename__ = "park_visitor_info_item_translations"

    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="park_visitor_info_items.id", index=True)
    locale: str = Field(index=True)

    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    item: Optional[ParkVisitorInfoItem] = Relationship(back_populates="translations")


# Backward-compatible aliases while the codebase finishes migrating to restaurant naming.
CafeSettings = ParkSettings
CafePageSettings = ParkPageSettings
CafeBranch = ParkLocation
CafeBranchTranslation = ParkLocationTranslation
CafeBranchMedia = ParkLocationMedia
CafeMenuCategory = ParkMenuCategory
CafeMenuCategoryTranslation = ParkMenuCategoryTranslation
CafeMenuItem = ParkMenuItem
CafeMenuItemTranslation = ParkMenuItemTranslation
CafeMenuItemMedia = ParkMenuItemMedia
CafeEvent = ParkEvent
CafeEventTranslation = ParkEventTranslation
CafeEventMedia = ParkEventMedia
CafeGameActivity = ParkGameActivity
CafeGameActivityTranslation = ParkGameActivityTranslation
CafeGameActivityMedia = ParkGameActivityMedia
CafeCareer = ParkCareer
CafeCareerTranslation = ParkCareerTranslation
CafeCareerMedia = ParkCareerMedia
CafePromotion = ParkPromotion
CafePromotionTranslation = ParkPromotionTranslation
CafePromotionMedia = ParkPromotionMedia
CafeAchievement = ParkAchievement
CafeAchievementTranslation = ParkAchievementTranslation
CafeAchievementMedia = ParkAchievementMedia
CafeSpace = ParkSpace
CafeSpaceTranslation = ParkSpaceTranslation
CafeSpaceMedia = ParkSpaceMedia
CafeService = ParkService
CafeServiceTranslation = ParkServiceTranslation
CafeServiceMedia = ParkServiceMedia
CafeDiningItem = ParkDiningItem
CafeDiningItemTranslation = ParkDiningItemTranslation
CafeDiningItemMedia = ParkDiningItemMedia
CafeAttraction = ParkAttraction
CafeAttractionTranslation = ParkAttractionTranslation
CafeAttractionMedia = ParkAttractionMedia
CafeTicketType = ParkTicketType
CafeTicketTypeTranslation = ParkTicketTypeTranslation
CafeTicketTypeMedia = ParkTicketTypeMedia
CafeContentSection = ParkContentSection
CafeContentSectionTranslation = ParkContentSectionTranslation
RestaurantSettings = ParkSettings
RestaurantPageSettings = ParkPageSettings
RestaurantBranch = ParkLocation
RestaurantBranchTranslation = ParkLocationTranslation
RestaurantBranchMedia = ParkLocationMedia
RestaurantMenuCategory = ParkMenuCategory
RestaurantMenuCategoryTranslation = ParkMenuCategoryTranslation
RestaurantMenuItem = ParkMenuItem
RestaurantMenuItemTranslation = ParkMenuItemTranslation
RestaurantMenuItemMedia = ParkMenuItemMedia
RestaurantEvent = ParkEvent
RestaurantEventTranslation = ParkEventTranslation
RestaurantEventMedia = ParkEventMedia
RestaurantGameActivity = ParkGameActivity
RestaurantGameActivityTranslation = ParkGameActivityTranslation
RestaurantGameActivityMedia = ParkGameActivityMedia
RestaurantCareer = ParkCareer
RestaurantCareerTranslation = ParkCareerTranslation
RestaurantCareerMedia = ParkCareerMedia
RestaurantPromotion = ParkPromotion
RestaurantPromotionTranslation = ParkPromotionTranslation
RestaurantPromotionMedia = ParkPromotionMedia
RestaurantAchievement = ParkAchievement
RestaurantAchievementTranslation = ParkAchievementTranslation
RestaurantAchievementMedia = ParkAchievementMedia
RestaurantSpace = ParkSpace
RestaurantSpaceTranslation = ParkSpaceTranslation
RestaurantSpaceMedia = ParkSpaceMedia
RestaurantService = ParkService
RestaurantServiceTranslation = ParkServiceTranslation
RestaurantServiceMedia = ParkServiceMedia
RestaurantDiningItem = ParkDiningItem
RestaurantDiningItemTranslation = ParkDiningItemTranslation
RestaurantDiningItemMedia = ParkDiningItemMedia
RestaurantAttraction = ParkAttraction
RestaurantAttractionTranslation = ParkAttractionTranslation
RestaurantAttractionMedia = ParkAttractionMedia
RestaurantTicketType = ParkTicketType
RestaurantTicketTypeTranslation = ParkTicketTypeTranslation
RestaurantTicketTypeMedia = ParkTicketTypeMedia
RestaurantContentSection = ParkContentSection
RestaurantContentSectionTranslation = ParkContentSectionTranslation
CafeVisitorInfoCategory = ParkVisitorInfoCategory
CafeVisitorInfoCategoryTranslation = ParkVisitorInfoCategoryTranslation
CafeVisitorInfoItem = ParkVisitorInfoItem
CafeVisitorInfoItemTranslation = ParkVisitorInfoItemTranslation
RestaurantVisitorInfoCategory = ParkVisitorInfoCategory
RestaurantVisitorInfoCategoryTranslation = ParkVisitorInfoCategoryTranslation
RestaurantVisitorInfoItem = ParkVisitorInfoItem
RestaurantVisitorInfoItemTranslation = ParkVisitorInfoItemTranslation
