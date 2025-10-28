"""
Farmer Marketplace Portal (Seller)
Enables farmers to list produce, manage offers, and sell directly to buyers
"""

from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from app.services import persistence
from app.services.ai_market_optimizer import market_optimizer, get_optimal_sale_strategy
from app.services.cross_regional_service import (
    get_region_from_coordinates,
    analyze_cross_regional_opportunities
)
from app.middleware.feature_guard import require_feature

router = APIRouter()


# ============================================================================
# MODELS
# ============================================================================

class SaleLot(BaseModel):
    field_id: str
    crop: str
    quantity_kg: float
    quality_grade: str  # A, B, C, Premium
    ready_date: str  # ISO format
    minimum_order_kg: float = 50
    willing_to_negotiate: bool = True
    target_price_kes_per_kg: Optional[float] = None
    storage_location: str
    delivery_available: bool = False
    organic_certified: bool = False


class OfferResponse(BaseModel):
    offer_id: str
    action: str  # accept, counter, decline
    counter_price_kes_per_kg: Optional[float] = None
    counter_quantity_kg: Optional[float] = None
    farmer_notes: Optional[str] = None


class ContractTerms(BaseModel):
    sale_lot_id: str
    buyer_id: str
    quantity_kg: float
    agreed_price_kes_per_kg: float
    delivery_date: str
    payment_terms: str
    quality_inspection: bool = True


# ============================================================================
# FARMER PORTAL: LISTING MANAGEMENT
# ============================================================================

@router.post("/create-listing")
async def create_sale_listing(
    farmer_id: str = Form(...),
    field_id: str = Form(...),
    crop: str = Form(...),
    quantity_kg: float = Form(...),
    quality_grade: str = Form("B"),
    ready_date: str = Form(...),
    minimum_order_kg: float = Form(50),
    willing_to_negotiate: bool = Form(True),
    target_price_kes_per_kg: Optional[float] = Form(None),
    storage_location: str = Form(...),
    delivery_available: bool = Form(False),
    organic_certified: bool = Form(False),
    images: Optional[List[UploadFile]] = File(None),
    # NEW: Cross-regional parameters
    farmer_region: Optional[str] = Form(None),
    prefer_cross_regional: bool = Form(False),
    avoid_local_competition: bool = Form(False),
    target_regions: Optional[str] = Form(None)  # JSON string array
):
    """
    Create a verified digital inventory listing with cross-regional targeting
    
    Links to Digital Farm Registration for verification:
    - Verified Quantity (from AI yield prediction)
    - Quality Grade (from Premium storage certificate)
    - Ready Date (from harvest window prediction)
    """
    # Verify field ownership
    field = persistence.get_field_by_id(field_id)
    if not field or field.get("owner_id") != farmer_id:
        raise HTTPException(status_code=403, detail="Field not found or unauthorized")
    
    # Verify quantity against AI prediction
    predicted_yield = field.get("predicted_yield_kg", 0)
    if quantity_kg > predicted_yield * 1.2:  # Allow 20% margin
        raise HTTPException(
            status_code=400,
            detail=f"Quantity exceeds predicted yield ({predicted_yield}kg). Please update field data."
        )
    
    # Get AI-recommended target price if not provided
    if not target_price_kes_per_kg:
        optimal_strategy = await get_optimal_sale_strategy(farmer_id, field_id)
        target_price_kes_per_kg = optimal_strategy.get("price_forecast", {}).get("predicted_price_range", {}).get("max", 50)
    
    # Upload product images
    image_urls = []
    if images:
        for image in images[:5]:  # Max 5 images
            contents = await image.read()
            image_path = persistence.save_product_image(farmer_id, contents)
            image_urls.append(image_path)
    
    # Parse target regions if provided
    import json
    target_regions_list = []
    if target_regions:
        try:
            target_regions_list = json.loads(target_regions)
        except:
            target_regions_list = []
    
    # Create listing
    listing = {
        "listing_id": f"LOT_{farmer_id}_{int(datetime.now().timestamp())}",
        "farmer_id": farmer_id,
        "field_id": field_id,
        "crop": crop,
        "quantity_kg": quantity_kg,
        "quantity_available_kg": quantity_kg,  # Updated as orders are placed
        "quality_grade": quality_grade,
        "ready_date": ready_date,
        "minimum_order_kg": minimum_order_kg,
        "willing_to_negotiate": willing_to_negotiate,
        "target_price_kes_per_kg": target_price_kes_per_kg,
        "storage_location": storage_location,
        "delivery_available": delivery_available,
        "organic_certified": organic_certified,
        "images": image_urls,
        "verified": True,  # Verified via field registration
        "verification_details": {
            "predicted_yield_kg": predicted_yield,
            "farm_registered": True,
            "quality_verified": quality_grade != "C",  # A/B grades verified via Premium
            "location": {"lat": field.get("latitude"), "lon": field.get("longitude")}
        },
        # NEW: Cross-regional fields
        "farmer_region": farmer_region or "Unknown",
        "prefer_cross_regional": prefer_cross_regional,
        "avoid_local_competition": avoid_local_competition,
        "target_regions": target_regions_list,
        "excluded_regions": [farmer_region] if (avoid_local_competition and farmer_region) else [],
        "prioritized_regions": target_regions_list,
        "status": "active",  # active, sold_out, expired
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=30)).isoformat(),
        "views_count": 0,
        "offers_count": 0
    }
    
    listing_id = persistence.create_sale_listing(listing)
    
    # Get AI market recommendations
    optimal_strategy = await get_optimal_sale_strategy(farmer_id, field_id)
    
    # Get cross-regional insights if requested
    cross_regional_insights = None
    if prefer_cross_regional and farmer_region:
        try:
            analysis = await analyze_cross_regional_opportunities(
                farmer_id=farmer_id,
                farmer_region=farmer_region,
                crops=[crop],
                radius_km=50
            )
            
            cross_regional_insights = {
                "message": generate_recommendation_message(analysis),
                "recommended_regions": [r["region"] for r in analysis["recommended_regions"][:3]],
                "avoid_regions": [
                    {"region": r["region"], "reason": r["reason"]} 
                    for r in analysis["avoid_regions"]
                ],
                "visibility": {
                    "visible_to_regions": target_regions_list or [r["region"] for r in analysis["recommended_regions"]],
                    "excluded_regions": [farmer_region] if avoid_local_competition else []
                },
                "local_competition": analysis["local_competition"]
            }
        except Exception as e:
            print(f"Error getting cross-regional insights: {str(e)}")
            cross_regional_insights = {"message": "Cross-regional analysis in progress"}
    
    return {
        "status": "success",
        "listing_id": listing_id,
        "listing": listing,
        "ai_recommendations": {
            "optimal_sale_window": optimal_strategy.get("optimal_sale_window"),
            "market_recommendations": optimal_strategy.get("market_recommendations", [])[:3],
            "ai_guidance": optimal_strategy.get("ai_recommendation")
        },
        "cross_regional_insights": cross_regional_insights,
        "next_steps": [
            "Your listing is now live in the Marketplace",
            "Verified buyers can now make offers",
            f"AI recommends selling between {optimal_strategy.get('optimal_sale_window', {}).get('start_date')} - {optimal_strategy.get('optimal_sale_window', {}).get('end_date')}",
            "Check 'Offers' tab to view incoming bids"
        ]
    }



@router.get("/my-listings/{farmer_id}")
async def get_farmer_listings(farmer_id: str, status: str = "active"):
    """
    Get all listings for a farmer
    """
    listings = persistence.get_farmer_listings(farmer_id, status=status)
    
    # Add offer counts and latest offers
    for listing in listings:
        offers = persistence.get_listing_offers(listing["listing_id"])
        listing["offers_count"] = len(offers)
        listing["pending_offers"] = len([o for o in offers if o["status"] == "pending"])
        listing["latest_offer"] = offers[0] if offers else None
    
    return {
        "farmer_id": farmer_id,
        "total_listings": len(listings),
        "active_listings": len([l for l in listings if l["status"] == "active"]),
        "total_quantity_kg": sum(l["quantity_available_kg"] for l in listings),
        "listings": listings
    }


@router.put("/update-listing/{listing_id}")
async def update_listing(
    listing_id: str,
    farmer_id: str = Form(...),
    quantity_available_kg: Optional[float] = Form(None),
    target_price_kes_per_kg: Optional[float] = Form(None),
    status: Optional[str] = Form(None)
):
    """
    Update listing details (price, quantity, status)
    """
    listing = persistence.get_listing_by_id(listing_id)
    
    if not listing or listing["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Listing not found or unauthorized")
    
    updates = {}
    if quantity_available_kg is not None:
        updates["quantity_available_kg"] = quantity_available_kg
        if quantity_available_kg == 0:
            updates["status"] = "sold_out"
    
    if target_price_kes_per_kg is not None:
        updates["target_price_kes_per_kg"] = target_price_kes_per_kg
    
    if status is not None:
        updates["status"] = status
    
    updates["updated_at"] = datetime.now().isoformat()
    
    persistence.update_listing(listing_id, updates)
    
    return {
        "status": "success",
        "listing_id": listing_id,
        "updates": updates
    }


@router.delete("/delete-listing/{listing_id}")
async def delete_listing(listing_id: str, farmer_id: str):
    """
    Delete/deactivate a listing
    """
    listing = persistence.get_listing_by_id(listing_id)
    
    if not listing or listing["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Listing not found or unauthorized")
    
    # Check for pending offers
    pending_offers = persistence.get_listing_offers(listing_id, status="pending")
    if pending_offers:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete listing with {len(pending_offers)} pending offers. Please respond to all offers first."
        )
    
    persistence.update_listing(listing_id, {"status": "deleted", "deleted_at": datetime.now().isoformat()})
    
    return {
        "status": "success",
        "message": "Listing deleted successfully"
    }


# ============================================================================
# FARMER PORTAL: OFFER MANAGEMENT
# ============================================================================

@router.get("/offers/{farmer_id}")
async def get_farmer_offers(farmer_id: str, status: str = "pending"):
    """
    Get all offers for farmer's listings
    """
    # Get all farmer listings
    listings = persistence.get_farmer_listings(farmer_id, status="active")
    listing_ids = [l["listing_id"] for l in listings]
    
    # Get offers for all listings
    all_offers = []
    for listing_id in listing_ids:
        offers = persistence.get_listing_offers(listing_id, status=status)
        for offer in offers:
            # Add listing details
            listing = next((l for l in listings if l["listing_id"] == listing_id), None)
            offer["listing_details"] = {
                "crop": listing["crop"],
                "quality_grade": listing["quality_grade"],
                "target_price": listing["target_price_kes_per_kg"]
            }
            all_offers.append(offer)
    
    # Sort by offer date (newest first)
    all_offers.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {
        "farmer_id": farmer_id,
        "total_offers": len(all_offers),
        "pending_offers": len([o for o in all_offers if o["status"] == "pending"]),
        "accepted_offers": len([o for o in all_offers if o["status"] == "accepted"]),
        "offers": all_offers
    }


@router.post("/respond-to-offer")
async def respond_to_offer(
    offer_id: str = Form(...),
    farmer_id: str = Form(...),
    action: str = Form(...),  # accept, counter, decline
    counter_price_kes_per_kg: Optional[float] = Form(None),
    counter_quantity_kg: Optional[float] = Form(None),
    farmer_notes: Optional[str] = Form(None)
):
    """
    Respond to buyer offer: Accept, Counter-Offer, or Decline
    """
    offer = persistence.get_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    listing = persistence.get_listing_by_id(offer["listing_id"])
    if listing["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    if action == "accept":
        # Accept offer and create contract
        contract = {
            "contract_id": f"CNT_{offer_id}_{int(datetime.now().timestamp())}",
            "offer_id": offer_id,
            "listing_id": offer["listing_id"],
            "farmer_id": farmer_id,
            "buyer_id": offer["buyer_id"],
            "crop": listing["crop"],
            "quantity_kg": offer["quantity_kg"],
            "agreed_price_kes_per_kg": offer["offered_price_kes_per_kg"],
            "total_amount_kes": offer["quantity_kg"] * offer["offered_price_kes_per_kg"],
            "delivery_date": offer.get("requested_delivery_date", listing["ready_date"]),
            "payment_terms": offer.get("payment_terms", "50% deposit, 50% on delivery"),
            "quality_inspection": True,
            "delivery_location": offer.get("delivery_location", listing["storage_location"]),
            "transport_responsibility": offer.get("transport_responsibility", "buyer"),
            "status": "pending_deposit",  # pending_deposit, deposit_paid, in_transit, delivered, completed
            "created_at": datetime.now().isoformat(),
            "contract_terms": {
                "earnest_deposit_percent": 10,  # 10% deposit
                "deposit_refundable": True,
                "quality_standards": listing["quality_grade"],
                "dispute_resolution": "AgroShield Mediation",
                "cancellation_policy": "24-hour notice required"
            }
        }
        
        contract_id = persistence.create_contract(contract)
        
        # Update offer status
        persistence.update_offer(offer_id, {
            "status": "accepted",
            "accepted_at": datetime.now().isoformat(),
            "contract_id": contract_id
        })
        
        # Request M-Pesa deposit from buyer
        deposit_amount = contract["total_amount_kes"] * 0.10
        mpesa_request = persistence.request_buyer_deposit(
            buyer_id=offer["buyer_id"],
            contract_id=contract_id,
            amount=deposit_amount
        )
        
        # Update listing availability
        new_available = listing["quantity_available_kg"] - offer["quantity_kg"]
        persistence.update_listing(listing["listing_id"], {
            "quantity_available_kg": new_available,
            "status": "sold_out" if new_available == 0 else "active"
        })
        
        return {
            "status": "accepted",
            "message": "Offer accepted! Contract created.",
            "contract": contract,
            "next_steps": [
                f"Buyer will deposit KES {deposit_amount:,} (10% earnest money) via M-Pesa",
                "You will be notified when deposit is received",
                "Prepare produce for delivery/pickup",
                f"Final payment of KES {contract['total_amount_kes'] * 0.90:,} on delivery confirmation"
            ]
        }
    
    elif action == "counter":
        # Create counter-offer
        if not counter_price_kes_per_kg and not counter_quantity_kg:
            raise HTTPException(status_code=400, detail="Provide counter price or quantity")
        
        counter_offer = {
            "counter_offer_id": f"CNTR_{offer_id}_{int(datetime.now().timestamp())}",
            "original_offer_id": offer_id,
            "farmer_id": farmer_id,
            "buyer_id": offer["buyer_id"],
            "listing_id": offer["listing_id"],
            "original_price_kes_per_kg": offer["offered_price_kes_per_kg"],
            "original_quantity_kg": offer["quantity_kg"],
            "counter_price_kes_per_kg": counter_price_kes_per_kg or offer["offered_price_kes_per_kg"],
            "counter_quantity_kg": counter_quantity_kg or offer["quantity_kg"],
            "farmer_notes": farmer_notes,
            "status": "pending_buyer_response",
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(days=2)).isoformat()
        }
        
        counter_id = persistence.create_counter_offer(counter_offer)
        
        # Update original offer
        persistence.update_offer(offer_id, {
            "status": "countered",
            "counter_offer_id": counter_id
        })
        
        # Notify buyer
        persistence.notify_buyer_counter_offer(offer["buyer_id"], counter_id)
        
        return {
            "status": "countered",
            "message": "Counter-offer sent to buyer",
            "counter_offer": counter_offer,
            "next_steps": [
                "Buyer has 48 hours to respond",
                "You will be notified of their decision",
                "Original offer is on hold pending buyer response"
            ]
        }
    
    elif action == "decline":
        # Decline offer
        persistence.update_offer(offer_id, {
            "status": "declined",
            "declined_at": datetime.now().isoformat(),
            "decline_reason": farmer_notes
        })
        
        # Notify buyer
        persistence.notify_buyer_offer_declined(offer["buyer_id"], offer_id)
        
        return {
            "status": "declined",
            "message": "Offer declined",
            "offer_id": offer_id
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use: accept, counter, or decline")


# ============================================================================
# FARMER PORTAL: CONTRACT MANAGEMENT
# ============================================================================

@router.get("/contracts/{farmer_id}")
async def get_farmer_contracts(farmer_id: str, status: str = "active"):
    """
    Get all contracts for farmer
    """
    contracts = persistence.get_farmer_contracts(farmer_id, status=status)
    
    # Add buyer details and payment status
    for contract in contracts:
        buyer = persistence.get_user_by_id(contract["buyer_id"])
        contract["buyer_details"] = {
            "name": buyer.get("name", "Unknown"),
            "business_name": buyer.get("business_name"),
            "rating": buyer.get("buyer_rating", 0),
            "verified": buyer.get("verified", False)
        }
        
        # Payment tracking
        payments = persistence.get_contract_payments(contract["contract_id"])
        contract["payment_status"] = {
            "deposit_paid": any(p["type"] == "deposit" and p["status"] == "completed" for p in payments),
            "final_payment_paid": any(p["type"] == "final" and p["status"] == "completed" for p in payments),
            "total_paid_kes": sum(p["amount"] for p in payments if p["status"] == "completed"),
            "total_due_kes": contract["total_amount_kes"]
        }
    
    return {
        "farmer_id": farmer_id,
        "total_contracts": len(contracts),
        "active_contracts": len([c for c in contracts if c["status"] in ["deposit_paid", "in_transit"]]),
        "completed_contracts": len([c for c in contracts if c["status"] == "completed"]),
        "total_revenue_kes": sum(c["total_amount_kes"] for c in contracts if c["status"] == "completed"),
        "contracts": contracts
    }


@router.post("/confirm-delivery/{contract_id}")
async def confirm_delivery(
    contract_id: str,
    farmer_id: str = Form(...),
    delivery_notes: Optional[str] = Form(None),
    delivery_photos: Optional[List[UploadFile]] = File(None)
):
    """
    Farmer confirms delivery/pickup completed
    Triggers final payment to farmer's M-Pesa
    """
    contract = persistence.get_contract_by_id(contract_id)
    
    if not contract or contract["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Contract not found or unauthorized")
    
    if contract["status"] != "in_transit":
        raise HTTPException(status_code=400, detail="Contract not in transit. Cannot confirm delivery.")
    
    # Upload delivery photos
    photo_urls = []
    if delivery_photos:
        for photo in delivery_photos[:5]:
            contents = await photo.read()
            photo_path = persistence.save_delivery_photo(contract_id, contents)
            photo_urls.append(photo_path)
    
    # Update contract
    persistence.update_contract(contract_id, {
        "status": "awaiting_buyer_confirmation",
        "farmer_confirmed_delivery": True,
        "farmer_delivery_notes": delivery_notes,
        "farmer_delivery_photos": photo_urls,
        "farmer_confirmed_at": datetime.now().isoformat()
    })
    
    # Notify buyer to confirm receipt
    persistence.notify_buyer_delivery_confirmation_needed(contract["buyer_id"], contract_id)
    
    return {
        "status": "success",
        "message": "Delivery confirmed. Awaiting buyer confirmation.",
        "next_steps": [
            "Buyer has 24 hours to confirm receipt and quality",
            "If no dispute, final payment will be released automatically",
            f"Final payment: KES {contract['total_amount_kes'] * 0.90:,} to your M-Pesa"
        ],
        "automatic_release": "If buyer doesn't respond in 24 hours, payment releases automatically"
    }


@router.get("/payment-status/{contract_id}")
async def get_payment_status(contract_id: str, farmer_id: str):
    """
    Check payment status for a contract
    """
    contract = persistence.get_contract_by_id(contract_id)
    
    if not contract or contract["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    payments = persistence.get_contract_payments(contract_id)
    
    return {
        "contract_id": contract_id,
        "total_amount_kes": contract["total_amount_kes"],
        "payments": payments,
        "deposit_status": "paid" if any(p["type"] == "deposit" and p["status"] == "completed" for p in payments) else "pending",
        "final_payment_status": "paid" if any(p["type"] == "final" and p["status"] == "completed" for p in payments) else "pending",
        "total_received_kes": sum(p["amount"] for p in payments if p["status"] == "completed"),
        "outstanding_kes": contract["total_amount_kes"] - sum(p["amount"] for p in payments if p["status"] == "completed")
    }


# ============================================================================
# AI MARKET INSIGHTS FOR FARMER
# ============================================================================

@router.get("/market-insights/{farmer_id}")
@require_feature("premium_market_alerts")
async def get_farmer_market_insights(farmer_id: str):
    """
    AI-powered market insights dashboard for farmer
    Shows optimal selling strategy for all fields
    """
    # Get all farmer fields
    fields = persistence.get_user_fields(farmer_id)
    
    insights = []
    for field in fields:
        if field.get("expected_harvest_date"):
            strategy = await get_optimal_sale_strategy(farmer_id, field["field_id"])
            insights.append({
                "field_id": field["field_id"],
                "crop": field["crop"],
                "predicted_yield_kg": field.get("predicted_yield_kg", 0),
                "harvest_date": field.get("expected_harvest_date"),
                "optimal_strategy": strategy
            })
    
    return {
        "farmer_id": farmer_id,
        "total_fields": len(fields),
        "total_predicted_yield_kg": sum(f.get("predicted_yield_kg", 0) for f in fields),
        "insights": insights,
        "market_summary": {
            "best_selling_window": insights[0]["optimal_strategy"]["optimal_sale_window"] if insights else None,
            "highest_price_opportunity": max((i["optimal_strategy"]["price_forecast"]["predicted_price_range"]["max"] for i in insights), default=0),
            "total_potential_revenue_kes": sum(
                i["predicted_yield_kg"] * i["optimal_strategy"]["price_forecast"]["expected_price_kes_per_kg"]
                for i in insights
            )
        }
    }


# ============================================================================
# CROSS-REGIONAL MARKETPLACE ENDPOINTS
# ============================================================================

@router.get("/farmer-location/{farmer_id}")
async def get_farmer_location(farmer_id: str):
    """
    Get farmer's GPS location and administrative region
    
    Returns:
        - GPS coordinates
        - Region name (Central Kenya, Rift Valley, etc.)
        - County and sub-county
    """
    try:
        # Get farmer profile
        farmer = persistence.get_farmer_by_id(farmer_id)
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")
        
        # Get location from farmer profile
        location = farmer.get("location", {})
        latitude = location.get("lat", 0)
        longitude = location.get("lon", 0)
        
        if not latitude or not longitude:
            # Fallback: Use field location if farmer location not set
            fields = persistence.get_farmer_fields(farmer_id)
            if fields:
                field = fields[0]
                latitude = field.get("latitude", 0)
                longitude = field.get("longitude", 0)
        
        # Get region information
        if latitude and longitude:
            region_info = get_region_from_coordinates(latitude, longitude)
        else:
            region_info = {"region": "Unknown", "county": "Unknown", "sub_county": "Unknown"}
        
        return {
            "farmer_id": farmer_id,
            "location": {
                "latitude": latitude,
                "longitude": longitude
            },
            "region": region_info.get("region", "Unknown"),
            "county": region_info.get("county", "Unknown"),
            "sub_county": region_info.get("sub_county", "Unknown")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting farmer location: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting farmer location: {str(e)}")


@router.post("/analyze-cross-regional")
async def analyze_cross_regional(
    farmer_id: str = Form(...),
    farmer_region: str = Form(...),
    crops: str = Form(...),  # Comma-separated list
    radius_km: float = Form(50)
):
    """
    AI-powered analysis of regional competition and target market recommendations
    
    Analyzes:
    - Local competition (farmers growing same crops within radius)
    - Regional buyer density (demand/supply ratios)
    - Optimal target markets (regions with high demand, low supply)
    - Matched buyers in target regions
    
    Args:
        farmer_id: Farmer's ID
        farmer_region: Farmer's current region
        crops: Comma-separated list of crops (e.g., "maize,beans")
        radius_km: Radius for local competition analysis (default: 50km)
    
    Returns:
        Comprehensive cross-regional analysis with recommendations
    """
    try:
        # Parse crops
        crop_list = [c.strip() for c in crops.split(",")]
        
        # Perform analysis
        analysis = await analyze_cross_regional_opportunities(
            farmer_id=farmer_id,
            farmer_region=farmer_region,
            crops=crop_list,
            radius_km=radius_km
        )
        
        return {
            "status": "success",
            "farmer_id": farmer_id,
            "farmer_region": farmer_region,
            "crops": crop_list,
            "local_competition": analysis["local_competition"],
            "recommended_regions": analysis["recommended_regions"],
            "avoid_regions": analysis["avoid_regions"],
            "matched_buyers": analysis["matched_buyers"],
            "summary": {
                "competition_status": analysis["local_competition"]["status"],
                "top_target_region": analysis["recommended_regions"][0]["region"] if analysis["recommended_regions"] else "None",
                "potential_matches": len(analysis["matched_buyers"]),
                "recommendation": generate_recommendation_message(analysis)
            }
        }
    
    except Exception as e:
        print(f"Error analyzing cross-regional opportunities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing opportunities: {str(e)}")


def generate_recommendation_message(analysis: dict) -> str:
    """Generate user-friendly recommendation message from analysis"""
    competition = analysis["local_competition"]
    recommended = analysis["recommended_regions"]
    
    if competition["status"] == "HIGH":
        if recommended:
            return f"High local competition detected ({competition['same_crop_farmers']} farmers). We recommend targeting {recommended[0]['region']} where demand is {round(recommended[0]['buyer_density'], 1)}x higher."
        else:
            return f"High local competition detected ({competition['same_crop_farmers']} farmers). Consider exploring cross-regional opportunities."
    elif competition["status"] == "MEDIUM":
        return f"Moderate competition in your area. Cross-regional selling to {recommended[0]['region'] if recommended else 'other regions'} could increase your prices by 15-20%."
    else:
        return f"Low local competition. You have good opportunities both locally and in {recommended[0]['region'] if recommended else 'other regions'}."

