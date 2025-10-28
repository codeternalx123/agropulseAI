from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import requests
import base64
import json
from app.services import persistence

router = APIRouter()

# ============================================================================
# M-PESA DARAJA API CONFIGURATION
# ============================================================================

MPESA_CONFIG = {
    "consumer_key": "YOUR_CONSUMER_KEY",  # Get from Safaricom Developer Portal
    "consumer_secret": "YOUR_CONSUMER_SECRET",
    "business_short_code": "174379",  # Your PayBill/Till Number
    "passkey": "YOUR_PASSKEY",  # Get from Daraja Portal
    "callback_url": "https://yourdomain.com/api/subscription/mpesa-callback",
    "environment": "sandbox"  # or "production"
}

# API URLs
MPESA_URLS = {
    "sandbox": {
        "oauth": "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        "stk_push": "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    },
    "production": {
        "oauth": "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        "stk_push": "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    }
}


# ============================================================================
# SUBSCRIPTION TIERS
# ============================================================================

SUBSCRIPTION_TIERS = {
    "FREE": {
        "name": "Basic",
        "price": 0,
        "duration_days": 0,
        "features": [
            "Standard weather alerts",
            "Basic pest alerts",
            "Camera-scan diagnosis (low confidence)",
            "Community village groups",
            "Basic calendar"
        ]
    },
    "PRO": {
        "name": "Pro Farmer",
        "price": 250,
        "duration_days": 30,
        "features": [
            "All FREE features",
            "Yield & profit forecasting",
            "Priority action plan alerts",
            "Premium market access alerts",
            "Advanced growth tracking",
            "What-if scenarios"
        ]
    },
    "EXPERT": {
        "name": "Expert",
        "price": 750,
        "duration_days": 30,
        "features": [
            "All PRO features",
            "Custom fertilizer/soil blending",
            "Priority expert triage (2hr response)",
            "Agri-reliability score for credit",
            "Spectral plant health analysis",
            "Pre-symptomatic deficiency alerts",
            "High-frequency storage monitoring"
        ]
    }
}

PAY_PER_SERVICE = {
    "EXPERT_DIAGNOSIS": {
        "name": "Expert Diagnosis",
        "price": 50,
        "description": "One photo forwarded to human expert"
    },
    "CUSTOM_BLEND": {
        "name": "Custom Fertilizer Plan",
        "price": 50,
        "description": "One custom soil blending plan"
    },
    "IOT_INTEGRATION": {
        "name": "IoT Integration Setup",
        "price": 100,
        "description": "API key for third-party sensor integration"
    }
}


# ============================================================================
# MODELS
# ============================================================================

class STKPushRequest(BaseModel):
    phone_number: str
    amount: int
    account_reference: str
    transaction_desc: str


class SubscriptionRequest(BaseModel):
    phone_number: str
    tier: str  # PRO or EXPERT
    duration: str = "monthly"  # monthly or annual


class PayPerServiceRequest(BaseModel):
    phone_number: str
    service_type: str  # EXPERT_DIAGNOSIS, CUSTOM_BLEND, IOT_INTEGRATION


class MPESACallback(BaseModel):
    Body: dict


class SubscriptionStatus(BaseModel):
    user_id: str
    subscription_tier: str
    is_active: bool
    expiry_date: Optional[datetime]
    features: List[str]
    agri_reliability_score: Optional[float]


# ============================================================================
# M-PESA INTEGRATION FUNCTIONS
# ============================================================================

def get_mpesa_access_token():
    """Get OAuth access token from M-Pesa"""
    env = MPESA_CONFIG["environment"]
    url = MPESA_URLS[env]["oauth"]
    
    # Create basic auth header
    auth_string = f"{MPESA_CONFIG['consumer_key']}:{MPESA_CONFIG['consumer_secret']}"
    auth_bytes = auth_string.encode('ascii')
    auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
    
    headers = {
        "Authorization": f"Basic {auth_b64}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get M-Pesa token: {str(e)}")


def generate_password():
    """Generate M-Pesa API password"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    data_to_encode = f"{MPESA_CONFIG['business_short_code']}{MPESA_CONFIG['passkey']}{timestamp}"
    encoded = base64.b64encode(data_to_encode.encode()).decode('utf-8')
    return encoded, timestamp


def initiate_stk_push(phone_number: str, amount: int, account_ref: str, description: str):
    """
    Initiate STK Push to customer's phone
    
    Args:
        phone_number: Customer phone in format 254XXXXXXXXX
        amount: Amount to charge
        account_ref: Reference (e.g., subscription tier)
        description: Transaction description
    """
    access_token = get_mpesa_access_token()
    password, timestamp = generate_password()
    env = MPESA_CONFIG["environment"]
    
    # Format phone number
    if phone_number.startswith('0'):
        phone_number = '254' + phone_number[1:]
    elif phone_number.startswith('+'):
        phone_number = phone_number[1:]
    
    payload = {
        "BusinessShortCode": MPESA_CONFIG["business_short_code"],
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone_number,
        "PartyB": MPESA_CONFIG["business_short_code"],
        "PhoneNumber": phone_number,
        "CallBackURL": MPESA_CONFIG["callback_url"],
        "AccountReference": account_ref,
        "TransactionDesc": description
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    url = MPESA_URLS[env]["stk_push"]
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STK Push failed: {str(e)}")


# ============================================================================
# SUBSCRIPTION MANAGEMENT
# ============================================================================

def check_subscription_access(user_id: str, required_tier: str) -> bool:
    """
    Check if user has access to a premium feature
    
    Args:
        user_id: User ID
        required_tier: Minimum tier required (PRO or EXPERT)
    """
    user = persistence.get_user_by_id(user_id)
    
    if not user:
        return False
    
    subscription_tier = user.get("subscription_tier", "FREE")
    expiry_date = user.get("subscription_expiry")
    
    # Check if subscription is active
    if expiry_date:
        if datetime.fromisoformat(expiry_date) < datetime.utcnow():
            # Subscription expired
            return False
    
    # Check tier hierarchy: FREE < PRO < EXPERT
    tier_hierarchy = {"FREE": 0, "PRO": 1, "EXPERT": 2}
    user_level = tier_hierarchy.get(subscription_tier, 0)
    required_level = tier_hierarchy.get(required_tier, 1)
    
    return user_level >= required_level


def calculate_agri_reliability_score(user_id: str) -> float:
    """
    Calculate farmer's Agri-Reliability Score (0-100)
    
    Factors:
    - Successful harvests (30%)
    - Following AI recommendations (25%)
    - Timely planting/practices (20%)
    - Community engagement (15%)
    - Account age (10%)
    """
    user = persistence.get_user_by_id(user_id)
    
    # Placeholder calculation - implement based on actual data
    score = 0.0
    
    # Successful harvests
    harvests = persistence.get_user_harvests(user_id)
    successful_harvests = len([h for h in harvests if h.get("success_rate", 0) > 0.7])
    score += min((successful_harvests / 5) * 30, 30)  # Max 30 points
    
    # Following recommendations
    practices_followed = persistence.get_practices_completed(user_id)
    if practices_followed:
        compliance_rate = practices_followed.get("completion_rate", 0)
        score += compliance_rate * 25  # Max 25 points
    
    # Timely actions
    timely_actions = persistence.get_timely_actions_count(user_id)
    score += min((timely_actions / 20) * 20, 20)  # Max 20 points
    
    # Community engagement
    posts_count = persistence.get_user_posts_count(user_id)
    score += min((posts_count / 10) * 15, 15)  # Max 15 points
    
    # Account age (months)
    account_age = persistence.get_account_age_months(user_id)
    score += min((account_age / 12) * 10, 10)  # Max 10 points
    
    return round(min(score, 100), 2)


# ============================================================================
# ROUTES
# ============================================================================

@router.get("/tiers")
async def get_subscription_tiers():
    """Get all available subscription tiers and pricing"""
    return {
        "subscriptions": SUBSCRIPTION_TIERS,
        "pay_per_service": PAY_PER_SERVICE
    }


@router.post("/subscribe")
async def subscribe_to_tier(request: SubscriptionRequest):
    """
    Initiate subscription purchase via M-Pesa STK Push
    """
    tier = request.tier.upper()
    
    if tier not in ["PRO", "EXPERT"]:
        raise HTTPException(status_code=400, detail="Invalid subscription tier")
    
    tier_info = SUBSCRIPTION_TIERS[tier]
    amount = tier_info["price"]
    
    # Apply discount for annual subscriptions
    if request.duration == "annual":
        amount = int(amount * 10)  # 10 months price for 12 months
    
    try:
        result = initiate_stk_push(
            phone_number=request.phone_number,
            amount=amount,
            account_ref=f"SUB_{tier}",
            description=f"AgroShield {tier_info['name']} Subscription"
        )
        
        return {
            "success": True,
            "message": "STK Push sent to your phone. Please enter your M-Pesa PIN.",
            "checkout_request_id": result.get("CheckoutRequestID"),
            "merchant_request_id": result.get("MerchantRequestID")
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pay-per-service")
async def purchase_service(request: PayPerServiceRequest):
    """
    Purchase a one-time service via M-Pesa STK Push
    """
    service_type = request.service_type.upper()
    
    if service_type not in PAY_PER_SERVICE:
        raise HTTPException(status_code=400, detail="Invalid service type")
    
    service_info = PAY_PER_SERVICE[service_type]
    
    try:
        result = initiate_stk_push(
            phone_number=request.phone_number,
            amount=service_info["price"],
            account_ref=f"SVC_{service_type}",
            description=f"AgroShield {service_info['name']}"
        )
        
        return {
            "success": True,
            "message": "STK Push sent to your phone. Please enter your M-Pesa PIN.",
            "checkout_request_id": result.get("CheckoutRequestID"),
            "service": service_info["name"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mpesa-callback")
async def mpesa_callback(callback: dict):
    """
    Handle M-Pesa payment callback
    """
    try:
        # Extract callback data
        result_code = callback["Body"]["stkCallback"]["ResultCode"]
        
        if result_code == 0:
            # Payment successful
            callback_metadata = callback["Body"]["stkCallback"]["CallbackMetadata"]["Item"]
            
            # Extract transaction details
            amount = next(item["Value"] for item in callback_metadata if item["Name"] == "Amount")
            mpesa_receipt = next(item["Value"] for item in callback_metadata if item["Name"] == "MpesaReceiptNumber")
            phone_number = next(item["Value"] for item in callback_metadata if item["Name"] == "PhoneNumber")
            
            merchant_request_id = callback["Body"]["stkCallback"]["MerchantRequestID"]
            checkout_request_id = callback["Body"]["stkCallback"]["CheckoutRequestID"]
            
            # Get user by phone number
            user = persistence.get_user_by_phone(str(phone_number))
            
            if user:
                # Determine what was purchased (from account reference)
                # This would be stored when initiating the transaction
                
                # Update user subscription
                if amount in [250, 2500]:  # PRO tier
                    tier = "PRO"
                elif amount in [750, 7500]:  # EXPERT tier
                    tier = "EXPERT"
                else:
                    tier = "SERVICE"  # One-time service
                
                if tier in ["PRO", "EXPERT"]:
                    # Calculate expiry date
                    duration_days = SUBSCRIPTION_TIERS[tier]["duration_days"]
                    if amount > 1000:  # Annual subscription
                        duration_days = 365
                    
                    expiry_date = datetime.utcnow() + timedelta(days=duration_days)
                    
                    # Update user subscription
                    persistence.update_user_subscription(
                        user_id=user["id"],
                        tier=tier,
                        expiry_date=expiry_date.isoformat(),
                        transaction_id=mpesa_receipt
                    )
                    
                    # Calculate and store Agri-Reliability Score
                    if tier == "EXPERT":
                        score = calculate_agri_reliability_score(user["id"])
                        persistence.update_agri_reliability_score(user["id"], score)
                
                # Log transaction
                persistence.log_transaction({
                    "user_id": user["id"],
                    "amount": amount,
                    "mpesa_receipt": mpesa_receipt,
                    "phone_number": phone_number,
                    "merchant_request_id": merchant_request_id,
                    "checkout_request_id": checkout_request_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            return {"ResultCode": 0, "ResultDesc": "Success"}
        
        else:
            # Payment failed
            return {"ResultCode": result_code, "ResultDesc": "Payment failed"}
    
    except Exception as e:
        print(f"Callback error: {e}")
        return {"ResultCode": 1, "ResultDesc": "Internal error"}


@router.get("/status/{user_id}")
async def get_subscription_status(user_id: str):
    """
    Get user's subscription status and features
    """
    user = persistence.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier = user.get("subscription_tier", "FREE")
    expiry_date = user.get("subscription_expiry")
    
    # Check if expired
    is_active = True
    if expiry_date:
        is_active = datetime.fromisoformat(expiry_date) > datetime.utcnow()
        if not is_active:
            tier = "FREE"
    
    # Get Agri-Reliability Score
    score = None
    if tier == "EXPERT":
        score = calculate_agri_reliability_score(user_id)
    
    return SubscriptionStatus(
        user_id=user_id,
        subscription_tier=tier,
        is_active=is_active,
        expiry_date=expiry_date,
        features=SUBSCRIPTION_TIERS[tier]["features"],
        agri_reliability_score=score
    )


@router.get("/transactions/{user_id}")
async def get_user_transactions(user_id: str):
    """
    Get user's transaction history
    """
    transactions = persistence.get_user_transactions(user_id)
    return {"transactions": transactions}


@router.get("/reliability-score/{user_id}")
async def get_reliability_score(user_id: str):
    """
    Get farmer's Agri-Reliability Score
    """
    # Check if user has EXPERT subscription
    if not check_subscription_access(user_id, "EXPERT"):
        raise HTTPException(
            status_code=403,
            detail="Agri-Reliability Score is only available for EXPERT tier subscribers"
        )
    
    score = calculate_agri_reliability_score(user_id)
    
    # Get score breakdown
    breakdown = {
        "total_score": score,
        "successful_harvests": 0,
        "recommendation_compliance": 0,
        "timely_actions": 0,
        "community_engagement": 0,
        "account_age": 0
    }
    
    return {
        "score": score,
        "breakdown": breakdown,
        "credit_status": "Excellent" if score > 80 else "Good" if score > 60 else "Fair"
    }


@router.post("/check-access")
async def check_feature_access(user_id: str, feature_tier: str):
    """
    Check if user has access to a premium feature
    """
    has_access = check_subscription_access(user_id, feature_tier)
    
    return {
        "has_access": has_access,
        "required_tier": feature_tier,
        "message": "Access granted" if has_access else f"Upgrade to {feature_tier} to access this feature"
    }
