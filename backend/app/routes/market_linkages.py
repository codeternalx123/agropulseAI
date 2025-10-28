"""
Enhanced Market Linkages API
AI-Driven Price Discovery, Risk Management, and Smart Fulfillment
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import statistics

router = APIRouter()

# ============================================================================
# ENUMS AND MODELS
# ============================================================================

class ContractType(str, Enum):
    SPOT = "spot"  # Immediate delivery
    FORWARD = "forward"  # Future delivery
    FUTURES = "futures"  # Standardized forward contract

class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"

class LogisticsStatus(str, Enum):
    PENDING = "pending"
    STAGING_ALERT = "staging_alert"
    READY_FOR_PICKUP = "ready_for_pickup"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    DELAYED = "delayed"

# ============================================================================
# PRICE DISCOVERY MODELS
# ============================================================================

class LocalizedPriceBenchmark(BaseModel):
    crop_type: str
    region: str
    farming_zone: str
    
    # Recent sales data
    recent_sales_count: int
    average_price_kes_kg: float
    price_range_min: float
    price_range_max: float
    
    # Quality-adjusted pricing
    quality_grade_premiums: Dict[str, float] = {
        "grade_a_premium": 1.25,  # 25% premium
        "grade_b_standard": 1.0,   # baseline
        "grade_c_basic": 0.85      # 15% discount
    }
    
    # Fair Market Price
    fair_market_price_kes_kg: float
    confidence_interval: float  # ±%
    
    # Market dynamics
    supply_level: str  # "surplus", "balanced", "shortage"
    demand_trend: str  # "increasing", "stable", "decreasing"
    
    calculated_at: datetime = Field(default_factory=datetime.now)

class AIQualityScore(BaseModel):
    """Comprehensive quality score from all AI systems"""
    overall_score: float = Field(..., ge=0, le=100)
    
    # Component scores
    harvest_health_score: Optional[float] = None
    storage_condition_score: Optional[float] = None
    pest_management_score: Optional[float] = None
    soil_health_score: Optional[float] = None
    ndvi_vegetation_score: Optional[float] = None
    
    # Risk factors
    spoilage_risk: float
    climate_risk: float
    
    # Weights for overall calculation
    weights: Dict[str, float] = {
        "harvest_health": 0.25,
        "storage_condition": 0.25,
        "pest_management": 0.20,
        "soil_health": 0.15,
        "vegetation": 0.15
    }

class RiskAdjustedPrice(BaseModel):
    base_price_kes_kg: float
    
    # Risk adjustments
    climate_risk_adjustment: float  # % adjustment
    crop_variety_risk_adjustment: float
    storage_risk_adjustment: float
    
    # Final price
    risk_adjusted_price_kes_kg: float
    
    # Buyer discount or premium
    buyer_risk_premium: float  # Amount buyer pays/saves
    
    justification: str

class ForwardContract(BaseModel):
    contract_id: str
    contract_type: ContractType
    
    # Parties
    seller_id: str
    seller_name: str
    buyer_id: Optional[str] = None  # Can be listed before buyer found
    
    # Asset details
    crop_type: str
    contracted_quantity_kg: float
    quality_grade_minimum: str
    
    # Pricing
    locked_price_kes_kg: float
    total_contract_value_kes: float
    
    # Timing
    harvest_prediction_date: datetime
    delivery_window_start: datetime
    delivery_window_end: datetime
    contract_expiry_date: datetime
    
    # Risk metrics
    lcrs_at_contract: float  # Localized Climate Risk Score
    harvest_confidence: float  # % confidence in yield prediction
    
    # Status
    status: str = "open"  # "open", "matched", "fulfilled", "expired", "disputed"
    created_at: datetime = Field(default_factory=datetime.now)

# ============================================================================
# SMART LOGISTICS MODELS
# ============================================================================

class WeatherOptimizedLogistics(BaseModel):
    """Optimal transport window based on weather"""
    asset_id: str
    origin_location: Dict[str, float]  # lat, lon
    destination_location: Dict[str, float]
    
    # Weather analysis
    five_day_forecast: List[Dict[str, Any]]
    optimal_transport_windows: List[Dict[str, Any]]  # [{start, end, weather_risk}]
    
    # Recommendations
    recommended_departure_time: datetime
    recommended_arrival_time: datetime
    weather_risk_score: float  # 0-100, lower is better
    
    # Alerts
    rain_risk: bool
    extreme_heat_risk: bool
    transport_advisories: List[str]

class GeoFencedDelivery(BaseModel):
    """Delivery confirmation with GPS verification"""
    transaction_id: str
    
    # Geo-fence
    buyer_location: Dict[str, float]
    geo_fence_radius_meters: float = 100  # 100m default
    
    # Delivery proof
    delivery_gps_location: Dict[str, float]
    delivery_timestamp: datetime
    delivery_photos: List[str]
    digital_signature: Optional[str] = None
    
    # Verification
    within_geo_fence: bool
    distance_from_buyer_meters: float
    verification_status: str  # "pending", "verified", "failed"
    
    # Auto-release trigger
    funds_released: bool = False
    released_at: Optional[datetime] = None

class InventoryStagingAlert(BaseModel):
    """Smart alerts for inventory preparation"""
    alert_id: str
    farmer_id: str
    asset_id: str
    
    # Logistics details
    buyer_id: str
    expected_pickup_time: datetime
    preparation_required_hours: int
    
    # Alert timing
    alert_trigger_time: datetime  # When to send alert
    alert_sent: bool = False
    alert_sent_at: Optional[datetime] = None
    
    # Instructions
    preparation_checklist: List[str] = [
        "Begin sorting and grading",
        "Start bagging/packaging",
        "Prepare loading area",
        "Verify quantity",
        "Complete quality check"
    ]
    
    # Status
    farmer_acknowledged: bool = False
    preparation_completed: bool = False

# ============================================================================
# COMMUNITY LIQUIDITY MODELS
# ============================================================================

class SupplyAggregationPool(BaseModel):
    """Pool of farmers combining inventory for bulk sales"""
    pool_id: str
    
    # Pool details
    crop_type: str
    farming_zone: str
    quality_grade_minimum: str
    
    # Participating farmers
    farmer_ids: List[str]
    farmer_contributions: List[Dict[str, Any]]  # [{farmer_id, quantity_kg, quality_score}]
    
    # Aggregated inventory
    total_quantity_kg: float
    average_quality_score: float
    
    # Pricing
    pooled_price_kes_kg: float
    total_pool_value_kes: float
    
    # Harvest window
    harvest_window_start: datetime
    harvest_window_end: datetime
    
    # Status
    status: str = "forming"  # "forming", "active", "matched", "fulfilled"
    minimum_pool_size_kg: float = 1000  # Minimum to attract bulk buyers
    current_fill_percentage: float
    
    created_at: datetime = Field(default_factory=datetime.now)

class DemandMatchingPrediction(BaseModel):
    """Predict demand based on crop diversification plans"""
    region: str
    crop_type: str
    
    # Supply prediction
    predicted_supply_kg: float
    farmers_planting_count: int
    harvest_timeline: List[Dict[str, Any]]  # [{date, quantity_kg}]
    
    # Demand analysis
    bulk_buyer_interest: List[Dict[str, Any]]  # [{buyer_id, required_kg, price_range}]
    predicted_demand_kg: float
    
    # Market dynamics
    supply_demand_ratio: float  # >1 = surplus, <1 = shortage
    predicted_price_trend: str  # "increasing", "stable", "decreasing"
    
    # Proactive matching
    recommended_forward_contracts: List[str]  # List of buyer IDs
    market_linkage_confidence: float  # % confidence in securing market

class SellerReputationScore(BaseModel):
    """Farmer reputation from efficacy feedback and past sales"""
    seller_id: str
    seller_name: str
    
    # Transaction history
    total_transactions: int
    successful_transactions: int
    disputed_transactions: int
    success_rate: float
    
    # Quality consistency
    average_quality_score: float
    quality_variance: float  # Lower is better
    grade_a_deliveries_percentage: float
    
    # Efficacy feedback
    pest_treatment_success_rate: float
    crop_health_improvement_score: float
    storage_compliance_score: float
    
    # Timeliness
    on_time_delivery_rate: float
    average_delay_hours: float
    
    # Overall reputation
    reputation_score: float = Field(..., ge=0, le=100)
    reputation_tier: str  # "platinum", "gold", "silver", "bronze", "unrated"
    
    # Benefits
    eligible_for_premium_listings: bool
    priority_matching: bool
    reduced_platform_fees: bool
    
    last_updated: datetime = Field(default_factory=datetime.now)

# ============================================================================
# IN-MEMORY STORAGE
# ============================================================================

PRICE_BENCHMARKS_DB: Dict[str, LocalizedPriceBenchmark] = {}
FORWARD_CONTRACTS_DB: Dict[str, ForwardContract] = {}
LOGISTICS_PLANS_DB: Dict[str, WeatherOptimizedLogistics] = {}
DELIVERY_VERIFICATIONS_DB: Dict[str, GeoFencedDelivery] = {}
STAGING_ALERTS_DB: Dict[str, InventoryStagingAlert] = {}
AGGREGATION_POOLS_DB: Dict[str, SupplyAggregationPool] = {}
DEMAND_PREDICTIONS_DB: Dict[str, DemandMatchingPrediction] = {}
REPUTATION_SCORES_DB: Dict[str, SellerReputationScore] = {}

# ============================================================================
# PRICE DISCOVERY ENDPOINTS
# ============================================================================

@router.get("/price-discovery/benchmark", response_model=LocalizedPriceBenchmark)
async def get_localized_price_benchmark(
    crop_type: str,
    latitude: float,
    longitude: float,
    quality_grade: str = "grade_b_standard"
):
    """
    Get AI-driven fair market price based on localized data
    Factors in recent sales, quality scores, and market dynamics
    """
    # Determine farming zone (use AI farm intelligence service)
    farming_zone = "highland_wet"  # Placeholder
    region = "Central Kenya"  # Placeholder
    
    # Simulate recent sales analysis
    recent_sales = [
        {"price": 45, "quality": "grade_a_premium"},
        {"price": 38, "quality": "grade_b_standard"},
        {"price": 42, "quality": "grade_a_premium"},
        {"price": 36, "quality": "grade_b_standard"},
        {"price": 40, "quality": "grade_b_standard"}
    ]
    
    prices = [s["price"] for s in recent_sales]
    avg_price = statistics.mean(prices)
    
    # Apply quality grade premium/discount
    benchmark = LocalizedPriceBenchmark(
        crop_type=crop_type,
        region=region,
        farming_zone=farming_zone,
        recent_sales_count=len(recent_sales),
        average_price_kes_kg=avg_price,
        price_range_min=min(prices),
        price_range_max=max(prices),
        fair_market_price_kes_kg=avg_price * benchmark.quality_grade_premiums.get(quality_grade, 1.0),
        confidence_interval=5.0,  # ±5%
        supply_level="balanced",
        demand_trend="stable"
    )
    
    key = f"{crop_type}_{region}"
    PRICE_BENCHMARKS_DB[key] = benchmark
    
    return benchmark

@router.post("/price-discovery/calculate-ai-quality-score", response_model=AIQualityScore)
async def calculate_ai_quality_score(
    harvest_health: Optional[float] = None,
    storage_condition: Optional[float] = None,
    pest_management: Optional[float] = None,
    soil_health: Optional[float] = None,
    vegetation_ndvi: Optional[float] = None,
    spoilage_risk: float = 0,
    climate_risk: float = 0
):
    """
    Calculate comprehensive quality score from all AI systems
    Used for quality-adjusted pricing
    """
    scores = {
        "harvest_health": harvest_health or 0,
        "storage_condition": storage_condition or 0,
        "pest_management": pest_management or 0,
        "soil_health": soil_health or 0,
        "vegetation": vegetation_ndvi or 0
    }
    
    quality_score = AIQualityScore(
        harvest_health_score=harvest_health,
        storage_condition_score=storage_condition,
        pest_management_score=pest_management,
        soil_health_score=soil_health,
        ndvi_vegetation_score=vegetation_ndvi,
        spoilage_risk=spoilage_risk,
        climate_risk=climate_risk,
        overall_score=0
    )
    
    # Calculate weighted overall score
    total_weight = 0
    weighted_sum = 0
    
    for key, score in scores.items():
        if score > 0:
            weight = quality_score.weights[key]
            weighted_sum += score * weight
            total_weight += weight
    
    if total_weight > 0:
        quality_score.overall_score = weighted_sum / total_weight
    
    return quality_score

@router.post("/price-discovery/risk-adjusted-price", response_model=RiskAdjustedPrice)
async def calculate_risk_adjusted_price(
    base_price_kes_kg: float,
    climate_risk_score: float,
    crop_variety_risk: float,
    storage_risk: float,
    lcrs: Optional[float] = None
):
    """
    Calculate risk-adjusted pricing
    Buyers pay premium for low-risk crops, discount for high-risk
    """
    # Risk adjustments (negative = discount, positive = premium)
    climate_adjustment = -climate_risk_score * 0.1  # -10% max for high risk
    variety_adjustment = -crop_variety_risk * 0.05  # -5% max
    storage_adjustment = -storage_risk * 0.08  # -8% max
    
    # LCRS bonus (low LCRS = premium)
    if lcrs and lcrs < 30:
        climate_adjustment += 0.05  # 5% premium for low LCRS zones
    
    total_adjustment = climate_adjustment + variety_adjustment + storage_adjustment
    adjusted_price = base_price_kes_kg * (1 + total_adjustment)
    
    risk_adjusted = RiskAdjustedPrice(
        base_price_kes_kg=base_price_kes_kg,
        climate_risk_adjustment=climate_adjustment * 100,
        crop_variety_risk_adjustment=variety_adjustment * 100,
        storage_risk_adjustment=storage_adjustment * 100,
        risk_adjusted_price_kes_kg=adjusted_price,
        buyer_risk_premium=(adjusted_price - base_price_kes_kg),
        justification=f"Price adjusted by {total_adjustment*100:.1f}% based on risk factors"
    )
    
    return risk_adjusted

@router.post("/price-discovery/create-forward-contract", response_model=ForwardContract)
async def create_forward_contract(contract: ForwardContract):
    """
    Create futures/forward contract for pre-harvest sales
    Secures guaranteed price and market access
    """
    FORWARD_CONTRACTS_DB[contract.contract_id] = contract
    return contract

@router.get("/price-discovery/forward-contracts", response_model=List[ForwardContract])
async def get_forward_contracts(
    crop_type: Optional[str] = None,
    status: Optional[str] = None,
    seller_id: Optional[str] = None
):
    """Get available forward contracts"""
    contracts = list(FORWARD_CONTRACTS_DB.values())
    
    if crop_type:
        contracts = [c for c in contracts if c.crop_type == crop_type]
    if status:
        contracts = [c for c in contracts if c.status == status]
    if seller_id:
        contracts = [c for c in contracts if c.seller_id == seller_id]
    
    return contracts

# ============================================================================
# SMART LOGISTICS ENDPOINTS
# ============================================================================

@router.post("/logistics/optimize-transport-window", response_model=WeatherOptimizedLogistics)
async def optimize_transport_window(
    asset_id: str,
    origin_lat: float,
    origin_lon: float,
    destination_lat: float,
    destination_lon: float
):
    """
    Calculate optimal transport window based on 5-day weather forecast
    Avoid rain, extreme heat, and other transport risks
    """
    # Simulate 5-day forecast
    forecast = [
        {"date": "2025-10-26", "conditions": "Sunny", "rain_probability": 0, "temp_max": 28, "risk": "low"},
        {"date": "2025-10-27", "conditions": "Partly Cloudy", "rain_probability": 20, "temp_max": 27, "risk": "low"},
        {"date": "2025-10-28", "conditions": "Rainy", "rain_probability": 80, "temp_max": 24, "risk": "high"},
        {"date": "2025-10-29", "conditions": "Sunny", "rain_probability": 10, "temp_max": 29, "risk": "low"},
        {"date": "2025-10-30", "conditions": "Sunny", "rain_probability": 5, "temp_max": 30, "risk": "moderate"}
    ]
    
    # Find optimal windows (low rain risk)
    optimal_windows = [
        {"start": "2025-10-26 06:00", "end": "2025-10-26 18:00", "weather_risk": 5},
        {"start": "2025-10-27 06:00", "end": "2025-10-27 18:00", "weather_risk": 15},
        {"start": "2025-10-29 06:00", "end": "2025-10-29 18:00", "weather_risk": 10}
    ]
    
    logistics = WeatherOptimizedLogistics(
        asset_id=asset_id,
        origin_location={"latitude": origin_lat, "longitude": origin_lon},
        destination_location={"latitude": destination_lat, "longitude": destination_lon},
        five_day_forecast=forecast,
        optimal_transport_windows=optimal_windows,
        recommended_departure_time=datetime.fromisoformat("2025-10-26T06:00:00"),
        recommended_arrival_time=datetime.fromisoformat("2025-10-26T14:00:00"),
        weather_risk_score=5.0,
        rain_risk=False,
        extreme_heat_risk=False,
        transport_advisories=["Optimal window: Oct 26, 6:00-18:00", "Avoid Oct 28 (heavy rain expected)"]
    )
    
    LOGISTICS_PLANS_DB[asset_id] = logistics
    return logistics

@router.post("/logistics/verify-geo-fenced-delivery", response_model=GeoFencedDelivery)
async def verify_geo_fenced_delivery(delivery: GeoFencedDelivery):
    """
    Verify delivery using GPS geo-fence
    Triggers automatic fund release if within fence
    """
    import math
    
    # Calculate distance using Haversine formula
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371000  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        
        a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    distance = haversine(
        delivery.buyer_location["latitude"],
        delivery.buyer_location["longitude"],
        delivery.delivery_gps_location["latitude"],
        delivery.delivery_gps_location["longitude"]
    )
    
    delivery.distance_from_buyer_meters = distance
    delivery.within_geo_fence = distance <= delivery.geo_fence_radius_meters
    
    if delivery.within_geo_fence and len(delivery.delivery_photos) > 0:
        delivery.verification_status = "verified"
        delivery.funds_released = True
        delivery.released_at = datetime.now()
    else:
        delivery.verification_status = "failed"
    
    DELIVERY_VERIFICATIONS_DB[delivery.transaction_id] = delivery
    return delivery

@router.post("/logistics/create-staging-alert", response_model=InventoryStagingAlert)
async def create_staging_alert(alert: InventoryStagingAlert):
    """
    Create smart staging alert for inventory preparation
    Triggers X hours before expected pickup
    """
    STAGING_ALERTS_DB[alert.alert_id] = alert
    return alert

@router.get("/logistics/staging-alerts/{farmer_id}", response_model=List[InventoryStagingAlert])
async def get_staging_alerts(farmer_id: str):
    """Get all staging alerts for a farmer"""
    alerts = [a for a in STAGING_ALERTS_DB.values() if a.farmer_id == farmer_id]
    return alerts

# ============================================================================
# COMMUNITY LIQUIDITY ENDPOINTS
# ============================================================================

@router.post("/community/create-supply-pool", response_model=SupplyAggregationPool)
async def create_supply_aggregation_pool(pool: SupplyAggregationPool):
    """
    Create supply aggregation pool for small farmers
    Combines inventory to attract bulk buyers
    """
    # Calculate aggregated metrics
    pool.total_quantity_kg = sum(f["quantity_kg"] for f in pool.farmer_contributions)
    pool.average_quality_score = statistics.mean(f["quality_score"] for f in pool.farmer_contributions)
    pool.current_fill_percentage = (pool.total_quantity_kg / pool.minimum_pool_size_kg) * 100
    pool.total_pool_value_kes = pool.total_quantity_kg * pool.pooled_price_kes_kg
    
    if pool.current_fill_percentage >= 100:
        pool.status = "active"
    
    AGGREGATION_POOLS_DB[pool.pool_id] = pool
    return pool

@router.get("/community/supply-pools", response_model=List[SupplyAggregationPool])
async def get_supply_pools(
    crop_type: Optional[str] = None,
    farming_zone: Optional[str] = None,
    status: Optional[str] = None
):
    """Get available supply aggregation pools"""
    pools = list(AGGREGATION_POOLS_DB.values())
    
    if crop_type:
        pools = [p for p in pools if p.crop_type == crop_type]
    if farming_zone:
        pools = [p for p in pools if p.farming_zone == farming_zone]
    if status:
        pools = [p for p in pools if p.status == status]
    
    return pools

@router.post("/community/predict-demand-matching", response_model=DemandMatchingPrediction)
async def predict_demand_matching(
    region: str,
    crop_type: str,
    farmers_planting_count: int,
    predicted_supply_kg: float
):
    """
    Predict demand and match with bulk buyers
    Uses crop diversification plans analysis
    """
    # Simulate bulk buyer interest
    bulk_buyers = [
        {"buyer_id": "PROC_001", "required_kg": 5000, "price_range": "40-45 KES/kg"},
        {"buyer_id": "DIST_002", "required_kg": 8000, "price_range": "38-42 KES/kg"}
    ]
    
    predicted_demand = sum(b["required_kg"] for b in bulk_buyers)
    
    prediction = DemandMatchingPrediction(
        region=region,
        crop_type=crop_type,
        predicted_supply_kg=predicted_supply_kg,
        farmers_planting_count=farmers_planting_count,
        harvest_timeline=[
            {"date": "2025-11-15", "quantity_kg": predicted_supply_kg * 0.3},
            {"date": "2025-11-30", "quantity_kg": predicted_supply_kg * 0.5},
            {"date": "2025-12-15", "quantity_kg": predicted_supply_kg * 0.2}
        ],
        bulk_buyer_interest=bulk_buyers,
        predicted_demand_kg=predicted_demand,
        supply_demand_ratio=predicted_supply_kg / predicted_demand,
        predicted_price_trend="stable" if 0.8 <= predicted_supply_kg / predicted_demand <= 1.2 else "decreasing",
        recommended_forward_contracts=["PROC_001", "DIST_002"],
        market_linkage_confidence=85.0
    )
    
    DEMAND_PREDICTIONS_DB[f"{region}_{crop_type}"] = prediction
    return prediction

@router.get("/community/seller-reputation/{seller_id}", response_model=SellerReputationScore)
async def get_seller_reputation(seller_id: str):
    """
    Get seller reputation score
    Includes efficacy feedback and transaction history
    """
    # Check if already exists
    if seller_id in REPUTATION_SCORES_DB:
        return REPUTATION_SCORES_DB[seller_id]
    
    # Create new reputation (simulate data)
    reputation = SellerReputationScore(
        seller_id=seller_id,
        seller_name="John Farmer",
        total_transactions=25,
        successful_transactions=23,
        disputed_transactions=2,
        success_rate=92.0,
        average_quality_score=85.5,
        quality_variance=5.2,
        grade_a_deliveries_percentage=68.0,
        pest_treatment_success_rate=88.0,
        crop_health_improvement_score=82.0,
        storage_compliance_score=95.0,
        on_time_delivery_rate=90.0,
        average_delay_hours=2.5,
        reputation_score=87.5,
        reputation_tier="gold",
        eligible_for_premium_listings=True,
        priority_matching=True,
        reduced_platform_fees=True
    )
    
    REPUTATION_SCORES_DB[seller_id] = reputation
    return reputation

@router.put("/community/update-reputation/{seller_id}")
async def update_seller_reputation(
    seller_id: str,
    transaction_successful: bool,
    quality_score: float,
    on_time: bool,
    efficacy_feedback: Optional[Dict[str, float]] = None
):
    """
    Update seller reputation after transaction
    Includes efficacy feedback loop integration
    """
    if seller_id not in REPUTATION_SCORES_DB:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    reputation = REPUTATION_SCORES_DB[seller_id]
    
    # Update transaction counts
    reputation.total_transactions += 1
    if transaction_successful:
        reputation.successful_transactions += 1
    else:
        reputation.disputed_transactions += 1
    
    reputation.success_rate = (reputation.successful_transactions / reputation.total_transactions) * 100
    
    # Update quality metrics
    reputation.average_quality_score = (
        (reputation.average_quality_score * (reputation.total_transactions - 1) + quality_score) /
        reputation.total_transactions
    )
    
    # Update timeliness
    if on_time:
        reputation.on_time_delivery_rate = (
            (reputation.on_time_delivery_rate * (reputation.total_transactions - 1) + 100) /
            reputation.total_transactions
        )
    
    # Update efficacy feedback
    if efficacy_feedback:
        reputation.pest_treatment_success_rate = efficacy_feedback.get("pest_treatment", reputation.pest_treatment_success_rate)
        reputation.crop_health_improvement_score = efficacy_feedback.get("crop_health", reputation.crop_health_improvement_score)
        reputation.storage_compliance_score = efficacy_feedback.get("storage_compliance", reputation.storage_compliance_score)
    
    # Recalculate overall reputation score
    reputation.reputation_score = (
        reputation.success_rate * 0.3 +
        reputation.average_quality_score * 0.25 +
        reputation.on_time_delivery_rate * 0.2 +
        reputation.pest_treatment_success_rate * 0.15 +
        reputation.storage_compliance_score * 0.10
    )
    
    # Update tier
    if reputation.reputation_score >= 90:
        reputation.reputation_tier = "platinum"
    elif reputation.reputation_score >= 80:
        reputation.reputation_tier = "gold"
    elif reputation.reputation_score >= 70:
        reputation.reputation_tier = "silver"
    elif reputation.reputation_score >= 60:
        reputation.reputation_tier = "bronze"
    else:
        reputation.reputation_tier = "unrated"
    
    # Update benefits
    reputation.eligible_for_premium_listings = reputation.reputation_score >= 80
    reputation.priority_matching = reputation.reputation_score >= 85
    reputation.reduced_platform_fees = reputation.reputation_score >= 90
    
    reputation.last_updated = datetime.now()
    
    return {"message": "Reputation updated successfully", "reputation": reputation}
