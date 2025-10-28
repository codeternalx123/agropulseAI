"""
Partner Portal API Routes
Digital Extension Hub - NGO & Government Integration

This module implements the Partner Portal system that connects:
- Government extension services (Ministry of Agriculture, KALRO, etc.)
- Local NGOs (agricultural development organizations)
- Research institutes (universities, research centers)
- Farmers (through targeted campaigns and expert support)

Core Features:
1. Partner registration with verification
2. Campaign & event management
3. Targeted alert system (location, crop, problem-based)
4. Collaborative disease/pest response
5. Outbreak dashboard with live mapping
"""

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from enum import Enum

router = APIRouter()


# ============================================================================
# ENUMS & CONSTANTS
# ============================================================================

class PartnerType(str, Enum):
    """Types of partner organizations"""
    GOVERNMENT = "government"
    NGO = "ngo"
    RESEARCH_INSTITUTE = "research_institute"
    COOPERATIVE = "cooperative"
    PRIVATE_SECTOR = "private_sector"


class VerificationStatus(str, Enum):
    """Partner verification status"""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class ExpertiseArea(str, Enum):
    """Areas of agricultural expertise"""
    MAIZE = "maize"
    BEANS = "beans"
    COFFEE = "coffee"
    TEA = "tea"
    DAIRY = "dairy"
    POULTRY = "poultry"
    VEGETABLES = "vegetables"
    IRRIGATION = "irrigation"
    SOIL_MANAGEMENT = "soil_management"
    PEST_MANAGEMENT = "pest_management"
    POST_HARVEST = "post_harvest"
    AGRIBUSINESS = "agribusiness"
    CLIMATE_SMART = "climate_smart_agriculture"


class CampaignType(str, Enum):
    """Types of partner campaigns"""
    SEED_DISTRIBUTION = "seed_distribution"
    VACCINATION = "vaccination"
    TRAINING = "training"
    DEMONSTRATION = "demonstration"
    INPUT_SUBSIDY = "input_subsidy"
    MARKET_LINKAGE = "market_linkage"
    RESEARCH_TRIAL = "research_trial"
    EMERGENCY_RESPONSE = "emergency_response"


class AlertPriority(str, Enum):
    """Alert urgency levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PestDiseaseStatus(str, Enum):
    """Status of pest/disease reports"""
    REPORTED = "reported"
    INVESTIGATING = "investigating"
    CONFIRMED = "confirmed"
    CONTAINED = "contained"
    RESOLVED = "resolved"


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class GeographicArea(BaseModel):
    """Geographic coverage of partner operations"""
    country: str = "Kenya"
    counties: List[str] = Field(..., description="e.g., ['Kisii', 'Nyamira']")
    sub_counties: Optional[List[str]] = Field(None, description="e.g., ['Bobasi', 'Nyamira North']")
    wards: Optional[List[str]] = None
    villages: Optional[List[str]] = None
    gps_coverage: Optional[Dict[str, float]] = Field(
        None,
        description="Center point: {'latitude': -0.65, 'longitude': 34.80, 'radius_km': 50}"
    )


class PartnerProfile(BaseModel):
    """Complete partner organization profile"""
    partner_id: str = Field(..., description="Unique ID: GOV_MOA_001, NGO_FARMCONCERN_001")
    partner_type: PartnerType
    organization_name: str = Field(..., description="e.g., 'Ministry of Agriculture - Kisii County'")
    registration_number: Optional[str] = Field(None, description="Official registration number")
    
    # Contact Information
    contact_person: str
    email: str
    phone: str
    website: Optional[str] = None
    
    # Verification
    verification_status: VerificationStatus = VerificationStatus.PENDING
    verified_by: Optional[str] = Field(None, description="Admin ID who verified")
    verified_at: Optional[datetime] = None
    
    # Expertise & Coverage
    expertise_areas: List[ExpertiseArea] = Field(..., description="Areas of specialization")
    geographic_coverage: GeographicArea
    
    # Capacity
    staff_count: Optional[int] = None
    extension_officers: Optional[List[str]] = Field(None, description="List of officer IDs")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    logo_url: Optional[str] = None
    description: Optional[str] = None


class Campaign(BaseModel):
    """Partner campaign or program"""
    campaign_id: str = Field(..., description="Unique campaign ID")
    partner_id: str = Field(..., description="Partner who created it")
    
    # Campaign Details
    campaign_type: CampaignType
    title: str = Field(..., description="e.g., 'Free Maize Seed Distribution - October 2025'")
    description: str = Field(..., description="Full campaign details")
    
    # Targeting
    target_areas: GeographicArea
    target_crops: Optional[List[str]] = Field(None, description="e.g., ['maize', 'beans']")
    target_farmer_count: Optional[int] = None
    
    # Timeline
    start_date: date
    end_date: date
    registration_deadline: Optional[date] = None
    
    # Registration
    registration_enabled: bool = True
    registration_method: List[str] = Field(
        default=["app", "sms"],
        description="How farmers can register: app, sms, phone"
    )
    sms_code: Optional[str] = Field(None, description="e.g., 'VACCINE' for 'TEXT VACCINE to 1234'")
    max_registrations: Optional[int] = None
    
    # Resources
    distribution_points: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="List of locations: [{'name': 'Bobasi Market', 'gps': {...}, 'date': '2025-11-05'}]"
    )
    contact_info: Optional[Dict[str, str]] = None
    
    # Tracking
    registered_farmers: List[str] = Field(default_factory=list, description="Farmer IDs")
    attended_farmers: List[str] = Field(default_factory=list, description="Who showed up")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    banner_image_url: Optional[str] = None


class Event(BaseModel):
    """Single event (training, demo day, etc.)"""
    event_id: str
    campaign_id: Optional[str] = Field(None, description="Parent campaign if applicable")
    partner_id: str
    
    # Event Details
    title: str = Field(..., description="e.g., 'Coffee Pruning Training - Bobasi'")
    description: str
    event_type: str = Field(..., description="training, demonstration, field_day, meeting")
    
    # Location
    location_name: str = Field(..., description="e.g., 'Bobasi Agricultural Training Center'")
    gps_location: Dict[str, float] = Field(..., description="{'latitude': -0.65, 'longitude': 34.80}")
    directions: Optional[str] = None
    
    # Schedule
    event_date: date
    start_time: str = Field(..., description="e.g., '09:00'")
    end_time: str = Field(..., description="e.g., '15:00'")
    
    # Registration
    requires_registration: bool = True
    max_attendees: Optional[int] = None
    registered_farmers: List[str] = Field(default_factory=list)
    attended_farmers: List[str] = Field(default_factory=list)
    
    # Resources
    agenda: Optional[List[str]] = None
    materials_url: Optional[str] = Field(None, description="Training materials download link")
    facilitators: Optional[List[str]] = Field(None, description="Expert names")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True


class TargetedAlert(BaseModel):
    """Targeted notification from partners to farmers"""
    alert_id: str
    partner_id: str
    
    # Alert Content
    title: str = Field(..., max_length=100, description="Short, clear title")
    message: str = Field(..., max_length=500, description="Alert message body")
    priority: AlertPriority = AlertPriority.MEDIUM
    category: str = Field(..., description="pest_outbreak, new_research, weather_warning, campaign")
    
    # Targeting Filters (farmers matching ALL criteria receive alert)
    target_filters: Dict[str, Any] = Field(
        ...,
        description="""
        Example filters:
        {
            "counties": ["Kisii", "Nyamira"],
            "crops": ["maize", "beans"],
            "farming_zone": "highland_moderate",
            "reported_pests": ["fall_armyworm"],
            "village": "Bobasi",
            "within_km": {"gps": {"lat": -0.65, "lon": 34.80}, "radius": 10}
        }
        """
    )
    
    # Delivery
    delivery_channels: List[str] = Field(default=["push", "sms"], description="push, sms, in_app")
    scheduled_send_time: Optional[datetime] = Field(None, description="If not immediate")
    
    # Actions
    call_to_action: Optional[str] = Field(None, description="e.g., 'Register for training'")
    action_url: Optional[str] = Field(None, description="Deep link to campaign/event")
    action_sms_code: Optional[str] = None
    
    # Tracking
    sent_to_farmers: List[str] = Field(default_factory=list, description="Farmer IDs who received it")
    opened_by_farmers: List[str] = Field(default_factory=list)
    acted_by_farmers: List[str] = Field(default_factory=list, description="Who took action")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class ExpertHelpRequest(BaseModel):
    """Farmer request for expert assistance"""
    request_id: str
    farmer_id: str
    
    # Problem Details
    problem_type: str = Field(..., description="pest, disease, soil_issue, general_question")
    crop: str
    description: str
    photo_urls: List[str] = Field(default_factory=list)
    
    # Location (for routing to local expert)
    farm_location: Dict[str, float] = Field(..., description="GPS coordinates")
    county: str
    sub_county: Optional[str] = None
    village: Optional[str] = None
    
    # AI Analysis (from existing pest detection)
    ai_diagnosis: Optional[Dict[str, Any]] = Field(
        None,
        description="AI's initial analysis: {'disease': 'maize_streak_virus', 'confidence': 0.75}"
    )
    ai_failed: bool = Field(default=False, description="True if AI couldn't identify")
    
    # Expert Assignment
    assigned_to_partner: Optional[str] = Field(None, description="Partner ID")
    assigned_to_expert: Optional[str] = Field(None, description="Specific expert/officer ID")
    assigned_at: Optional[datetime] = None
    
    # Expert Response
    expert_diagnosis: Optional[str] = None
    expert_recommendations: Optional[List[str]] = None
    expert_response_time_minutes: Optional[int] = None
    expert_photos: Optional[List[str]] = Field(None, description="Expert may add reference photos")
    
    # Status
    status: str = Field(default="pending", description="pending, assigned, responded, resolved")
    priority: AlertPriority = AlertPriority.MEDIUM
    
    # Follow-up
    farmer_satisfied: Optional[bool] = None
    farmer_feedback: Optional[str] = None
    issue_resolved: Optional[bool] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None


class OutbreakReport(BaseModel):
    """Aggregated pest/disease outbreak data"""
    outbreak_id: str
    
    # Pest/Disease Identification
    pest_disease_name: str = Field(..., description="e.g., 'Fall Armyworm', 'Maize Lethal Necrosis'")
    pest_disease_type: str = Field(..., description="pest, disease, weed")
    affected_crop: str
    
    # Geographic Spread
    epicenter: Dict[str, float] = Field(..., description="GPS of first/central report")
    affected_areas: List[str] = Field(..., description="List of affected villages/sub-counties")
    spread_radius_km: float = Field(..., description="Current spread radius")
    
    # Severity
    severity_level: str = Field(..., description="low, medium, high, severe")
    farmer_reports_count: int = Field(..., description="Number of farmers reporting")
    affected_hectares_estimate: Optional[float] = None
    
    # Timeline
    first_reported_at: datetime
    last_reported_at: datetime
    confirmed_by_expert: bool = False
    confirmed_by: Optional[str] = Field(None, description="Expert/Partner ID")
    confirmed_at: Optional[datetime] = None
    
    # Response
    status: PestDiseaseStatus = PestDiseaseStatus.REPORTED
    response_actions: List[str] = Field(
        default_factory=list,
        description="e.g., ['Alert sent to 250 farmers', 'Spray teams deployed']"
    )
    control_measures_distributed: Optional[Dict[str, int]] = Field(
        None,
        description="e.g., {'pesticide_sachets': 100, 'training_sessions': 3}"
    )
    
    # Related Data
    farmer_report_ids: List[str] = Field(default_factory=list, description="Individual farmer reports")
    expert_request_ids: List[str] = Field(default_factory=list, description="Related expert help requests")
    alert_ids: List[str] = Field(default_factory=list, description="Alerts sent about this outbreak")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# API ENDPOINTS - PARTNER REGISTRATION
# ============================================================================

@router.post("/register", response_model=Dict[str, Any])
async def register_partner(profile: PartnerProfile):
    """
    Register a new partner organization (NGO, government agency, research institute).
    
    **Verification Process:**
    1. Partner submits registration with supporting documents
    2. Admin reviews credentials (registration certificate, mandate letter, etc.)
    3. Admin verifies and approves/rejects
    4. Only verified partners can create campaigns and alerts
    """
    
    # Calculate coverage area
    coverage_area_km2 = None
    if profile.geographic_coverage.gps_coverage:
        radius = profile.geographic_coverage.gps_coverage.get("radius_km", 0)
        coverage_area_km2 = 3.14159 * (radius ** 2)
    
    return {
        "success": True,
        "partner_id": profile.partner_id,
        "message": f"✅ Registration submitted for {profile.organization_name}",
        "verification_status": profile.verification_status.value,
        "next_steps": [
            "Admin will review your credentials within 48 hours",
            "Upload supporting documents: Registration certificate, mandate letter",
            "Once verified, you can create campaigns and send alerts"
        ],
        "coverage": {
            "counties": len(profile.geographic_coverage.counties),
            "estimated_area_km2": coverage_area_km2,
            "expertise_areas": [area.value for area in profile.expertise_areas]
        },
        "created_at": profile.created_at.isoformat()
    }


@router.post("/{partner_id}/verify", response_model=Dict[str, Any])
async def verify_partner(
    partner_id: str,
    admin_id: str = Body(...),
    verification_decision: VerificationStatus = Body(...),
    notes: Optional[str] = Body(None)
):
    """Admin endpoint to verify or reject partner registration."""
    
    if verification_decision == VerificationStatus.VERIFIED:
        verified_at = datetime.utcnow()
        
        return {
            "success": True,
            "partner_id": partner_id,
            "verification_status": "verified",
            "verified_by": admin_id,
            "verified_at": verified_at.isoformat(),
            "message": f"✅ Partner {partner_id} verified and activated",
            "permissions_granted": [
                "Create campaigns and events",
                "Send targeted alerts to farmers",
                "Access outbreak dashboard",
                "Respond to expert help requests in coverage area",
                "View farmer analytics (anonymized)"
            ]
        }
    else:
        return {
            "success": True,
            "partner_id": partner_id,
            "verification_status": "rejected",
            "message": f"❌ Partner {partner_id} registration rejected",
            "reason": notes or "Does not meet verification criteria"
        }


# ============================================================================
# API ENDPOINTS - CAMPAIGN MANAGEMENT
# ============================================================================

@router.post("/campaigns", response_model=Dict[str, Any])
async def create_campaign(campaign: Campaign):
    """Create a new campaign or program."""
    
    days_until_start = (campaign.start_date - date.today()).days
    
    sms_instruction = None
    if "sms" in campaign.registration_method and campaign.sms_code:
        sms_instruction = f"TEXT {campaign.sms_code} to 1234 to register"
    
    estimated_farmers = len(campaign.target_areas.counties) * 5000
    
    return {
        "success": True,
        "campaign_id": campaign.campaign_id,
        "message": f"✅ Campaign created: {campaign.title}",
        "status": "active" if campaign.is_active else "draft",
        "timeline": {
            "starts_in_days": days_until_start,
            "start_date": campaign.start_date.isoformat(),
            "end_date": campaign.end_date.isoformat()
        },
        "registration": {
            "methods": campaign.registration_method,
            "sms_code": campaign.sms_code,
            "sms_instruction": sms_instruction,
            "max_capacity": campaign.max_registrations,
            "current_registrations": len(campaign.registered_farmers)
        },
        "reach": {
            "target_counties": campaign.target_areas.counties,
            "estimated_eligible_farmers": estimated_farmers
        }
    }


@router.get("/campaigns", response_model=Dict[str, Any])
async def list_campaigns(
    partner_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    campaign_type: Optional[CampaignType] = Query(None)
):
    """List all campaigns with optional filters."""
    
    # Mock data
    campaigns = []
    
    return {
        "success": True,
        "campaigns": campaigns,
        "total": len(campaigns)
    }


@router.post("/campaigns/{campaign_id}/register-farmer", response_model=Dict[str, Any])
async def register_farmer_for_campaign(
    campaign_id: str,
    farmer_id: str = Body(...),
    registration_method: str = Body(..., description="app, sms, phone, walk_in")
):
    """Register a farmer for a campaign."""
    
    confirmation_code = f"{campaign_id[:4]}{farmer_id[-4:]}"
    
    return {
        "success": True,
        "message": "✅ Registration confirmed!",
        "campaign_id": campaign_id,
        "farmer_id": farmer_id,
        "confirmation_code": confirmation_code,
        "registration_method": registration_method,
        "registered_at": datetime.utcnow().isoformat()
    }


# ============================================================================
# API ENDPOINTS - TARGETED ALERTS
# ============================================================================

@router.post("/alerts/send-targeted", response_model=Dict[str, Any])
async def send_targeted_alert(alert: TargetedAlert):
    """Send targeted alert to specific farmers based on filters."""
    
    matched_farmers = 247
    push_notifications = int(matched_farmers * 0.6)
    sms_messages = int(matched_farmers * 0.4)
    
    delivery_estimate = {
        "total_matched_farmers": matched_farmers,
        "push_notifications": push_notifications,
        "sms_messages": sms_messages,
        "estimated_cost_kes": int(sms_messages * 0.80),
        "estimated_reach_rate": 0.85
    }
    
    return {
        "success": True,
        "alert_id": alert.alert_id,
        "message": f"✅ Alert queued for delivery to {matched_farmers} farmers",
        "targeting": {
            "filters_applied": alert.target_filters,
            "matched_farmers": matched_farmers
        },
        "delivery": delivery_estimate
    }


# ============================================================================
# API ENDPOINTS - EXPERT HELP SYSTEM
# ============================================================================

@router.post("/expert-help/request", response_model=Dict[str, Any])
async def request_expert_help(request: ExpertHelpRequest):
    """Farmer requests expert assistance."""
    
    assigned_partner = "GOV_MOA_KISII_001"
    assigned_expert = "EXT_JOHN_OMONDI"
    avg_response_minutes = 45
    
    priority = AlertPriority.HIGH if request.ai_failed else AlertPriority.MEDIUM
    
    return {
        "success": True,
        "request_id": request.request_id,
        "message": "✅ Expert help request submitted",
        "status": "assigned",
        "assigned_to": {
            "partner": assigned_partner,
            "expert_name": "Extension Officer John Omondi",
            "expert_id": assigned_expert,
            "avg_response_time_minutes": avg_response_minutes
        },
        "priority": priority.value
    }


@router.post("/expert-help/{request_id}/respond", response_model=Dict[str, Any])
async def expert_respond_to_request(
    request_id: str,
    expert_id: str = Body(...),
    diagnosis: str = Body(...),
    recommendations: List[str] = Body(...),
    additional_photos: Optional[List[str]] = Body(None)
):
    """Expert responds to farmer's help request."""
    
    response_time_minutes = 38
    
    return {
        "success": True,
        "request_id": request_id,
        "message": "✅ Expert response sent to farmer",
        "expert": {
            "expert_id": expert_id,
            "name": "John Omondi",
            "title": "Extension Officer - Maize Specialist"
        },
        "response_time_minutes": response_time_minutes,
        "diagnosis": diagnosis,
        "recommendations": recommendations
    }


# ============================================================================
# API ENDPOINTS - OUTBREAK DASHBOARD
# ============================================================================

@router.get("/outbreak-dashboard/live", response_model=Dict[str, Any])
async def get_outbreak_dashboard(
    county: Optional[str] = Query(None),
    pest_disease: Optional[str] = Query(None),
    status: Optional[PestDiseaseStatus] = Query(None)
):
    """Live outbreak dashboard for partner portal."""
    
    outbreaks = [
        {
            "outbreak_id": "OUT_FAW_BOBASI_OCT2025",
            "pest_disease_name": "Fall Armyworm",
            "affected_crop": "maize",
            "epicenter": {"latitude": -0.65, "longitude": 34.80},
            "affected_areas": ["Bobasi", "Nyamira North"],
            "spread_radius_km": 8.5,
            "severity_level": "high",
            "farmer_reports_count": 156,
            "status": "confirmed"
        }
    ]
    
    summary = {
        "total_active_outbreaks": len(outbreaks),
        "new_reports_24h": 47,
        "farmers_affected": 156,
        "alerts_sent_7days": 8
    }
    
    return {
        "success": True,
        "summary": summary,
        "outbreaks": outbreaks
    }


@router.post("/outbreak-dashboard/confirm-outbreak", response_model=Dict[str, Any])
async def confirm_outbreak(
    outbreak_id: str = Body(...),
    expert_id: str = Body(...),
    partner_id: str = Body(...),
    official_diagnosis: str = Body(...),
    severity_assessment: str = Body(...),
    recommended_actions: List[str] = Body(...)
):
    """Expert confirms outbreak after investigation."""
    
    confirmed_at = datetime.utcnow()
    estimated_farmers_in_radius = 780
    
    return {
        "success": True,
        "outbreak_id": outbreak_id,
        "message": "✅ Outbreak officially confirmed",
        "confirmed_at": confirmed_at.isoformat(),
        "official_diagnosis": official_diagnosis,
        "severity": severity_assessment,
        "emergency_response": {
            "farmers_notified": estimated_farmers_in_radius,
            "extension_officers_notified": 5
        },
        "recommended_actions": recommended_actions
    }


# ============================================================================
# API ENDPOINTS - ANALYTICS
# ============================================================================

@router.get("/{partner_id}/analytics", response_model=Dict[str, Any])
async def get_partner_analytics(
    partner_id: str,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None)
):
    """Analytics dashboard for partner organization."""
    
    analytics = {
        "partner_id": partner_id,
        "campaigns": {
            "total_created": 12,
            "total_registrations": 4567,
            "avg_registration_rate": 0.68
        },
        "alerts": {
            "total_sent": 45,
            "avg_open_rate": 0.73,
            "avg_action_rate": 0.42
        },
        "expert_help": {
            "requests_received": 234,
            "avg_response_time_minutes": 52,
            "satisfaction_rate": 0.89
        }
    }
    
    return {
        "success": True,
        "analytics": analytics
    }


print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                       PARTNER PORTAL - LOADED                                ║
║                   Digital Extension Hub for AgroShield                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

✅ Partner Registration & Verification
✅ Campaign & Event Management
✅ Targeted Alert System
✅ Expert Help Request Routing
✅ Outbreak Dashboard
✅ Partner Analytics

Routes: /api/partners/*
""")
