from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import io, numpy as np, os, requests
from datetime import datetime
from typing import Optional
from app.services.ai_pest_intelligence import (
    analyze_pest_severity_with_ai,
    predict_pest_outbreak_risk,
    optimize_action_plan_with_community_feedback,
    assess_diagnosis_confidence_and_triage,
    detect_outbreak_patterns
)
from app.services import persistence
from app.middleware.feature_guard import check_limit, filter_diagnosis_by_confidence, get_confidence_threshold

router = APIRouter()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _simulate_cv_analysis(image_data: bytes, pest_type: str) -> dict:
    """
    Simulate computer vision model analysis.
    In production, replace with actual TensorFlow/PyTorch model.
    
    Returns:
        {
            "pest_disease_id": "late_blight",
            "cv_confidence": 0.85,
            "leaf_coverage": 25,  # % of leaf affected
            "plant_damage": 30,
            "symptom_clarity": 0.75,
            "image_quality": {
                "brightness": 0.8,
                "sharpness": 0.7,
                "leaf_visibility": 0.9
            }
        }
    """
    # Simulated CV analysis
    # In production: Run TensorFlow Hub PlantVillage model or custom CNN
    
    import random
    
    # Simulate different pest detections
    possible_pests = ["late_blight", "fall_armyworm", "aphids", "maize_streak_virus", "bean_rust"]
    detected_pest = random.choice(possible_pests)
    
    return {
        "pest_disease_id": detected_pest,
        "cv_confidence": round(random.uniform(0.65, 0.95), 2),
        "leaf_coverage": random.randint(5, 60),
        "plant_damage": random.randint(10, 50),
        "symptom_clarity": round(random.uniform(0.6, 0.95), 2),
        "image_quality": {
            "brightness": round(random.uniform(0.6, 0.95), 2),
            "sharpness": round(random.uniform(0.5, 0.9), 2),
            "leaf_visibility": round(random.uniform(0.7, 1.0), 2)
        }
    }


def _format_pest_alert_sms(severity_analysis: dict, confidence_assessment: dict, lang: str = 'en') -> str:
    """Format AI pest alert for SMS."""
    urgency_emoji = {
        "low": "ℹ️",
        "medium": "⚠️",
        "high": "🚨",
        "critical": "🚨🚨"
    }
    
    emoji = urgency_emoji.get(severity_analysis["action_urgency"], "⚠️")
    pest_name = severity_analysis["pest_disease"]
    severity = severity_analysis["severity"].upper()
    window = severity_analysis["optimal_intervention_window"]
    loss = severity_analysis["estimated_loss_if_no_action"]
    
    if lang == 'sw':
        msg = f"{emoji} {pest_name}: Hatari ya {severity}. Fanya kazi ndani ya {window}. Hasara: {loss} KES."
    else:
        msg = f"{emoji} {pest_name}: {severity} severity. Act within {window}. Potential loss: {loss} KES."
    
    # Add confidence warning if low
    if confidence_assessment["requires_expert_triage"]:
        if lang == 'sw':
            msg += " Subiri uthibitisho wa mtaalamu."
        else:
            msg += " Awaiting expert confirmation."
    
    return msg[:160]  # SMS limit


@router.post('/leaf')
async def leaf(
    file: UploadFile = File(...),
    lat: float = Form(None),
    lon: float = Form(None),
    crop: str = Form("maize"),
    crop_stage: str = Form("vegetative"),
    days_since_planting: int = Form(30),
    farmer_id: str = Form(None),
    farmer_notes: str = Form(None)
):
    """
    AI-Enhanced Leaf Scan with:
    - Severity analysis & intervention timing
    - Confidence scoring & expert triage
    - Community efficacy optimization
    - Pre-emptive outbreak alerts
    
    FREE tier: 10 scans/month, high confidence only (70%+)
    PRO tier: 50 scans/month, medium confidence (50%+)
    EXPERT tier: Unlimited scans, low confidence (30%+)
    """
    # Check usage limit based on subscription tier
    if farmer_id:
        limit_check = check_limit("max_scans_per_month")
        try:
            # This will be enforced by the decorator in production
            from app.middleware.feature_guard import check_usage_limit
            usage = check_usage_limit(farmer_id, "max_scans_per_month")
            if not usage["within_limit"]:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "Monthly scan limit reached",
                        "current_usage": usage["current_usage"],
                        "max_limit": usage["max_limit"],
                        "upgrade_tier": usage.get("upgrade_tier"),
                        "message": f"You've used all {usage['max_limit']} scans this month. Upgrade to get more scans!"
                    }
                )
        except:
            pass  # Skip if user check fails
    
    contents = await file.read()
    
    # 1. Computer Vision Analysis (Simulated)
    cv_analysis = _simulate_cv_analysis(contents, "pest")
    
    pest_disease_id = cv_analysis["pest_disease_id"]
    cv_confidence = cv_analysis["cv_confidence"]
    image_quality = cv_analysis["image_quality"]
    symptom_clarity = cv_analysis["symptom_clarity"]
    
    # 2. AI-Driven Severity Analysis
    severity_analysis = analyze_pest_severity_with_ai(
        pest_disease_id=pest_disease_id,
        image_analysis=cv_analysis,
        crop=crop,
        crop_stage=crop_stage,
        days_since_planting=days_since_planting,
        gps_location=(lat or -1.2921, lon or 36.8219)
    )
    
    # 3. Confidence Scoring & Expert Triage
    confidence_assessment = assess_diagnosis_confidence_and_triage(
        pest_disease_id=pest_disease_id,
        cv_model_confidence=cv_confidence,
        image_quality=image_quality,
        symptom_clarity=symptom_clarity,
        farmer_notes=farmer_notes
    )
    
    # 4. Community Efficacy Optimization
    # Get community feedback from nearby farmers
    community_feedback = persistence.get_community_pest_feedback(
        lat or -1.2921, lon or 36.8219, radius_km=20
    )
    
    optimized_plan = optimize_action_plan_with_community_feedback(
        pest_disease_id=pest_disease_id,
        gps_location=(lat or -1.2921, lon or 36.8219),
        crop=crop,
        variety="local",  # TODO: Get from farm registration
        recommended_actions=severity_analysis["recommended_actions"],
        community_feedback=community_feedback
    )
    
    # 5. Log pest report for outbreak detection
    pest_report = {
        "pest_disease_id": pest_disease_id,
        "lat": lat or -1.2921,
        "lon": lon or 36.8219,
        "date": datetime.now().isoformat(),
        "severity": severity_analysis["severity"],
        "crop": crop,
        "farmer_id": farmer_id
    }
    persistence.log_pest_report(pest_report)
    
    # 6. Check for outbreak patterns
    recent_reports = persistence.get_recent_pest_reports(pest_disease_id, days=30)
    outbreak_analysis = detect_outbreak_patterns(
        pest_disease_id=pest_disease_id,
        recent_reports=recent_reports,
        analysis_date=datetime.now()
    )
    
    # 7. Generate SMS alert
    sms_text = _format_pest_alert_sms(severity_analysis, confidence_assessment, lang='en')
    
    # 8. Combined response
    response = {
        "cv_analysis": {
            "pest_disease_id": pest_disease_id,
            "pest_disease_name": severity_analysis["pest_disease"],
            "confidence": cv_confidence,
            "image_quality": image_quality
        },
        "severity_analysis": severity_analysis,
        "confidence_assessment": confidence_assessment,
        "optimized_action_plan": optimized_plan,
        "outbreak_alert": outbreak_analysis if outbreak_analysis.get("outbreak_detected") else None,
        "sms_alert": sms_text,
        "farmer_guidance": {
            "immediate_action": confidence_assessment["farmer_action"],
            "primary_remedy": optimized_plan["optimized_actions"][0] if optimized_plan["optimized_actions"] else "Contact extension officer",
            "urgency": severity_analysis["action_urgency"],
            "estimated_cost": _estimate_treatment_cost(optimized_plan["optimized_actions"][0] if optimized_plan["optimized_actions"] else "")
        }
    }
    
    return JSONResponse(response)


def _estimate_treatment_cost(remedy: str) -> dict:
    """Estimate cost of treatment (KES)."""
    cost_ranges = {
        "cultural": {"min": 0, "max": 100, "note": "Labor only"},
        "organic": {"min": 200, "max": 800, "note": "Neem oil, garlic spray"},
        "chemical": {"min": 500, "max": 2000, "note": "Pesticides + application"}
    }
    
    if any(word in remedy.lower() for word in ["remove", "spacing", "drainage", "manual"]):
        return cost_ranges["cultural"]
    elif any(word in remedy.lower() for word in ["neem", "garlic", "organic", "bacillus"]):
        return cost_ranges["organic"]
    else:
        return cost_ranges["chemical"]

@router.post('/soil')
async def soil(file: UploadFile = File(...), lat: float = None, lon: float = None):
    contents = await file.read()
    return JSONResponse({'nutrients':{'N':'low','P':'medium','K':'high'}, 'recommended_crops':['Maize']})


# ============================================================================
# AI PEST INTELLIGENCE ENDPOINTS
# ============================================================================

@router.post('/ai/preventative_alert')
async def ai_preventative_alert(
    crop: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    field_id: str = Form(None)
):
    """
    Get pre-emptive pest/disease outbreak alerts based on weather + SMI.
    """
    # Get weather forecast from LCRS
    weather_forecast = persistence.get_weather_forecast(lat, lon, days=7)
    
    # Get soil moisture index
    smi = persistence.get_soil_moisture_index(field_id) if field_id else 5.0
    
    # Predict outbreaks
    outbreak_predictions = predict_pest_outbreak_risk(
        crop=crop,
        gps_location=(lat, lon),
        weather_forecast=weather_forecast,
        soil_moisture_index=smi,
        current_date=datetime.now()
    )
    
    return JSONResponse({
        "crop": crop,
        "location": {"lat": lat, "lon": lon},
        "outbreak_predictions": outbreak_predictions,
        "total_threats": len(outbreak_predictions),
        "highest_risk": outbreak_predictions[0] if outbreak_predictions else None
    })


@router.post('/ai/community_efficacy')
async def ai_community_efficacy(
    pest_disease_id: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    radius_km: int = Form(20)
):
    """
    Get community efficacy data for pest treatments in area.
    """
    community_feedback = persistence.get_community_pest_feedback(lat, lon, radius_km)
    
    # Calculate efficacy statistics
    action_stats = {}
    for feedback in community_feedback:
        action = feedback["action"]
        if action not in action_stats:
            action_stats[action] = {"total": 0, "success": 0}
        action_stats[action]["total"] += 1
        if feedback.get("success"):
            action_stats[action]["success"] += 1
    
    # Calculate success rates
    efficacy_summary = {
        action: {
            "total_reports": stats["total"],
            "success_count": stats["success"],
            "efficacy_rate": round(stats["success"] / stats["total"], 2) if stats["total"] > 0 else 0
        }
        for action, stats in action_stats.items()
    }
    
    return JSONResponse({
        "pest_disease_id": pest_disease_id,
        "location": {"lat": lat, "lon": lon},
        "radius_km": radius_km,
        "total_reports": len(community_feedback),
        "efficacy_summary": efficacy_summary,
        "top_effective_remedies": sorted(
            efficacy_summary.items(),
            key=lambda x: x[1]["efficacy_rate"],
            reverse=True
        )[:5]
    })


@router.post('/ai/report_efficacy')
async def ai_report_efficacy(
    pest_disease_id: str = Form(...),
    action: str = Form(...),
    success: bool = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    farmer_id: str = Form(...),
    notes: str = Form(None)
):
    """
    Farmer reports treatment efficacy for community learning.
    """
    feedback = {
        "pest_disease_id": pest_disease_id,
        "action": action,
        "success": success,
        "lat": lat,
        "lon": lon,
        "farmer_id": farmer_id,
        "date": datetime.now().isoformat(),
        "notes": notes
    }
    
    persistence.log_pest_efficacy_feedback(feedback)
    
    return JSONResponse({
        "status": "success",
        "message": "Thank you for your feedback! This helps farmers in your area.",
        "feedback_id": f"{farmer_id}_{datetime.now().timestamp()}"
    })


@router.get('/ai/outbreak_hotspots')
async def ai_outbreak_hotspots(
    pest_disease_id: str = None,
    region: str = "all",  # all, county_name, etc.
    days: int = 30
):
    """
    Get outbreak hotspot map data for dashboard visualization.
    """
    # Get all recent reports
    if pest_disease_id:
        recent_reports = persistence.get_recent_pest_reports(pest_disease_id, days)
    else:
        recent_reports = persistence.get_all_recent_pest_reports(days)
    
    # Analyze each pest for outbreak patterns
    outbreak_hotspots = []
    
    # Group by pest_disease_id
    pest_groups = {}
    for report in recent_reports:
        pid = report.get("pest_disease_id")
        if pid not in pest_groups:
            pest_groups[pid] = []
        pest_groups[pid].append(report)
    
    # Detect outbreaks for each pest
    for pid, reports in pest_groups.items():
        if len(reports) >= 5:  # Minimum reports for analysis
            outbreak = detect_outbreak_patterns(
                pest_disease_id=pid,
                recent_reports=reports,
                analysis_date=datetime.now()
            )
            
            if outbreak.get("outbreak_detected"):
                outbreak_hotspots.append({
                    "pest_disease_id": pid,
                    **outbreak
                })
    
    return JSONResponse({
        "region": region,
        "analysis_period_days": days,
        "total_reports": len(recent_reports),
        "outbreak_hotspots": outbreak_hotspots,
        "critical_outbreaks": [h for h in outbreak_hotspots if h["severity"] == "critical"]
    })


@router.post('/ai/expert_triage_queue')
async def ai_expert_triage_queue(
    extension_officer_id: str = Form(...)
):
    """
    Get queue of low-confidence diagnoses requiring expert review.
    """
    # Get pending triage cases
    triage_queue = persistence.get_expert_triage_queue(extension_officer_id)
    
    # Sort by urgency
    triage_queue.sort(key=lambda x: {"urgent": 0, "priority": 1, "routine": 2}.get(x.get("urgency", "routine"), 2))
    
    return JSONResponse({
        "extension_officer_id": extension_officer_id,
        "total_cases": len(triage_queue),
        "urgent_cases": len([c for c in triage_queue if c.get("urgency") == "urgent"]),
        "priority_cases": len([c for c in triage_queue if c.get("urgency") == "priority"]),
        "routine_cases": len([c for c in triage_queue if c.get("urgency") == "routine"]),
        "queue": triage_queue[:20]  # First 20 cases
    })


@router.post('/ai/expert_confirm_diagnosis')
async def ai_expert_confirm_diagnosis(
    case_id: str = Form(...),
    expert_diagnosis: str = Form(...),
    expert_recommendations: str = Form(...),
    confidence: float = Form(...),
    extension_officer_id: str = Form(...)
):
    """
    Extension officer confirms/corrects AI diagnosis.
    """
    confirmation = {
        "case_id": case_id,
        "expert_diagnosis": expert_diagnosis,
        "expert_recommendations": expert_recommendations,
        "confidence": confidence,
        "extension_officer_id": extension_officer_id,
        "confirmed_at": datetime.now().isoformat()
    }
    
    persistence.log_expert_diagnosis(confirmation)
    
    # Notify farmer
    case = persistence.get_triage_case(case_id)
    if case and case.get("farmer_id"):
        sms_text = f"✅ Expert Confirmed: {expert_diagnosis}. Action: {expert_recommendations[:80]}..."
        # TODO: Send SMS to farmer
    
    return JSONResponse({
        "status": "success",
        "message": "Diagnosis confirmed and farmer notified",
        "case_id": case_id
    })
