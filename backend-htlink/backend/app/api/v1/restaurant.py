from fastapi import APIRouter

from app.api.v1.endpoints import (
    restaurant_achievements,
    restaurant_attractions,
    restaurant_branches,
    restaurant_careers,
    restaurant_contact,
    restaurant_content_sections,
    restaurant_events,
    restaurant_languages,
    restaurant_menu,
    restaurant_promotions,
    restaurant_services,
    restaurant_settings,
    restaurant_spaces,
    restaurant_ticket_types,
    restaurant_visitor_information,
)


restaurant_router = APIRouter(prefix="/restaurant", tags=["restaurant"])

restaurant_router.include_router(restaurant_settings.router, prefix="/settings")
restaurant_router.include_router(restaurant_contact.router, prefix="/contact")
restaurant_router.include_router(restaurant_languages.router)
restaurant_router.include_router(restaurant_branches.router, prefix="/branches")
restaurant_router.include_router(restaurant_menu.router, prefix="/menu")
restaurant_router.include_router(restaurant_events.router, prefix="/events")
restaurant_router.include_router(restaurant_careers.router, prefix="/careers")
restaurant_router.include_router(restaurant_promotions.router, prefix="/promotions")
restaurant_router.include_router(restaurant_achievements.router, prefix="/achievements")
restaurant_router.include_router(restaurant_attractions.router, prefix="/attractions")
restaurant_router.include_router(restaurant_services.router, prefix="/services")
restaurant_router.include_router(restaurant_spaces.router, prefix="/spaces")
restaurant_router.include_router(restaurant_ticket_types.router, prefix="/ticket-types")
restaurant_router.include_router(restaurant_content_sections.router, prefix="/content-sections")
restaurant_router.include_router(restaurant_visitor_information.router, prefix="/visitor-information")
