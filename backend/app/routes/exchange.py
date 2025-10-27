"""
AgroPulse Exchange API - Decentralized Marketplace with Escrow
Similar to OKX exchange model with fraud prevention and payment finality
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import json
import uuid

router = APIRouter()

# ============================================================================
# ENUMS AND MODELS
# ============================================================================

class AssetStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    IN_ESCROW = "in_escrow"
    SOLD = "sold"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"

class QualityGrade(str, Enum):
    GRADE_A_PREMIUM = "grade_a_premium"  # AI-verified with full traceability
    GRADE_B_STANDARD = "grade_b_standard"  # Partial verification
    GRADE_C_BASIC = "grade_c_basic"  # Minimal verification

class TransactionStatus(str, Enum):
    PENDING = "pending"
    FUNDS_ESCROWED = "funds_escrowed"
    DELIVERY_PROOF_SUBMITTED = "delivery_proof_submitted"
    IN_ACCEPTANCE_WINDOW = "in_acceptance_window"
    COMPLETED = "completed"
    DISPUTED = "disputed"
    REFUNDED = "refunded"

class DisputeStatus(str, Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    ESCALATED = "escalated"

class PaymentMethod(str, Enum):
    MPESA = "mpesa"
    BANK_TRANSFER = "bank_transfer"
    CRYPTO = "crypto"
    CASH_ON_DELIVERY = "cash_on_delivery"

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class StorageConditionProof(BaseModel):
    sensor_id: str
    temperature_avg: float
    temperature_min: float
    temperature_max: float
    humidity_avg: float
    humidity_min: float
    humidity_max: float
    safe_range_compliance: float  # % time within safe range
    monitoring_start_date: datetime
    monitoring_end_date: datetime
    total_readings: int

class AIVerificationData(BaseModel):
    # From Photo-Based Harvest Refinement
    harvest_health_score: Optional[float] = Field(None, ge=0, le=100)
    harvest_maturity_level: Optional[str] = None
    harvest_image_url: Optional[str] = None
    harvest_date: Optional[datetime] = None
    
    # From Spoilage Risk Visualization
    spoilage_risk_score: float = Field(..., ge=0, le=100)
    spoilage_risk_trend: str  # "low", "moderate", "high"
    predicted_shelf_life_days: int
    color_coded_risk: str  # hex color
    
    # From BLE Storage Monitoring
    storage_condition_proof: Optional[StorageConditionProof] = None
    
    # From GPS Geo-Tagging
    gps_latitude: float
    gps_longitude: float
    farm_id: str
    field_registration_id: str
    
    # From Pest Management
    pest_scan_history: List[Dict[str, Any]] = []
    pest_free_certification: bool = False
    last_pest_scan_date: Optional[datetime] = None
    
    # From Soil Analysis
    soil_health_score: Optional[float] = Field(None, ge=0, le=100)
    soil_nutrient_status: Optional[Dict[str, str]] = None
    
    # From NDVI Satellite Analysis
    ndvi_index: Optional[float] = Field(None, ge=-1, le=1)
    vegetation_health: Optional[str] = None
    
    # Verification timestamp
    verified_at: datetime = Field(default_factory=datetime.now)
    ai_confidence_score: float = Field(..., ge=0, le=100)

class TokenizedAsset(BaseModel):
    asset_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_id: str
    seller_name: str
    seller_phone: str
    
    # Basic Info
    crop_type: str
    quantity_kg: float
    unit_price_kes: float
    total_value_kes: float
    
    # Quality Classification
    quality_grade: QualityGrade
    ai_verification: AIVerificationData
    
    # Market Listing
    listing_title: str
    description: str
    listing_images: List[str] = []
    
    # Status
    status: AssetStatus = AssetStatus.DRAFT
    available_quantity_kg: float  # Remaining after partial sales
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    listed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Harvest and Storage
    harvest_date: Optional[datetime] = None
    storage_location: Optional[str] = None
    preferred_pickup_location: str
    delivery_available: bool = False
    delivery_radius_km: Optional[float] = None

class EscrowTransaction(BaseModel):
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_id: str
    seller_id: str
    buyer_id: str
    buyer_name: str
    buyer_phone: str
    
    # Transaction Details
    quantity_kg: float
    agreed_price_per_kg: float
    total_amount_kes: float
    payment_method: PaymentMethod
    
    # Escrow Details
    escrow_account_id: str
    funds_escrowed_at: Optional[datetime] = None
    funds_locked: bool = False
    
    # Delivery Details
    delivery_method: str  # "pickup", "delivery", "third_party"
    delivery_address: Optional[str] = None
    expected_delivery_date: datetime
    
    # Proof of Delivery
    delivery_proof_images: List[str] = []
    delivery_proof_submitted_at: Optional[datetime] = None
    delivery_qr_code: Optional[str] = None
    digital_signature: Optional[str] = None
    
    # Buyer Acceptance Window
    acceptance_window_hours: int = 48
    acceptance_window_start: Optional[datetime] = None
    acceptance_window_end: Optional[datetime] = None
    buyer_accepted: bool = False
    buyer_acceptance_date: Optional[datetime] = None
    
    # Status and Resolution
    status: TransactionStatus = TransactionStatus.PENDING
    completed_at: Optional[datetime] = None
    seller_payout_amount: float = 0.0
    platform_fee_kes: float = 0.0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class DisputeCase(BaseModel):
    dispute_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str
    raised_by: str  # "buyer" or "seller"
    raised_by_user_id: str
    
    # Dispute Details
    dispute_reason: str
    dispute_category: str  # "quality", "quantity", "condition", "non_delivery", "other"
    description: str
    evidence_images: List[str] = []
    
    # AI Data Pull for Arbitration
    pre_harvest_health_score: Optional[float] = None
    storage_condition_history: Optional[Dict[str, Any]] = None
    spoilage_risk_at_sale: Optional[float] = None
    current_condition_assessment: Optional[Dict[str, Any]] = None
    
    # Arbitration
    status: DisputeStatus = DisputeStatus.OPEN
    assigned_arbitrator_id: Optional[str] = None
    arbitrator_name: Optional[str] = None
    arbitration_notes: Optional[str] = None
    
    # Resolution
    resolution: Optional[str] = None  # "full_refund", "partial_refund", "seller_wins", "negotiated"
    refund_amount_kes: float = 0.0
    resolved_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class MarketInventory(BaseModel):
    farm_id: str
    storage_location_id: Optional[str] = None
    
    # Inventory Details
    crop_type: str
    current_quantity_kg: float
    quality_grade: QualityGrade
    
    # AI Intelligence Links
    harvest_prediction_date: Optional[datetime] = None
    predicted_yield_kg: Optional[float] = None
    spoilage_risk_score: float
    days_until_critical_spoilage: int
    
    # Market Status
    listed_on_exchange: bool = False
    asset_id: Optional[str] = None
    reserved_quantity_kg: float = 0.0  # Quantity in pending transactions
    available_for_sale_kg: float
    
    # Proactive Matching
    matched_buyers: List[str] = []  # List of buyer IDs
    forward_sales_contracts: List[str] = []  # Pre-harvest sales
    
    last_updated: datetime = Field(default_factory=datetime.now)

class BuyerOrder(BaseModel):
    order_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    buyer_id: str
    buyer_name: str
    buyer_type: str  # "individual", "processor", "distributor", "exporter"
    
    # Order Requirements
    crop_type: str
    required_quantity_kg: float
    max_price_per_kg: float
    required_quality_grade: QualityGrade
    preferred_delivery_date: datetime
    
    # Location
    delivery_location: str
    delivery_latitude: float
    delivery_longitude: float
    max_distance_km: float
    
    # Order Status
    status: str = "active"  # "active", "partially_filled", "filled", "expired"
    matched_assets: List[str] = []
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime

# ============================================================================
# API ENDPOINTS
# ============================================================================

# In-memory storage (Replace with Supabase in production)
ASSETS_DB: Dict[str, TokenizedAsset] = {}
TRANSACTIONS_DB: Dict[str, EscrowTransaction] = {}
DISPUTES_DB: Dict[str, DisputeCase] = {}
INVENTORY_DB: Dict[str, MarketInventory] = {}
BUYER_ORDERS_DB: Dict[str, BuyerOrder] = {}

@router.post("/assets/create", response_model=TokenizedAsset)
async def create_asset_listing(asset: TokenizedAsset):
    """
    Create a new tokenized asset listing with AI verification
    Links to GPS, soil scan, BLE sensors, harvest photos, and pest history
    """
    # Validate AI verification data completeness
    if asset.ai_verification.ai_confidence_score < 60:
        raise HTTPException(
            status_code=400,
            detail="AI verification confidence too low. Please complete GPS tagging, harvest photos, and pest scans."
        )
    
    # Determine quality grade based on verification completeness
    verification_score = 0
    if asset.ai_verification.harvest_health_score and asset.ai_verification.harvest_health_score > 80:
        verification_score += 25
    if asset.ai_verification.storage_condition_proof:
        verification_score += 25
    if asset.ai_verification.pest_free_certification:
        verification_score += 25
    if asset.ai_verification.soil_health_score and asset.ai_verification.soil_health_score > 70:
        verification_score += 25
    
    # Auto-assign quality grade
    if verification_score >= 90:
        asset.quality_grade = QualityGrade.GRADE_A_PREMIUM
    elif verification_score >= 60:
        asset.quality_grade = QualityGrade.GRADE_B_STANDARD
    else:
        asset.quality_grade = QualityGrade.GRADE_C_BASIC
    
    # Set initial availability
    asset.available_quantity_kg = asset.quantity_kg
    asset.total_value_kes = asset.quantity_kg * asset.unit_price_kes
    
    # Store in database
    ASSETS_DB[asset.asset_id] = asset
    
    return asset

@router.put("/assets/{asset_id}/publish")
async def publish_asset(asset_id: str, expires_in_days: int = 30):
    """Publish asset to active marketplace"""
    if asset_id not in ASSETS_DB:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset = ASSETS_DB[asset_id]
    asset.status = AssetStatus.ACTIVE
    asset.listed_at = datetime.now()
    asset.expires_at = datetime.now() + timedelta(days=expires_in_days)
    
    return {"message": "Asset published successfully", "asset": asset}

@router.get("/assets/active", response_model=List[TokenizedAsset])
async def get_active_assets(
    crop_type: Optional[str] = None,
    quality_grade: Optional[QualityGrade] = None,
    max_price: Optional[float] = None,
    min_quantity: Optional[float] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    max_distance_km: Optional[float] = 50
):
    """
    Get all active marketplace listings with optional filters
    Supports location-based search
    """
    active_assets = [a for a in ASSETS_DB.values() if a.status == AssetStatus.ACTIVE]
    
    # Apply filters
    if crop_type:
        active_assets = [a for a in active_assets if a.crop_type.lower() == crop_type.lower()]
    if quality_grade:
        active_assets = [a for a in active_assets if a.quality_grade == quality_grade]
    if max_price:
        active_assets = [a for a in active_assets if a.unit_price_kes <= max_price]
    if min_quantity:
        active_assets = [a for a in active_assets if a.available_quantity_kg >= min_quantity]
    
    # Location-based filtering (simple distance calculation)
    if latitude and longitude:
        def calculate_distance(lat1, lon1, lat2, lon2):
            # Haversine formula (simplified for small distances)
            import math
            R = 6371  # Earth radius in km
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            return R * c
        
        active_assets = [
            a for a in active_assets 
            if calculate_distance(latitude, longitude, a.ai_verification.gps_latitude, a.ai_verification.gps_longitude) <= max_distance_km
        ]
    
    return active_assets

@router.get("/assets/{asset_id}", response_model=TokenizedAsset)
async def get_asset_details(asset_id: str):
    """Get detailed asset information with full AI verification data"""
    if asset_id not in ASSETS_DB:
        raise HTTPException(status_code=404, detail="Asset not found")
    return ASSETS_DB[asset_id]

@router.post("/transactions/create", response_model=EscrowTransaction)
async def create_escrow_transaction(
    asset_id: str,
    buyer_id: str,
    buyer_name: str,
    buyer_phone: str,
    quantity_kg: float,
    payment_method: PaymentMethod,
    delivery_method: str,
    delivery_address: Optional[str] = None,
    expected_delivery_days: int = 3
):
    """
    Create an escrow transaction
    Locks the asset and prepares for fund escrow
    """
    # Validate asset
    if asset_id not in ASSETS_DB:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset = ASSETS_DB[asset_id]
    
    if asset.status != AssetStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Asset not available for sale")
    
    if quantity_kg > asset.available_quantity_kg:
        raise HTTPException(status_code=400, detail=f"Insufficient quantity. Available: {asset.available_quantity_kg} kg")
    
    # Calculate total amount and fees
    total_amount = quantity_kg * asset.unit_price_kes
    platform_fee = total_amount * 0.02  # 2% platform fee
    seller_payout = total_amount - platform_fee
    
    # Create transaction
    transaction = EscrowTransaction(
        asset_id=asset_id,
        seller_id=asset.seller_id,
        buyer_id=buyer_id,
        buyer_name=buyer_name,
        buyer_phone=buyer_phone,
        quantity_kg=quantity_kg,
        agreed_price_per_kg=asset.unit_price_kes,
        total_amount_kes=total_amount,
        payment_method=payment_method,
        escrow_account_id=f"ESCROW_{uuid.uuid4().hex[:12].upper()}",
        delivery_method=delivery_method,
        delivery_address=delivery_address,
        expected_delivery_date=datetime.now() + timedelta(days=expected_delivery_days),
        seller_payout_amount=seller_payout,
        platform_fee_kes=platform_fee
    )
    
    # Update asset
    asset.available_quantity_kg -= quantity_kg
    if asset.available_quantity_kg <= 0:
        asset.status = AssetStatus.IN_ESCROW
    
    # Store transaction
    TRANSACTIONS_DB[transaction.transaction_id] = transaction
    
    return transaction

@router.post("/transactions/{transaction_id}/escrow-funds")
async def escrow_funds(
    transaction_id: str,
    payment_reference: str,
    payment_proof_url: Optional[str] = None
):
    """
    Lock funds in escrow
    CRITICAL: Once funds are escrowed, they CANNOT be unilaterally withdrawn by buyer
    """
    if transaction_id not in TRANSACTIONS_DB:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction = TRANSACTIONS_DB[transaction_id]
    
    if transaction.funds_locked:
        raise HTTPException(status_code=400, detail="Funds already escrowed")
    
    # Lock funds
    transaction.funds_locked = True
    transaction.funds_escrowed_at = datetime.now()
    transaction.status = TransactionStatus.FUNDS_ESCROWED
    
    # Update asset status
    asset = ASSETS_DB[transaction.asset_id]
    asset.status = AssetStatus.IN_ESCROW
    
    return {
        "message": "Funds successfully locked in escrow",
        "escrow_account_id": transaction.escrow_account_id,
        "amount_kes": transaction.total_amount_kes,
        "locked_at": transaction.funds_escrowed_at,
        "warning": "Funds are now LOCKED and cannot be withdrawn without completing delivery or dispute resolution"
    }

@router.post("/transactions/{transaction_id}/submit-delivery-proof")
async def submit_delivery_proof(
    transaction_id: str,
    delivery_images: List[str],
    digital_signature: Optional[str] = None,
    qr_code: Optional[str] = None
):
    """
    Seller submits proof of delivery
    Starts the buyer acceptance window
    """
    if transaction_id not in TRANSACTIONS_DB:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction = TRANSACTIONS_DB[transaction_id]
    
    if not transaction.funds_locked:
        raise HTTPException(status_code=400, detail="Funds not yet escrowed")
    
    # Submit proof
    transaction.delivery_proof_images = delivery_images
    transaction.digital_signature = digital_signature
    transaction.delivery_qr_code = qr_code
    transaction.delivery_proof_submitted_at = datetime.now()
    transaction.status = TransactionStatus.DELIVERY_PROOF_SUBMITTED
    
    # Start acceptance window
    transaction.acceptance_window_start = datetime.now()
    transaction.acceptance_window_end = datetime.now() + timedelta(hours=transaction.acceptance_window_hours)
    transaction.status = TransactionStatus.IN_ACCEPTANCE_WINDOW
    
    return {
        "message": "Delivery proof submitted",
        "acceptance_window_end": transaction.acceptance_window_end,
        "hours_remaining": transaction.acceptance_window_hours
    }

@router.post("/transactions/{transaction_id}/buyer-accept")
async def buyer_accept_delivery(transaction_id: str, buyer_id: str):
    """
    Buyer confirms acceptance of goods
    Triggers automatic release of funds to seller
    """
    if transaction_id not in TRANSACTIONS_DB:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction = TRANSACTIONS_DB[transaction_id]
    
    if transaction.buyer_id != buyer_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    if transaction.status != TransactionStatus.IN_ACCEPTANCE_WINDOW:
        raise HTTPException(status_code=400, detail="Not in acceptance window")
    
    # Buyer accepts
    transaction.buyer_accepted = True
    transaction.buyer_acceptance_date = datetime.now()
    transaction.status = TransactionStatus.COMPLETED
    transaction.completed_at = datetime.now()
    
    # Update asset
    asset = ASSETS_DB[transaction.asset_id]
    if asset.available_quantity_kg <= 0:
        asset.status = AssetStatus.SOLD
    else:
        asset.status = AssetStatus.ACTIVE  # Still has available quantity
    
    # Release funds (in production, integrate with payment gateway)
    return {
        "message": "Transaction completed successfully",
        "seller_payout_kes": transaction.seller_payout_amount,
        "funds_released_to": transaction.seller_id,
        "platform_fee_kes": transaction.platform_fee_kes
    }

@router.post("/transactions/{transaction_id}/auto-release")
async def auto_release_on_expiry(transaction_id: str):
    """
    Automatic fund release when acceptance window expires without dispute
    Called by scheduled job or manual check
    """
    if transaction_id not in TRANSACTIONS_DB:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction = TRANSACTIONS_DB[transaction_id]
    
    if transaction.status != TransactionStatus.IN_ACCEPTANCE_WINDOW:
        raise HTTPException(status_code=400, detail="Not in acceptance window")
    
    # Check if window expired
    if datetime.now() < transaction.acceptance_window_end:
        raise HTTPException(status_code=400, detail=f"Acceptance window not expired. Ends at {transaction.acceptance_window_end}")
    
    # Auto-release funds
    transaction.status = TransactionStatus.COMPLETED
    transaction.completed_at = datetime.now()
    transaction.buyer_accepted = True  # Implicit acceptance by timeout
    
    # Update asset
    asset = ASSETS_DB[transaction.asset_id]
    if asset.available_quantity_kg <= 0:
        asset.status = AssetStatus.SOLD
    else:
        asset.status = AssetStatus.ACTIVE
    
    return {
        "message": "Funds automatically released to seller (acceptance window expired)",
        "seller_payout_kes": transaction.seller_payout_amount,
        "completed_at": transaction.completed_at
    }

@router.post("/disputes/create", response_model=DisputeCase)
async def create_dispute(
    transaction_id: str,
    raised_by: str,
    raised_by_user_id: str,
    dispute_reason: str,
    dispute_category: str,
    description: str,
    evidence_images: List[str] = []
):
    """
    Create a dispute case
    Freezes fund release and pulls AI data for arbitration
    """
    if transaction_id not in TRANSACTIONS_DB:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction = TRANSACTIONS_DB[transaction_id]
    asset = ASSETS_DB[transaction.asset_id]
    
    # Pull AI data for arbitration
    dispute = DisputeCase(
        transaction_id=transaction_id,
        raised_by=raised_by,
        raised_by_user_id=raised_by_user_id,
        dispute_reason=dispute_reason,
        dispute_category=dispute_category,
        description=description,
        evidence_images=evidence_images,
        pre_harvest_health_score=asset.ai_verification.harvest_health_score,
        storage_condition_history=asset.ai_verification.storage_condition_proof.dict() if asset.ai_verification.storage_condition_proof else None,
        spoilage_risk_at_sale=asset.ai_verification.spoilage_risk_score
    )
    
    # Update transaction status
    transaction.status = TransactionStatus.DISPUTED
    
    # Store dispute
    DISPUTES_DB[dispute.dispute_id] = dispute
    
    return dispute

@router.put("/disputes/{dispute_id}/assign-arbitrator")
async def assign_arbitrator(dispute_id: str, arbitrator_id: str, arbitrator_name: str):
    """Assign extension officer or quality inspector to review dispute"""
    if dispute_id not in DISPUTES_DB:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    dispute = DISPUTES_DB[dispute_id]
    dispute.assigned_arbitrator_id = arbitrator_id
    dispute.arbitrator_name = arbitrator_name
    dispute.status = DisputeStatus.UNDER_REVIEW
    
    return {"message": "Arbitrator assigned", "dispute": dispute}

@router.post("/disputes/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: str,
    arbitrator_id: str,
    resolution: str,
    refund_percentage: float = 0.0,
    arbitration_notes: str = ""
):
    """
    Arbitrator resolves dispute based on AI data and physical inspection
    Issues binding decision for fund release
    """
    if dispute_id not in DISPUTES_DB:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    dispute = DISPUTES_DB[dispute_id]
    
    if dispute.assigned_arbitrator_id != arbitrator_id:
        raise HTTPException(status_code=403, detail="Unauthorized arbitrator")
    
    transaction = TRANSACTIONS_DB[dispute.transaction_id]
    
    # Calculate refund
    refund_amount = transaction.total_amount_kes * (refund_percentage / 100)
    seller_payout = transaction.total_amount_kes - refund_amount - transaction.platform_fee_kes
    
    # Resolve dispute
    dispute.resolution = resolution
    dispute.refund_amount_kes = refund_amount
    dispute.arbitration_notes = arbitration_notes
    dispute.status = DisputeStatus.RESOLVED
    dispute.resolved_at = datetime.now()
    
    # Update transaction
    if refund_percentage == 100:
        transaction.status = TransactionStatus.REFUNDED
    elif refund_percentage == 0:
        transaction.status = TransactionStatus.COMPLETED
        transaction.seller_payout_amount = seller_payout
    else:
        transaction.status = TransactionStatus.COMPLETED
        transaction.seller_payout_amount = seller_payout
    
    transaction.completed_at = datetime.now()
    
    return {
        "message": "Dispute resolved",
        "resolution": resolution,
        "refund_amount_kes": refund_amount,
        "seller_payout_kes": seller_payout,
        "arbitration_notes": arbitration_notes
    }

@router.post("/inventory/sync-from-storage")
async def sync_inventory_from_storage(farm_id: str):
    """
    Sync market inventory from AI Storage Intelligence Engine
    Links storage data to marketplace
    """
    # This would integrate with the actual storage API
    # For now, create a sample inventory item
    inventory = MarketInventory(
        farm_id=farm_id,
        crop_type="Potato",
        current_quantity_kg=500.0,
        quality_grade=QualityGrade.GRADE_A_PREMIUM,
        spoilage_risk_score=15.0,
        days_until_critical_spoilage=45,
        available_for_sale_kg=500.0
    )
    
    INVENTORY_DB[f"{farm_id}_{inventory.crop_type}"] = inventory
    
    return {
        "message": "Inventory synced from storage system",
        "inventory": inventory
    }

@router.get("/inventory/farm/{farm_id}")
async def get_farm_inventory(farm_id: str):
    """Get market-ready inventory for a farm"""
    inventory_items = [inv for inv in INVENTORY_DB.values() if inv.farm_id == farm_id]
    return inventory_items

@router.post("/orders/create-bulk-order", response_model=BuyerOrder)
async def create_bulk_buyer_order(order: BuyerOrder):
    """
    Create bulk buyer order (processor/distributor)
    System will match with available inventory and forward sales
    """
    BUYER_ORDERS_DB[order.order_id] = order
    
    # Match with existing assets
    matching_assets = [
        a for a in ASSETS_DB.values()
        if a.crop_type == order.crop_type
        and a.quality_grade.value >= order.required_quality_grade.value
        and a.unit_price_kes <= order.max_price_per_kg
        and a.status == AssetStatus.ACTIVE
    ]
    
    order.matched_assets = [a.asset_id for a in matching_assets]
    
    return order

@router.get("/orders/bulk/{buyer_id}")
async def get_buyer_orders(buyer_id: str):
    """Get all orders for a bulk buyer"""
    orders = [o for o in BUYER_ORDERS_DB.values() if o.buyer_id == buyer_id]
    return orders

@router.get("/analytics/marketplace-stats")
async def get_marketplace_stats():
    """Get marketplace analytics and statistics"""
    total_assets = len(ASSETS_DB)
    active_assets = len([a for a in ASSETS_DB.values() if a.status == AssetStatus.ACTIVE])
    total_transactions = len(TRANSACTIONS_DB)
    completed_transactions = len([t for t in TRANSACTIONS_DB.values() if t.status == TransactionStatus.COMPLETED])
    total_disputes = len(DISPUTES_DB)
    resolved_disputes = len([d for d in DISPUTES_DB.values() if d.status == DisputeStatus.RESOLVED])
    
    total_value = sum(t.total_amount_kes for t in TRANSACTIONS_DB.values())
    avg_transaction_value = total_value / total_transactions if total_transactions > 0 else 0
    
    # Quality grade distribution
    grade_distribution = {
        "grade_a_premium": len([a for a in ASSETS_DB.values() if a.quality_grade == QualityGrade.GRADE_A_PREMIUM]),
        "grade_b_standard": len([a for a in ASSETS_DB.values() if a.quality_grade == QualityGrade.GRADE_B_STANDARD]),
        "grade_c_basic": len([a for a in ASSETS_DB.values() if a.quality_grade == QualityGrade.GRADE_C_BASIC])
    }
    
    return {
        "total_assets_listed": total_assets,
        "active_listings": active_assets,
        "total_transactions": total_transactions,
        "completed_transactions": completed_transactions,
        "completion_rate": f"{(completed_transactions / total_transactions * 100) if total_transactions > 0 else 0:.1f}%",
        "total_disputes": total_disputes,
        "resolved_disputes": resolved_disputes,
        "dispute_rate": f"{(total_disputes / total_transactions * 100) if total_transactions > 0 else 0:.1f}%",
        "total_marketplace_value_kes": total_value,
        "average_transaction_value_kes": avg_transaction_value,
        "quality_grade_distribution": grade_distribution
    }
