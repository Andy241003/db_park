from typing import Any, Optional
import logging

from sqlmodel import Session

from app.core.config import settings
from app.models.activity_log import ActivityLog, ActivityType

logger = logging.getLogger(__name__)


def _activity_logging_disabled() -> bool:
    # Local development in this repo currently talks to a remote DB and
    # synchronous audit-log writes are causing save operations to hang.
    return settings.ENVIRONMENT == "local"


def log_activity(
    db: Session,
    activity_type: ActivityType,
    details: dict = None,
    ip_address: str = None,
) -> Optional[ActivityLog]:
    """
    Log an activity to the database safely.
    """
    if _activity_logging_disabled():
        return None

    try:
        activity_details = details or {}
        user_id = activity_details.get("user_id")

        activity_log = ActivityLog(
            user_id=user_id,
            action=activity_type.value,
            resource_type="auth",
            resource_id=None,
            details_json=activity_details,
            ip_address=ip_address,
            user_agent=None,
        )
        db.add(activity_log)
        db.commit()
        db.refresh(activity_log)
        return activity_log
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to log activity {activity_type.value}: {e}")
        return None


def log_user_activity(
    db: Session,
    current_user: Any,
    activity_type: ActivityType,
    message: str,
    *,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    extra_details: Optional[dict] = None,
) -> Optional[ActivityLog]:
    """
    Convenience wrapper for activity logs tied to the current authenticated user.
    """
    if _activity_logging_disabled():
        return None

    try:
        activity_details = dict(extra_details or {})
        activity_details.setdefault("message", message)
        activity_details.setdefault("user_id", getattr(current_user, "id", None))
        activity_details.setdefault("username", getattr(current_user, "email", "unknown"))

        activity_log = ActivityLog(
            user_id=getattr(current_user, "id", None),
            action=activity_type.value,
            resource_type=resource_type,
            resource_id=resource_id,
            details_json=activity_details,
            ip_address=ip_address,
            user_agent=None,
        )
        db.add(activity_log)
        db.commit()
        db.refresh(activity_log)
        return activity_log
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to log user activity {activity_type.value}: {e}")
        return None
