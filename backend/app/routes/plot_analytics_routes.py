"""
Plot Analytics API Routes
Multi-image upload, AI predictions, fertilizer recommendations, disease tracking
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import json
import os
from uuid import UUID

from app.services.plot_analytics_ai import plot_analytics_ai
from app.services.supabase_auth import supabase_admin
# from app.services.weather_service import get_weather_data  # TODO: Add when available

router = APIRouter(prefix="/plot-analytics", tags=["Plot Analytics"])

UPLOAD_DIR = "uploads/plot_datasets"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload-images")
async def upload_plot_images(
    plot_id: str = Form(...),
    user_id: str = Form(...),
    files: List[UploadFile] = File(...),
    data_category: str = Form("whole_plant"),  # leaf, stem, fruit, soil, whole_plant
    growth_stage: str = Form("vegetative"),
    gps_location: Optional[str] = Form(None),  # JSON string
    weather_conditions: Optional[str] = Form(None),  # JSON string
    analyze_immediately: bool = Form(True)
):
    """
    Upload multiple images for a plot and optionally analyze them
    
    Args:
        plot_id: UUID of the plot
        user_id: UUID of the user
        files: List of image files
        data_category: Type of images (leaf, stem, etc.)
        growth_stage: Current growth stage
        gps_location: GPS coordinates as JSON
        weather_conditions: Weather data as JSON
        analyze_immediately: Whether to run AI analysis right away
    """
    try:
        supabase = supabase_admin
        uploaded_files = []
        analysis_results = []
        
        # Parse JSON strings
        gps_data = json.loads(gps_location) if gps_location else None
        weather_data = json.loads(weather_conditions) if weather_conditions else None
        
        # Get weather if not provided (commented out until weather_service is available)
        # if not weather_data and gps_data:
        #     weather_data = await get_weather_data(gps_data['lat'], gps_data['lng'])
        
        for file in files:
            # Save file
            file_path = os.path.join(UPLOAD_DIR, f"{plot_id}_{datetime.now().timestamp()}_{file.filename}")
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            # Create database record
            dataset_record = {
                'plot_id': plot_id,
                'user_id': user_id,
                'file_url': file_path,
                'file_type': 'image',
                'data_category': data_category,
                'growth_stage': growth_stage,
                'gps_location': gps_data,
                'weather_conditions': weather_data,
                'analyzed': False,
                'captured_at': datetime.utcnow().isoformat(),
                'uploaded_at': datetime.utcnow().isoformat()
            }
            
            # Analyze if requested
            if analyze_immediately:
                metadata = {
                    'gps_location': gps_data,
                    'weather_conditions': weather_data,
                    'growth_stage': growth_stage
                }
                
                analysis = await plot_analytics_ai.analyze_image(content, metadata)
                
                dataset_record['analyzed'] = True
                dataset_record['analysis_results'] = analysis
                dataset_record['confidence_score'] = analysis.get('confidence_score', 0.5)
                dataset_record['health_status'] = 'healthy' if analysis.get('health_scores', {}).get('overall_health_score', 50) > 70 else 'stressed'
                
                # Store predictions
                if analysis.get('diseases') and len(analysis['diseases']) > 0:
                    await _store_predictions(
                        supabase, 
                        plot_id, 
                        user_id,
                        analysis['diseases'],
                        analysis.get('health_scores', {})
                    )
                
                # Update health metrics
                await _update_health_metrics(
                    supabase,
                    plot_id,
                    user_id,
                    analysis.get('health_scores', {}),
                    analysis.get('stress_indicators', {})
                )
                
                analysis_results.append(analysis)
            
            # Insert dataset record
            result = supabase.table('plot_datasets').insert(dataset_record).execute()
            uploaded_files.append({
                'filename': file.filename,
                'file_path': file_path,
                'id': result.data[0]['id'] if result.data else None
            })
        
        return {
            'success': True,
            'message': f'Successfully uploaded {len(files)} images',
            'uploaded_files': uploaded_files,
            'analysis_results': analysis_results if analyze_immediately else [],
            'total_images': len(files)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading images: {str(e)}")


@router.get("/plots/{plot_id}/analytics")
async def get_plot_analytics(plot_id: str):
    """
    Get comprehensive analytics for a plot including health, diseases, predictions
    """
    try:
        supabase = supabase_admin
        
        # Use the SQL function
        result = supabase.rpc('get_plot_analytics', {'plot_uuid': plot_id}).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Plot not found")
        
        return {
            'success': True,
            'analytics': result.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analytics: {str(e)}")


@router.get("/plots/{plot_id}/health-history")
async def get_health_history(
    plot_id: str,
    days: int = 30
):
    """Get health metrics history for trend analysis"""
    try:
        supabase = supabase_admin
        
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        result = supabase.table('crop_health_metrics')\
            .select('*')\
            .eq('plot_id', plot_id)\
            .gte('measured_at', start_date)\
            .order('measured_at', desc=False)\
            .execute()
        
        return {
            'success': True,
            'history': result.data,
            'count': len(result.data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching health history: {str(e)}")


@router.post("/plots/{plot_id}/fertilizer-recommendation")
async def get_fertilizer_recommendation(
    plot_id: str,
    user_id: str = Form(...),
    area_size: float = Form(...),  # hectares
    budget: Optional[float] = Form(None),
    soil_nitrogen: Optional[float] = Form(0),
    soil_phosphorus: Optional[float] = Form(0),
    soil_potassium: Optional[float] = Form(0)
):
    """
    Get fertilizer recommendations comparing organic vs inorganic options
    """
    try:
        supabase = supabase_admin
        
        # Get plot info
        plot_result = supabase.table('digital_plots')\
            .select('crop_name')\
            .eq('id', plot_id)\
            .single()\
            .execute()
        
        if not plot_result.data:
            raise HTTPException(status_code=404, detail="Plot not found")
        
        crop_type = plot_result.data['crop_name']
        
        # Get recommendations from AI
        soil_data = {
            'nitrogen': soil_nitrogen,
            'phosphorus': soil_phosphorus,
            'potassium': soil_potassium
        }
        
        recommendations = await plot_analytics_ai.recommend_fertilizers(
            soil_data=soil_data,
            crop_type=crop_type,
            area_size=area_size,
            budget=budget
        )
        
        # Store in database
        db_record = {
            'plot_id': plot_id,
            'user_id': user_id,
            'nitrogen_needed': recommendations['nitrogen_needed'],
            'phosphorus_needed': recommendations['phosphorus_needed'],
            'potassium_needed': recommendations['potassium_needed'],
            'organic_options': recommendations['organic_options'],
            'organic_total_cost': recommendations['organic_total_cost'],
            'organic_effectiveness_score': recommendations['organic_effectiveness_score'],
            'inorganic_options': recommendations['inorganic_options'],
            'inorganic_total_cost': recommendations['inorganic_total_cost'],
            'inorganic_effectiveness_score': recommendations['inorganic_effectiveness_score'],
            'cost_difference': recommendations['cost_difference'],
            'recommended_method': recommendations['recommended_method'],
            'reasoning': recommendations['reasoning'],
            'application_schedule': recommendations['application_schedule'],
            'expected_results': recommendations['expected_results'],
            'local_suppliers': recommendations['local_suppliers'],
            'valid_until': (datetime.utcnow() + timedelta(days=90)).isoformat()
        }
        
        result = supabase.table('fertilizer_recommendations').insert(db_record).execute()
        
        return {
            'success': True,
            'recommendations': recommendations,
            'recommendation_id': result.data[0]['id'] if result.data else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")


@router.get("/plots/{plot_id}/disease-timeline")
async def get_disease_timeline(plot_id: str):
    """Get disease detection and treatment timeline"""
    try:
        supabase = supabase_admin
        
        result = supabase.table('disease_timeline')\
            .select('*')\
            .eq('plot_id', plot_id)\
            .order('detection_date', desc=True)\
            .execute()
        
        return {
            'success': True,
            'diseases': result.data,
            'active_diseases': [d for d in result.data if not d.get('resolution_date')],
            'resolved_diseases': [d for d in result.data if d.get('resolution_date')]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching disease timeline: {str(e)}")


@router.post("/plots/{plot_id}/predict-disease-progression")
async def predict_disease_progression(
    plot_id: str,
    disease_name: str = Form(...),
    current_severity: str = Form("medium")
):
    """Predict how a disease will progress based on weather and conditions"""
    try:
        supabase = supabase_admin
        
        # Get plot location for weather forecast
        plot_result = supabase.table('digital_plots')\
            .select('gps_location, crop_name')\
            .eq('id', plot_id)\
            .single()\
            .execute()
        
        if not plot_result.data:
            raise HTTPException(status_code=404, detail="Plot not found")
        
        # Get weather forecast (mock for now)
        weather_forecast = [
            {'temp': 28, 'humidity': 75, 'rainfall': 10},
            {'temp': 29, 'humidity': 80, 'rainfall': 15},
            {'temp': 27, 'humidity': 78, 'rainfall': 5},
            {'temp': 30, 'humidity': 82, 'rainfall': 20},
            {'temp': 28, 'humidity': 76, 'rainfall': 8},
            {'temp': 29, 'humidity': 79, 'rainfall': 12},
            {'temp': 27, 'humidity': 74, 'rainfall': 7}
        ]
        
        current_disease = {
            'name': disease_name,
            'severity': current_severity
        }
        
        prediction = await plot_analytics_ai.predict_disease_progression(
            current_disease=current_disease,
            weather_forecast=weather_forecast,
            crop_type=plot_result.data['crop_name']
        )
        
        return {
            'success': True,
            'prediction': prediction,
            'disease_name': disease_name,
            'current_severity': current_severity
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting progression: {str(e)}")


@router.post("/plots/{plot_id}/weather-impact-analysis")
async def analyze_weather_impact(
    plot_id: str,
    growth_stage: str = Form("vegetative")
):
    """Analyze weather impact on crop health"""
    try:
        supabase = supabase_admin
        
        # Get plot info
        plot_result = supabase.table('digital_plots')\
            .select('gps_location, crop_name')\
            .eq('id', plot_id)\
            .single()\
            .execute()
        
        if not plot_result.data:
            raise HTTPException(status_code=404, detail="Plot not found")
        
        # Get current weather and forecast (mock)
        current_weather = {'temp': 28, 'humidity': 75, 'rainfall': 10}
        forecast = [
            {'temp': 29, 'humidity': 80, 'rainfall': 15},
            {'temp': 27, 'humidity': 78, 'rainfall': 5},
            {'temp': 30, 'humidity': 82, 'rainfall': 20},
            {'temp': 28, 'humidity': 76, 'rainfall': 8},
            {'temp': 29, 'humidity': 79, 'rainfall': 12},
            {'temp': 27, 'humidity': 74, 'rainfall': 7},
            {'temp': 28, 'humidity': 77, 'rainfall': 9}
        ]
        
        analysis = await plot_analytics_ai.analyze_weather_impact(
            current_weather=current_weather,
            forecast=forecast,
            crop_type=plot_result.data['crop_name'],
            growth_stage=growth_stage
        )
        
        # Store in database
        db_record = {
            'plot_id': plot_id,
            'user_id': plot_result.data.get('user_id'),  # Add user_id to select
            'current_conditions': analysis['current_conditions'],
            'stress_factors': analysis['stress_factors'],
            'optimal_variance': analysis['optimal_variance'],
            'forecast_data': analysis['forecast_data'],
            'risk_periods': analysis['risk_periods'],
            'disease_risk_score': analysis['disease_risk_score'],
            'favorable_diseases': analysis['favorable_diseases'],
            'weather_adjustments': analysis['weather_adjustments'],
            'protective_measures': analysis['protective_measures']
        }
        
        # Note: Need to add user_id to plot query above
        if 'user_id' in plot_result.data:
            result = supabase.table('weather_analysis').insert(db_record).execute()
        
        return {
            'success': True,
            'analysis': analysis
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing weather impact: {str(e)}")


@router.get("/plots/{plot_id}/datasets")
async def get_plot_datasets(
    plot_id: str,
    limit: int = 50,
    analyzed_only: bool = False
):
    """Get all uploaded images/datasets for a plot"""
    try:
        supabase = supabase_admin
        
        query = supabase.table('plot_datasets')\
            .select('*')\
            .eq('plot_id', plot_id)\
            .order('captured_at', desc=True)\
            .limit(limit)
        
        if analyzed_only:
            query = query.eq('analyzed', True)
        
        result = query.execute()
        
        return {
            'success': True,
            'datasets': result.data,
            'count': len(result.data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching datasets: {str(e)}")


@router.post("/plots/{plot_id}/update-disease-status")
async def update_disease_status(
    plot_id: str,
    disease_timeline_id: str = Form(...),
    new_severity: Optional[str] = Form(None),
    treatment_applied: Optional[str] = Form(None),  # JSON string
    is_resolved: bool = Form(False),
    notes: Optional[str] = Form(None)
):
    """Update disease treatment and progression"""
    try:
        supabase = supabase_admin
        
        update_data = {
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if new_severity:
            update_data['current_severity'] = new_severity
            
            # Add to progression history
            timeline = supabase.table('disease_timeline')\
                .select('progression_history')\
                .eq('id', disease_timeline_id)\
                .single()\
                .execute()
            
            history = timeline.data.get('progression_history', [])
            history.append({
                'date': datetime.utcnow().isoformat(),
                'severity': new_severity,
                'area_affected': 0  # Could be provided as parameter
            })
            update_data['progression_history'] = history
        
        if treatment_applied:
            treatment_data = json.loads(treatment_applied)
            timeline = supabase.table('disease_timeline')\
                .select('treatments_applied')\
                .eq('id', disease_timeline_id)\
                .single()\
                .execute()
            
            treatments = timeline.data.get('treatments_applied', [])
            treatment_data['date'] = datetime.utcnow().isoformat()
            treatments.append(treatment_data)
            update_data['treatments_applied'] = treatments
        
        if is_resolved:
            update_data['resolution_date'] = datetime.utcnow().isoformat()
            update_data['current_severity'] = 'resolved'
        
        if notes:
            update_data['notes'] = notes
        
        result = supabase.table('disease_timeline')\
            .update(update_data)\
            .eq('id', disease_timeline_id)\
            .execute()
        
        return {
            'success': True,
            'message': 'Disease timeline updated',
            'updated': result.data[0] if result.data else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating disease status: {str(e)}")


# Helper functions

async def _store_predictions(supabase, plot_id: str, user_id: str, diseases: List[Dict], health_scores: Dict):
    """Store AI predictions in database"""
    for disease in diseases:
        prediction_record = {
            'plot_id': plot_id,
            'user_id': user_id,
            'prediction_type': 'disease',
            'disease_name': disease['name'],
            'disease_severity': disease['severity'],
            'affected_area_percentage': 0,  # Would come from image analysis
            'confidence_score': disease['confidence'],
            'risk_level': disease['severity'],
            'treatment_recommendations': [
                {'method': rec, 'cost': 'TBD', 'effectiveness': 0.8}
                for rec in disease.get('likely_cause', '').split(',')
            ],
            'preventive_measures': disease.get('symptoms', []),
            'model_version': '1.0',
            'prediction_date': datetime.utcnow().isoformat()
        }
        
        supabase.table('ai_predictions').insert(prediction_record).execute()


async def _update_health_metrics(supabase, plot_id: str, user_id: str, health_scores: Dict, stress_indicators: Dict):
    """Update crop health metrics"""
    health_record = {
        'plot_id': plot_id,
        'user_id': user_id,
        'overall_health_score': health_scores.get('overall_health_score', 50),
        'leaf_health_score': health_scores.get('leaf_health_score', 50),
        'stem_health_score': health_scores.get('stem_health_score', 50),
        'vigor_index': health_scores.get('vigor_index', 0.5),
        'stress_indicators': stress_indicators,
        'weather_stress_score': health_scores.get('weather_stress_score', 0),
        'vs_optimal_percentage': health_scores.get('vs_optimal_percentage', 50),
        'measured_at': datetime.utcnow().isoformat()
    }
    
    supabase.table('crop_health_metrics').insert(health_record).execute()
