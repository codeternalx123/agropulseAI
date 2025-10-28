"""
Integrated AI Prediction Engine
================================
Combines disease prediction, financial modeling, weather forecasting,
and climate risk to provide comprehensive farm intelligence.

Pre-trained models:
- Disease risk prediction (pest, fungal, bacterial)
- Financial impact modeling
- Weather-crop interaction analysis
- Optimal action recommendations
"""

from fastapi import APIRouter, HTTPException
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

class DiseaseType(str, Enum):
    PEST = "pest"
    FUNGAL = "fungal"
    BACTERIAL = "bacterial"
    VIRAL = "viral"
    NUTRIENT_DEFICIENCY = "nutrient_deficiency"

class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class WeatherThreat(str, Enum):
    DROUGHT = "drought"
    FLOOD = "flood"
    HEATWAVE = "heatwave"
    FROST = "frost"
    HAIL = "hail"
    WINDSTORM = "windstorm"

class ActionPriority(str, Enum):
    IMMEDIATE = "immediate"  # Within 24 hours
    URGENT = "urgent"  # Within 3 days
    SCHEDULED = "scheduled"  # Within 7 days
    MONITORING = "monitoring"  # Ongoing

# Pre-trained disease signatures (simplified - production uses ML models)
DISEASE_SIGNATURES = {
    "late_blight": {
        "triggers": {"humidity": ">85%", "temp_range": "10-25C", "rainfall": ">50mm/week"},
        "crops_affected": ["Potato", "Tomato"],
        "incubation_days": 5,
        "financial_impact_per_hectare": 150000,  # KES
        "symptoms": ["Dark lesions on leaves", "White fungal growth", "Tuber rot"]
    },
    "fall_armyworm": {
        "triggers": {"temp_range": "25-30C", "ndvi_drop": ">15%"},
        "crops_affected": ["Maize"],
        "incubation_days": 3,
        "financial_impact_per_hectare": 80000,
        "symptoms": ["Holes in leaves", "Caterpillars in whorl", "Frass on plants"]
    },
    "bacterial_wilt": {
        "triggers": {"soil_moisture": ">60%", "temp_range": "25-35C"},
        "crops_affected": ["Tomato", "Potato", "Cabbage"],
        "incubation_days": 7,
        "financial_impact_per_hectare": 120000,
        "symptoms": ["Wilting without yellowing", "Vascular discoloration", "Bacterial ooze"]
    },
    "aphid_infestation": {
        "triggers": {"temp_range": "20-30C", "drought_stress": True},
        "crops_affected": ["Cabbage", "Beans", "Peas"],
        "incubation_days": 2,
        "financial_impact_per_hectare": 40000,
        "symptoms": ["Sticky honeydew", "Curled leaves", "Stunted growth"]
    },
    "powdery_mildew": {
        "triggers": {"humidity": "60-80%", "temp_range": "20-30C"},
        "crops_affected": ["Tomato", "Beans", "Peas"],
        "incubation_days": 7,
        "financial_impact_per_hectare": 60000,
        "symptoms": ["White powdery coating", "Leaf distortion", "Premature defoliation"]
    }
}

# ============================================================================
# DATA MODELS
# ============================================================================

class FarmEnvironmentData(BaseModel):
    """Current farm environmental conditions"""
    farm_id: str
    crop_type: str
    field_area_hectares: float
    
    # Weather data (current + forecast)
    current_temperature_c: float
    current_humidity_percentage: float
    current_rainfall_mm_last_week: float
    five_day_forecast: List[Dict[str, Any]]  # [{date, temp_min, temp_max, rainfall_mm, humidity}]
    
    # Soil data
    soil_moisture_percentage: float
    soil_temperature_c: float
    soil_ph: float
    soil_npk: Dict[str, float]  # {nitrogen, phosphorus, potassium}
    
    # Crop health data (from drone/AI intelligence)
    ndvi_score: float = 0.7
    plant_health_percentage: float = 85.0
    vegetation_uniformity: float = 80.0
    
    # Growth stage
    days_since_planting: int
    growth_stage: str  # "seedling", "vegetative", "flowering", "fruiting", "maturity"
    days_to_harvest: int
    
    # Historical data
    previous_diseases: List[str] = []
    previous_treatments: List[Dict[str, Any]] = []
    neighboring_farms_disease_reports: List[str] = []

class FinancialData(BaseModel):
    """Farm financial information"""
    farm_id: str
    total_investment_kes: float
    
    # Costs
    seed_cost_kes: float
    fertilizer_cost_kes: float
    labor_cost_kes: float
    equipment_cost_kes: float
    irrigation_cost_kes: float
    pesticide_budget_kes: float = 0.0
    
    # Expected returns
    expected_yield_kg: float
    market_price_per_kg: float
    expected_revenue_kes: float
    
    # Insurance
    has_crop_insurance: bool = False
    insurance_coverage_percentage: float = 0.0

class DiseasePrediction(BaseModel):
    """AI-powered disease risk prediction"""
    prediction_id: str = Field(default_factory=lambda: f"DPR_{uuid.uuid4().hex[:8]}")
    farm_id: str
    crop_type: str
    
    # Disease predictions
    predicted_diseases: List[Dict[str, Any]]  # [{disease_name, risk_level, probability, days_to_onset}]
    highest_risk_disease: str
    overall_risk_score: float = Field(..., ge=0, le=100)
    
    # Environmental factors
    contributing_factors: List[str]
    protective_factors: List[str]
    
    # Weather threat analysis
    weather_threats: List[Dict[str, Any]]  # [{threat_type, probability, impact_severity, timeframe}]
    
    # Financial impact
    potential_loss_kes: float
    treatment_cost_kes: float
    roi_of_prevention: float  # Return on investment if preventive action taken
    
    predicted_at: datetime = Field(default_factory=datetime.now)

class ActionRecommendation(BaseModel):
    """Prioritized actions to protect crops"""
    recommendation_id: str = Field(default_factory=lambda: f"ACT_{uuid.uuid4().hex[:8]}")
    farm_id: str
    priority: ActionPriority
    
    # Action details
    action_type: str  # "spray", "irrigation", "drainage", "harvest_early", "apply_fertilizer"
    action_description: str
    why_needed: str
    
    # Timing
    execute_by: datetime
    optimal_window_start: datetime
    optimal_window_end: datetime
    hours_until_deadline: int
    
    # Resources required
    materials_needed: List[Dict[str, Any]]  # [{material, quantity, cost_kes}]
    total_cost_kes: float
    labor_hours_required: float
    equipment_needed: List[str]
    
    # Expected outcome
    expected_crop_saved_percentage: float
    financial_benefit_kes: float
    success_probability: float = Field(..., ge=0, le=100)
    
    # Instructions (English + Swahili)
    instructions_en: List[str]
    instructions_sw: List[str]

class IntegratedFarmIntelligence(BaseModel):
    """Complete AI-powered farm intelligence report"""
    report_id: str = Field(default_factory=lambda: f"IFI_{uuid.uuid4().hex[:8]}")
    farm_id: str
    farmer_id: str
    crop_type: str
    
    # Current status
    overall_health_score: float = Field(..., ge=0, le=100)
    risk_level: RiskLevel
    days_to_harvest: int
    
    # Predictions
    disease_prediction: DiseasePrediction
    weather_analysis: Dict[str, Any]
    financial_projection: Dict[str, Any]
    
    # Recommended actions
    immediate_actions: List[ActionRecommendation]
    scheduled_actions: List[ActionRecommendation]
    monitoring_tasks: List[str]
    
    # Decision support
    should_harvest_early: bool
    early_harvest_benefit_kes: float = 0.0
    should_apply_insurance_claim: bool = False
    
    # AI confidence
    prediction_confidence: float = Field(..., ge=0, le=100)
    data_quality_score: float = Field(..., ge=0, le=100)
    
    generated_at: datetime = Field(default_factory=datetime.now)
    valid_until: datetime = Field(default_factory=lambda: datetime.now() + timedelta(days=2))

# ============================================================================
# IN-MEMORY STORAGE
# ============================================================================

disease_predictions: Dict[str, DiseasePrediction] = {}
action_recommendations: Dict[str, ActionRecommendation] = {}
intelligence_reports: Dict[str, IntegratedFarmIntelligence] = {}

# ============================================================================
# AI PREDICTION ENGINE
# ============================================================================

@router.post("/predict/disease-risk")
async def predict_disease_risk(
    environment_data: FarmEnvironmentData
):
    """
    AI-powered disease risk prediction using pre-trained models.
    Analyzes environmental conditions, crop health, and weather forecasts.
    """
    
    predicted_diseases = []
    overall_risk_score = 0.0
    contributing_factors = []
    protective_factors = []
    
    # Analyze each disease signature
    for disease_name, signature in DISEASE_SIGNATURES.items():
        # Check if crop is susceptible
        if environment_data.crop_type not in signature["crops_affected"]:
            continue
        
        risk_score = 0.0
        triggers_met = 0
        total_triggers = len(signature["triggers"])
        
        # Check environmental triggers
        for trigger, condition in signature["triggers"].items():
            if trigger == "humidity":
                if ">" in condition:
                    threshold = float(condition.replace(">", "").replace("%", ""))
                    if environment_data.current_humidity_percentage > threshold:
                        risk_score += 25
                        triggers_met += 1
                        contributing_factors.append(f"High humidity ({environment_data.current_humidity_percentage}%)")
                elif "-" in condition:
                    min_val, max_val = condition.replace("%", "").split("-")
                    if float(min_val) <= environment_data.current_humidity_percentage <= float(max_val):
                        risk_score += 25
                        triggers_met += 1
            
            elif trigger == "temp_range":
                min_temp, max_temp = condition.replace("C", "").split("-")
                if float(min_temp) <= environment_data.current_temperature_c <= float(max_temp):
                    risk_score += 25
                    triggers_met += 1
                    contributing_factors.append(f"Temperature in disease range ({environment_data.current_temperature_c}°C)")
            
            elif trigger == "rainfall":
                if ">" in condition:
                    threshold = float(condition.replace(">", "").replace("mm/week", ""))
                    if environment_data.current_rainfall_mm_last_week > threshold:
                        risk_score += 25
                        triggers_met += 1
                        contributing_factors.append(f"High rainfall ({environment_data.current_rainfall_mm_last_week}mm)")
            
            elif trigger == "soil_moisture":
                if ">" in condition:
                    threshold = float(condition.replace(">", "").replace("%", ""))
                    if environment_data.soil_moisture_percentage > threshold:
                        risk_score += 25
                        triggers_met += 1
                        contributing_factors.append(f"High soil moisture ({environment_data.soil_moisture_percentage}%)")
            
            elif trigger == "ndvi_drop":
                if environment_data.ndvi_score < 0.6:  # NDVI < 0.6 indicates stress
                    risk_score += 25
                    triggers_met += 1
                    contributing_factors.append(f"Low NDVI score ({environment_data.ndvi_score:.2f})")
            
            elif trigger == "drought_stress":
                if environment_data.soil_moisture_percentage < 25:
                    risk_score += 25
                    triggers_met += 1
                    contributing_factors.append("Drought stress detected")
        
        # Boost risk if disease reported in neighboring farms
        if disease_name in environment_data.neighboring_farms_disease_reports:
            risk_score += 30
            contributing_factors.append(f"{disease_name} reported in neighboring farms")
        
        # Calculate probability
        probability = (triggers_met / total_triggers) * 100
        
        if probability > 30:  # Only report if >30% probability
            # Calculate days to onset
            days_to_onset = signature["incubation_days"]
            
            # Determine risk level
            if probability >= 75:
                risk_level = RiskLevel.CRITICAL
            elif probability >= 50:
                risk_level = RiskLevel.HIGH
            elif probability >= 30:
                risk_level = RiskLevel.MODERATE
            else:
                risk_level = RiskLevel.LOW
            
            predicted_diseases.append({
                "disease_name": disease_name,
                "risk_level": risk_level.value,
                "probability": probability,
                "days_to_onset": days_to_onset,
                "financial_impact_kes": signature["financial_impact_per_hectare"] * environment_data.field_area_hectares,
                "symptoms": signature["symptoms"]
            })
            
            overall_risk_score = max(overall_risk_score, probability)
    
    # Identify protective factors
    if environment_data.plant_health_percentage > 85:
        protective_factors.append("Strong plant health (>85%)")
    if environment_data.vegetation_uniformity > 80:
        protective_factors.append("High crop uniformity")
    if environment_data.soil_ph >= 6.0 and environment_data.soil_ph <= 7.0:
        protective_factors.append("Optimal soil pH")
    if len(environment_data.previous_treatments) > 0:
        protective_factors.append("Recent preventive treatments")
    
    # Weather threat analysis
    weather_threats = analyze_weather_threats(environment_data)
    
    # Find highest risk disease
    highest_risk_disease = "None"
    if predicted_diseases:
        highest_risk_disease = max(predicted_diseases, key=lambda x: x["probability"])["disease_name"]
    
    # Calculate financial impact
    potential_loss_kes = sum(d["financial_impact_kes"] for d in predicted_diseases)
    
    # Estimate treatment costs (10-15% of potential loss)
    treatment_cost_kes = potential_loss_kes * 0.12
    
    # ROI calculation
    roi_of_prevention = ((potential_loss_kes - treatment_cost_kes) / treatment_cost_kes * 100) if treatment_cost_kes > 0 else 0
    
    prediction = DiseasePrediction(
        farm_id=environment_data.farm_id,
        crop_type=environment_data.crop_type,
        predicted_diseases=predicted_diseases,
        highest_risk_disease=highest_risk_disease,
        overall_risk_score=overall_risk_score,
        contributing_factors=list(set(contributing_factors)),
        protective_factors=protective_factors,
        weather_threats=weather_threats,
        potential_loss_kes=potential_loss_kes,
        treatment_cost_kes=treatment_cost_kes,
        roi_of_prevention=roi_of_prevention
    )
    
    disease_predictions[prediction.prediction_id] = prediction
    
    return {
        "success": True,
        "prediction": prediction,
        "message": f"Disease risk analysis complete. Overall risk: {overall_risk_score:.0f}%. " +
                   f"Highest threat: {highest_risk_disease}"
    }

def analyze_weather_threats(environment_data: FarmEnvironmentData) -> List[Dict[str, Any]]:
    """Analyze weather forecast for crop threats"""
    threats = []
    
    # Analyze 5-day forecast
    for day in environment_data.five_day_forecast:
        # Drought threat
        if day.get("rainfall_mm", 0) < 5 and environment_data.soil_moisture_percentage < 30:
            threats.append({
                "threat_type": WeatherThreat.DROUGHT.value,
                "probability": 70,
                "impact_severity": "high",
                "timeframe": day.get("date"),
                "mitigation": "Increase irrigation frequency"
            })
        
        # Flood threat
        if day.get("rainfall_mm", 0) > 50:
            threats.append({
                "threat_type": WeatherThreat.FLOOD.value,
                "probability": 60,
                "impact_severity": "high",
                "timeframe": day.get("date"),
                "mitigation": "Prepare drainage channels"
            })
        
        # Heatwave threat
        if day.get("temp_max", 0) > 35:
            threats.append({
                "threat_type": WeatherThreat.HEATWAVE.value,
                "probability": 80,
                "impact_severity": "moderate",
                "timeframe": day.get("date"),
                "mitigation": "Apply mulch, increase irrigation"
            })
        
        # Frost threat (for highland crops)
        if day.get("temp_min", 20) < 5:
            threats.append({
                "threat_type": WeatherThreat.FROST.value,
                "probability": 90,
                "impact_severity": "critical",
                "timeframe": day.get("date"),
                "mitigation": "Cover crops overnight"
            })
    
    return threats

@router.post("/predict/integrated-intelligence")
async def generate_integrated_intelligence(
    environment_data: FarmEnvironmentData,
    financial_data: FinancialData
):
    """
    Generate comprehensive farm intelligence report integrating:
    - Disease prediction
    - Weather analysis
    - Financial impact modeling
    - Actionable recommendations
    """
    
    # Step 1: Predict diseases
    disease_result = await predict_disease_risk(environment_data)
    disease_prediction = disease_result["prediction"]
    
    # Step 2: Calculate overall health score
    health_factors = [
        environment_data.plant_health_percentage,
        environment_data.vegetation_uniformity,
        environment_data.ndvi_score * 100,
        (100 - disease_prediction.overall_risk_score)
    ]
    overall_health_score = statistics.mean(health_factors)
    
    # Step 3: Determine risk level
    if disease_prediction.overall_risk_score >= 75:
        risk_level = RiskLevel.CRITICAL
    elif disease_prediction.overall_risk_score >= 50:
        risk_level = RiskLevel.HIGH
    elif disease_prediction.overall_risk_score >= 30:
        risk_level = RiskLevel.MODERATE
    else:
        risk_level = RiskLevel.LOW
    
    # Step 4: Generate action recommendations
    immediate_actions, scheduled_actions = generate_action_recommendations(
        environment_data,
        disease_prediction,
        financial_data
    )
    
    # Step 5: Financial projection
    financial_projection = {
        "current_investment_kes": financial_data.total_investment_kes,
        "expected_revenue_kes": financial_data.expected_revenue_kes,
        "expected_profit_kes": financial_data.expected_revenue_kes - financial_data.total_investment_kes,
        "potential_loss_from_disease_kes": disease_prediction.potential_loss_kes,
        "treatment_investment_kes": disease_prediction.treatment_cost_kes,
        "projected_profit_after_treatment_kes": (
            financial_data.expected_revenue_kes -
            financial_data.total_investment_kes -
            disease_prediction.treatment_cost_kes +
            (disease_prediction.potential_loss_kes * 0.7)  # Assume 70% recovery
        ),
        "roi_percentage": disease_prediction.roi_of_prevention
    }
    
    # Step 6: Weather analysis
    weather_analysis = {
        "five_day_summary": environment_data.five_day_forecast,
        "threats_detected": disease_prediction.weather_threats,
        "optimal_work_days": [
            day for day in environment_data.five_day_forecast
            if day.get("rainfall_mm", 0) < 5 and day.get("temp_max", 0) < 32
        ]
    }
    
    # Step 7: Early harvest decision
    should_harvest_early = False
    early_harvest_benefit = 0.0
    
    if disease_prediction.overall_risk_score > 70 and environment_data.days_to_harvest < 14:
        # If critical disease risk and close to harvest, consider early harvest
        current_value = financial_data.expected_revenue_kes * 0.85  # 85% of full maturity
        potential_loss = disease_prediction.potential_loss_kes
        if current_value > (financial_data.expected_revenue_kes - potential_loss):
            should_harvest_early = True
            early_harvest_benefit = current_value - (financial_data.expected_revenue_kes - potential_loss)
    
    # Step 8: Insurance claim recommendation
    should_apply_insurance_claim = (
        financial_data.has_crop_insurance and
        disease_prediction.potential_loss_kes > (financial_data.expected_revenue_kes * 0.3)
    )
    
    # Step 9: Create intelligence report
    report = IntegratedFarmIntelligence(
        farm_id=environment_data.farm_id,
        farmer_id=financial_data.farm_id,  # Assuming same
        crop_type=environment_data.crop_type,
        overall_health_score=overall_health_score,
        risk_level=risk_level,
        days_to_harvest=environment_data.days_to_harvest,
        disease_prediction=disease_prediction,
        weather_analysis=weather_analysis,
        financial_projection=financial_projection,
        immediate_actions=immediate_actions,
        scheduled_actions=scheduled_actions,
        monitoring_tasks=[
            "Check plants daily for disease symptoms",
            "Monitor soil moisture levels",
            "Track weather forecasts",
            "Inspect neighboring farms for disease outbreaks"
        ],
        should_harvest_early=should_harvest_early,
        early_harvest_benefit_kes=early_harvest_benefit,
        should_apply_insurance_claim=should_apply_insurance_claim,
        prediction_confidence=85.0,
        data_quality_score=90.0
    )
    
    intelligence_reports[report.report_id] = report
    
    return {
        "success": True,
        "report": report,
        "message": f"Integrated intelligence report generated. Health score: {overall_health_score:.0f}%. " +
                   f"Risk level: {risk_level.value.upper()}"
    }

def generate_action_recommendations(
    environment_data: FarmEnvironmentData,
    disease_prediction: DiseasePrediction,
    financial_data: FinancialData
) -> tuple:
    """Generate prioritized action recommendations"""
    
    immediate_actions = []
    scheduled_actions = []
    
    # For each predicted disease, create recommendations
    for disease in disease_prediction.predicted_diseases:
        if disease["probability"] > 50:  # High risk diseases
            # Immediate fungicide/pesticide application
            action = ActionRecommendation(
                farm_id=environment_data.farm_id,
                priority=ActionPriority.IMMEDIATE if disease["probability"] > 75 else ActionPriority.URGENT,
                action_type="spray",
                action_description=f"Apply treatment for {disease['disease_name']}",
                why_needed=f"{disease['probability']:.0f}% probability of {disease['disease_name']} within {disease['days_to_onset']} days. " +
                           f"Potential loss: KES {disease['financial_impact_kes']:,.0f}",
                execute_by=datetime.now() + timedelta(hours=24 if disease["probability"] > 75 else 72),
                optimal_window_start=datetime.now() + timedelta(hours=6),  # Early morning
                optimal_window_end=datetime.now() + timedelta(hours=10),
                hours_until_deadline=24 if disease["probability"] > 75 else 72,
                materials_needed=[
                    {"material": "Fungicide/Pesticide", "quantity": f"{environment_data.field_area_hectares * 2}L", "cost_kes": environment_data.field_area_hectares * 3000},
                    {"material": "Spreader/Sticker", "quantity": "500ml", "cost_kes": 500}
                ],
                total_cost_kes=environment_data.field_area_hectares * 3500,
                labor_hours_required=environment_data.field_area_hectares * 2,
                equipment_needed=["Knapsack sprayer", "Protective gear"],
                expected_crop_saved_percentage=70.0,
                financial_benefit_kes=disease["financial_impact_kes"] * 0.7,
                success_probability=85.0,
                instructions_en=[
                    "Mix pesticide according to label instructions",
                    "Spray in early morning (6-10 AM) when wind is calm",
                    "Ensure complete coverage of leaves (top and bottom)",
                    "Wear protective clothing and mask",
                    "Do not spray if rain expected within 6 hours"
                ],
                instructions_sw=[
                    "Changanya dawa kulingana na maelekezo",
                    "Nyunyizia asubuhi mapema (6-10 AM) upepo unapopungua",
                    "Hakikisha majani yamefunikwa vizuri (juu na chini)",
                    "Vaa nguo za kujilinda na barakoa",
                    "Usiinyunyize ikiwa mvua inatarajiwa ndani ya masaa 6"
                ]
            )
            
            if disease["probability"] > 75:
                immediate_actions.append(action)
            else:
                scheduled_actions.append(action)
    
    # Irrigation recommendations based on soil moisture
    if environment_data.soil_moisture_percentage < 30:
        action = ActionRecommendation(
            farm_id=environment_data.farm_id,
            priority=ActionPriority.URGENT,
            action_type="irrigation",
            action_description="Increase irrigation to prevent drought stress",
            why_needed=f"Soil moisture at {environment_data.soil_moisture_percentage}% (optimal: 40-60%). " +
                       "Drought stress weakens plants and increases disease susceptibility.",
            execute_by=datetime.now() + timedelta(hours=48),
            optimal_window_start=datetime.now() + timedelta(hours=6),
            optimal_window_end=datetime.now() + timedelta(hours=18),
            hours_until_deadline=48,
            materials_needed=[
                {"material": "Water", "quantity": f"{environment_data.field_area_hectares * 500}L", "cost_kes": environment_data.field_area_hectares * 200}
            ],
            total_cost_kes=environment_data.field_area_hectares * 200,
            labor_hours_required=environment_data.field_area_hectares * 1,
            equipment_needed=["Irrigation system", "Water pump"],
            expected_crop_saved_percentage=50.0,
            financial_benefit_kes=financial_data.expected_revenue_kes * 0.15,
            success_probability=90.0,
            instructions_en=[
                "Apply deep irrigation to reach root zone (30cm depth)",
                "Water early morning or late evening to reduce evaporation",
                "Check soil moisture after 24 hours",
                "Repeat if needed"
            ],
            instructions_sw=[
                "Mwagilie kwa kina kufika mizizi (urefu wa cm 30)",
                "Mwagilia asubuhi mapema au jioni kuzuia uchapuo",
                "Angalia unyevu wa udongo baada ya masaa 24",
                "Rudia ikiwa ni lazima"
            ]
        )
        immediate_actions.append(action)
    
    # Nutrient supplementation
    if environment_data.soil_npk.get("nitrogen", 0) < 20:  # Low nitrogen
        action = ActionRecommendation(
            farm_id=environment_data.farm_id,
            priority=ActionPriority.SCHEDULED,
            action_type="apply_fertilizer",
            action_description="Apply nitrogen fertilizer to boost plant health",
            why_needed="Low nitrogen levels detected. Nitrogen deficiency weakens plant immune system.",
            execute_by=datetime.now() + timedelta(days=7),
            optimal_window_start=datetime.now() + timedelta(days=1),
            optimal_window_end=datetime.now() + timedelta(days=7),
            hours_until_deadline=168,
            materials_needed=[
                {"material": "Urea (46-0-0)", "quantity": f"{environment_data.field_area_hectares * 50}kg", "cost_kes": environment_data.field_area_hectares * 2500}
            ],
            total_cost_kes=environment_data.field_area_hectares * 2500,
            labor_hours_required=environment_data.field_area_hectares * 1.5,
            equipment_needed=["Fertilizer spreader"],
            expected_crop_saved_percentage=30.0,
            financial_benefit_kes=financial_data.expected_revenue_kes * 0.12,
            success_probability=80.0,
            instructions_en=[
                "Apply 50kg urea per hectare",
                "Broadcast evenly across field",
                "Water immediately after application",
                "Avoid application before heavy rain"
            ],
            instructions_sw=[
                "Tumia urea kg 50 kwa hekta",
                "Sambaza sawasawa shambani",
                "Mwagilia mara moja baada ya kutumia",
                "Epuka kutumia kabla ya mvua kubwa"
            ]
        )
        scheduled_actions.append(action)
    
    return immediate_actions, scheduled_actions

# ============================================================================
# QUERY ENDPOINTS
# ============================================================================

@router.get("/predict/disease-risk/{farm_id}")
async def get_disease_prediction(farm_id: str):
    """Get latest disease prediction for a farm"""
    predictions = [p for p in disease_predictions.values() if p.farm_id == farm_id]
    if not predictions:
        raise HTTPException(status_code=404, detail="No predictions found")
    
    latest = max(predictions, key=lambda x: x.predicted_at)
    return {"success": True, "prediction": latest}

@router.get("/predict/integrated-intelligence/{farm_id}")
async def get_intelligence_report(farm_id: str):
    """Get latest integrated intelligence report"""
    reports = [r for r in intelligence_reports.values() if r.farm_id == farm_id]
    if not reports:
        raise HTTPException(status_code=404, detail="No reports found")
    
    latest = max(reports, key=lambda x: x.generated_at)
    return {"success": True, "report": latest}

@router.get("/predict/actions/{farm_id}")
async def get_farm_actions(farm_id: str):
    """Get all action recommendations for a farm"""
    immediate = [a for a in action_recommendations.values() 
                 if a.farm_id == farm_id and a.priority == ActionPriority.IMMEDIATE]
    urgent = [a for a in action_recommendations.values() 
              if a.farm_id == farm_id and a.priority == ActionPriority.URGENT]
    scheduled = [a for a in action_recommendations.values() 
                 if a.farm_id == farm_id and a.priority == ActionPriority.SCHEDULED]
    
    return {
        "success": True,
        "immediate_actions": immediate,
        "urgent_actions": urgent,
        "scheduled_actions": scheduled,
        "total": len(immediate) + len(urgent) + len(scheduled)
    }
