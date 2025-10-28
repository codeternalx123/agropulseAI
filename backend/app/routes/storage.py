from fastapi import APIRouter, Form, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from app.services import persistence, advice, sms_provider
from app.services.ai_storage_intelligence import (
    analyze_storage_conditions_with_ai,
    prioritize_storage_alert,
    generate_ai_remediation_strategy,
    recommend_storage_strategy_at_harvest
)
from datetime import datetime

router = APIRouter()


# ============================================================================
# AI STORAGE ALERT FORMATTING
# ============================================================================

def _format_ai_storage_alert(crop: str, risk_analysis: dict, remediation: dict, lang: str = 'en') -> str:
    """
    Format AI-powered storage alert with emoji-rich, actionable advice.
    
    Args:
        crop: Crop type
        risk_analysis: Output from analyze_storage_conditions_with_ai()
        remediation: Output from generate_ai_remediation_strategy()
        lang: Language ('en' or 'sw')
    
    Returns:
        Formatted SMS message (160 chars max)
    """
    urgency = remediation.get('urgency_emoji', '⚠️')
    risk_category = risk_analysis['risk_category'].upper()
    days_to_critical = risk_analysis['days_to_critical']
    predicted_loss = risk_analysis['predicted_loss_kes']
    primary_action = remediation['primary_action']
    optimal_time = remediation.get('optimal_action_time', 'Now')
    
    if lang == 'sw':
        # Swahili message
        if risk_category == 'CRITICAL':
            msg = f"{urgency} HATARI! {crop.title()}: Kuoza kwa siku {days_to_critical}. "
        elif risk_category == 'HIGH':
            msg = f"{urgency} TAHADHARI! {crop.title()}: Hatari ya kuoza. "
        else:
            msg = f"{urgency} {crop.title()}: Angalia hali. "
        
        # Add action
        if 'Ventilate' in primary_action or 'ventilate' in primary_action:
            msg += f"Fungua milango: {optimal_time}. "
        elif 'pest' in primary_action.lower():
            msg += f"Wadudu wanakuja: Tumia dawa asili. "
        
        # Add loss estimate
        if predicted_loss > 1000:
            msg += f"Hasara: {predicted_loss} KES."
    else:
        # English message
        if risk_category == 'CRITICAL':
            msg = f"{urgency} CRITICAL! {crop.title()}: Spoilage in {days_to_critical} days. "
        elif risk_category == 'HIGH':
            msg = f"{urgency} WARNING! {crop.title()}: High spoilage risk. "
        else:
            msg = f"{urgency} {crop.title()}: Monitor conditions. "
        
        # Add action
        msg += f"{primary_action}. "
        
        # Add optimal time if specified
        if optimal_time != 'Now':
            msg += f"Best time: {optimal_time}. "
        
        # Add loss estimate
        if predicted_loss > 1000:
            msg += f"Potential loss: {predicted_loss} KES."
    
    # Truncate to 160 chars (SMS limit)
    return msg[:160]


class Reading(BaseModel):
    ts: Optional[str] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class UploadPayload(BaseModel):
    farmer_id: str
    sensor_id: str
    readings: List[Reading]
    phone_number: Optional[str] = None
    crop: Optional[str] = None
    language: Optional[str] = 'en'


@router.post('/assess')
async def assess(temperature: float = Form(...), humidity: float = Form(...)):
    advice_list = []
    safe = True
    if temperature > 35 or humidity > 70:
        advice_list.append('High temp/humidity: ventilate')
        safe = False
    pest_risk = humidity > 80
    return JSONResponse({'safe_for_storage': safe, 'advice': advice_list, 'pest_risk': pest_risk})


@router.get('/crop_profiles')
async def get_crop_profiles():
    profiles = persistence.load_crop_profiles()
    return JSONResponse(profiles)


@router.post('/crop_profiles')
async def update_crop_profiles(profiles: dict = Body(...)):
    # simple admin endpoint to upload profiles
    persistence.save_crop_profiles(profiles)
    return JSONResponse({'saved': True})


@router.post('/ble/upload')
async def ble_upload(payload: UploadPayload):
    # persist readings
    readings = [r.dict() for r in payload.readings]
    persistence.append_readings(payload.sensor_id, readings)

    # evaluate latest reading
    last = readings[-1] if readings else None
    crop = payload.crop or persistence.get_farmer_settings(payload.farmer_id).get('crop', 'maize')
    lang = payload.language or persistence.get_farmer_settings(payload.farmer_id).get('language', 'en')
    phone = payload.phone_number or persistence.get_farmer_settings(payload.farmer_id).get('phone')

    result = None
    sms_text = None
    sent = False
    ai_analysis = None
    
    if last:
        # Traditional evaluation (backward compatible)
        level, details = advice.evaluate_reading(crop, last.get('temperature'), last.get('humidity'))
        
        # AI-POWERED ANALYSIS (NEW!)
        # Get storage metadata
        storage_data = persistence.get_storage_metadata(payload.sensor_id)
        stored_quantity = storage_data.get('quantity_kg', 100)
        harvest_moisture = storage_data.get('harvest_moisture', None)
        days_in_storage = storage_data.get('days_in_storage', 0)
        
        # Get sensor history (last 24 hours for trend analysis)
        sensor_history = persistence.get_readings(payload.sensor_id, limit=24)
        
        # AI Analysis
        ai_analysis = analyze_storage_conditions_with_ai(
            crop=crop,
            temp_c=last.get('temperature'),
            humidity_pct=last.get('humidity'),
            stored_quantity_kg=stored_quantity,
            harvest_moisture_content=harvest_moisture,
            days_in_storage=days_in_storage,
            sensor_history=sensor_history
        )
        
        # Smart Alert Prioritization
        farmer_alert_history = persistence.get_farmer_alert_history(payload.farmer_id)
        current_hour = datetime.now().hour
        
        alert_priority = prioritize_storage_alert(
            risk_analysis=ai_analysis,
            farmer_alert_history=farmer_alert_history,
            time_of_day=current_hour
        )
        
        # AI-Optimized Remediation Strategy
        # Get outdoor weather (if available from climate engine)
        outdoor_weather = persistence.get_current_weather(last.get('lat'), last.get('lon'))
        storage_method = storage_data.get('storage_method', 'traditional_crib')
        
        remediation = generate_ai_remediation_strategy(
            risk_analysis=ai_analysis,
            crop=crop,
            outdoor_weather=outdoor_weather,
            time_of_day=current_hour,
            storage_method=storage_method
        )
        
        # Generate AI-enhanced SMS message
        if ai_analysis['risk_category'] in ['high', 'critical']:
            sms_text = _format_ai_storage_alert(
                crop=crop,
                risk_analysis=ai_analysis,
                remediation=remediation,
                lang=lang
            )
        else:
            # Use traditional message for low risk
            sms_text = advice.format_message(level, crop, lang, **details)
        
        # Log alert with AI data
        alert = {
            'farmer_id': payload.farmer_id,
            'sensor_id': payload.sensor_id,
            'level': alert_priority['priority'],  # Use AI priority
            'details': details,
            'message': sms_text,
            'ai_analysis': ai_analysis,
            'ai_priority': alert_priority,
            'ai_remediation': remediation,
            'ts': datetime.utcnow().isoformat(),
        }
        persistence.log_alert(alert)

        # Send SMS based on AI priority
        if phone and alert_priority['send_immediately']:
            sent = sms_provider.send_sms(phone, sms_text, attempt_gateway=True)

        result = {
            'level': alert_priority['priority'],
            'details': details,
            'ai_analysis': ai_analysis,
            'ai_remediation': remediation,
            'alert_priority': alert_priority
        }

    return JSONResponse({
        'result': result,
        'sms_text': sms_text,
        'sent_via_gateway': sent,
        'ai_enabled': ai_analysis is not None
    })


@router.get('/history')
async def history(sensor_id: str, limit: int = 100):
    arr = persistence.get_readings(sensor_id, limit)
    return JSONResponse({'sensor_id': sensor_id, 'readings': arr})


@router.post('/select_crop')
async def select_crop(farmer_id: str = Form(...), crop: str = Form(...), language: str = Form('en'), phone: Optional[str] = Form(None)):
    settings = {'crop': crop, 'language': language}
    if phone:
        settings['phone'] = phone
    persistence.set_farmer_settings(farmer_id, settings)
    return JSONResponse({'saved': True, 'settings': settings})


@router.post('/trigger_check')
async def trigger_check(farmer_id: str = Form(...), sensor_id: str = Form(...)):
    readings = persistence.get_readings(sensor_id, limit=1)
    if not readings:
        return JSONResponse({'error': 'no_readings'})
    last = readings[-1]
    settings = persistence.get_farmer_settings(farmer_id)
    crop = settings.get('crop', 'maize')
    lang = settings.get('language', 'en')
    phone = settings.get('phone')
    level, details = advice.evaluate_reading(crop, last.get('temperature'), last.get('humidity'))
    sms_text = advice.format_message(level, crop, lang, **details)
    persistence.log_alert({'farmer_id': farmer_id, 'sensor_id': sensor_id, 'level': level, 'details': details, 'message': sms_text, 'ts': datetime.utcnow().isoformat()})
    sent = False
    if phone:
        sent = sms_provider.send_sms(phone, sms_text, attempt_gateway=True)
    return JSONResponse({'level': level, 'message': sms_text, 'sent_via_gateway': sent})


# ============================================================================
# AI-ENHANCED STORAGE ENDPOINTS
# ============================================================================

@router.post('/ai/analyze')
async def ai_analyze_storage(
    sensor_id: str = Form(...),
    crop: str = Form(...),
    stored_quantity_kg: float = Form(100),
    harvest_moisture_content: Optional[float] = Form(None),
    days_in_storage: int = Form(0)
):
    """
    AI-powered storage condition analysis.
    Returns predictive spoilage modeling, days to critical risk, pest emergence predictions.
    """
    # Get latest reading
    readings = persistence.get_readings(sensor_id, limit=24)
    if not readings:
        return JSONResponse({'error': 'no_readings'})
    
    last = readings[-1]
    
    # AI Analysis
    ai_analysis = analyze_storage_conditions_with_ai(
        crop=crop,
        temp_c=last.get('temperature'),
        humidity_pct=last.get('humidity'),
        stored_quantity_kg=stored_quantity_kg,
        harvest_moisture_content=harvest_moisture_content,
        days_in_storage=days_in_storage,
        sensor_history=readings
    )
    
    return JSONResponse(ai_analysis)


@router.post('/ai/remediation')
async def ai_get_remediation(
    sensor_id: str = Form(...),
    crop: str = Form(...),
    storage_method: str = Form('traditional_crib'),
    lat: Optional[float] = Form(None),
    lon: Optional[float] = Form(None)
):
    """
    Get AI-optimized remediation strategy with weather-aware advice.
    """
    # Get latest reading
    readings = persistence.get_readings(sensor_id, limit=1)
    if not readings:
        return JSONResponse({'error': 'no_readings'})
    
    last = readings[-1]
    
    # Get storage metadata
    storage_data = persistence.get_storage_metadata(sensor_id)
    stored_quantity = storage_data.get('quantity_kg', 100)
    harvest_moisture = storage_data.get('harvest_moisture', None)
    days_in_storage = storage_data.get('days_in_storage', 0)
    
    # AI Analysis
    ai_analysis = analyze_storage_conditions_with_ai(
        crop=crop,
        temp_c=last.get('temperature'),
        humidity_pct=last.get('humidity'),
        stored_quantity_kg=stored_quantity,
        harvest_moisture_content=harvest_moisture,
        days_in_storage=days_in_storage
    )
    
    # Get outdoor weather
    outdoor_weather = persistence.get_current_weather(lat or last.get('lat'), lon or last.get('lon'))
    current_hour = datetime.now().hour
    
    # Generate remediation strategy
    remediation = generate_ai_remediation_strategy(
        risk_analysis=ai_analysis,
        crop=crop,
        outdoor_weather=outdoor_weather,
        time_of_day=current_hour,
        storage_method=storage_method
    )
    
    return JSONResponse(remediation)


@router.post('/ai/storage_strategy')
async def ai_recommend_storage_strategy(
    crop: str = Form(...),
    harvest_quantity_kg: float = Form(...),
    harvest_moisture_content: float = Form(...),
    harvest_quality: str = Form('good'),  # excellent, good, fair, poor
    lcrs_forecast: dict = Body(...),  # From climate engine
    farmer_budget: Optional[int] = Form(None)
):
    """
    AI-based storage method recommendation at harvest.
    Recommends PICS bags vs traditional crib vs metal silo based on harvest quality and forecast.
    """
    recommendation = recommend_storage_strategy_at_harvest(
        crop=crop,
        harvest_quantity_kg=harvest_quantity_kg,
        harvest_moisture_content=harvest_moisture_content,
        harvest_quality=harvest_quality,
        lcrs_forecast=lcrs_forecast,
        farmer_budget=farmer_budget
    )
    
    return JSONResponse(recommendation)


@router.get('/ai/pest_prediction')
async def ai_predict_pest_emergence(
    sensor_id: str,
    crop: str,
    days_in_storage: int = 0
):
    """
    Predict stored product pest emergence (weevils, moths, beetles).
    Returns days to adult emergence and recommended preventative actions.
    """
    # Get temperature history (last 7 days)
    readings = persistence.get_readings(sensor_id, limit=168)  # 7 days * 24 hours
    if not readings:
        return JSONResponse({'error': 'no_readings'})
    
    # Calculate average temperature
    avg_temp = sum(r.get('temperature', 20) for r in readings) / len(readings)
    
    # Get storage metadata
    storage_data = persistence.get_storage_metadata(sensor_id)
    stored_quantity = storage_data.get('quantity_kg', 100)
    
    # AI Analysis
    ai_analysis = analyze_storage_conditions_with_ai(
        crop=crop,
        temp_c=avg_temp,
        humidity_pct=readings[-1].get('humidity', 60),
        stored_quantity_kg=stored_quantity,
        days_in_storage=days_in_storage,
        sensor_history=readings
    )
    
    return JSONResponse({
        'pest_risk': ai_analysis['pest_risk'],
        'active_threats': ai_analysis['pest_risk']['active_threats'],
        'recommendations': 'Apply organic pesticide or PICS bags before emergence' if ai_analysis['pest_risk']['total_pests'] > 0 else 'Continue monitoring'
    })


@router.get('/ai/spoilage_graph')
async def ai_get_spoilage_risk_graph(
    sensor_id: str,
    crop: str,
    hours: int = 48  # Last 48 hours
):
    """
    Get spoilage risk trend graph data (color-coded risk levels over time).
    Returns: [{timestamp, risk_score, risk_category, temp, humidity}, ...]
    """
    readings = persistence.get_readings(sensor_id, limit=hours)
    if not readings:
        return JSONResponse({'error': 'no_readings'})
    
    # Get storage metadata
    storage_data = persistence.get_storage_metadata(sensor_id)
    stored_quantity = storage_data.get('quantity_kg', 100)
    
    graph_data = []
    for reading in readings:
        # Quick AI analysis for each reading
        analysis = analyze_storage_conditions_with_ai(
            crop=crop,
            temp_c=reading.get('temperature'),
            humidity_pct=reading.get('humidity'),
            stored_quantity_kg=stored_quantity
        )
        
        graph_data.append({
            'timestamp': reading.get('ts'),
            'risk_score': analysis['current_risk_score'],
            'risk_category': analysis['risk_category'],
            'temp': reading.get('temperature'),
            'humidity': reading.get('humidity'),
            'predicted_loss_kes': analysis['predicted_loss_kes']
        })
    
    return JSONResponse({
        'sensor_id': sensor_id,
        'crop': crop,
        'data': graph_data,
        'current_trend': graph_data[-1]['risk_category'] if graph_data else 'unknown'
    })
