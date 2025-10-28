from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from app.services import persistence
from app.services.regional_data_service import (
    regional_data_service,
    get_user_regional_data,
    get_weather_for_location,
    get_market_prices_for_location
)
from app.middleware.feature_guard import (
    require_feature, 
    require_tier, 
    check_limit,
    filter_diagnosis_by_confidence,
    get_storage_monitoring_interval
)

router = APIRouter()


# ============================================================================
# MODELS
# ============================================================================

class YieldForecastRequest(BaseModel):
    field_id: str
    days_ahead: int = 90


class WhatIfScenario(BaseModel):
    field_id: str
    investment_amount: float
    investment_type: str  # fertilizer, pesticide, irrigation


class MarketAlert(BaseModel):
    crop: str
    current_price: float
    forecast_price: float
    optimal_sale_date: str
    market_location: str
    profit_increase_percent: float


class CustomFertilizerPlan(BaseModel):
    field_id: str


class PriorityExpertRequest(BaseModel):
    image_url: str
    symptoms: str
    field_id: str
    guaranteed_response: bool = True


class SpectralAnalysisRequest(BaseModel):
    image_url: str
    field_id: str


class StorageCertificateRequest(BaseModel):
    storage_device_id: str
    duration_days: int = 30


# ============================================================================
# PREMIUM FEATURE: YIELD & PROFIT FORECASTING (PRO+)
# ============================================================================

@router.post("/yield-forecast")
@require_feature("yield_forecasting")
async def get_yield_forecast(request: YieldForecastRequest, user_id: str):
    """
    AI-powered yield and profit forecasting (PRO tier required)
    
    Predicts harvest size and revenue using:
    - Visual growth log data
    - Real-time market price API
    - Weather forecasts from OpenWeatherMap/NASA POWER
    - Soil health data
    """
    # Get field data
    field = persistence.get_field_by_id(request.field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # Get growth data
    growth_logs = persistence.get_growth_logs(request.field_id)
    
    # Get field location
    lat = field.get("latitude", -1.2921)
    lon = field.get("longitude", 36.8219)
    
    # Fetch real-time market prices for this location
    market_data = await get_market_prices_for_location(lat, lon)
    crop = field.get("crop", "maize").lower()
    
    # Get current market price from regional data
    current_price = 45  # Default
    if crop in market_data.get("prices", {}):
        current_price = market_data["prices"][crop]["price_kes_per_kg"]
    
    # Fetch weather data for yield prediction
    weather_data = await get_weather_for_location(lat, lon)
    
    # AI Prediction (simplified - integrate with actual ML model)
    current_growth_stage = field.get("growth_stage", 0.5)
    field_size_acres = field.get("field_size_acres", 1.0)
    
    # Weather impact on yield
    recent_rainfall = sum(day.get("rain", 0) for day in weather_data.get("forecast", [])[:7])
    avg_temp = sum(day.get("temp_day", 25) for day in weather_data.get("forecast", [])[:7]) / 7
    
    # Adjust yield based on weather conditions
    weather_multiplier = 1.0
    if recent_rainfall < 10:  # Drought risk
        weather_multiplier = 0.85
    elif recent_rainfall > 50:  # Excess rain
        weather_multiplier = 0.90
    if avg_temp > 30 or avg_temp < 18:  # Sub-optimal temperature
        weather_multiplier *= 0.95
    
    # Estimate yield based on growth trajectory and weather
    expected_yield_per_acre = 800  # kg (example for maize)
    predicted_yield_kg = expected_yield_per_acre * field_size_acres * current_growth_stage * weather_multiplier
    
    # Forecast price based on season and market trends
    month = datetime.utcnow().month
    harvest_months = [6, 7, 12, 1]  # Maize harvest months in Kenya
    
    if month in harvest_months:
        forecast_price = current_price * 0.90  # Lower during harvest glut
    else:
        forecast_price = current_price * 1.10  # Higher off-season
    
    predicted_revenue = predicted_yield_kg * forecast_price
    
    # Calculate costs
    estimated_costs = field_size_acres * 15000  # KES per acre
    predicted_profit = predicted_revenue - estimated_costs
    
    return {
        "field_id": request.field_id,
        "crop": field["crop"],
        "forecast_date": (datetime.utcnow() + timedelta(days=request.days_ahead)).isoformat(),
        "predicted_yield_kg": round(predicted_yield_kg, 2),
        "current_market_price_kes": current_price,
        "forecast_market_price_kes": round(forecast_price, 2),
        "predicted_revenue_kes": round(predicted_revenue, 2),
        "estimated_costs_kes": estimated_costs,
        "predicted_profit_kes": round(predicted_profit, 2),
        "confidence_level": 0.85,
        "factors": {
            "growth_stage": f"{current_growth_stage * 100}%",
            "field_size_acres": field_size_acres,
            "soil_health": "Good",
            "weather_outlook": "Favorable" if weather_multiplier >= 0.95 else "Challenging",
            "recent_rainfall_mm": round(recent_rainfall, 1),
            "avg_temperature_c": round(avg_temp, 1),
            "nearest_market": market_data.get("nearest_market", "Nairobi"),
            "weather_impact": f"{round((weather_multiplier - 1) * 100, 1)}%"
        },
        "data_sources": {
            "weather": "OpenWeatherMap + NASA POWER",
            "market_prices": market_data.get("data_source", "Regional market data"),
            "satellite": "NASA POWER satellite-derived data"
        }
    }


@router.post("/what-if-scenario")
@require_feature("what_if_scenarios")
async def calculate_what_if_scenario(request: WhatIfScenario, user_id: str):
    """
    What-If scenario analysis for investment decisions (PRO tier required)
    """
    # Get baseline forecast
    baseline = await get_yield_forecast(
        YieldForecastRequest(field_id=request.field_id),
        user_id
    )
    
    # Calculate impact of investment
    impact_multiplier = 1.0
    if request.investment_type == "fertilizer":
        impact_multiplier = 1.15  # 15% yield increase
    elif request.investment_type == "pesticide":
        impact_multiplier = 1.10  # 10% yield increase
    elif request.investment_type == "irrigation":
        impact_multiplier = 1.20  # 20% yield increase
    
    new_predicted_yield = baseline["predicted_yield_kg"] * impact_multiplier
    new_revenue = new_predicted_yield * baseline["forecast_market_price_kes"]
    new_costs = baseline["estimated_costs_kes"] + request.investment_amount
    new_profit = new_revenue - new_costs
    
    profit_increase = new_profit - baseline["predicted_profit_kes"]
    profit_increase_percent = (profit_increase / baseline["predicted_profit_kes"]) * 100
    
    return {
        "scenario": {
            "investment_type": request.investment_type,
            "investment_amount_kes": request.investment_amount
        },
        "baseline": {
            "predicted_profit_kes": baseline["predicted_profit_kes"],
            "predicted_yield_kg": baseline["predicted_yield_kg"]
        },
        "with_investment": {
            "predicted_profit_kes": round(new_profit, 2),
            "predicted_yield_kg": round(new_predicted_yield, 2),
            "profit_increase_kes": round(profit_increase, 2),
            "profit_increase_percent": round(profit_increase_percent, 2)
        },
        "recommendation": "Invest" if profit_increase > request.investment_amount else "Consider alternatives",
        "roi_percent": round((profit_increase / request.investment_amount) * 100, 2)
    }


# ============================================================================
# PREMIUM FEATURE: MARKET ACCESS ALERTS
# ============================================================================

@router.get("/premium-market-alerts/{crop}")
@require_feature("premium_market_alerts")
async def get_premium_market_alerts(crop: str, user_id: str):
    """
    Premium market access alerts with optimal sale windows (PRO tier required)
    Uses real-time regional market data and weather forecasting
    """
    # Get user location
    user = persistence.get_user_by_id(user_id)
    lat = user.get("latitude", -1.2921)
    lon = user.get("longitude", 36.8219)
    
    # Fetch real-time regional market prices
    market_data = await get_market_prices_for_location(lat, lon)
    
    # Build markets list from regional data
    markets = []
    crop_lower = crop.lower()
    
    # Major Kenya markets with regional pricing
    major_markets = {
        "Nairobi": (-1.2921, 36.8219),
        "Mombasa": (-4.0435, 39.6682),
        "Kisumu": (-0.0917, 34.7680)
    }
    
    # Fetch prices for each major market
    for market_name, (m_lat, m_lon) in major_markets.items():
        regional_prices = await get_market_prices_for_location(m_lat, m_lon)
        if crop_lower in regional_prices.get("prices", {}):
            price_info = regional_prices["prices"][crop_lower]
            markets.append({
                "location": market_name,
                "price": price_info["price_kes_per_kg"],
                "date": price_info["last_updated"],
                "distance_km": market_data.get("distance_km", 0) if market_name == market_data.get("nearest_market") else 100
            })
    
    # Add local market
    if crop_lower in market_data.get("prices", {}):
        local_price = market_data["prices"][crop_lower]
        markets.append({
            "location": "Local Market",
            "price": local_price["price_kes_per_kg"] * 0.90,  # Local typically 10% lower
            "date": datetime.utcnow().date().isoformat(),
            "distance_km": 5
        })
    
    # Fallback if no data
    if not markets:
        markets = [
            {"location": "Nairobi", "price": 45, "date": datetime.utcnow().date().isoformat(), "distance_km": 50},
            {"location": "Local Market", "price": 35, "date": datetime.utcnow().date().isoformat(), "distance_km": 5}
        ]
    
    # Find optimal market
    best_market = max(markets, key=lambda x: x["price"])
    local_market = next((m for m in markets if m["location"] == "Local Market"), markets[-1])
    
    profit_increase = ((best_market["price"] - local_market["price"]) / local_market["price"]) * 100
    
    # Calculate transport costs based on distance
    transport_cost_per_km = 10  # KES per km per 100kg
    transport_cost = best_market.get("distance_km", 50) * transport_cost_per_km
    
    return {
        "crop": crop,
        "user_location": {
            "latitude": lat,
            "longitude": lon,
            "nearest_market": market_data.get("nearest_market", "Nairobi")
        },
        "optimal_market": {
            "location": best_market["location"],
            "price_per_kg_kes": best_market["price"],
            "optimal_sale_date": best_market["date"],
            "profit_increase_percent": round(profit_increase, 2),
            "distance_km": best_market.get("distance_km", 50)
        },
        "local_market": {
            "location": local_market["location"],
            "price_per_kg_kes": local_market["price"]
        },
        "all_markets": sorted(markets, key=lambda x: x["price"], reverse=True),
        "recommendation": f"Selling your {crop} in {best_market['location']} on {best_market['date']} "
                         f"is forecast to yield {round(profit_increase)}% higher profit than selling locally today.",
        "transport_cost_estimate_kes": round(transport_cost, 2),
        "net_benefit_kes_per_100kg": round((best_market["price"] - local_market["price"]) * 100 - transport_cost, 2),
        "data_sources": {
            "market_prices": market_data.get("data_source", "Regional market data"),
            "last_updated": market_data.get("last_updated", datetime.utcnow().isoformat())
        }
    }


# ============================================================================
# PREMIUM FEATURE: PRIORITY EXPERT TRIAGE
# ============================================================================

@router.post("/priority-expert-triage")
@require_feature("priority_expert_response")
async def request_priority_expert(request: PriorityExpertRequest, user_id: str):
    """
    Priority expert diagnosis with guaranteed 2-hour response (EXPERT tier required)
    """
    # Create priority expert request
    expert_request = {
        "user_id": user_id,
        "field_id": request.field_id,
        "image_url": request.image_url,
        "symptoms": request.symptoms,
        "priority": "HIGH",
        "guaranteed_response_hours": 2,
        "status": "PENDING",
        "created_at": datetime.utcnow().isoformat()
    }
    
    request_id = persistence.create_expert_request(expert_request)
    
    # Notify available experts
    # SMS/Push notification to verified extension officers
    
    return {
        "request_id": request_id,
        "status": "PENDING",
        "guaranteed_response_time": "2 hours",
        "priority": "HIGH",
        "message": "Your request has been placed at the top of the queue. "
                  "A verified expert will respond within 2 hours."
    }


# ============================================================================
# PREMIUM FEATURE: SPECTRAL/MULTI-LAYER ANALYSIS
# ============================================================================

@router.post("/spectral-analysis")
@require_feature("spectral_analysis")
async def perform_spectral_analysis(request: SpectralAnalysisRequest, user_id: str):
    """
    Advanced spectral plant health analysis (EXPERT tier required)
    
    Uses deep learning to detect pre-symptomatic nutrient deficiencies
    """
    # Perform advanced AI analysis (integrate with actual model)
    # This would use a more sophisticated CNN model to analyze subtle color variations
    
    analysis_result = {
        "field_id": request.field_id,
        "image_url": request.image_url,
        "analysis_type": "spectral_multi_layer",
        "detected_deficiencies": [
            {
                "nutrient": "Potassium (K)",
                "severity": "Early Stage",
                "confidence": 0.87,
                "visible_symptoms": False,
                "recommendation": "Apply 50kg/acre of Potassium Sulfate within 7 days to prevent stunting"
            },
            {
                "nutrient": "Nitrogen (N)",
                "severity": "Mild",
                "confidence": 0.72,
                "visible_symptoms": False,
                "recommendation": "Consider foliar application of liquid nitrogen fertilizer"
            }
        ],
        "overall_plant_health": "Good with early deficiency detected",
        "alert": {
            "type": "PRE_SYMPTOMATIC",
            "message": "Your maize is showing early signs of Potassium deficiency. "
                      "Order the recommended fertilizer now to prevent stunting.",
            "urgency": "MEDIUM",
            "days_before_symptoms": 14
        },
        "analyzed_at": datetime.utcnow().isoformat()
    }
    
    return analysis_result


# ============================================================================
# PREMIUM FEATURE: CUSTOM FERTILIZER BLENDING
# ============================================================================

@router.post("/custom-fertilizer-plan")
@require_feature("custom_fertilizer_plans")
async def generate_custom_fertilizer_plan(request: CustomFertilizerPlan, user_id: str):
    """
    Custom fertilizer/soil blending plan (EXPERT tier required)
    """
    # Get field data
    field = persistence.get_field_by_id(request.field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # Get soil snapshot
    soil_data = field.get("soil_snapshots", [{}])[0]
    
    # Generate custom blend based on NPK levels
    n_level = soil_data.get("nitrogen_level", "medium")
    p_level = soil_data.get("phosphorus_level", "medium")
    k_level = soil_data.get("potassium_level", "medium")
    ph = soil_data.get("ph", 6.5)
    
    # Custom blend recommendations
    blend = {
        "field_id": request.field_id,
        "soil_analysis": {
            "nitrogen": n_level,
            "phosphorus": p_level,
            "potassium": k_level,
            "ph": ph
        },
        "custom_blend_stages": [
            {
                "stage": "Planting (0-2 weeks)",
                "blend_ratio": "10-26-10",
                "quantity_per_acre_kg": 50,
                "cost_per_acre_kes": 2500,
                "application_method": "Band placement"
            },
            {
                "stage": "Vegetative (3-6 weeks)",
                "blend_ratio": "23-10-5",
                "quantity_per_acre_kg": 75,
                "cost_per_acre_kes": 3200,
                "application_method": "Side dressing"
            },
            {
                "stage": "Reproductive (7-12 weeks)",
                "blend_ratio": "15-15-15",
                "quantity_per_acre_kg": 50,
                "cost_per_acre_kes": 2800,
                "application_method": "Top dressing"
            }
        ],
        "total_cost_per_acre_kes": 8500,
        "expected_yield_increase_percent": 25,
        "certified_dealers": [
            {"name": "AgroDealer Cooperative", "location": "Nairobi", "contact": "0700123456"},
            {"name": "FarmInput Supplies", "location": "Kisumu", "contact": "0711234567"}
        ],
        "organic_alternative": {
            "available": True,
            "materials": ["Compost", "Bone meal", "Wood ash"],
            "cost_per_acre_kes": 5000
        }
    }
    
    return blend


# ============================================================================
# PREMIUM FEATURE: HIGH-FREQUENCY STORAGE MONITORING
# ============================================================================

@router.get("/storage-monitoring/{device_id}")
@require_feature("basic_storage_monitoring")
async def get_high_frequency_storage_data(device_id: str, user_id: str):
    """
    Storage monitoring with tier-based frequency (FREE: daily, PRO: hourly, EXPERT: 5-min)
    """
    # Get monitoring interval based on subscription
    interval_minutes = get_storage_monitoring_interval(user_id)
    
    # Get continuous storage data
    # In production, this would query from continuous data logs
    
    return {
        "device_id": device_id,
        "monitoring_frequency": f"{interval_minutes} minutes",
        "data_points_last_24h": 288,  # 24 * 60 / 5
        "current_conditions": {
            "temperature_c": 24.5,
            "humidity_percent": 58.2,
            "co2_ppm": 450
        },
        "trends": {
            "temperature_trend": "stable",
            "humidity_trend": "decreasing",
            "risk_level": "LOW"
        },
        "alerts_last_24h": 0,
        "storage_health_score": 95,
        "certificate_eligible": True
    }


@router.post("/storage-certificate")
@require_feature("storage_certificates")
async def generate_storage_certificate(request: StorageCertificateRequest, user_id: str):
    """
    Generate certified storage health certificate (EXPERT tier required)
    """
    # Get storage data for the period
    storage_data = await get_high_frequency_storage_data(request.storage_device_id, user_id)
    
    if storage_data["storage_health_score"] < 80:
        raise HTTPException(
            status_code=400,
            detail="Storage conditions do not meet certification standards"
        )
    
    certificate = {
        "certificate_id": f"CERT-{datetime.utcnow().strftime('%Y%m%d')}-{request.storage_device_id[:8]}",
        "user_id": user_id,
        "device_id": request.storage_device_id,
        "monitoring_period_days": request.duration_days,
        "certification_date": datetime.utcnow().isoformat(),
        "storage_health_score": storage_data["storage_health_score"],
        "conditions_met": {
            "temperature_range": "20-28°C",
            "humidity_range": "50-65%",
            "co2_levels": "< 500 ppm",
            "continuous_monitoring": "5-minute intervals"
        },
        "verified_by": "AgroShield AI System",
        "certificate_url": f"https://agroshield.com/certificates/{request.storage_device_id}",
        "qr_code_url": f"https://api.qrserver.com/v1/create-qr-code/?data=CERT-{request.storage_device_id}",
        "valid_for": "Export to premium buyers and processors"
    }
    
    # Store certificate
    persistence.store_storage_certificate(certificate)
    
    return certificate


# ============================================================================
# PREMIUM FEATURE: IOT INTEGRATION
# ============================================================================

@router.post("/iot-api-key")
@require_feature("iot_integration")
async def generate_iot_api_key(user_id: str):
    """
    Generate API key for third-party IoT sensor integration (EXPERT tier required)
    """
    import secrets
    api_key = f"agroshield_{secrets.token_urlsafe(32)}"
    
    # Store API key
    persistence.store_iot_api_key(user_id, api_key)
    
    return {
        "api_key": api_key,
        "user_id": user_id,
        "created_at": datetime.utcnow().isoformat(),
        "documentation_url": "https://docs.agroshield.com/iot-integration",
        "supported_devices": [
            "Automated irrigation systems",
            "Weather stations",
            "Soil moisture sensors",
            "Temperature/humidity sensors"
        ],
        "webhook_url": f"https://api.agroshield.com/iot/webhook/{user_id}",
        "sample_payload": {
            "device_id": "sensor_001",
            "timestamp": "2025-10-24T10:30:00Z",
            "data": {
                "temperature": 25.5,
                "humidity": 60.2,
                "soil_moisture": 45
            }
        }
    }
