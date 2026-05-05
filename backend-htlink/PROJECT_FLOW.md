# Project Flow Guide

This file is the fastest way for a new developer to understand how the
adventure park project is wired today, which paths are active, and where to
read first before changing code.

## 1. Project Goal

This repository now runs an adventure park SaaS admin system.

Main domains in active use:

- Authentication
- Media upload / file serving
- Park settings
- Contact
- Languages
- Locations
- Spaces / zones
- Attractions
- Ticket types
- Events
- Careers
- Promotions
- Services
- Content sections
- Achievements

Important:

- the repository still contains legacy hotel/cafe/restaurant code
- the public API direction is now park-first
- some compatibility layers still keep old restaurant naming alive

## 2. High-Level Runtime Flow

```text
Frontend (React/Vite)
  -> calls /api/v1/restaurant/... today
     or /api/v1/park/... for the new path
Backend (FastAPI)
  -> api/v1 router
  -> park router or hidden restaurant compatibility router
  -> endpoint module
  -> SQLModel / DB session
  -> remote MySQL
  -> response back to frontend
```

## 3. Current Routing Reality

There are two backend paths in the codebase right now:

1. Public park path

- `/api/v1/park/*`
- shown in Swagger docs
- should be treated as the target runtime path

2. Compatibility restaurant path

- `/api/v1/restaurant/*`
- still enabled for existing frontend calls
- hidden from Swagger docs
- should be kept stable until frontend is fully migrated

Practical rule:

- new backend work should follow the park path first
- if the frontend still depends on restaurant endpoints, keep compatibility in mind

## 4. Frontend Flow

Main frontend entry:

- `frontend/src/App.tsx`

API base URL logic:

- `frontend/src/utils/api.ts`

Current admin API client:

- `frontend/src/services/restaurantApi.ts`

Current admin pages:

- `frontend/src/pages/cafe/*`
- some pages may also be re-exported from other page folders later

Main layout / sidebar:

- `frontend/src/pages/cafe/RestaurantLayout.tsx`
- `frontend/src/components/layout/RestaurantSidebar.tsx`

### Frontend request flow

```text
Page component
  -> restaurantApi.ts
  -> axios client
  -> /api/v1/restaurant/... today
     or /api/v1/park/... after migration
  -> backend response
  -> UI state update
```

## 5. Backend Flow

Main backend entry:

- `backend/app/main.py`

API root router:

- `backend/app/api/v1/__init__.py`

Park router aggregator:

- `backend/app/api/v1/park.py`

Restaurant compatibility router:

- `backend/app/api/v1/restaurant.py`

Dependencies and auth context:

- `backend/app/api/deps.py`

Configuration:

- `backend/app/core/config.py`

Database session / engine:

- `backend/app/core/db.py`

### Backend request flow

```text
Request
  -> FastAPI app (main.py)
  -> api_router
  -> park_router or restaurant_router
  -> endpoint file
  -> SQLModel query/update
  -> commit / refresh
  -> response model
```

## 6. Active Park Backend Modules

These are the files a developer should treat as the primary business path:

- `backend/app/api/v1/endpoints/auth.py`
- `backend/app/api/v1/endpoints/media.py`
- `backend/app/api/v1/endpoints/restaurant_settings.py`
- `backend/app/api/v1/endpoints/restaurant_contact.py`
- `backend/app/api/v1/endpoints/restaurant_languages.py`
- `backend/app/api/v1/endpoints/restaurant_branches.py`
- `backend/app/api/v1/endpoints/restaurant_spaces.py`
- `backend/app/api/v1/endpoints/restaurant_attractions.py`
- `backend/app/api/v1/endpoints/restaurant_ticket_types.py`
- `backend/app/api/v1/endpoints/restaurant_events.py`
- `backend/app/api/v1/endpoints/restaurant_careers.py`
- `backend/app/api/v1/endpoints/restaurant_promotions.py`
- `backend/app/api/v1/endpoints/restaurant_services.py`
- `backend/app/api/v1/endpoints/restaurant_content_sections.py`
- `backend/app/api/v1/endpoints/restaurant_achievements.py`

Primary model file:

- `backend/app/models/restaurant.py`

Important naming note:

- many endpoint and model filenames still begin with `restaurant_`
- many of those files now point to `park_*` tables under the hood
- rename cleanup can happen later after runtime stability

## 7. Data Model Flow

Most park modules follow this pattern:

```text
Main entity table
  + translation table
  + media link table
```

Examples:

- `park_locations`
  - `park_location_translations`
  - `park_location_media`
- `park_spaces`
  - `park_space_translations`
  - `park_space_media`
- `park_attractions`
  - `park_attraction_translations`
  - `park_attraction_media`
- `park_ticket_types`
  - `park_ticket_type_translations`
  - `park_ticket_type_media`
- `park_promotions`
  - `park_promotion_translations`
  - `park_promotion_media`
- `park_achievements`
  - `park_achievement_translations`
  - `park_achievement_media`

## 8. Media / Upload Flow

Upload endpoint:

- `backend/app/api/v1/endpoints/media.py`

Physical file storage:

- container path: `/app/uploads`

Database metadata:

- table: `media_files`

Flow:

```text
Upload file
  -> backend saves physical file into /app/uploads/<file_key>
  -> backend inserts row into media_files
  -> park entities store media IDs
```

## 9. Database / Schema Sources

There are multiple schema sources in the repo, so use them carefully.

Park-focused SQL init files:

- `docker/mysql/init/00-adventure-park-only-schema.sql`

Restaurant legacy SQL still exists:

- `docker/mysql/init/00-vr-restaurant-only-schema.sql`
- `docker/mysql/init/02-align-restaurant-schema.sql`
- `docker/mysql/init/03-add-restaurant-achievements.sql`

Focused SQL updates added during park migration:

- `backend/migrations/add_adventure_park_core_tables.sql`
- `backend/migrations/add_park_achievements_tables.sql`

Practical rule:

- for the current park runtime, prefer the park schema and focused park migrations
- only use restaurant SQL files when dealing with compatibility or legacy recovery

## 10. Current Environment Shape

Typical current environment:

```text
Frontend: local Vite or deployed frontend
Backend/API: FastAPI in Docker
Database: remote MySQL
Uploads: persistent volume mounted to /app/uploads
```

Important:

- the backend is currently configured to use a remote MySQL from `.env`
- the local Docker MySQL container may not be the source of truth for runtime data

Key env file references:

- `.env`
- `.env.production.example`
- `COOLIFY_DEPLOY.md`

## 11. Known Legacy / Confusing Areas

These still exist in the repo and can confuse new contributors:

- `backend/app/models/vr_hotel.py`
- `backend/app/models_legacy.py`
- `backend/app/models_old.py`
- various `vr_hotel_*` endpoints
- old cafe/hotel migration helpers
- frontend pages still under `pages/cafe/*`
- current API client still named `restaurantApi.ts`
- hidden `/api/v1/restaurant/*` compatibility router

Important rule:

- do not extend hotel paths for new park features
- prefer park table shape and park API behavior
- only touch compatibility code when needed to keep current frontend stable

## 12. Safe Change Strategy

When implementing a new feature:

1. Start from the park endpoint behavior.
2. Check related `park_*` tables in `backend/app/models/restaurant.py`.
3. Verify whether frontend still calls `/restaurant/*` or has moved to `/park/*`.
4. Update `frontend/src/services/restaurantApi.ts`.
5. Update the page under `frontend/src/pages/cafe/*` or the active page source.
6. If schema changes are needed, add a focused park SQL migration.
7. Test list, create, update, and delete flows together.

## 13. Reading Order For New Developers

If someone is new to the project, they should read in this order:

1. `PROJECT_FLOW.md`
2. `backend/app/main.py`
3. `backend/app/api/v1/__init__.py`
4. `backend/app/api/v1/park.py`
5. `backend/app/api/v1/restaurant.py`
6. one active endpoint module, for example:
   - `backend/app/api/v1/endpoints/restaurant_attractions.py`
7. `backend/app/models/restaurant.py`
8. `frontend/src/services/restaurantApi.ts`
9. the matching frontend page, for example:
   - `frontend/src/pages/cafe/Events.tsx`

## 14. Current Improvement Direction

The recommended refactor path is:

1. Keep runtime stable.
2. Strengthen the park-only route and model path.
3. Migrate frontend calls from `/restaurant/*` to `/park/*`.
4. Rename `restaurant_*` endpoint/model files later when the runtime is stable.
5. Split `backend/app/models/restaurant.py` into smaller domain files later.
6. Gradually isolate or archive legacy hotel/cafe code.

## 15. One-Sentence Summary

This project is now an adventure park admin system running on a codebase with
restaurant/hotel/cafe history, so new work should follow the active park path
from `frontend -> restaurantApi (for now) -> /api/v1/park/* or compatibility /restaurant/* -> backend park logic -> park_* tables -> remote MySQL`.
