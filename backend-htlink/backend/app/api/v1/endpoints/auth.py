from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Header, Form
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import SessionDep, get_current_user, CurrentUser
from app.core import security
from app.core.config import settings
from app.core.security import get_client_ip
from app.models import AdminUser, Tenant
from app.models.activity_log import ActivityLog, ActivityType
from app.utils.activity_logger import log_activity
from app import crud


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_info: dict[str, Any]
    tenant_info: dict[str, Any]


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


router = APIRouter()


def _log_auth_activity_if_new(
    session: SessionDep,
    user_id: int,
    activity_type: ActivityType,
    username: str,
    client_ip: str,
) -> None:
    """Avoid duplicate login/logout audit rows created within a short burst."""
    action_label = "logged in" if activity_type == ActivityType.LOGIN else "logged out"
    dedupe_window_start = datetime.utcnow() - timedelta(seconds=10)
    recent_entry = session.exec(
        select(ActivityLog).where(
            ActivityLog.user_id == user_id,
            ActivityLog.action == activity_type.value,
            ActivityLog.ip_address == client_ip,
            ActivityLog.created_at >= dedupe_window_start,
        ).order_by(ActivityLog.created_at.desc())
    ).first()

    if recent_entry:
        return

    log_activity(
        db=session,
        activity_type=activity_type,
        details={
            "message": f"User {username} {action_label} from {client_ip}",
            "user_id": user_id,
            "username": username,
            "ip_address": client_ip,
        },
        ip_address=client_ip,
    )


@router.post("/login")
async def login(
    request: Request,
    session: SessionDep,
    username: str | None = Form(default=None),
    password: str | None = Form(default=None),
    tenant_code: str | None = Form(default=None),
    x_tenant_code: str | None = Header(default=None, alias="X-Tenant-Code"),
):
    """
    Login endpoint with username/password authentication
    
    POST /api/v1/auth/login
    Form data:
    - username: test@park.com
    - password: use the configured FIRST_SUPERUSER_PASSWORD value
    
    Backend automatically finds the correct tenant for the user
    Returns access token for external apps to use
    """
    body_username = username
    body_password = password
    body_tenant_code = tenant_code

    if body_username is None or body_password is None:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                payload = await request.json()
            except Exception:
                payload = {}
            body_username = body_username or payload.get("username") or payload.get("email")
            body_password = body_password or payload.get("password")
            body_tenant_code = body_tenant_code or payload.get("tenant_code")

    tenant_code_value = x_tenant_code or body_tenant_code
    tenant_id = None
    if tenant_code_value:
        tenant = crud.tenant.get_by_code(session, code=tenant_code_value)
        if not tenant:
            raise HTTPException(
                status_code=404,
                detail=f"Tenant '{tenant_code_value}' not found"
            )
        tenant_id = tenant.id

    if not body_username or not body_password:
        raise HTTPException(
            status_code=400,
            detail="Username and password are required"
        )

    user = crud.admin_user.authenticate(
        db=session,
        email=body_username,
        password=body_password,
        tenant_id=tenant_id,
    )
    
    # If no tenant specified, try to find user across all tenants
    if not user and tenant_id is None:
        # Get all users with this email
        from sqlmodel import select
        users = session.exec(select(AdminUser).where(AdminUser.email == body_username)).all()
        # Find active user
        for u in users:
            if u.is_active and security.verify_password(body_password, u.password_hash):
                user = u
                break
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=400, 
            detail="Inactive user"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=str(user.id), 
        expires_delta=access_token_expires
    )
    
    # Get client IP
    client_ip = get_client_ip(request)
    
    _log_auth_activity_if_new(
        session=session,
        user_id=user.id,
        activity_type=ActivityType.LOGIN,
        username=user.email,
        client_ip=client_ip,
    )

    tenant = session.get(Tenant, user.tenant_id) if user.tenant_id else None
    
    # Return token with user info
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_info": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "tenant_id": user.tenant_id or 1  # Default to 1 if null
        },
        "tenant_info": {
            "id": tenant.id if tenant else user.tenant_id,
            "code": tenant.code if tenant else None,
            "name": tenant.name if tenant else None,
        },
    }


@router.get("/auto-token", response_model=Token)
def auto_generate_token_for_docs(
    session: SessionDep,
    tenant_code: str = "demo"
) -> Token:
    """
    Auto-generate token for API docs "Authorize" button
    This saves token to localStorage for external apps to use
    """
    # Get tenant by code
    tenant = session.exec(
        select(Tenant).where(Tenant.code == tenant_code)
    ).first()
    
    if not tenant:
        raise HTTPException(status_code=400, detail=f"Tenant '{tenant_code}' not found")
    
    # Get default admin user for this tenant
    user = session.exec(
        select(AdminUser).where(
            AdminUser.email == settings.FIRST_SUPERUSER,
            AdminUser.tenant_id == tenant.id
        )
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Default admin user not found")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Default admin user is inactive")
    
    # Create token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/logout")
def logout(
    request: Request,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Logout endpoint - logs the logout activity
    
    POST /api/v1/auth/logout
    Requires valid authentication token
    """
    # Get client IP
    client_ip = get_client_ip(request)
    
    _log_auth_activity_if_new(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.LOGOUT,
        username=current_user.email,
        client_ip=client_ip,
    )
    
    # In a stateless JWT system, logout is handled client-side by discarding the token
    # No server-side session cleanup needed
    return {"message": "Successfully logged out"}


@router.get("/me/services")
def get_user_services(
    session: SessionDep,
    current_user: CurrentUser
):
    """
    Get current user's service access configuration
    
    UPDATED: Cafe-only system - always returns cafe service
    
    Returns:
    - service_access: 0 (kept for backward compatibility)
    - available_services: ["cafe"] (always)
    
    GET /api/v1/auth/me/services
    Requires valid authentication token
    """
    # Cafe-only system - always return cafe service
    return {
        "service_access": 0,  # Kept for backward compatibility
        "available_services": ["cafe"],  # Always cafe
        "user_id": current_user.id,
        "email": current_user.email
    }

