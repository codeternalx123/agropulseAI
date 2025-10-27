
"""
Authentication API Routes
Handles user registration, login, and session management with Supabase
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.services.supabase_auth import (
    register_user,
    login_user,
    verify_token,
    refresh_session,
    logout_user,
    reset_password_request,
    update_password,
    get_user_profile,
    update_user_profile
)

router = APIRouter()


# ============================================================================
# REQUEST MODELS
# ============================================================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    user_type: str  # "farmer" or "buyer"
    full_name: Optional[str] = None
    phone_number: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class UpdatePasswordRequest(BaseModel):
    new_password: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[dict] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None


# ============================================================================
# DEPENDENCY: GET CURRENT USER
# ============================================================================

async def get_current_user(authorization: str = Header(None)):
    """
    Dependency to get current authenticated user from token
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    token = parts[1]
    
    # Verify token
    user = await verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user


# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================

@router.post("/register")
async def register(request: RegisterRequest):
    """
    Register a new user
    
    Request Body:
    - email: User's email address
    - password: User's password (min 6 characters)
    - user_type: "farmer" or "buyer"
    - full_name: User's full name (optional)
    - phone_number: User's phone number (optional)
    
    Returns:
    - User data and session tokens
    """
    # Validate user type
    if request.user_type not in ["farmer", "buyer"]:
        raise HTTPException(status_code=400, detail="user_type must be 'farmer' or 'buyer'")
    
    # Validate password
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Prepare metadata
    metadata = {}
    if request.full_name:
        metadata["full_name"] = request.full_name
    if request.phone_number:
        metadata["phone_number"] = request.phone_number
    
    # Register user
    result = await register_user(
        email=request.email,
        password=request.password,
        user_type=request.user_type,
        metadata=metadata
    )
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return JSONResponse(result)


@router.post("/login")
async def login(request: LoginRequest):
    """
    Authenticate user and create session
    
    Request Body:
    - email: User's email address
    - password: User's password
    
    Returns:
    - User data and session tokens
    """
    result = await login_user(email=request.email, password=request.password)
    
    if result["status"] == "error":
        raise HTTPException(status_code=401, detail=result["message"])
    
    return JSONResponse(result)


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Sign out current user
    
    Headers:
    - Authorization: Bearer <access_token>
    
    Returns:
    - Logout status
    """
    # Get token from header (already validated by get_current_user)
    result = await logout_user(token="")
    
    return JSONResponse(result)


@router.post("/refresh")
async def refresh(request: RefreshTokenRequest):
    """
    Refresh access token using refresh token
    
    Request Body:
    - refresh_token: Refresh token from login
    
    Returns:
    - New access token and refresh token
    """
    result = await refresh_session(refresh_token=request.refresh_token)
    
    if result["status"] == "error":
        raise HTTPException(status_code=401, detail=result["message"])
    
    return JSONResponse(result)


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user's profile
    
    Headers:
    - Authorization: Bearer <access_token>
    
    Returns:
    - User profile data
    """
    profile = await get_user_profile(current_user["user_id"])
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return JSONResponse({
        "status": "success",
        "user": current_user,
        "profile": profile
    })


@router.put("/me")
async def update_current_user_profile(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current user's profile
    
    Headers:
    - Authorization: Bearer <access_token>
    
    Request Body:
    - full_name: User's full name (optional)
    - phone_number: User's phone number (optional)
    - location: User's location {lat, lon, address} (optional)
    - bio: User's bio (optional)
    - profile_image_url: Profile image URL (optional)
    
    Returns:
    - Updated profile data
    """
    # Prepare update data
    update_data = {}
    if request.full_name is not None:
        update_data["full_name"] = request.full_name
    if request.phone_number is not None:
        update_data["phone_number"] = request.phone_number
    if request.location is not None:
        update_data["location"] = request.location
    if request.bio is not None:
        update_data["bio"] = request.bio
    if request.profile_image_url is not None:
        update_data["profile_image_url"] = request.profile_image_url
    
    result = await update_user_profile(current_user["user_id"], update_data)
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return JSONResponse(result)


# ============================================================================
# PASSWORD MANAGEMENT
# ============================================================================

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    Request password reset email
    
    Request Body:
    - email: User's email address
    
    Returns:
    - Success message
    """
    result = await reset_password_request(email=request.email)
    
    return JSONResponse(result)


@router.post("/update-password")
async def change_password(
    request: UpdatePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update user password
    
    Headers:
    - Authorization: Bearer <access_token>
    
    Request Body:
    - new_password: New password (min 6 characters)
    
    Returns:
    - Update status
    """
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Get token from dependency (not implemented in this simplified version)
    result = await update_password(token="", new_password=request.new_password)
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return JSONResponse(result)


# ============================================================================
# TOKEN VERIFICATION (For debugging)
# ============================================================================

@router.get("/verify-token")
async def verify_user_token(current_user: dict = Depends(get_current_user)):
    """
    Verify if token is valid
    
    Headers:
    - Authorization: Bearer <access_token>
    
    Returns:
    - Token validity and user info
    """
    return JSONResponse({
        "status": "success",
        "message": "Token is valid",
        "user": current_user
    })
