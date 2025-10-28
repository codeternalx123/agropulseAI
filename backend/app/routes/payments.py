from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import requests
import base64
import json
import hmac
import hashlib
import stripe
from app.services import persistence

router = APIRouter()

# ============================================================================
# PAYMENT PROVIDER CONFIGURATIONS
# ============================================================================

class PaymentProvider(str, Enum):
    MPESA = "mpesa"
    STRIPE = "stripe"
    PAYPAL = "paypal"
    CRYPTO = "crypto"
    VISA = "visa"

# M-Pesa Configuration
MPESA_CONFIG = {
    "consumer_key": "YOUR_MPESA_CONSUMER_KEY",
    "consumer_secret": "YOUR_MPESA_CONSUMER_SECRET",
    "business_short_code": "174379",
    "passkey": "YOUR_MPESA_PASSKEY",
    "callback_url": "https://yourdomain.com/api/payments/mpesa-callback",
    "environment": "sandbox"
}

# Stripe Configuration
STRIPE_CONFIG = {
    "secret_key": "sk_test_YOUR_STRIPE_SECRET_KEY",
    "publishable_key": "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY",
    "webhook_secret": "whsec_YOUR_WEBHOOK_SECRET"
}
stripe.api_key = STRIPE_CONFIG["secret_key"]

# PayPal Configuration
PAYPAL_CONFIG = {
    "client_id": "YOUR_PAYPAL_CLIENT_ID",
    "client_secret": "YOUR_PAYPAL_CLIENT_SECRET",
    "mode": "sandbox",  # or "live"
    "webhook_id": "YOUR_WEBHOOK_ID"
}

PAYPAL_URLS = {
    "sandbox": {
        "api": "https://api-m.sandbox.paypal.com",
        "oauth": "https://api-m.sandbox.paypal.com/v1/oauth2/token"
    },
    "live": {
        "api": "https://api-m.paypal.com",
        "oauth": "https://api-m.paypal.com/v1/oauth2/token"
    }
}

# Crypto Payment Configuration (using CoinGate or similar)
CRYPTO_CONFIG = {
    "api_key": "YOUR_COINGATE_API_KEY",
    "api_url": "https://api.coingate.com/v2",
    "callback_url": "https://yourdomain.com/api/payments/crypto-callback",
    "accepted_currencies": ["BTC", "ETH", "USDT", "USDC"]
}

# Visa Direct Configuration (through payment gateway)
VISA_CONFIG = {
    "merchant_id": "YOUR_VISA_MERCHANT_ID",
    "api_key": "YOUR_VISA_API_KEY",
    "api_url": "https://sandbox.api.visa.com",
    "webhook_secret": "YOUR_VISA_WEBHOOK_SECRET"
}

# ============================================================================
# SUBSCRIPTION TIERS WITH FEATURE ACCESS CONTROL
# ============================================================================

SUBSCRIPTION_TIERS = {
    "FREE": {
        "name": "Basic",
        "price_usd": 0,
        "price_kes": 0,
        "duration_days": 0,
        "features": {
            # Weather & Climate
            "basic_weather_alerts": True,
            "advanced_weather_forecast": False,
            "climate_prediction": False,
            
            # Pest & Disease
            "basic_pest_alerts": True,
            "camera_scan_diagnosis": True,
            "low_confidence_threshold": True,
            "expert_diagnosis": False,
            "priority_expert_response": False,
            
            # Growth & Planning
            "basic_calendar": True,
            "growth_tracking": True,
            "yield_forecasting": False,
            "profit_forecasting": False,
            "what_if_scenarios": False,
            
            # Market & Pricing
            "basic_market_prices": True,
            "premium_market_alerts": False,
            "regional_market_comparison": False,
            "optimal_sale_timing": False,
            
            # Storage & Monitoring
            "basic_storage_monitoring": True,
            "storage_interval_minutes": 1440,  # Daily (24 hours)
            "storage_certificates": False,
            
            # Soil & Fertilizer
            "basic_soil_info": True,
            "custom_fertilizer_plans": False,
            "spectral_analysis": False,
            
            # Community & Support
            "village_groups": True,
            "partner_campaigns": True,
            "standard_support": True,
            
            # IoT & Integration
            "iot_integration": False,
            "api_access": False,
            
            # Limits
            "max_fields": 2,
            "max_scans_per_month": 10,
            "max_storage_devices": 1
        }
    },
    "PRO": {
        "name": "Pro Farmer",
        "price_usd": 5,
        "price_kes": 250,
        "duration_days": 30,
        "features": {
            # Weather & Climate
            "basic_weather_alerts": True,
            "advanced_weather_forecast": True,
            "climate_prediction": True,
            
            # Pest & Disease
            "basic_pest_alerts": True,
            "camera_scan_diagnosis": True,
            "low_confidence_threshold": False,
            "expert_diagnosis": False,
            "priority_expert_response": False,
            
            # Growth & Planning
            "basic_calendar": True,
            "growth_tracking": True,
            "yield_forecasting": True,
            "profit_forecasting": True,
            "what_if_scenarios": True,
            
            # Market & Pricing
            "basic_market_prices": True,
            "premium_market_alerts": True,
            "regional_market_comparison": True,
            "optimal_sale_timing": True,
            
            # Storage & Monitoring
            "basic_storage_monitoring": True,
            "storage_interval_minutes": 60,  # Hourly
            "storage_certificates": False,
            
            # Soil & Fertilizer
            "basic_soil_info": True,
            "custom_fertilizer_plans": False,
            "spectral_analysis": False,
            
            # Community & Support
            "village_groups": True,
            "partner_campaigns": True,
            "standard_support": True,
            
            # IoT & Integration
            "iot_integration": False,
            "api_access": False,
            
            # Limits
            "max_fields": 10,
            "max_scans_per_month": 50,
            "max_storage_devices": 3
        }
    },
    "EXPERT": {
        "name": "Expert",
        "price_usd": 15,
        "price_kes": 750,
        "duration_days": 30,
        "features": {
            # Weather & Climate
            "basic_weather_alerts": True,
            "advanced_weather_forecast": True,
            "climate_prediction": True,
            
            # Pest & Disease
            "basic_pest_alerts": True,
            "camera_scan_diagnosis": True,
            "low_confidence_threshold": False,
            "expert_diagnosis": True,
            "priority_expert_response": True,  # 2-hour guarantee
            
            # Growth & Planning
            "basic_calendar": True,
            "growth_tracking": True,
            "yield_forecasting": True,
            "profit_forecasting": True,
            "what_if_scenarios": True,
            
            # Market & Pricing
            "basic_market_prices": True,
            "premium_market_alerts": True,
            "regional_market_comparison": True,
            "optimal_sale_timing": True,
            
            # Storage & Monitoring
            "basic_storage_monitoring": True,
            "storage_interval_minutes": 5,  # High-frequency (5 minutes)
            "storage_certificates": True,
            
            # Soil & Fertilizer
            "basic_soil_info": True,
            "custom_fertilizer_plans": True,
            "spectral_analysis": True,
            
            # Community & Support
            "village_groups": True,
            "partner_campaigns": True,
            "standard_support": True,
            
            # IoT & Integration
            "iot_integration": True,
            "api_access": True,
            
            # Limits
            "max_fields": -1,  # Unlimited
            "max_scans_per_month": -1,  # Unlimited
            "max_storage_devices": -1,  # Unlimited
            
            # Additional
            "agri_reliability_score": True
        }
    }
}

PAY_PER_SERVICE = {
    "EXPERT_DIAGNOSIS": {
        "name": "Expert Diagnosis",
        "price_usd": 1,
        "price_kes": 50,
        "description": "One photo forwarded to human expert",
        "feature_unlock": "expert_diagnosis",
        "duration_hours": 48
    },
    "CUSTOM_BLEND": {
        "name": "Custom Fertilizer Plan",
        "price_usd": 1,
        "price_kes": 50,
        "description": "One custom soil blending plan",
        "feature_unlock": "custom_fertilizer_plans",
        "duration_hours": 168  # 7 days
    },
    "IOT_INTEGRATION": {
        "name": "IoT Integration Setup",
        "price_usd": 2,
        "price_kes": 100,
        "description": "API key for third-party sensor integration",
        "feature_unlock": "iot_integration",
        "duration_hours": 720  # 30 days
    },
    "STORAGE_CERTIFICATE": {
        "name": "Storage Quality Certificate",
        "price_usd": 1.5,
        "price_kes": 75,
        "description": "Generate storage quality certificate",
        "feature_unlock": "storage_certificates",
        "duration_hours": 1
    }
}

# ============================================================================
# PAYMENT MODELS
# ============================================================================

class PaymentRequest(BaseModel):
    user_id: str
    tier: str  # FREE, PRO, EXPERT
    duration: str = "monthly"  # monthly or annual
    provider: PaymentProvider
    currency: str = "USD"  # USD, KES, BTC, ETH, etc.
    payment_method_id: Optional[str] = None  # For Stripe
    phone_number: Optional[str] = None  # For M-Pesa
    email: Optional[str] = None  # For PayPal
    card_token: Optional[str] = None  # For Visa


class PayPerServicePayment(BaseModel):
    user_id: str
    service_type: str
    provider: PaymentProvider
    currency: str = "USD"
    payment_method_id: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None


class PaymentStatus(BaseModel):
    payment_id: str
    status: str  # pending, completed, failed, cancelled
    amount: float
    currency: str
    provider: PaymentProvider
    created_at: datetime
    completed_at: Optional[datetime]


class FeatureAccessRequest(BaseModel):
    user_id: str
    feature_name: str


# ============================================================================
# FEATURE ACCESS CONTROL
# ============================================================================

def check_feature_access(user_id: str, feature_name: str) -> Dict[str, Any]:
    """
    Check if user has access to a specific feature
    
    Returns:
        {
            "has_access": bool,
            "reason": str,
            "upgrade_tier": Optional[str],
            "current_tier": str
        }
    """
    user = persistence.get_user_by_id(user_id)
    
    if not user:
        return {
            "has_access": False,
            "reason": "User not found",
            "upgrade_tier": None,
            "current_tier": "FREE"
        }
    
    # Get user's subscription tier
    subscription_tier = user.get("subscription_tier", "FREE")
    expiry_date = user.get("subscription_expiry")
    
    # Check if subscription is active
    if expiry_date and subscription_tier != "FREE":
        if datetime.fromisoformat(expiry_date) < datetime.utcnow():
            # Subscription expired, downgrade to FREE
            subscription_tier = "FREE"
            persistence.update_user(user_id, {
                "subscription_tier": "FREE",
                "subscription_status": "EXPIRED"
            })
    
    # Check temporary feature unlocks (pay-per-service)
    temp_features = user.get("temporary_features", {})
    if feature_name in temp_features:
        unlock_expiry = datetime.fromisoformat(temp_features[feature_name])
        if unlock_expiry > datetime.utcnow():
            return {
                "has_access": True,
                "reason": "Temporary access via pay-per-service",
                "upgrade_tier": None,
                "current_tier": subscription_tier,
                "expires_at": unlock_expiry
            }
    
    # Check tier features
    tier_features = SUBSCRIPTION_TIERS[subscription_tier]["features"]
    
    if feature_name not in tier_features:
        return {
            "has_access": False,
            "reason": f"Feature '{feature_name}' not found",
            "upgrade_tier": None,
            "current_tier": subscription_tier
        }
    
    has_access = tier_features[feature_name]
    
    if has_access:
        return {
            "has_access": True,
            "reason": "Access granted",
            "upgrade_tier": None,
            "current_tier": subscription_tier
        }
    
    # Determine which tier provides this feature
    upgrade_tier = None
    for tier in ["PRO", "EXPERT"]:
        if SUBSCRIPTION_TIERS[tier]["features"].get(feature_name, False):
            upgrade_tier = tier
            break
    
    return {
        "has_access": False,
        "reason": f"Feature requires {upgrade_tier} subscription",
        "upgrade_tier": upgrade_tier,
        "current_tier": subscription_tier
    }


def check_usage_limit(user_id: str, limit_type: str) -> Dict[str, Any]:
    """
    Check if user has reached usage limits
    
    Args:
        limit_type: max_fields, max_scans_per_month, max_storage_devices
    """
    user = persistence.get_user_by_id(user_id)
    
    if not user:
        return {"within_limit": False, "reason": "User not found"}
    
    subscription_tier = user.get("subscription_tier", "FREE")
    tier_features = SUBSCRIPTION_TIERS[subscription_tier]["features"]
    
    max_limit = tier_features.get(limit_type, 0)
    
    # -1 means unlimited
    if max_limit == -1:
        return {
            "within_limit": True,
            "current_usage": user.get(f"usage_{limit_type}", 0),
            "max_limit": "Unlimited",
            "remaining": "Unlimited"
        }
    
    current_usage = user.get(f"usage_{limit_type}", 0)
    
    return {
        "within_limit": current_usage < max_limit,
        "current_usage": current_usage,
        "max_limit": max_limit,
        "remaining": max(0, max_limit - current_usage),
        "upgrade_tier": "PRO" if subscription_tier == "FREE" else "EXPERT"
    }


# ============================================================================
# M-PESA PAYMENT INTEGRATION
# ============================================================================

def get_mpesa_access_token():
    """Get OAuth access token from M-Pesa"""
    url = f"https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    
    auth_string = f"{MPESA_CONFIG['consumer_key']}:{MPESA_CONFIG['consumer_secret']}"
    auth_bytes = auth_string.encode('ascii')
    auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
    
    headers = {"Authorization": f"Basic {auth_b64}"}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"M-Pesa token failed: {str(e)}")


def process_mpesa_payment(phone_number: str, amount: int, account_ref: str, description: str):
    """Initiate M-Pesa STK Push"""
    access_token = get_mpesa_access_token()
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    
    password_string = f"{MPESA_CONFIG['business_short_code']}{MPESA_CONFIG['passkey']}{timestamp}"
    password = base64.b64encode(password_string.encode()).decode('utf-8')
    
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
    
    url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STK Push failed: {str(e)}")


# ============================================================================
# STRIPE PAYMENT INTEGRATION
# ============================================================================

def process_stripe_payment(amount: float, currency: str, payment_method_id: str, 
                          description: str, metadata: dict):
    """Process payment via Stripe"""
    try:
        # Convert to cents for USD
        if currency.upper() == "USD":
            amount_cents = int(amount * 100)
        else:
            amount_cents = int(amount)
        
        payment_intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency.lower(),
            payment_method=payment_method_id,
            description=description,
            metadata=metadata,
            confirm=True
        )
        
        return {
            "payment_id": payment_intent.id,
            "status": payment_intent.status,
            "amount": amount,
            "currency": currency
        }
    except stripe.error.CardError as e:
        raise HTTPException(status_code=400, detail=f"Card error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe payment failed: {str(e)}")


def create_stripe_subscription(customer_id: str, price_id: str, metadata: dict):
    """Create recurring subscription via Stripe"""
    try:
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            metadata=metadata
        )
        return subscription
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe subscription failed: {str(e)}")


# ============================================================================
# PAYPAL PAYMENT INTEGRATION
# ============================================================================

def get_paypal_access_token():
    """Get PayPal OAuth token"""
    mode = PAYPAL_CONFIG["mode"]
    url = PAYPAL_URLS[mode]["oauth"]
    
    auth = (PAYPAL_CONFIG["client_id"], PAYPAL_CONFIG["client_secret"])
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {"grant_type": "client_credentials"}
    
    try:
        response = requests.post(url, auth=auth, headers=headers, data=data)
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PayPal token failed: {str(e)}")


def process_paypal_payment(amount: float, currency: str, description: str, return_url: str, cancel_url: str):
    """Create PayPal order"""
    access_token = get_paypal_access_token()
    mode = PAYPAL_CONFIG["mode"]
    url = f"{PAYPAL_URLS[mode]['api']}/v2/checkout/orders"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    
    payload = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "amount": {
                "currency_code": currency,
                "value": str(amount)
            },
            "description": description
        }],
        "application_context": {
            "return_url": return_url,
            "cancel_url": cancel_url
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        order = response.json()
        
        # Get approval URL
        approval_url = next(
            link["href"] for link in order["links"] if link["rel"] == "approve"
        )
        
        return {
            "order_id": order["id"],
            "approval_url": approval_url,
            "status": order["status"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PayPal order failed: {str(e)}")


# ============================================================================
# CRYPTO PAYMENT INTEGRATION (CoinGate)
# ============================================================================

def process_crypto_payment(amount: float, currency: str, receive_currency: str, 
                          description: str, callback_url: str):
    """Create crypto payment order"""
    url = f"{CRYPTO_CONFIG['api_url']}/orders"
    
    headers = {
        "Authorization": f"Token {CRYPTO_CONFIG['api_key']}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "order_id": f"AGRO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "price_amount": amount,
        "price_currency": currency,
        "receive_currency": receive_currency,  # BTC, ETH, USDT, etc.
        "title": "AgroShield Subscription",
        "description": description,
        "callback_url": callback_url,
        "cancel_url": "https://agroshield.com/payment/cancelled",
        "success_url": "https://agroshield.com/payment/success"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        order = response.json()
        
        return {
            "payment_id": order["id"],
            "payment_url": order["payment_url"],
            "pay_amount": order["pay_amount"],
            "pay_currency": order["pay_currency"],
            "status": order["status"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crypto payment failed: {str(e)}")


# ============================================================================
# VISA PAYMENT INTEGRATION
# ============================================================================

def process_visa_payment(amount: float, currency: str, card_token: str, 
                        description: str, metadata: dict):
    """Process Visa payment (through payment gateway)"""
    url = f"{VISA_CONFIG['api_url']}/visadirect/fundstransfer/v1/pullfundstransactions"
    
    headers = {
        "Authorization": f"Bearer {VISA_CONFIG['api_key']}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "systemsTraceAuditNumber": datetime.now().strftime('%H%M%S'),
        "retrievalReferenceNumber": datetime.now().strftime('%y%m%d%H%M%S'),
        "localTransactionDateTime": datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
        "acquiringBin": "408999",
        "acquirerCountryCode": "840",
        "businessApplicationId": "AA",
        "cardAcceptor": {
            "name": "AgroShield",
            "terminalId": "AGROSH01",
            "idCode": VISA_CONFIG["merchant_id"]
        },
        "amount": amount,
        "currencyCode": currency,
        "senderCardNumber": card_token,
        "transactionIdentifier": metadata.get("transaction_id")
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        return {
            "payment_id": result.get("transactionIdentifier"),
            "status": "completed" if result.get("responseCode") == "00" else "failed",
            "amount": amount,
            "currency": currency
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visa payment failed: {str(e)}")


# ============================================================================
# API ROUTES
# ============================================================================

@router.get("/tiers")
async def get_subscription_tiers():
    """Get all subscription tiers with features and pricing"""
    return {
        "subscriptions": SUBSCRIPTION_TIERS,
        "pay_per_service": PAY_PER_SERVICE,
        "supported_providers": [provider.value for provider in PaymentProvider],
        "supported_currencies": {
            "mpesa": ["KES"],
            "stripe": ["USD", "EUR", "GBP", "KES"],
            "paypal": ["USD", "EUR", "GBP"],
            "crypto": ["BTC", "ETH", "USDT", "USDC"],
            "visa": ["USD", "EUR", "GBP"]
        }
    }


@router.post("/subscribe")
async def create_subscription(request: PaymentRequest):
    """
    Create subscription with selected payment provider
    """
    # Validate tier
    if request.tier not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail="Invalid subscription tier")
    
    tier_info = SUBSCRIPTION_TIERS[request.tier]
    
    # Get amount based on currency
    if request.currency == "KES":
        amount = tier_info["price_kes"]
    else:
        amount = tier_info["price_usd"]
    
    # Apply discount for annual
    if request.duration == "annual":
        amount = amount * 10  # 10 months price for 12 months
    
    description = f"AgroShield {tier_info['name']} - {request.duration}"
    
    # Process payment based on provider
    try:
        if request.provider == PaymentProvider.MPESA:
            if not request.phone_number:
                raise HTTPException(status_code=400, detail="Phone number required for M-Pesa")
            
            result = process_mpesa_payment(
                request.phone_number,
                int(amount),
                request.tier,
                description
            )
            
            # Store pending payment
            payment_id = result.get("CheckoutRequestID")
            persistence.store_payment({
                "payment_id": payment_id,
                "user_id": request.user_id,
                "provider": "mpesa",
                "amount": amount,
                "currency": "KES",
                "tier": request.tier,
                "duration": request.duration,
                "status": "pending",
                "created_at": datetime.utcnow().isoformat()
            })
            
            return {
                "status": "pending",
                "message": "STK Push sent to your phone. Please enter your M-Pesa PIN.",
                "payment_id": payment_id,
                "provider": "mpesa"
            }
        
        elif request.provider == PaymentProvider.STRIPE:
            if not request.payment_method_id:
                raise HTTPException(status_code=400, detail="Payment method required for Stripe")
            
            result = process_stripe_payment(
                amount,
                request.currency,
                request.payment_method_id,
                description,
                {"user_id": request.user_id, "tier": request.tier}
            )
            
            # Activate subscription immediately for successful Stripe payments
            if result["status"] == "succeeded":
                activate_subscription(request.user_id, request.tier, request.duration)
            
            return {
                "status": "completed" if result["status"] == "succeeded" else "pending",
                "message": "Payment processed successfully" if result["status"] == "succeeded" else "Payment processing",
                "payment_id": result["payment_id"],
                "provider": "stripe"
            }
        
        elif request.provider == PaymentProvider.PAYPAL:
            result = process_paypal_payment(
                amount,
                request.currency,
                description,
                f"https://agroshield.com/payment/paypal-return?user_id={request.user_id}&tier={request.tier}",
                "https://agroshield.com/payment/cancelled"
            )
            
            return {
                "status": "pending",
                "message": "Redirecting to PayPal...",
                "payment_id": result["order_id"],
                "approval_url": result["approval_url"],
                "provider": "paypal"
            }
        
        elif request.provider == PaymentProvider.CRYPTO:
            result = process_crypto_payment(
                amount,
                request.currency,
                "USDT",  # Receive in USDT for stability
                description,
                f"https://agroshield.com/api/payments/crypto-callback"
            )
            
            return {
                "status": "pending",
                "message": "Please complete crypto payment",
                "payment_id": result["payment_id"],
                "payment_url": result["payment_url"],
                "pay_amount": result["pay_amount"],
                "pay_currency": result["pay_currency"],
                "provider": "crypto"
            }
        
        elif request.provider == PaymentProvider.VISA:
            if not request.card_token:
                raise HTTPException(status_code=400, detail="Card token required for Visa")
            
            result = process_visa_payment(
                amount,
                request.currency,
                request.card_token,
                description,
                {"user_id": request.user_id, "tier": request.tier}
            )
            
            if result["status"] == "completed":
                activate_subscription(request.user_id, request.tier, request.duration)
            
            return {
                "status": result["status"],
                "message": "Payment completed" if result["status"] == "completed" else "Payment failed",
                "payment_id": result["payment_id"],
                "provider": "visa"
            }
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported payment provider")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")


@router.post("/pay-per-service")
async def purchase_service(request: PayPerServicePayment):
    """Purchase one-time service access"""
    if request.service_type not in PAY_PER_SERVICE:
        raise HTTPException(status_code=400, detail="Invalid service type")
    
    service_info = PAY_PER_SERVICE[request.service_type]
    
    # Get amount based on currency
    if request.currency == "KES":
        amount = service_info["price_kes"]
    else:
        amount = service_info["price_usd"]
    
    description = f"AgroShield {service_info['name']}"
    
    # Process payment (simplified - similar to subscribe endpoint)
    if request.provider == PaymentProvider.MPESA:
        result = process_mpesa_payment(
            request.phone_number,
            int(amount),
            request.service_type,
            description
        )
        
        return {
            "status": "pending",
            "message": "STK Push sent. Complete payment to unlock feature.",
            "payment_id": result.get("CheckoutRequestID")
        }
    
    elif request.provider == PaymentProvider.STRIPE:
        result = process_stripe_payment(
            amount,
            request.currency,
            request.payment_method_id,
            description,
            {"user_id": request.user_id, "service": request.service_type}
        )
        
        if result["status"] == "succeeded":
            grant_temporary_feature(request.user_id, service_info["feature_unlock"], service_info["duration_hours"])
        
        return {
            "status": "completed",
            "message": f"Feature unlocked for {service_info['duration_hours']} hours"
        }
    
    # Add other providers as needed...


@router.post("/check-feature-access")
async def check_access(request: FeatureAccessRequest):
    """Check if user has access to a specific feature"""
    result = check_feature_access(request.user_id, request.feature_name)
    return result


@router.get("/user-features/{user_id}")
async def get_user_features(user_id: str):
    """Get all features available to user based on subscription"""
    user = persistence.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription_tier = user.get("subscription_tier", "FREE")
    features = SUBSCRIPTION_TIERS[subscription_tier]["features"]
    
    # Add temporary features
    temp_features = user.get("temporary_features", {})
    for feature, expiry_str in temp_features.items():
        expiry = datetime.fromisoformat(expiry_str)
        if expiry > datetime.utcnow():
            features[feature] = True
    
    return {
        "user_id": user_id,
        "subscription_tier": subscription_tier,
        "features": features,
        "expiry_date": user.get("subscription_expiry"),
        "is_active": user.get("subscription_status") == "ACTIVE"
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def activate_subscription(user_id: str, tier: str, duration: str):
    """Activate subscription for user"""
    days = SUBSCRIPTION_TIERS[tier]["duration_days"]
    if duration == "annual":
        days = days * 12
    
    expiry_date = datetime.utcnow() + timedelta(days=days)
    
    persistence.update_user(user_id, {
        "subscription_tier": tier,
        "subscription_status": "ACTIVE",
        "subscription_expiry": expiry_date.isoformat(),
        "subscription_updated_at": datetime.utcnow().isoformat()
    })


def grant_temporary_feature(user_id: str, feature_name: str, duration_hours: int):
    """Grant temporary access to a feature"""
    user = persistence.get_user_by_id(user_id)
    temp_features = user.get("temporary_features", {})
    
    expiry = datetime.utcnow() + timedelta(hours=duration_hours)
    temp_features[feature_name] = expiry.isoformat()
    
    persistence.update_user(user_id, {
        "temporary_features": temp_features
    })


# ============================================================================
# WEBHOOK ENDPOINTS
# ============================================================================

@router.post("/mpesa-callback")
async def mpesa_callback(callback: dict):
    """Handle M-Pesa payment callback"""
    try:
        body = callback.get("Body", {})
        stk_callback = body.get("stkCallback", {})
        
        result_code = stk_callback.get("ResultCode")
        checkout_request_id = stk_callback.get("CheckoutRequestID")
        
        # Get payment record
        payment = persistence.get_payment_by_id(checkout_request_id)
        
        if result_code == 0:
            # Payment successful
            persistence.update_payment(checkout_request_id, {
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat()
            })
            
            # Activate subscription
            activate_subscription(
                payment["user_id"],
                payment["tier"],
                payment["duration"]
            )
        else:
            # Payment failed
            persistence.update_payment(checkout_request_id, {
                "status": "failed",
                "error_message": stk_callback.get("ResultDesc")
            })
        
        return {"status": "success"}
    except Exception as e:
        print(f"M-Pesa callback error: {str(e)}")
        return {"status": "error"}


@router.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_CONFIG["webhook_secret"]
        )
        
        if event["type"] == "payment_intent.succeeded":
            payment_intent = event["data"]["object"]
            user_id = payment_intent["metadata"]["user_id"]
            tier = payment_intent["metadata"]["tier"]
            
            activate_subscription(user_id, tier, "monthly")
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/crypto-callback")
async def crypto_callback(callback: dict):
    """Handle crypto payment callback"""
    try:
        order_id = callback.get("id")
        status = callback.get("status")
        
        if status == "paid":
            payment = persistence.get_payment_by_id(order_id)
            activate_subscription(
                payment["user_id"],
                payment["tier"],
                payment["duration"]
            )
        
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
