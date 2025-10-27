"""
Drone Intelligence API
====================
Handles drone imagery upload, multispectral analysis, 3D farm reconstruction,
yield prediction, quality grading, and harvest optimization.

Integrates with:
- Multispectral sensors (NDVI, NIR, RGB)
- BLE soil sensors (moisture, temperature)
- Weather forecasts
- Growth models
- Market linkages
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import statistics
import math
import uuid

router = APIRouter()

# ============================================================================
# ENUMS & CONSTANTS
# ============================================================================

class ImageType(str, Enum):
    RGB = "rgb"
    MULTISPECTRAL = "multispectral"
    THERMAL = "thermal"
    LIDAR = "lidar"

class QualityGrade(str, Enum):
    GRADE_A_PREMIUM = "grade_a_premium"  # 90-100% NDVI uniformity
    GRADE_B_STANDARD = "grade_b_standard"  # 70-89% uniformity
    GRADE_C_BASIC = "grade_c_basic"  # 50-69% uniformity
    GRADE_D_POOR = "grade_d_poor"  # <50% uniformity

class HarvestStatus(str, Enum):
    PRE_HARVEST = "pre_harvest"
    OPTIMAL_WINDOW = "optimal_window"
    HARVESTING = "harvesting"
    HARVESTED = "harvested"
    DELAYED = "delayed"

class DroneFlightStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PROCESSING = "processing"
    ANALYZED = "analyzed"

# ============================================================================
# DATA MODELS
# ============================================================================

class DroneFlightPlan(BaseModel):
    """Plan for drone data collection mission"""
    flight_id: str = Field(default_factory=lambda: f"FLT_{uuid.uuid4().hex[:8]}")
    farm_id: str
    farmer_id: str
    field_coordinates: List[Dict[str, float]]  # List of {lat, lon} for field boundary
    planned_date: datetime
    flight_altitude_meters: float = 50.0
    ground_resolution_cm: float = 2.5  # cm per pixel
    image_overlap_percentage: int = 75
    sensors_enabled: List[ImageType] = ["rgb", "multispectral"]
    ble_sensor_collection: bool = True  # Collect BLE data during flight
    estimated_images: int = 0
    estimated_duration_minutes: int = 0
    status: DroneFlightStatus = DroneFlightStatus.PLANNED
    created_at: datetime = Field(default_factory=datetime.now)

class DroneImageUpload(BaseModel):
    """Single drone image with metadata"""
    image_id: str = Field(default_factory=lambda: f"IMG_{uuid.uuid4().hex[:8]}")
    flight_id: str
    image_type: ImageType
    gps_latitude: float
    gps_longitude: float
    altitude_meters: float
    timestamp: datetime
    gimbal_pitch_degrees: float = -90.0  # -90 = straight down
    camera_settings: Dict[str, Any] = {}
    file_url: str  # S3/storage URL
    file_size_mb: float
    resolution_width: int
    resolution_height: int

class MultispectralAnalysis(BaseModel):
    """Results from multispectral image analysis"""
    analysis_id: str = Field(default_factory=lambda: f"MSA_{uuid.uuid4().hex[:8]}")
    flight_id: str
    farm_id: str
    field_area_hectares: float
    
    # NDVI (Normalized Difference Vegetation Index)
    ndvi_mean: float = Field(..., ge=-1.0, le=1.0)  # -1 to +1 scale
    ndvi_std_dev: float  # Standard deviation = uniformity indicator
    ndvi_min: float
    ndvi_max: float
    ndvi_map_url: str  # Color-coded map
    
    # Plant Health Indicators
    healthy_vegetation_percentage: float = Field(..., ge=0, le=100)
    stressed_vegetation_percentage: float = Field(..., ge=0, le=100)
    bare_soil_percentage: float = Field(..., ge=0, le=100)
    
    # Disease/Pest Detection
    disease_hotspots: List[Dict[str, Any]] = []  # [{lat, lon, severity, confidence}]
    pest_affected_areas: List[Dict[str, Any]] = []
    
    # Water Stress
    water_stress_score: float = Field(..., ge=0, le=100)  # 0=no stress, 100=severe
    drought_affected_percentage: float = Field(..., ge=0, le=100)
    
    # Uniformity Score (Key for Quality Grading)
    uniformity_score: float = Field(..., ge=0, le=100)  # 100=perfect uniformity
    quality_grade: QualityGrade
    
    analyzed_at: datetime = Field(default_factory=datetime.now)

class BLESensorDataPoint(BaseModel):
    """Data collected from BLE sensor during drone flight"""
    sensor_id: str
    flight_id: str
    gps_latitude: float
    gps_longitude: float
    soil_moisture_percentage: float = Field(..., ge=0, le=100)
    soil_temperature_celsius: float
    air_temperature_celsius: Optional[float] = None
    air_humidity_percentage: Optional[float] = None
    battery_level_percentage: float
    collected_at: datetime = Field(default_factory=datetime.now)

class Farm3DReconstruction(BaseModel):
    """3D model of farm from drone imagery"""
    reconstruction_id: str = Field(default_factory=lambda: f"3DR_{uuid.uuid4().hex[:8]}")
    flight_id: str
    farm_id: str
    total_images_processed: int
    
    # 3D Model Files
    point_cloud_url: str  # .las/.laz file
    mesh_model_url: str  # .obj/.fbx file
    orthomosaic_url: str  # High-res 2D map
    digital_elevation_model_url: str  # DEM/DSM
    
    # Measurements
    field_area_sqm: float
    field_perimeter_meters: float
    elevation_min_meters: float
    elevation_max_meters: float
    elevation_mean_meters: float
    slope_mean_degrees: float
    
    # Plant Counting (Computer Vision)
    estimated_plant_count: int
    plant_density_per_sqm: float
    row_spacing_cm: Optional[float] = None
    plant_spacing_cm: Optional[float] = None
    
    # Processing Stats
    processing_time_minutes: int
    generated_at: datetime = Field(default_factory=datetime.now)

class YieldPrediction(BaseModel):
    """AI-powered yield prediction from drone + sensor data"""
    prediction_id: str = Field(default_factory=lambda: f"YPR_{uuid.uuid4().hex[:8]}")
    flight_id: str
    farm_id: str
    crop_type: str
    
    # Data Sources
    ndvi_score: float  # From multispectral
    plant_count: int  # From 3D reconstruction
    plant_health_score: float = Field(..., ge=0, le=100)  # From NDVI analysis
    soil_moisture_average: float  # From BLE sensors
    growth_stage: str  # e.g., "flowering", "grain_filling"
    days_to_maturity: int
    
    # Predictions
    predicted_yield_kg: float
    predicted_yield_per_hectare_kg: float
    confidence_percentage: float = Field(..., ge=0, le=100)
    
    # Yield Range (Monte Carlo simulation)
    yield_min_kg: float  # Pessimistic scenario
    yield_max_kg: float  # Optimistic scenario
    
    # Quality Predictions
    predicted_quality_grade: QualityGrade
    predicted_market_price_kes_kg: float
    predicted_total_value_kes: float
    
    # Factors Affecting Yield
    positive_factors: List[str] = []  # e.g., ["Healthy vegetation", "Optimal moisture"]
    risk_factors: List[str] = []  # e.g., ["Water stress detected", "Disease hotspot"]
    
    predicted_at: datetime = Field(default_factory=datetime.now)
    last_updated: datetime = Field(default_factory=datetime.now)

class OptimalHarvestWindow(BaseModel):
    """AI-calculated optimal harvest timing"""
    window_id: str = Field(default_factory=lambda: f"OHW_{uuid.uuid4().hex[:8]}")
    farm_id: str
    crop_type: str
    field_area_hectares: float
    
    # Maturity Assessment
    current_maturity_percentage: float = Field(..., ge=0, le=100)
    days_to_optimal_maturity: int
    maturity_assessment: str  # e.g., "grain_filling_complete"
    
    # Optimal Window
    window_start_date: datetime
    window_end_date: datetime
    optimal_harvest_date: datetime  # Single best day
    window_duration_days: int
    
    # Weather Integration
    weather_forecast: List[Dict[str, Any]]  # 5-day forecast
    rain_risk_percentage: float = Field(..., ge=0, le=100)
    heat_stress_risk: float = Field(..., ge=0, le=100)
    weather_recommendation: str
    
    # Crop Moisture
    crop_moisture_percentage: float  # Current moisture content
    optimal_moisture_percentage: float  # Target for harvest
    drying_days_needed: int = 0
    
    # Storage Readiness
    storage_available: bool = False
    storage_facility_id: Optional[str] = None
    storage_temperature_celsius: Optional[float] = None
    storage_humidity_percentage: Optional[float] = None
    storage_ready: bool = False
    
    # Quality Impact
    quality_if_harvested_now: QualityGrade
    quality_if_delayed_7_days: QualityGrade
    shelf_life_if_harvested_now_days: int
    
    # Market Timing
    current_market_price_kes_kg: float
    predicted_price_at_optimal_date: float
    price_trend: str  # "increasing", "stable", "decreasing"
    
    # Harvest Logistics
    estimated_harvest_duration_days: float
    required_labor_count: int
    required_equipment: List[str] = []
    
    status: HarvestStatus = HarvestStatus.PRE_HARVEST
    created_at: datetime = Field(default_factory=datetime.now)
    last_updated: datetime = Field(default_factory=datetime.now)

class FarmerAggregationBundle(BaseModel):
    """Aggregated bundle of multiple farmers for bulk buyer"""
    bundle_id: str = Field(default_factory=lambda: f"BUN_{uuid.uuid4().hex[:8]}")
    region: str
    crop_type: str
    quality_grade: QualityGrade
    
    # Bundle Composition
    farmer_ids: List[str]
    farm_ids: List[str]
    total_farmers: int
    
    # Quantity
    total_predicted_yield_kg: float
    quantity_range_min_kg: float
    quantity_range_max_kg: float
    
    # Quality Metrics
    average_ndvi_score: float
    average_uniformity_score: float
    average_plant_health: float
    
    # Timing
    harvest_window_start: datetime
    harvest_window_end: datetime
    delivery_date: datetime
    
    # Pricing
    bundled_price_kes_kg: float
    total_bundle_value_kes: float
    farmer_share_percentage: float = 92.0  # Farmer gets 92%, platform 5%, logistics 3%
    
    # Buyer Requirements
    minimum_order_kg: float = 50000  # 50 tons minimum
    target_buyer_type: str = "processor"  # "processor", "distributor", "retailer"
    
    # Logistics
    collection_points: List[Dict[str, Any]] = []  # Centralized pickup locations
    estimated_transport_cost_kes: float
    
    # Status
    status: str = "available"  # "available", "reserved", "sold", "delivered"
    interested_buyers: List[str] = []
    
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

class PreHarvestMarketListing(BaseModel):
    """Future contract marketplace listing"""
    listing_id: str = Field(default_factory=lambda: f"PHL_{uuid.uuid4().hex[:8]}")
    farm_id: str
    farmer_id: str
    crop_type: str
    
    # Yield Prediction (from YieldPrediction)
    predicted_yield_kg: float
    yield_confidence_percentage: float
    quality_grade: QualityGrade
    
    # Harvest Timing
    expected_harvest_date: datetime
    harvest_window_days: int
    weeks_until_harvest: int
    
    # Pricing
    asking_price_kes_kg: float
    market_benchmark_kes_kg: float
    price_premium_percentage: float = 0.0  # Premium for pre-purchase
    total_listing_value_kes: float
    
    # Verification
    drone_verified: bool = True
    ndvi_score: float
    uniformity_score: float
    verification_date: datetime
    verification_images_urls: List[str] = []
    
    # Contract Terms
    payment_terms: str = "50% advance, 50% on delivery"
    delivery_terms: str = "farm_gate"  # "farm_gate", "collection_point", "buyer_location"
    quality_guarantee: str = "Refund if grade drops below listed quality"
    
    # Buyer Interest
    views_count: int = 0
    interested_buyers: List[str] = []
    bids: List[Dict[str, Any]] = []  # [{buyer_id, price_kes_kg, quantity_kg, timestamp}]
    
    # Status
    status: str = "active"  # "active", "reserved", "sold", "harvested"
    buyer_id: Optional[str] = None
    contract_signed: bool = False
    
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

class HarvestTriggerAlert(BaseModel):
    """Automated alert when optimal harvest window is reached"""
    alert_id: str = Field(default_factory=lambda: f"HTA_{uuid.uuid4().hex[:8]}")
    farm_id: str
    farmer_id: str
    window_id: str  # Reference to OptimalHarvestWindow
    
    # Alert Details
    alert_type: str = "optimal_harvest_window_reached"
    priority: str = "high"  # "low", "medium", "high", "urgent"
    message: str
    
    # Recommendations
    recommended_harvest_date: datetime
    recommended_harvest_time: str = "early_morning"  # Best time of day
    weather_window: Dict[str, Any]  # Next 3 days weather
    
    # Automated Notifications Sent
    farmer_notified: bool = False
    buyer_notified: bool = False
    storage_facility_notified: bool = False
    logistics_provider_notified: bool = False
    
    # Buyer Information (if pre-sold)
    buyer_id: Optional[str] = None
    buyer_name: Optional[str] = None
    pre_purchase_contract_id: Optional[str] = None
    
    # Storage Information
    storage_booking_id: Optional[str] = None
    storage_facility_name: Optional[str] = None
    storage_capacity_reserved_kg: Optional[float] = None
    
    # Logistics
    pickup_scheduled: bool = False
    pickup_date: Optional[datetime] = None
    transport_provider: Optional[str] = None
    
    # Farmer Actions
    farmer_confirmed_harvesting: bool = False
    actual_harvest_start_date: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

# ============================================================================
# IN-MEMORY STORAGE (Production: Use Supabase/PostgreSQL)
# ============================================================================

drone_flights: Dict[str, DroneFlightPlan] = {}
drone_images: Dict[str, DroneImageUpload] = {}
multispectral_analyses: Dict[str, MultispectralAnalysis] = {}
ble_sensor_data: Dict[str, List[BLESensorDataPoint]] = {}  # Key: flight_id
farm_3d_models: Dict[str, Farm3DReconstruction] = {}
yield_predictions: Dict[str, YieldPrediction] = {}
harvest_windows: Dict[str, OptimalHarvestWindow] = {}
aggregation_bundles: Dict[str, FarmerAggregationBundle] = {}
pre_harvest_listings: Dict[str, PreHarvestMarketListing] = {}
harvest_alerts: Dict[str, HarvestTriggerAlert] = {}

# ============================================================================
# PILLAR 1: DATA ACQUISITION (DRONE & SENSORS)
# ============================================================================

@router.post("/drone/plan-flight")
async def plan_drone_flight(flight_plan: DroneFlightPlan):
    """
    Create a flight plan for drone data collection mission.
    Calculates optimal flight path, image count, and duration.
    """
    # Calculate field area (simplified - production would use Haversine)
    coords = flight_plan.field_coordinates
    if len(coords) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 coordinates for field boundary")
    
    # Simplified area calculation (assume small field, flat earth approximation)
    # Production: Use proper polygon area calculation
    area_hectares = len(coords) * 0.5  # Placeholder
    
    # Calculate image requirements
    coverage_area_per_image_sqm = (flight_plan.ground_resolution_cm / 100) ** 2 * 1000000
    overlap_factor = 1 + (flight_plan.image_overlap_percentage / 100)
    estimated_images = int((area_hectares * 10000) / coverage_area_per_image_sqm * overlap_factor)
    
    # Estimate duration (assume 5m/s flight speed)
    estimated_duration = estimated_images * 3 / 60  # 3 seconds per image
    
    flight_plan.estimated_images = estimated_images
    flight_plan.estimated_duration_minutes = int(estimated_duration)
    
    drone_flights[flight_plan.flight_id] = flight_plan
    
    return {
        "success": True,
        "flight_plan": flight_plan,
        "message": f"Flight plan created. Estimated {estimated_images} images, {estimated_duration:.0f} minutes"
    }

@router.post("/drone/upload-images")
async def upload_drone_images(
    flight_id: str = Form(...),
    image_data: List[DroneImageUpload] = Form(...)
):
    """
    Upload drone images from completed flight.
    Supports batch upload of RGB, multispectral, thermal, LiDAR.
    """
    if flight_id not in drone_flights:
        raise HTTPException(status_code=404, detail="Flight plan not found")
    
    flight = drone_flights[flight_id]
    flight.status = DroneFlightStatus.PROCESSING
    
    # Store images
    for image in image_data:
        drone_images[image.image_id] = image
    
    return {
        "success": True,
        "images_uploaded": len(image_data),
        "flight_id": flight_id,
        "message": f"Uploaded {len(image_data)} images. Processing started."
    }

@router.post("/drone/collect-ble-data")
async def collect_ble_sensor_data(
    flight_id: str,
    sensor_data: List[BLESensorDataPoint]
):
    """
    Store BLE sensor data collected during drone flight.
    Drone flies over field and auto-collects from BLE sensors.
    """
    if flight_id not in drone_flights:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    if flight_id not in ble_sensor_data:
        ble_sensor_data[flight_id] = []
    
    ble_sensor_data[flight_id].extend(sensor_data)
    
    # Calculate averages
    avg_moisture = statistics.mean([d.soil_moisture_percentage for d in sensor_data])
    avg_temp = statistics.mean([d.soil_temperature_celsius for d in sensor_data])
    
    return {
        "success": True,
        "sensors_collected": len(sensor_data),
        "flight_id": flight_id,
        "average_soil_moisture": f"{avg_moisture:.1f}%",
        "average_soil_temperature": f"{avg_temp:.1f}°C",
        "message": f"Collected data from {len(sensor_data)} BLE sensors"
    }

# ============================================================================
# PILLAR 2: AI ENGINE (ANALYSIS & PREDICTION)
# ============================================================================

@router.post("/analysis/multispectral")
async def analyze_multispectral_images(
    flight_id: str,
    farm_id: str,
    field_area_hectares: float
):
    """
    Process multispectral images to generate NDVI maps and health analysis.
    This is the core AI analysis that drives quality grading.
    """
    if flight_id not in drone_flights:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    # In production, this would:
    # 1. Load all multispectral images
    # 2. Calculate NDVI for each pixel
    # 3. Generate statistical analysis
    # 4. Detect anomalies (disease, pests, water stress)
    
    # Simulated analysis (production uses computer vision AI)
    ndvi_mean = 0.72  # Healthy vegetation
    ndvi_std_dev = 0.08  # Low std dev = high uniformity
    
    # Calculate uniformity score (inverse of coefficient of variation)
    uniformity_score = 100 * (1 - (ndvi_std_dev / ndvi_mean))
    
    # Assign quality grade based on uniformity
    if uniformity_score >= 90:
        quality_grade = QualityGrade.GRADE_A_PREMIUM
    elif uniformity_score >= 70:
        quality_grade = QualityGrade.GRADE_B_STANDARD
    elif uniformity_score >= 50:
        quality_grade = QualityGrade.GRADE_C_BASIC
    else:
        quality_grade = QualityGrade.GRADE_D_POOR
    
    analysis = MultispectralAnalysis(
        flight_id=flight_id,
        farm_id=farm_id,
        field_area_hectares=field_area_hectares,
        ndvi_mean=ndvi_mean,
        ndvi_std_dev=ndvi_std_dev,
        ndvi_min=0.45,
        ndvi_max=0.88,
        ndvi_map_url=f"https://storage.agropulse.com/ndvi/{flight_id}.png",
        healthy_vegetation_percentage=85.0,
        stressed_vegetation_percentage=12.0,
        bare_soil_percentage=3.0,
        disease_hotspots=[
            {"lat": -1.2921, "lon": 36.8219, "severity": "moderate", "confidence": 0.78}
        ],
        water_stress_score=25.0,
        drought_affected_percentage=8.0,
        uniformity_score=uniformity_score,
        quality_grade=quality_grade
    )
    
    multispectral_analyses[analysis.analysis_id] = analysis
    
    # Update flight status
    drone_flights[flight_id].status = DroneFlightStatus.ANALYZED
    
    return {
        "success": True,
        "analysis": analysis,
        "message": f"Multispectral analysis complete. Quality Grade: {quality_grade.value.upper()}"
    }

@router.post("/analysis/3d-reconstruction")
async def create_3d_farm_model(
    flight_id: str,
    farm_id: str
):
    """
    Process drone images to create 3D farm model.
    Uses photogrammetry to generate point cloud, mesh, and orthomosaic.
    Includes AI-powered plant counting.
    """
    if flight_id not in drone_flights:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    # In production, this uses photogrammetry software (Pix4D, OpenDroneMap, etc.)
    # and computer vision for plant counting
    
    reconstruction = Farm3DReconstruction(
        flight_id=flight_id,
        farm_id=farm_id,
        total_images_processed=450,
        point_cloud_url=f"https://storage.agropulse.com/3d/{flight_id}_pointcloud.las",
        mesh_model_url=f"https://storage.agropulse.com/3d/{flight_id}_mesh.obj",
        orthomosaic_url=f"https://storage.agropulse.com/3d/{flight_id}_ortho.tif",
        digital_elevation_model_url=f"https://storage.agropulse.com/3d/{flight_id}_dem.tif",
        field_area_sqm=25000,  # 2.5 hectares
        field_perimeter_meters=632,
        elevation_min_meters=1450,
        elevation_max_meters=1468,
        elevation_mean_meters=1459,
        slope_mean_degrees=3.2,
        estimated_plant_count=125000,
        plant_density_per_sqm=5.0,
        row_spacing_cm=75,
        plant_spacing_cm=40,
        processing_time_minutes=45
    )
    
    farm_3d_models[reconstruction.reconstruction_id] = reconstruction
    
    return {
        "success": True,
        "reconstruction": reconstruction,
        "message": f"3D model created. Estimated {reconstruction.estimated_plant_count:,} plants"
    }

@router.post("/prediction/yield")
async def predict_yield(
    flight_id: str,
    farm_id: str,
    crop_type: str,
    growth_stage: str,
    days_to_maturity: int
):
    """
    AI-powered yield prediction combining:
    - Multispectral data (NDVI)
    - 3D reconstruction (plant count)
    - BLE sensor data (soil moisture)
    - Growth models
    """
    # Get analysis data
    analysis = None
    for a in multispectral_analyses.values():
        if a.flight_id == flight_id:
            analysis = a
            break
    
    reconstruction = None
    for r in farm_3d_models.values():
        if r.flight_id == flight_id:
            reconstruction = r
            break
    
    if not analysis or not reconstruction:
        raise HTTPException(status_code=400, detail="Need multispectral analysis and 3D reconstruction first")
    
    # Get BLE sensor averages
    sensors = ble_sensor_data.get(flight_id, [])
    avg_moisture = statistics.mean([s.soil_moisture_percentage for s in sensors]) if sensors else 35.0
    
    # Yield prediction algorithm (simplified)
    # Production: Use trained ML model (RandomForest, XGBoost, etc.)
    
    # Base yield per plant (crop-specific)
    crop_yields = {
        "Potato": 0.8,  # kg per plant
        "Maize": 0.25,
        "Tomato": 2.5,
        "Cabbage": 1.5
    }
    base_yield_per_plant = crop_yields.get(crop_type, 0.5)
    
    # Adjust for health
    health_factor = analysis.ndvi_mean * 1.2  # 0.7 NDVI = 84% of potential
    
    # Adjust for uniformity (lower variance = better yield)
    uniformity_factor = analysis.uniformity_score / 100
    
    # Adjust for moisture
    moisture_factor = 1.0
    if avg_moisture < 25:
        moisture_factor = 0.7  # Drought stress
    elif avg_moisture > 50:
        moisture_factor = 0.9  # Overwatering
    
    # Calculate predicted yield
    predicted_yield_kg = (
        reconstruction.estimated_plant_count *
        base_yield_per_plant *
        health_factor *
        uniformity_factor *
        moisture_factor
    )
    
    # Calculate per-hectare yield
    area_hectares = reconstruction.field_area_sqm / 10000
    yield_per_hectare = predicted_yield_kg / area_hectares
    
    # Monte Carlo range (±15%)
    yield_min = predicted_yield_kg * 0.85
    yield_max = predicted_yield_kg * 1.15
    
    # Market price (from market linkages)
    quality_price_multipliers = {
        QualityGrade.GRADE_A_PREMIUM: 1.25,
        QualityGrade.GRADE_B_STANDARD: 1.0,
        QualityGrade.GRADE_C_BASIC: 0.85,
        QualityGrade.GRADE_D_POOR: 0.7
    }
    base_price = 40.0  # KES per kg
    predicted_price = base_price * quality_price_multipliers[analysis.quality_grade]
    predicted_value = predicted_yield_kg * predicted_price
    
    # Identify factors
    positive_factors = []
    risk_factors = []
    
    if analysis.ndvi_mean > 0.7:
        positive_factors.append("Healthy vegetation (NDVI > 0.7)")
    if analysis.uniformity_score > 80:
        positive_factors.append("High crop uniformity")
    if avg_moisture > 30 and avg_moisture < 45:
        positive_factors.append("Optimal soil moisture")
    
    if analysis.water_stress_score > 40:
        risk_factors.append(f"Water stress detected ({analysis.water_stress_score:.0f}%)")
    if len(analysis.disease_hotspots) > 0:
        risk_factors.append(f"{len(analysis.disease_hotspots)} disease hotspots detected")
    if analysis.uniformity_score < 70:
        risk_factors.append("Uneven crop growth")
    
    prediction = YieldPrediction(
        flight_id=flight_id,
        farm_id=farm_id,
        crop_type=crop_type,
        ndvi_score=analysis.ndvi_mean,
        plant_count=reconstruction.estimated_plant_count,
        plant_health_score=analysis.healthy_vegetation_percentage,
        soil_moisture_average=avg_moisture,
        growth_stage=growth_stage,
        days_to_maturity=days_to_maturity,
        predicted_yield_kg=predicted_yield_kg,
        predicted_yield_per_hectare_kg=yield_per_hectare,
        confidence_percentage=85.0,
        yield_min_kg=yield_min,
        yield_max_kg=yield_max,
        predicted_quality_grade=analysis.quality_grade,
        predicted_market_price_kes_kg=predicted_price,
        predicted_total_value_kes=predicted_value,
        positive_factors=positive_factors,
        risk_factors=risk_factors
    )
    
    yield_predictions[prediction.prediction_id] = prediction
    
    return {
        "success": True,
        "prediction": prediction,
        "message": f"Predicted yield: {predicted_yield_kg:,.0f} kg ({yield_per_hectare:,.0f} kg/ha). " +
                   f"Estimated value: KES {predicted_value:,.0f}"
    }

@router.post("/harvest/calculate-optimal-window")
async def calculate_optimal_harvest_window(
    farm_id: str,
    prediction_id: str,
    storage_facility_id: Optional[str] = None
):
    """
    Calculate optimal harvest window combining:
    - Crop maturity
    - Weather forecast
    - Soil moisture
    - Market prices
    - Storage availability
    """
    if prediction_id not in yield_predictions:
        raise HTTPException(status_code=404, detail="Yield prediction not found")
    
    prediction = yield_predictions[prediction_id]
    
    # Calculate maturity
    current_maturity = 85.0  # %
    days_to_optimal = prediction.days_to_maturity
    
    # Optimal window (typically 7-10 days)
    window_start = datetime.now() + timedelta(days=days_to_optimal)
    window_end = window_start + timedelta(days=10)
    optimal_date = window_start + timedelta(days=3)  # Day 3 of window
    
    # Weather forecast (simplified - production uses real API)
    weather_forecast = [
        {"date": (datetime.now() + timedelta(days=i)).date().isoformat(),
         "condition": "sunny" if i % 2 == 0 else "cloudy",
         "rain_probability": 10 if i % 2 == 0 else 30,
         "temp_max": 28 + i % 3}
        for i in range(days_to_optimal, days_to_optimal + 5)
    ]
    
    rain_risk = 15.0  # Low rain risk
    
    # Storage check
    storage_ready = storage_facility_id is not None
    
    # Market timing
    current_price = prediction.predicted_market_price_kes_kg
    predicted_price_at_harvest = current_price * 1.05  # 5% increase expected
    
    # Labor requirements
    area_hectares = 2.5
    labor_count = int(area_hectares * 8)  # 8 people per hectare
    harvest_duration = area_hectares / 0.5  # 0.5 hectares per day
    
    window = OptimalHarvestWindow(
        farm_id=farm_id,
        crop_type=prediction.crop_type,
        field_area_hectares=area_hectares,
        current_maturity_percentage=current_maturity,
        days_to_optimal_maturity=days_to_optimal,
        maturity_assessment="grain_filling_complete",
        window_start_date=window_start,
        window_end_date=window_end,
        optimal_harvest_date=optimal_date,
        window_duration_days=10,
        weather_forecast=weather_forecast,
        rain_risk_percentage=rain_risk,
        heat_stress_risk=20.0,
        weather_recommendation="Harvest early morning to avoid midday heat",
        crop_moisture_percentage=18.0,
        optimal_moisture_percentage=14.0,
        drying_days_needed=2,
        storage_available=bool(storage_facility_id),
        storage_facility_id=storage_facility_id,
        storage_ready=storage_ready,
        quality_if_harvested_now=QualityGrade.GRADE_B_STANDARD,
        quality_if_delayed_7_days=QualityGrade.GRADE_A_PREMIUM,
        shelf_life_if_harvested_now_days=30,
        current_market_price_kes_kg=current_price,
        predicted_price_at_optimal_date=predicted_price_at_harvest,
        price_trend="increasing",
        estimated_harvest_duration_days=harvest_duration,
        required_labor_count=labor_count,
        required_equipment=["Combine harvester", "Transport trucks", "Drying equipment"]
    )
    
    harvest_windows[window.window_id] = window
    
    return {
        "success": True,
        "window": window,
        "message": f"Optimal harvest: {optimal_date.strftime('%A, %B %d, %Y')}. " +
                   f"Window: {window.window_duration_days} days. Rain risk: {rain_risk:.0f}%"
    }

# ============================================================================
# PILLAR 3: MARKETPLACE & LOGISTICS
# ============================================================================

@router.post("/marketplace/create-aggregation-bundle")
async def create_farmer_aggregation_bundle(
    region: str,
    crop_type: str,
    quality_grade: QualityGrade,
    minimum_quantity_kg: float = 50000
):
    """
    AI-powered farmer aggregation: Bundle multiple small farms to meet bulk buyer requirements.
    Scans all farms with yield predictions and groups by quality/timing.
    """
    # Find all yield predictions matching criteria
    matching_predictions = []
    for pred in yield_predictions.values():
        if (pred.crop_type == crop_type and
            pred.predicted_quality_grade == quality_grade):
            matching_predictions.append(pred)
    
    if not matching_predictions:
        raise HTTPException(status_code=404, detail="No matching farms found")
    
    # Sort by predicted harvest date
    matching_predictions.sort(key=lambda p: p.predicted_at)
    
    # Bundle farms until we reach minimum quantity
    bundled_farms = []
    total_yield = 0.0
    farmer_ids = []
    farm_ids = []
    
    for pred in matching_predictions:
        if total_yield >= minimum_quantity_kg:
            break
        bundled_farms.append(pred)
        total_yield += pred.predicted_yield_kg
        farmer_ids.append(f"FARMER_{pred.farm_id[:8]}")
        farm_ids.append(pred.farm_id)
    
    if total_yield < minimum_quantity_kg:
        return {
            "success": False,
            "message": f"Only {total_yield:,.0f} kg available. Need {minimum_quantity_kg:,.0f} kg minimum."
        }
    
    # Calculate bundle statistics
    avg_ndvi = statistics.mean([p.ndvi_score for p in bundled_farms])
    avg_health = statistics.mean([p.plant_health_score for p in bundled_farms])
    
    # Get harvest windows
    first_harvest = datetime.now() + timedelta(days=14)
    last_harvest = first_harvest + timedelta(days=7)
    delivery_date = last_harvest + timedelta(days=2)
    
    # Pricing (bulk discount)
    base_price = bundled_farms[0].predicted_market_price_kes_kg
    bulk_discount = 0.92  # 8% bulk discount
    bundled_price = base_price * bulk_discount
    total_value = total_yield * bundled_price
    
    # Collection points (regional aggregation)
    collection_points = [
        {"name": "Nakuru Co-op Center", "lat": -0.3031, "lon": 36.0800, "capacity_kg": 30000},
        {"name": "Naivasha Collection Hub", "lat": -0.7167, "lon": 36.4333, "capacity_kg": 25000}
    ]
    
    bundle = FarmerAggregationBundle(
        region=region,
        crop_type=crop_type,
        quality_grade=quality_grade,
        farmer_ids=farmer_ids,
        farm_ids=farm_ids,
        total_farmers=len(bundled_farms),
        total_predicted_yield_kg=total_yield,
        quantity_range_min_kg=total_yield * 0.9,
        quantity_range_max_kg=total_yield * 1.1,
        average_ndvi_score=avg_ndvi,
        average_uniformity_score=85.0,
        average_plant_health=avg_health,
        harvest_window_start=first_harvest,
        harvest_window_end=last_harvest,
        delivery_date=delivery_date,
        bundled_price_kes_kg=bundled_price,
        total_bundle_value_kes=total_value,
        collection_points=collection_points,
        estimated_transport_cost_kes=total_yield * 2.5,  # KES 2.5/kg transport
        expires_at=first_harvest - timedelta(days=7)  # Expire 1 week before harvest
    )
    
    aggregation_bundles[bundle.bundle_id] = bundle
    
    return {
        "success": True,
        "bundle": bundle,
        "message": f"Bundle created: {len(bundled_farms)} farmers, {total_yield:,.0f} kg, " +
                   f"KES {bundled_price:.2f}/kg. Value: KES {total_value:,.0f}"
    }

@router.post("/marketplace/create-pre-harvest-listing")
async def create_pre_harvest_listing(
    prediction_id: str,
    farmer_id: str,
    asking_price_kes_kg: Optional[float] = None,
    payment_terms: str = "50% advance, 50% on delivery"
):
    """
    Create pre-harvest marketplace listing (future contract).
    Allows buyers to purchase crops before harvest, providing farmers with upfront capital.
    """
    if prediction_id not in yield_predictions:
        raise HTTPException(status_code=404, detail="Yield prediction not found")
    
    prediction = yield_predictions[prediction_id]
    
    # Default asking price = predicted price + 5% premium for pre-purchase
    if not asking_price_kes_kg:
        asking_price_kes_kg = prediction.predicted_market_price_kes_kg * 1.05
    
    # Get verification data
    analysis = None
    for a in multispectral_analyses.values():
        if a.flight_id == prediction.flight_id:
            analysis = a
            break
    
    # Calculate weeks until harvest
    weeks_until_harvest = prediction.days_to_maturity // 7
    expected_harvest_date = datetime.now() + timedelta(days=prediction.days_to_maturity)
    
    listing = PreHarvestMarketListing(
        farm_id=prediction.farm_id,
        farmer_id=farmer_id,
        crop_type=prediction.crop_type,
        predicted_yield_kg=prediction.predicted_yield_kg,
        yield_confidence_percentage=prediction.confidence_percentage,
        quality_grade=prediction.predicted_quality_grade,
        expected_harvest_date=expected_harvest_date,
        harvest_window_days=10,
        weeks_until_harvest=weeks_until_harvest,
        asking_price_kes_kg=asking_price_kes_kg,
        market_benchmark_kes_kg=prediction.predicted_market_price_kes_kg,
        price_premium_percentage=5.0,
        total_listing_value_kes=prediction.predicted_yield_kg * asking_price_kes_kg,
        ndvi_score=prediction.ndvi_score,
        uniformity_score=analysis.uniformity_score if analysis else 85.0,
        verification_date=datetime.now(),
        verification_images_urls=[
            f"https://storage.agropulse.com/verify/{prediction.flight_id}_1.jpg",
            f"https://storage.agropulse.com/verify/{prediction.flight_id}_2.jpg"
        ],
        payment_terms=payment_terms,
        expires_at=expected_harvest_date - timedelta(days=14)  # Expire 2 weeks before harvest
    )
    
    pre_harvest_listings[listing.listing_id] = listing
    
    return {
        "success": True,
        "listing": listing,
        "message": f"Pre-harvest listing created: {prediction.predicted_yield_kg:,.0f} kg {prediction.crop_type}, " +
                   f"{weeks_until_harvest} weeks until harvest. Asking: KES {asking_price_kes_kg:.2f}/kg"
    }

@router.post("/harvest/trigger-alert")
async def trigger_harvest_alert(window_id: str, farmer_id: str):
    """
    Automated alert triggered when optimal harvest window is reached.
    Notifies farmer, buyer (if pre-sold), storage facility, and logistics.
    """
    if window_id not in harvest_windows:
        raise HTTPException(status_code=404, detail="Harvest window not found")
    
    window = harvest_windows[window_id]
    
    # Check if crop is pre-sold
    pre_sold_listing = None
    buyer_id = None
    for listing in pre_harvest_listings.values():
        if listing.farm_id == window.farm_id and listing.status == "sold":
            pre_sold_listing = listing
            buyer_id = listing.buyer_id
            break
    
    # Check storage booking
    storage_booking_id = window.storage_facility_id
    
    alert = HarvestTriggerAlert(
        farm_id=window.farm_id,
        farmer_id=farmer_id,
        window_id=window_id,
        message=f"🌾 OPTIMAL HARVEST WINDOW REACHED!\n\n" +
                f"Recommended harvest date: {window.optimal_harvest_date.strftime('%A, %B %d, %Y')}\n" +
                f"Best time: Early morning (6:00 AM - 10:00 AM)\n" +
                f"Weather: {window.weather_recommendation}\n\n" +
                f"Expected yield: {[p.predicted_yield_kg for p in yield_predictions.values() if p.farm_id == window.farm_id][0]:,.0f} kg\n" +
                f"Quality grade: {window.quality_if_harvested_now.value.upper()}\n\n" +
                f"Required labor: {window.required_labor_count} people\n" +
                f"Duration: {window.estimated_harvest_duration_days:.1f} days",
        recommended_harvest_date=window.optimal_harvest_date,
        weather_window=window.weather_forecast[:3],  # Next 3 days
        buyer_id=buyer_id,
        buyer_name="Nakuru Mills Ltd" if buyer_id else None,
        pre_purchase_contract_id=pre_sold_listing.listing_id if pre_sold_listing else None,
        storage_booking_id=storage_booking_id,
        storage_facility_name="Nakuru Co-op Storage" if storage_booking_id else None,
        storage_capacity_reserved_kg=10000.0 if storage_booking_id else None
    )
    
    # Simulate notifications sent
    alert.farmer_notified = True
    alert.buyer_notified = bool(buyer_id)
    alert.storage_facility_notified = bool(storage_booking_id)
    alert.logistics_provider_notified = bool(buyer_id)
    
    harvest_alerts[alert.alert_id] = alert
    
    # Update harvest window status
    window.status = HarvestStatus.OPTIMAL_WINDOW
    
    notifications_sent = []
    if alert.farmer_notified:
        notifications_sent.append("Farmer (SMS + App)")
    if alert.buyer_notified:
        notifications_sent.append(f"Buyer ({alert.buyer_name})")
    if alert.storage_facility_notified:
        notifications_sent.append("Storage Facility")
    if alert.logistics_provider_notified:
        notifications_sent.append("Logistics Provider")
    
    return {
        "success": True,
        "alert": alert,
        "notifications_sent": notifications_sent,
        "message": f"Harvest alert triggered! Notifications sent to: {', '.join(notifications_sent)}"
    }

@router.put("/harvest/confirm-harvesting/{alert_id}")
async def confirm_harvesting_started(alert_id: str):
    """
    Farmer confirms they have started harvesting.
    This triggers immediate alerts to buyer and logistics.
    """
    if alert_id not in harvest_alerts:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert = harvest_alerts[alert_id]
    alert.farmer_confirmed_harvesting = True
    alert.actual_harvest_start_date = datetime.now()
    
    # Update window status
    for window in harvest_windows.values():
        if window.window_id == alert.window_id:
            window.status = HarvestStatus.HARVESTING
            break
    
    # Trigger buyer alert
    buyer_message = ""
    if alert.buyer_id:
        buyer_message = f"\n\n📦 BUYER ALERT: Your pre-purchased crop is being harvested NOW! " +\
                       f"Expected pickup: {(datetime.now() + timedelta(days=2)).strftime('%A, %B %d')}"
    
    # Trigger storage alert
    storage_message = ""
    if alert.storage_booking_id:
        storage_message = f"\n\n🏪 STORAGE ALERT: Incoming delivery in 2 days. " +\
                         f"Reserved capacity: {alert.storage_capacity_reserved_kg:,.0f} kg"
    
    return {
        "success": True,
        "message": f"✅ Harvest confirmed! Started: {datetime.now().strftime('%Y-%m-%d %H:%M')}" +
                   buyer_message + storage_message,
        "buyer_notified": alert.buyer_notified,
        "storage_notified": alert.storage_facility_notified,
        "logistics_notified": alert.logistics_provider_notified
    }

# ============================================================================
# QUERY ENDPOINTS
# ============================================================================

@router.get("/drone/flights/{farm_id}")
async def get_farm_flights(farm_id: str):
    """Get all drone flights for a farm"""
    flights = [f for f in drone_flights.values() if f.farm_id == farm_id]
    return {"success": True, "flights": flights, "total": len(flights)}

@router.get("/analysis/multispectral/{flight_id}")
async def get_multispectral_analysis(flight_id: str):
    """Get multispectral analysis for a flight"""
    for analysis in multispectral_analyses.values():
        if analysis.flight_id == flight_id:
            return {"success": True, "analysis": analysis}
    raise HTTPException(status_code=404, detail="Analysis not found")

@router.get("/prediction/yield/{farm_id}")
async def get_farm_yield_predictions(farm_id: str):
    """Get all yield predictions for a farm"""
    predictions = [p for p in yield_predictions.values() if p.farm_id == farm_id]
    return {"success": True, "predictions": predictions, "total": len(predictions)}

@router.get("/harvest/window/{farm_id}")
async def get_harvest_window(farm_id: str):
    """Get optimal harvest window for a farm"""
    for window in harvest_windows.values():
        if window.farm_id == farm_id:
            return {"success": True, "window": window}
    raise HTTPException(status_code=404, detail="No harvest window calculated")

@router.get("/marketplace/aggregation-bundles")
async def get_aggregation_bundles(
    crop_type: Optional[str] = None,
    quality_grade: Optional[QualityGrade] = None,
    status: str = "available"
):
    """Browse farmer aggregation bundles"""
    bundles = [b for b in aggregation_bundles.values() if b.status == status]
    
    if crop_type:
        bundles = [b for b in bundles if b.crop_type == crop_type]
    if quality_grade:
        bundles = [b for b in bundles if b.quality_grade == quality_grade]
    
    return {"success": True, "bundles": bundles, "total": len(bundles)}

@router.get("/marketplace/pre-harvest-listings")
async def get_pre_harvest_listings(
    crop_type: Optional[str] = None,
    quality_grade: Optional[QualityGrade] = None,
    max_weeks_until_harvest: Optional[int] = None
):
    """Browse pre-harvest marketplace listings"""
    listings = [l for l in pre_harvest_listings.values() if l.status == "active"]
    
    if crop_type:
        listings = [l for l in listings if l.crop_type == crop_type]
    if quality_grade:
        listings = [l for l in listings if l.quality_grade == quality_grade]
    if max_weeks_until_harvest:
        listings = [l for l in listings if l.weeks_until_harvest <= max_weeks_until_harvest]
    
    return {"success": True, "listings": listings, "total": len(listings)}

@router.get("/harvest/alerts/{farmer_id}")
async def get_farmer_harvest_alerts(farmer_id: str):
    """Get harvest alerts for a farmer"""
    alerts = [a for a in harvest_alerts.values() if a.farmer_id == farmer_id]
    return {"success": True, "alerts": alerts, "total": len(alerts)}
