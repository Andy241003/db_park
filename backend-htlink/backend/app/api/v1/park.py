from fastapi import APIRouter

from app.api.v1.endpoints import (
    park_achievements,
    park_attractions,
    park_branches,
    park_careers,
    park_contact,
    park_content_sections,
    park_dining,
    park_events,
    park_games_activities,
    park_languages,
    park_promotions,
    park_services,
    park_settings,
    park_spaces,
    park_ticket_types,
    park_visitor_information,
)


park_router = APIRouter(prefix="/park", tags=["park"])

# Core park settings
park_router.include_router(park_settings.router, prefix="/settings")
park_router.include_router(park_contact.router, prefix="/contact")
park_router.include_router(park_languages.router)

# Park structure
park_router.include_router(park_branches.router, prefix="/locations")
park_router.include_router(park_branches.router, prefix="/branches")
park_router.include_router(park_spaces.router, prefix="/spaces")
park_router.include_router(park_attractions.router, prefix="/attractions")

# Products and services
park_router.include_router(park_ticket_types.router, prefix="/ticket-types")
park_router.include_router(park_dining.router, prefix="/dining")
park_router.include_router(park_services.router, prefix="/services")
park_router.include_router(park_promotions.router, prefix="/promotions")

# Content and operations
park_router.include_router(park_events.router, prefix="/events")
park_router.include_router(park_games_activities.router, prefix="/games-activities")
park_router.include_router(park_careers.router, prefix="/careers")
park_router.include_router(park_content_sections.router, prefix="/content-sections")
park_router.include_router(park_achievements.router, prefix="/achievements")
park_router.include_router(park_visitor_information.router, prefix="/visitor-information")
