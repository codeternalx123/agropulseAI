"""
Feature Access Control Middleware
Enforces subscription-based feature access across all routes
"""

from functools import wraps
from fastapi import HTTPException, Header
from typing import Optional, Callable, TYPE_CHECKING

# Lazy import to avoid circular dependency with payments.py
if TYPE_CHECKING:
    from app.routes.payments import check_feature_access, check_usage_limit

def _get_payment_helpers():
    """Lazy load payment helper functions to avoid circular imports"""
    from app.routes.payments import check_feature_access, check_usage_limit
    return check_feature_access, check_usage_limit

# ============================================================================
# DECORATORS FOR FEATURE ACCESS CONTROL
# ============================================================================

def require_feature(feature_name: str):
    """
    Decorator to enforce feature access control
    
    Usage:
        @router.get("/premium-endpoint")
        @require_feature("yield_forecasting")
        async def get_forecast(user_id: str):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, user_id: str = None, **kwargs):
            if not user_id:
                raise HTTPException(
                    status_code=401,
                    detail="User ID required"
                )
            
            check_feature_access, _ = _get_payment_helpers()
            access_check = check_feature_access(user_id, feature_name)
            
            if not access_check["has_access"]:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "Feature not available",
                        "reason": access_check["reason"],
                        "upgrade_tier": access_check["upgrade_tier"],
                        "current_tier": access_check["current_tier"]
                    }
                )
            
            return await func(*args, user_id=user_id, **kwargs)
        
        return wrapper
    return decorator


def require_tier(minimum_tier: str):
    """
    Decorator to enforce minimum subscription tier
    
    Usage:
        @router.get("/pro-endpoint")
        @require_tier("PRO")
        async def pro_feature(user_id: str):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, user_id: str = None, **kwargs):
            if not user_id:
                raise HTTPException(
                    status_code=401,
                    detail="User ID required"
                )
            
            from app.services import persistence
            user = persistence.get_user_by_id(user_id)
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            tier_hierarchy = {"FREE": 0, "PRO": 1, "EXPERT": 2}
            user_tier = user.get("subscription_tier", "FREE")
            
            user_level = tier_hierarchy.get(user_tier, 0)
            required_level = tier_hierarchy.get(minimum_tier, 1)
            
            if user_level < required_level:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "Insufficient subscription tier",
                        "current_tier": user_tier,
                        "required_tier": minimum_tier
                    }
                )
            
            return await func(*args, user_id=user_id, **kwargs)
        
        return wrapper
    return decorator


def check_limit(limit_type: str):
    """
    Decorator to enforce usage limits
    
    Usage:
        @router.post("/scan")
        @check_limit("max_scans_per_month")
        async def scan_plant(user_id: str):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, user_id: str = None, **kwargs):
            if not user_id:
                raise HTTPException(
                    status_code=401,
                    detail="User ID required"
                )
            
            _, check_usage_limit = _get_payment_helpers()
            limit_check = check_usage_limit(user_id, limit_type)
            
            if not limit_check["within_limit"]:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "Usage limit exceeded",
                        "current_usage": limit_check["current_usage"],
                        "max_limit": limit_check["max_limit"],
                        "upgrade_tier": limit_check.get("upgrade_tier")
                    }
                )
            
            # Increment usage counter
            from app.services import persistence
            user = persistence.get_user_by_id(user_id)
            current_usage = user.get(f"usage_{limit_type}", 0)
            persistence.update_user(user_id, {
                f"usage_{limit_type}": current_usage + 1
            })
            
            return await func(*args, user_id=user_id, **kwargs)
        
        return wrapper
    return decorator


# ============================================================================
# FEATURE-SPECIFIC GUARDS
# ============================================================================

class FeatureGuard:
    """
    Context manager for feature access checks
    
    Usage:
        with FeatureGuard(user_id, "yield_forecasting"):
            # Your premium feature code here
            pass
    """
    
    def __init__(self, user_id: str, feature_name: str):
        self.user_id = user_id
        self.feature_name = feature_name
    
    def __enter__(self):
        check_feature_access, _ = _get_payment_helpers()
        access_check = check_feature_access(self.user_id, self.feature_name)
        
        if not access_check["has_access"]:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "Feature not available",
                    "reason": access_check["reason"],
                    "upgrade_tier": access_check["upgrade_tier"],
                    "current_tier": access_check["current_tier"]
                }
            )
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass


# ============================================================================
# RESPONSE MODIFIERS BASED ON TIER
# ============================================================================

def filter_response_by_tier(user_id: str, response: dict, feature_filters: dict) -> dict:
    """
    Filter API response based on user's subscription tier
    
    Args:
        user_id: User ID
        response: Full API response
        feature_filters: Dict mapping features to response keys to filter
            Example: {
                "advanced_weather_forecast": ["hourly_forecast", "precipitation_detail"],
                "climate_prediction": ["climate_trends", "long_term_forecast"]
            }
    
    Returns:
        Filtered response based on user's features
    """
    from app.services import persistence
    user = persistence.get_user_by_id(user_id)
    
    if not user:
        return response
    
    subscription_tier = user.get("subscription_tier", "FREE")
    
    from app.routes.payments import SUBSCRIPTION_TIERS
    user_features = SUBSCRIPTION_TIERS[subscription_tier]["features"]
    
    filtered_response = response.copy()
    
    for feature, keys_to_remove in feature_filters.items():
        if not user_features.get(feature, False):
            for key in keys_to_remove:
                filtered_response.pop(key, None)
    
    return filtered_response


def add_upgrade_prompt(response: dict, feature_name: str, upgrade_tier: str) -> dict:
    """
    Add upgrade prompt to response for locked features
    """
    response["_upgrade_available"] = {
        "feature": feature_name,
        "message": f"Upgrade to {upgrade_tier} to unlock this feature",
        "upgrade_tier": upgrade_tier
    }
    return response


# ============================================================================
# STORAGE MONITORING INTERVAL ENFORCER
# ============================================================================

def get_storage_monitoring_interval(user_id: str) -> int:
    """
    Get storage monitoring interval in minutes based on subscription tier
    
    Returns:
        - FREE: 1440 (daily)
        - PRO: 60 (hourly)
        - EXPERT: 5 (5 minutes)
    """
    from app.services import persistence
    from app.routes.payments import SUBSCRIPTION_TIERS
    
    user = persistence.get_user_by_id(user_id)
    
    if not user:
        return 1440  # Default to FREE tier
    
    subscription_tier = user.get("subscription_tier", "FREE")
    return SUBSCRIPTION_TIERS[subscription_tier]["features"]["storage_interval_minutes"]


# ============================================================================
# DIAGNOSTIC CONFIDENCE THRESHOLD ENFORCER
# ============================================================================

def get_confidence_threshold(user_id: str) -> float:
    """
    Get minimum confidence threshold for showing diagnosis results
    
    Returns:
        - FREE: 0.7 (70% - only high confidence)
        - PRO: 0.5 (50% - medium confidence)
        - EXPERT: 0.3 (30% - low confidence, more insights)
    """
    from app.services import persistence
    
    user = persistence.get_user_by_id(user_id)
    
    if not user:
        return 0.7  # Default to FREE tier
    
    subscription_tier = user.get("subscription_tier", "FREE")
    
    thresholds = {
        "FREE": 0.7,
        "PRO": 0.5,
        "EXPERT": 0.3
    }
    
    return thresholds.get(subscription_tier, 0.7)


def filter_diagnosis_by_confidence(user_id: str, diagnosis_results: list) -> list:
    """
    Filter diagnosis results based on user's confidence threshold
    """
    threshold = get_confidence_threshold(user_id)
    
    return [
        result for result in diagnosis_results
        if result.get("confidence", 0) >= threshold
    ]
