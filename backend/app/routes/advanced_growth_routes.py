"""
Advanced Growth Tracking API Routes
Comprehensive plant growth monitoring with AI analysis
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uuid
import os
from pathlib import Path

from app.services.advanced_growth_tracking import AdvancedGrowthTrackingService
from app.services.supabase_auth import supabase_admin

router = APIRouter()

# Test endpoint to verify routes are working
@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify routes are registered"""
    return {
        "success": True,
        "message": "Advanced growth routes are working!",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/db-test")
async def test_database():
    """Test database connection and table existence"""
    try:
        from app.services.supabase_auth import supabase_admin
        
        # Test 1: Can we connect?
        test_query = supabase_admin.table('digital_plots').select('id').limit(1).execute()
        
        # Test 2: Count plots
        count_query = supabase_admin.table('digital_plots').select('id', count='exact').execute()
        
        return {
            "success": True,
            "message": "Database connection working",
            "table_exists": True,
            "total_plots": count_query.count if hasattr(count_query, 'count') else "unknown",
            "can_query": test_query.data is not None
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "message": "Database connection failed - table may not exist"
        }

# Ensure uploads directory exists
UPLOAD_DIR = Path("uploads/plots")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================
# REQUEST/RESPONSE MODELS
# ============================================================

class LocationModel(BaseModel):
    latitude: float
    longitude: float

class CreatePlotRequest(BaseModel):
    crop_name: str
    plot_name: str
    initial_image_url: str
    planting_date: str  # ISO format
    location: LocationModel
    soil_image_url: Optional[str] = None
    area_size: Optional[float] = None
    notes: Optional[str] = None

class CreateGrowthLogRequest(BaseModel):
    plot_id: str
    image_urls: List[str]
    log_type: str = "regular_checkin"  # initial_setup, regular_checkin, milestone, harvest
    notes: Optional[str] = None

class DiagnosePestDiseaseRequest(BaseModel):
    plot_id: str
    image_url: str
    location: LocationModel

class ManualPlotCreationRequest(BaseModel):
    crop_name: str
    plot_name: str
    planting_date: str  # ISO format
    latitude: float
    longitude: float
    area_size: Optional[float] = None
    notes: Optional[str] = None
    soil_type: Optional[str] = None

# ============================================================
# IMAGE UPLOAD ENDPOINTS
# ============================================================

@router.post("/upload/plot-image")
async def upload_plot_image(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    plot_id: str = Form(...),
    image_type: str = Form("initial")  # initial, progress, soil, pest, harvest
):
    """
    Upload plot image (initial, progress, soil, pest, or harvest photo)
    
    Automatically:
    1. Saves image to disk
    2. Stores record in plot_images table
    3. Triggers AI analysis based on image type
    4. Updates image record with AI analysis results
    
    Returns URL to uploaded image with AI analysis data
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"{user_id}_{uuid.uuid4()}.{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Return URL with proper base URL
        # Use environment variable or default to DigitalOcean URL
        base_url = os.getenv('API_BASE_URL', 'https://urchin-app-86rjy.ondigitalocean.app')
        image_url = f"{base_url}/uploads/plots/{unique_filename}"
        
        print(f"📸 Image uploaded: {image_url}")
        print(f"📍 Plot ID: {plot_id}, User ID: {user_id}, Type: {image_type}")
        
        # Initialize AI analysis data
        ai_analysis = {}
        
        # Run AI analysis based on image type
        if image_type == "soil":
            try:
                from ..services.soil_health_ai import soil_analyzer
                
                print(f"🔬 Running AI soil health analysis on: {image_url}")
                
                # Analyze soil image with trained AI model
                soil_analysis = await soil_analyzer.analyze_soil_image(image_url)
                
                ai_analysis["soil_health"] = {
                    "fertility_score": soil_analysis['fertility_score'],
                    "soil_type": soil_analysis['soil_type'],
                    "texture": soil_analysis['texture'],
                    "ph_estimate": soil_analysis['ph_estimate'],
                    "moisture_level": soil_analysis['moisture_level'],
                    "organic_matter": soil_analysis['organic_matter_estimate'],
                    "nutrients": {
                        "nitrogen": soil_analysis['nutrients']['nitrogen']['level'],
                        "nitrogen_score": soil_analysis['nutrients']['nitrogen']['score'],
                        "nitrogen_percentage": soil_analysis['nutrients']['nitrogen'].get('percentage', 'N/A'),
                        "phosphorus": soil_analysis['nutrients']['phosphorus']['level'],
                        "phosphorus_score": soil_analysis['nutrients']['phosphorus']['score'],
                        "phosphorus_percentage": soil_analysis['nutrients']['phosphorus'].get('percentage', 'N/A'),
                        "potassium": soil_analysis['nutrients']['potassium']['level'],
                        "potassium_score": soil_analysis['nutrients']['potassium']['score'],
                        "potassium_percentage": soil_analysis['nutrients']['potassium'].get('percentage', 'N/A')
                    },
                    "color_analysis": soil_analysis.get('color_analysis', {}),
                    "recommendations": soil_analysis.get('recommendations', [])
                }
                
                print(f"✅ Soil analysis complete: Fertility {soil_analysis['fertility_score']}/10, Type: {soil_analysis['soil_type']}")
                
            except Exception as soil_error:
                print(f"⚠️ Soil analysis error: {soil_error}")
                ai_analysis["soil_health"] = {"error": str(soil_error)}
        
        elif image_type in ["progress", "pest", "initial"]:
            # For crop health/pest detection
            try:
                from ..services.pest_disease_ai import pest_disease_detector
                
                print(f"🐛 Running AI pest/disease detection on: {image_url}")
                
                # Get plot details for crop type
                supabase = supabase_admin
                plot_data = supabase.table('digital_plots').select('crop_type').eq('id', plot_id).single().execute()
                crop_type = plot_data.data.get('crop_type', 'unknown') if plot_data.data else 'unknown'
                
                # Analyze crop health image
                pest_analysis = await pest_disease_detector.analyze_crop_image(image_url, crop_type)
                
                ai_analysis["pest_disease_scan"] = {
                    "health_status": pest_analysis['health_status'],
                    "risk_level": pest_analysis['risk_level'],
                    "confidence": pest_analysis['confidence'],
                    "crop_type": pest_analysis.get('crop_type', crop_type),
                    "growth_stage": pest_analysis.get('growth_stage', {}),
                    "health_metrics": pest_analysis.get('health_metrics', {}),
                    "detected_pests": pest_analysis.get('detected_pests', []),
                    "detected_diseases": pest_analysis.get('detected_diseases', []),
                    "predictions": pest_analysis.get('predictions', []),
                    "immediate_actions": pest_analysis.get('immediate_actions', []),
                    "recommendations": pest_analysis.get('recommendations', [])
                }
                
                print(f"✅ Pest/Disease analysis complete: Status: {pest_analysis['health_status']}, Risk: {pest_analysis['risk_level']}")
                
            except Exception as pest_error:
                print(f"⚠️ Pest/disease analysis error: {pest_error}")
                ai_analysis["pest_disease_scan"] = {"error": str(pest_error)}
        
        # Save image record to database with AI analysis
        supabase = supabase_admin
        image_record = {
            "id": str(uuid.uuid4()),
            "plot_id": plot_id,
            "user_id": user_id,
            "image_url": image_url,
            "image_type": image_type,
            "description": f"{image_type.capitalize()} image with AI analysis",
            "captured_at": datetime.utcnow().isoformat(),
            "ai_analysis": ai_analysis if ai_analysis else None
        }
        
        try:
            result = supabase.table('plot_images').insert(image_record).execute()
            print(f"✅ Image record saved to database with AI analysis")
        except Exception as db_error:
            print(f"⚠️ Error saving to database: {db_error}")
        
        return {
            "success": True,
            "image_url": image_url,
            "filename": unique_filename,
            "image_type": image_type,
            "ai_analysis": ai_analysis,
            "analysis_completed": bool(ai_analysis)
        }
    
    except Exception as e:
        print(f"❌ Error in upload_plot_image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/plots")
async def create_plot(
    user_id: str = Form(...),
    crop_name: str = Form(...),
    plot_name: str = Form(...),
    planting_date: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    is_demo: bool = Form(False),  # NEW: Flag for demo plots
    area_size: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    soil_type: Optional[str] = Form(None),
    initial_image: Optional[UploadFile] = File(None),
    soil_image: Optional[UploadFile] = File(None),
    additional_images: Optional[List[UploadFile]] = File(None)  # NEW: Multiple additional photos
):
    """
    UNIFIED PLOT CREATION ENDPOINT
    
    Create a plot (demo or real) with support for:
    - Multiple crops per farmer (no limit)
    - Demo plots (editable templates, can be converted to real plots)
    - Real plots (actual farm plots)
    - Multiple photo uploads (initial, soil, and additional photos)
    
    Parameters:
    - user_id: User's unique ID
    - crop_name: Name of the crop (e.g., "Maize", "Tomatoes", "Beans")
    - plot_name: Custom name for the plot
    - planting_date: ISO format date
    - latitude, longitude: Plot location
    - is_demo: If True, creates an editable demo plot; if False, creates a real plot
    - area_size: Plot size in square meters (optional)
    - notes: Additional notes (optional)
    - soil_type: Manual soil type entry (optional)
    - initial_image: Main plot photo (optional)
    - soil_image: Soil sample photo (optional)
    - additional_images: List of extra photos (optional)
    
    Returns:
    - Created plot with scheduled events and image URLs
    """
    print("=" * 60)
    print(f"{'DEMO' if is_demo else 'REAL'} PLOT CREATION - REQUEST RECEIVED")
    print("=" * 60)
    print(f"User ID: {user_id}")
    print(f"Plot Name: {plot_name}")
    print(f"Crop Name: {crop_name}")
    print(f"Planting Date: {planting_date}")
    print(f"Location: ({latitude}, {longitude})")
    print(f"Is Demo: {is_demo}")
    print(f"Area Size: {area_size}")
    print(f"Notes: {notes}")
    print(f"Soil Type: {soil_type}")
    print(f"Initial Image: {initial_image.filename if initial_image else 'None'}")
    print(f"Soil Image: {soil_image.filename if soil_image else 'None'}")
    print(f"Additional Images: {len(additional_images) if additional_images else 0}")
    print("=" * 60)
    
    try:
        # Use service role client to bypass RLS for backend operations
        from app.services.supabase_auth import supabase_admin
        supabase = supabase_admin
        
        # CRITICAL: Ensure user profile exists before creating plot
        print(f"Checking if user {user_id} exists in profiles table...")
        user_check = supabase.table('profiles').select('id').eq('id', user_id).execute()
        
        if not user_check.data or len(user_check.data) == 0:
            print(f"User {user_id} not found in profiles table - creating profile...")
            
            try:
                profile_data = {
                    'id': user_id,
                    'user_type': 'farmer',
                    'created_at': datetime.utcnow().isoformat(),
                    'email_confirmed': False
                }
                supabase.table('profiles').insert(profile_data).execute()
                print(f"✅ Profile created for user {user_id}")
            except Exception as profile_error:
                print(f"⚠️ Could not create profile: {profile_error}")
        else:
            print(f"✅ User {user_id} exists in profiles table")
        
        # Upload images if provided
        initial_image_url = None
        soil_image_url = None
        additional_image_urls = []
        
        if initial_image:
            file_extension = initial_image.filename.split('.')[-1]
            unique_filename = f"{user_id}_initial_{uuid.uuid4()}.{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            with open(file_path, "wb") as buffer:
                content = await initial_image.read()
                buffer.write(content)
            
            base_url = os.getenv('API_BASE_URL', 'https://urchin-app-86rjy.ondigitalocean.app')
            initial_image_url = f"{base_url}/uploads/plots/{unique_filename}"
            print(f"Initial image saved: {initial_image_url}")
        
        if soil_image:
            file_extension = soil_image.filename.split('.')[-1]
            unique_filename = f"{user_id}_soil_{uuid.uuid4()}.{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            with open(file_path, "wb") as buffer:
                content = await soil_image.read()
                buffer.write(content)
            
            base_url = os.getenv('API_BASE_URL', 'https://urchin-app-86rjy.ondigitalocean.app')
            soil_image_url = f"{base_url}/uploads/plots/{unique_filename}"
            print(f"Soil image saved: {soil_image_url}")
        
        # NEW: Handle multiple additional images
        if additional_images:
            for idx, img_file in enumerate(additional_images):
                file_extension = img_file.filename.split('.')[-1]
                unique_filename = f"{user_id}_extra_{idx}_{uuid.uuid4()}.{file_extension}"
                file_path = UPLOAD_DIR / unique_filename
                
                with open(file_path, "wb") as buffer:
                    content = await img_file.read()
                    buffer.write(content)
                
                base_url = os.getenv('API_BASE_URL', 'https://urchin-app-86rjy.ondigitalocean.app')
                img_url = f"{base_url}/uploads/plots/{unique_filename}"
                additional_image_urls.append(img_url)
                print(f"Additional image {idx+1} saved: {img_url}")
        
        # Create plot in database
        plot_id = str(uuid.uuid4())
        plot_data = {
            "id": plot_id,
            "user_id": user_id,
            "crop_name": crop_name,
            "plot_name": plot_name,
            "planting_date": planting_date,
            "location": {
                "latitude": latitude,
                "longitude": longitude
            },
            "area_size": area_size,
            "notes": notes,
            "is_demo": is_demo,  # NEW: Demo flag
            "initial_image_url": initial_image_url or "https://via.placeholder.com/400x300?text=No+Image",
            "soil_image_url": soil_image_url,
            "setup_completed_at": datetime.utcnow().isoformat(),
            "soil_analysis": {
                "soil_type": soil_type or "Not analyzed",
                "manually_entered": True
            }
        }
        
        print(f"Inserting plot into database: {plot_data}")
        
        try:
            result = supabase.table('digital_plots').insert(plot_data).execute()
            print(f"Plot insert SUCCESS - result: {result.data}")
            
            # Verify insertion
            verify_result = supabase.table('digital_plots').select('*').eq('id', plot_id).execute()
            print(f"Verification query result: {verify_result.data}")
            
            if not verify_result.data:
                raise Exception("Plot was not saved to database - RLS policy may be blocking")
                
        except Exception as db_error:
            print(f"ERROR inserting plot into database: {db_error}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
        
        # Create initial scheduled events for the plot (skip for demo plots unless requested)
        calendar_events = None
        if not is_demo:  # Only auto-generate calendar for real plots
            from ..services.growth_calendar_integration import schedule_full_season_calendar
            
            try:
                calendar_events = await schedule_full_season_calendar(
                    plot_id=plot_id,
                    user_id=user_id,
                    crop_name=crop_name,
                    planting_date=planting_date,
                    location={"latitude": latitude, "longitude": longitude},
                    supabase_client=supabase
                )
            except Exception as e:
                print(f"Calendar generation error: {e}")
        
        # Save all uploaded images to plot_images table
        images_to_insert = []
        
        if initial_image_url:
            images_to_insert.append({
                "id": str(uuid.uuid4()),
                "plot_id": plot_id,
                "user_id": user_id,
                "image_url": initial_image_url,
                "image_type": "initial",
                "description": "Initial plot image",
                "captured_at": planting_date
            })
        
        if soil_image_url:
            images_to_insert.append({
                "id": str(uuid.uuid4()),
                "plot_id": plot_id,
                "user_id": user_id,
                "image_url": soil_image_url,
                "image_type": "soil",
                "description": "Soil sample image",
                "captured_at": planting_date
            })
        
        # NEW: Insert additional images
        for idx, img_url in enumerate(additional_image_urls):
            images_to_insert.append({
                "id": str(uuid.uuid4()),
                "plot_id": plot_id,
                "user_id": user_id,
                "image_url": img_url,
                "image_type": "progress",
                "description": f"Additional plot photo {idx+1}",
                "captured_at": planting_date
            })
        
        if images_to_insert:
            try:
                image_result = supabase.table('plot_images').insert(images_to_insert).execute()
                print(f"✅ Images inserted: {len(images_to_insert)} images")
            except Exception as img_error:
                print(f"⚠️ Error inserting images: {img_error}")
        
        # NEW: Run AI analysis on uploaded images
        ai_analysis = {
            "soil_health": None,
            "pest_disease_scan": None,
            "recommendations": []
        }
        
        # Analyze soil image with trained AI model
        if soil_image_url:
            try:
                from ..services.soil_health_ai import soil_analyzer
                
                print(f"🔬 Running AI soil health analysis on: {soil_image_url}")
                
                # Analyze soil image with trained AI model
                soil_analysis = await soil_analyzer.analyze_soil_image(soil_image_url)
                
                ai_analysis["soil_health"] = {
                    "fertility_score": soil_analysis['fertility_score'],
                    "soil_type": soil_analysis['soil_type'],
                    "texture": soil_analysis['texture'],
                    "ph_estimate": soil_analysis['ph_estimate'],
                    "moisture_level": soil_analysis['moisture_level'],
                    "organic_matter": soil_analysis['organic_matter_estimate'],
                    "nutrients": {
                        "nitrogen": soil_analysis['nutrients']['nitrogen']['level'],
                        "nitrogen_score": soil_analysis['nutrients']['nitrogen']['score'],
                        "nitrogen_percentage": soil_analysis['nutrients']['nitrogen'].get('percentage', 'N/A'),
                        "phosphorus": soil_analysis['nutrients']['phosphorus']['level'],
                        "phosphorus_score": soil_analysis['nutrients']['phosphorus']['score'],
                        "phosphorus_ppm": soil_analysis['nutrients']['phosphorus'].get('ppm', 'N/A'),
                        "potassium": soil_analysis['nutrients']['potassium']['level'],
                        "potassium_score": soil_analysis['nutrients']['potassium']['score'],
                        "potassium_ppm": soil_analysis['nutrients']['potassium'].get('ppm', 'N/A'),
                    },
                    "color_analysis": soil_analysis['color_analysis'],
                    "confidence": soil_analysis['confidence'],
                    "analysis_timestamp": soil_analysis['analysis_timestamp']
                }
                
                # Add soil recommendations
                for rec in soil_analysis['recommendations']:
                    ai_analysis["recommendations"].append({
                        "type": "soil",
                        "priority": "high" if "⚠️" in rec else "medium",
                        "message": rec
                    })
                
                # Update soil image with AI analysis
                try:
                    soil_img_id = next((img['id'] for img in images_to_insert if img['image_type'] == 'soil'), None)
                    if soil_img_id:
                        supabase.table('plot_images').update({
                            'ai_analysis': {
                                'soil_health': ai_analysis['soil_health']
                            }
                        }).eq('id', soil_img_id).execute()
                        print(f"✅ Soil analysis saved to image record")
                except Exception as update_err:
                    print(f"⚠️ Could not update image with analysis: {update_err}")
                
                print(f"✅ Soil health analysis complete - Fertility: {soil_analysis['fertility_score']}/10")
                
            except Exception as soil_err:
                print(f"❌ Soil analysis error: {soil_err}")
                import traceback
                traceback.print_exc()
                # Fallback to basic analysis
                ai_analysis["soil_health"] = {
                    "fertility_score": 6.5,
                    "soil_type": soil_type or "Loam",
                    "nutrients": {
                        "nitrogen": "Moderate",
                        "phosphorus": "Good",
                        "potassium": "Moderate"
                    },
                    "ph_estimate": "6.5-7.0",
                    "texture": "Medium loam"
                }
        
        # Scan initial image for pests/diseases using AI model
        if initial_image_url:
            try:
                from ..services.pest_disease_ai import pest_disease_detector
                
                # Run comprehensive AI analysis on crop image
                pest_analysis = await pest_disease_detector.analyze_crop_image(
                    initial_image_url, 
                    crop_name
                )
                
                # Store full analysis
                ai_analysis["pest_disease_scan"] = {
                    "health_status": pest_analysis.get("health_status", "healthy"),
                    "risk_level": pest_analysis.get("risk_level", "low"),
                    "confidence": pest_analysis.get("confidence", 0.85),
                    "growth_stage": pest_analysis.get("growth_stage", {}),
                    "detected_pests": pest_analysis.get("detected_pests", []),
                    "detected_diseases": pest_analysis.get("detected_diseases", []),
                    "health_metrics": pest_analysis.get("health_metrics", {}),
                    "predictions": pest_analysis.get("predictions", []),
                    "immediate_actions": pest_analysis.get("immediate_actions", [])
                }
                
                # Generate recommendations from analysis
                for rec in pest_analysis.get("recommendations", []):
                    ai_analysis["recommendations"].append({
                        "type": rec.get("type", "pest_disease"),
                        "priority": rec.get("priority", "medium"),
                        "message": f"{rec.get('target', 'Crop')}: {rec.get('action', 'Monitor closely')}",
                        "timing": rec.get("timing"),
                        "cost_estimate": rec.get("cost_estimate")
                    })
                
                # Add immediate actions as high-priority recommendations
                for action in pest_analysis.get("immediate_actions", []):
                    if "⚠️" in action or "🚨" in action:
                        ai_analysis["recommendations"].insert(0, {
                            "type": "urgent_action",
                            "priority": "critical",
                            "message": action
                        })
                
                # If no issues, add positive message
                if not pest_analysis.get("detected_pests") and not pest_analysis.get("detected_diseases"):
                    ai_analysis["recommendations"].append({
                        "type": "status",
                        "priority": "low",
                        "message": "✅ No pests or diseases detected. Crop appears healthy!"
                    })
                    
            except Exception as pest_err:
                print(f"Pest AI analysis error: {pest_err}")
                import traceback
                traceback.print_exc()
        
        print("=" * 60)
        print(f"{'DEMO' if is_demo else 'REAL'} PLOT CREATION - SUCCESS")
        print(f"Plot ID: {plot_id}")
        print(f"Total Images: {len(images_to_insert)}")
        print(f"AI Analysis: Soil={ai_analysis['soil_health'] is not None}, Pests={ai_analysis['pest_disease_scan'] is not None}")
        print("=" * 60)
        
        # Build comprehensive response
        plot_response = result.data[0] if result.data and len(result.data) > 0 else {
            "id": plot_id,
            "user_id": user_id,
            "crop_name": crop_name,
            "plot_name": plot_name,
            "planting_date": planting_date,
            "is_demo": is_demo
        }
        
        return {
            "success": True,
            "message": f"{'Demo' if is_demo else 'Real'} plot created successfully!",
            "plot": plot_response,
            "plot_id": plot_id,
            "is_demo": is_demo,
            "calendar_events": calendar_events,
            "calendar_events_created": len(calendar_events) if calendar_events else 0,
            "images": {
                "initial": initial_image_url,
                "soil": soil_image_url,
                "additional": additional_image_urls
            },
            "total_images": len(images_to_insert),
            "ai_analysis": ai_analysis
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print("=" * 60)
        print(f"{'DEMO' if is_demo else 'REAL'} PLOT CREATION - FATAL ERROR")
        print(f"Error: {e}")
        print(f"Error type: {type(e)}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# LEGACY ENDPOINT - Kept for backward compatibility
@router.post("/plots/create-manual")
async def create_plot_manual(
    user_id: str = Form(...),
    crop_name: str = Form(...),
    plot_name: str = Form(...),
    planting_date: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    area_size: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    soil_type: Optional[str] = Form(None),
    initial_image: Optional[UploadFile] = File(None),
    soil_image: Optional[UploadFile] = File(None)
):
    """
    LEGACY: Create plot with manual data entry
    
    DEPRECATED: Use POST /plots instead with is_demo=False
    
    This endpoint is maintained for backward compatibility.
    """
    # Redirect to the new unified endpoint
    return await create_plot(
        user_id=user_id,
        crop_name=crop_name,
        plot_name=plot_name,
        planting_date=planting_date,
        latitude=latitude,
        longitude=longitude,
        is_demo=False,
        area_size=area_size,
        notes=notes,
        soil_type=soil_type,
        initial_image=initial_image,
        soil_image=soil_image,
        additional_images=None
    )


# ============================================================
# PLOT RETRIEVAL ENDPOINTS
# ============================================================

@router.get("/plots")
async def get_user_plots(
    user_id: str,
    is_demo: Optional[bool] = None,
    crop_name: Optional[str] = None,
    status: Optional[str] = None
):
    """
    Get all plots for a user with optional filters
    
    Query Parameters:
    - user_id (required): User's unique ID
    - is_demo (optional): Filter by demo (true) or real (false) plots. Omit to get all.
    - crop_name (optional): Filter by specific crop
    - status (optional): Filter by status (active, harvested, abandoned)
    
    Returns:
    - List of plots matching filters
    - Supports multiple crops per farmer
    - Clearly distinguishes demo vs real plots
    
    Examples:
    - GET /plots?user_id=123 → All plots (demo + real)
    - GET /plots?user_id=123&is_demo=true → Only demo plots
    - GET /plots?user_id=123&is_demo=false → Only real plots
    - GET /plots?user_id=123&crop_name=Maize → All maize plots
    - GET /plots?user_id=123&is_demo=false&status=active → Active real plots
    """
    try:
        from app.services.supabase_auth import supabase_admin
        supabase = supabase_admin
        
        # Build query
        query = supabase.table('digital_plots').select('*').eq('user_id', user_id)
        
        # Apply filters
        if is_demo is not None:
            query = query.eq('is_demo', is_demo)
        if crop_name is not None:
            query = query.eq('crop_name', crop_name)
        if status is not None:
            query = query.eq('status', status)
        
        # Order by most recent first
        query = query.order('created_at', desc=True)
        
        result = query.execute()
        
        plots = result.data or []
        
        # Count by type
        demo_count = sum(1 for p in plots if p.get('is_demo'))
        real_count = len(plots) - demo_count
        
        # Get unique crops
        unique_crops = list(set(p.get('crop_name') for p in plots if p.get('crop_name')))
        
        return {
            "success": True,
            "plots": plots,
            "total_plots": len(plots),
            "demo_plots": demo_count,
            "real_plots": real_count,
            "unique_crops": unique_crops,
            "filters_applied": {
                "is_demo": is_demo,
                "crop_name": crop_name,
                "status": status
            }
        }
    
    except Exception as e:
        print(f"Error fetching plots: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/plots/{plot_id}")
async def get_plot_details(plot_id: str, user_id: str):
    """
    Get detailed information about a specific plot
    
    Returns:
    - Plot details
    - All images associated with the plot
    - Recent growth logs
    - Scheduled events
    """
    try:
        from app.services.supabase_auth import supabase_admin
        supabase = supabase_admin
        
        # Get plot
        plot_result = supabase.table('digital_plots').select('*').eq('id', plot_id).eq('user_id', user_id).execute()
        
        if not plot_result.data or len(plot_result.data) == 0:
            raise HTTPException(status_code=404, detail="Plot not found")
        
        plot = plot_result.data[0]
        
        # Get all images for this plot
        images_result = supabase.table('plot_images').select('*').eq('plot_id', plot_id).order('captured_at', desc=True).execute()
        images = images_result.data or []
        
        # Get recent growth logs
        logs_result = supabase.table('growth_logs').select('*').eq('plot_id', plot_id).order('timestamp', desc=True).limit(5).execute()
        logs = logs_result.data or []
        
        # Get upcoming events
        events_result = supabase.table('scheduled_events').select('*').eq('plot_id', plot_id).eq('status', 'scheduled').order('scheduled_date').limit(10).execute()
        events = events_result.data or []
        
        return {
            "success": True,
            "plot": plot,
            "is_demo": plot.get('is_demo', False),
            "images": images,
            "recent_logs": logs,
            "upcoming_events": events,
            "total_images": len(images),
            "total_logs": len(logs)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching plot details: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# PLOT EDITING ENDPOINT
# ============================================================

@router.patch("/plots/{plot_id}")
async def edit_plot(
    plot_id: str,
    user_id: str = Form(...),
    crop_name: Optional[str] = Form(None),
    plot_name: Optional[str] = Form(None),
    planting_date: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    is_demo: Optional[bool] = Form(None),  # Can convert demo→real or real→demo
    area_size: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    soil_type: Optional[str] = Form(None),
    status: Optional[str] = Form(None),  # active, harvested, abandoned
    initial_image: Optional[UploadFile] = File(None),  # Replace initial image
    soil_image: Optional[UploadFile] = File(None),  # Replace soil image
    additional_images: Optional[List[UploadFile]] = File(None)  # Add more photos
):
    """
    EDIT EXISTING PLOT
    
    Update any plot details including:
    - Converting demo plots to real plots (is_demo: true → false)
    - Converting real plots to demo templates (is_demo: false → true)
    - Changing crop type, plot name, dates, location
    - Updating or adding photos
    - Changing status (active, harvested, abandoned)
    
    Only provide the fields you want to update - all are optional.
    
    Special use cases:
    1. Convert demo to real: Set is_demo=false on a demo plot
    2. Update crop on existing plot: Change crop_name
    3. Add more photos: Upload additional_images
    4. Mark plot as harvested: Set status="harvested"
    
    Returns: Updated plot data
    """
    print("=" * 60)
    print(f"EDIT PLOT - REQUEST RECEIVED")
    print("=" * 60)
    print(f"Plot ID: {plot_id}")
    print(f"User ID: {user_id}")
    print(f"Updates: crop_name={crop_name}, plot_name={plot_name}, is_demo={is_demo}, status={status}")
    print("=" * 60)
    
    try:
        from app.services.supabase_auth import supabase_admin
        supabase = supabase_admin
        
        # Verify plot exists and belongs to user
        plot_check = supabase.table('digital_plots').select('*').eq('id', plot_id).eq('user_id', user_id).execute()
        
        if not plot_check.data or len(plot_check.data) == 0:
            raise HTTPException(status_code=404, detail=f"Plot {plot_id} not found or doesn't belong to user {user_id}")
        
        existing_plot = plot_check.data[0]
        print(f"Existing plot found: {existing_plot.get('plot_name')} (is_demo: {existing_plot.get('is_demo', False)})")
        
        # Build update dict with only provided fields
        updates = {}
        
        if crop_name is not None:
            updates['crop_name'] = crop_name
        if plot_name is not None:
            updates['plot_name'] = plot_name
        if planting_date is not None:
            updates['planting_date'] = planting_date
        if area_size is not None:
            updates['area_size'] = area_size
        if notes is not None:
            updates['notes'] = notes
        if status is not None:
            updates['status'] = status
        if is_demo is not None:
            updates['is_demo'] = is_demo
            if is_demo == False and existing_plot.get('is_demo') == True:
                print("🔄 Converting DEMO plot → REAL plot")
            elif is_demo == True and existing_plot.get('is_demo') == False:
                print("🔄 Converting REAL plot → DEMO plot")
        
        # Update location if both lat/lon provided
        if latitude is not None and longitude is not None:
            updates['location'] = {
                "latitude": latitude,
                "longitude": longitude
            }
        
        # Update soil type
        if soil_type is not None:
            existing_soil = existing_plot.get('soil_analysis', {})
            updates['soil_analysis'] = {
                **existing_soil,
                "soil_type": soil_type,
                "manually_entered": True
            }
        
        # Handle image uploads
        initial_image_url = None
        soil_image_url = None
        additional_image_urls = []
        
        if initial_image:
            file_extension = initial_image.filename.split('.')[-1]
            unique_filename = f"{user_id}_initial_{uuid.uuid4()}.{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            with open(file_path, "wb") as buffer:
                content = await initial_image.read()
                buffer.write(content)
            
            base_url = os.getenv('API_BASE_URL', 'https://urchin-app-86rjy.ondigitalocean.app')
            initial_image_url = f"{base_url}/uploads/plots/{unique_filename}"
            updates['initial_image_url'] = initial_image_url
            print(f"New initial image: {initial_image_url}")
        
        if soil_image:
            file_extension = soil_image.filename.split('.')[-1]
            unique_filename = f"{user_id}_soil_{uuid.uuid4()}.{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            with open(file_path, "wb") as buffer:
                content = await soil_image.read()
                buffer.write(content)
            
            base_url = os.getenv('API_BASE_URL', 'https://urchin-app-86rjy.ondigitalocean.app')
            soil_image_url = f"{base_url}/uploads/plots/{unique_filename}"
            updates['soil_image_url'] = soil_image_url
            print(f"New soil image: {soil_image_url}")
        
        # Handle additional images
        if additional_images:
            for idx, img_file in enumerate(additional_images):
                file_extension = img_file.filename.split('.')[-1]
                unique_filename = f"{user_id}_extra_{idx}_{uuid.uuid4()}.{file_extension}"
                file_path = UPLOAD_DIR / unique_filename
                
                with open(file_path, "wb") as buffer:
                    content = await img_file.read()
                    buffer.write(content)
                
                base_url = os.getenv('API_BASE_URL', 'https://urchin-app-86rjy.ondigitalocean.app')
                img_url = f"{base_url}/uploads/plots/{unique_filename}"
                additional_image_urls.append(img_url)
        
        # Update timestamp
        updates['updated_at'] = datetime.utcnow().isoformat()
        
        # Apply updates to database
        if updates:
            print(f"Applying updates: {list(updates.keys())}")
            result = supabase.table('digital_plots').update(updates).eq('id', plot_id).execute()
            print(f"✅ Plot updated successfully")
        else:
            print("⚠️ No updates to apply")
            result = plot_check
        
        # Insert additional images to plot_images table
        if initial_image_url or soil_image_url or additional_image_urls:
            images_to_insert = []
            
            if initial_image_url:
                images_to_insert.append({
                    "id": str(uuid.uuid4()),
                    "plot_id": plot_id,
                    "user_id": user_id,
                    "image_url": initial_image_url,
                    "image_type": "initial",
                    "description": "Updated initial image",
                    "captured_at": datetime.utcnow().isoformat()
                })
            
            if soil_image_url:
                images_to_insert.append({
                    "id": str(uuid.uuid4()),
                    "plot_id": plot_id,
                    "user_id": user_id,
                    "image_url": soil_image_url,
                    "image_type": "soil",
                    "description": "Updated soil image",
                    "captured_at": datetime.utcnow().isoformat()
                })
            
            for idx, img_url in enumerate(additional_image_urls):
                images_to_insert.append({
                    "id": str(uuid.uuid4()),
                    "plot_id": plot_id,
                    "user_id": user_id,
                    "image_url": img_url,
                    "image_type": "progress",
                    "description": f"Additional photo {idx+1}",
                    "captured_at": datetime.utcnow().isoformat()
                })
            
            if images_to_insert:
                try:
                    supabase.table('plot_images').insert(images_to_insert).execute()
                    print(f"✅ {len(images_to_insert)} new images added")
                except Exception as img_error:
                    print(f"⚠️ Error inserting images: {img_error}")
        
        # If converting demo to real, generate calendar events
        if is_demo == False and existing_plot.get('is_demo') == True:
            print("🗓️ Generating calendar events for newly converted real plot...")
            try:
                from ..services.growth_calendar_integration import schedule_full_season_calendar
                
                updated_plot = result.data[0] if result.data else existing_plot
                calendar_events = await schedule_full_season_calendar(
                    plot_id=plot_id,
                    user_id=user_id,
                    crop_name=updated_plot.get('crop_name'),
                    planting_date=updated_plot.get('planting_date'),
                    location=updated_plot.get('location'),
                    supabase_client=supabase
                )
                print(f"✅ Calendar events created: {len(calendar_events) if calendar_events else 0}")
            except Exception as cal_error:
                print(f"⚠️ Calendar generation error: {cal_error}")
        
        print("=" * 60)
        print("EDIT PLOT - SUCCESS")
        print("=" * 60)
        
        return {
            "success": True,
            "message": "Plot updated successfully!",
            "plot": result.data[0] if result.data else existing_plot,
            "updates_applied": list(updates.keys()),
            "new_images_count": len(additional_image_urls) + (1 if initial_image_url else 0) + (1 if soil_image_url else 0)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print("=" * 60)
        print("EDIT PLOT - ERROR")
        print(f"Error: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 1. DIGITAL PLOT SETUP
# ============================================================

@router.post("/plots/create")
async def create_digital_plot(request: CreatePlotRequest, user_id: str = "demo_user"):
    """
    Create a new digital plot with comprehensive setup
    
    User provides:
    - Initial photo of plant/planting area
    - Planting date from calendar
    - Location (crucial for regional predictions)
    - Soil image for analysis
    
    AI analyzes:
    - Soil type, organic matter, pH
    - Provides soil recommendations
    """
    try:
        supabase = supabase_admin
        service = AdvancedGrowthTrackingService(supabase)
        
        result = await service.create_digital_plot(
            user_id=user_id,
            crop_name=request.crop_name,
            plot_name=request.plot_name,
            initial_image_url=request.initial_image_url,
            planting_date=request.planting_date,
            location=request.location.dict(),
            soil_image_url=request.soil_image_url,
            area_size=request.area_size,
            notes=request.notes
        )
        
        return {
            "success": True,
            "message": "Digital plot created successfully!",
            "data": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/soil/analyze")
async def analyze_soil(image_url: str):
    """
    Analyze soil image using AI
    
    Returns:
    - Soil type (Clay, Loam, Sandy, etc.)
    - Organic matter content
    - pH range estimate
    - Moisture level
    - Improvement recommendations
    """
    try:
        supabase = supabase_admin
        service = AdvancedGrowthTrackingService(supabase)
        
        analysis = await service.analyze_soil_ai(image_url)
        
        return {
            "success": True,
            "soil_analysis": analysis
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/plots/{plot_id}")
async def get_plot_details(plot_id: str):
    """Get comprehensive plot details including setup and logs"""
    try:
        supabase = supabase_admin
        
        # Fetch plot
        plot = supabase.table('digital_plots')\
            .select('*')\
            .eq('id', plot_id)\
            .single()\
            .execute()
        
        # Fetch recent logs
        logs = supabase.table('growth_logs')\
            .select('*')\
            .eq('plot_id', plot_id)\
            .order('timestamp', desc=True)\
            .limit(10)\
            .execute()
        
        return {
            "success": True,
            "plot": plot.data,
            "recent_logs": logs.data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/plots/user/{user_id}")
async def get_user_plots(user_id: str):
    """Get all plots for a user"""
    try:
        plots = supabase_admin.table('digital_plots')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('setup_completed_at', desc=True)\
            .execute()
        
        return {
            "success": True,
            "plots": plots.data,
            "count": len(plots.data)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# 2. GROWTH LOGS & CHECK-INS
# ============================================================

@router.post("/logs/create")
async def create_growth_log(request: CreateGrowthLogRequest, user_id: str = "demo_user"):
    """
    Create growth log with AI health analysis
    
    User uploads photos focusing on:
    - Leaves (chlorophyll/nitrogen analysis)
    - Stems (structural health)
    - Fruit/flowers (development stage)
    
    AI analyzes:
    - Growth rate vs previous photos
    - Chlorophyll/Nitrogen index
    - Water stress indicators
    - Overall health score (1-100)
    """
    try:
        supabase = supabase_admin
        service = AdvancedGrowthTrackingService(supabase)
        
        result = await service.create_growth_log(
            plot_id=request.plot_id,
            user_id=user_id,
            image_urls=request.image_urls,
            log_type=request.log_type,
            notes=request.notes
        )
        
        return {
            "success": True,
            "message": "Growth log created with AI analysis!",
            "data": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/health/analyze")
async def analyze_plant_health(image_url: str):
    """
    Comprehensive plant health analysis
    
    Analyzes:
    - Overall health score (1-100)
    - Chlorophyll index
    - Nitrogen status
    - Water stress
    - Growth stage
    - Biomarkers and alerts
    """
    try:
        supabase = supabase_admin
        service = AdvancedGrowthTrackingService(supabase)
        
        analysis = await service.analyze_plant_health_comprehensive(image_url)
        
        return {
            "success": True,
            "health_analysis": analysis
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/plot/{plot_id}")
async def get_plot_logs(plot_id: str, limit: int = 20):
    """Get growth logs for a plot"""
    try:
        supabase = supabase_admin
        
        logs = supabase.table('growth_logs')\
            .select('*')\
            .eq('plot_id', plot_id)\
            .order('timestamp', desc=True)\
            .limit(limit)\
            .execute()
        
        return {
            "success": True,
            "logs": logs.data,
            "count": len(logs.data)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/{plot_id}")
async def get_health_dashboard(plot_id: str):
    """
    Get comprehensive health dashboard for a plot
    
    Includes:
    - Current health metrics
    - Growth progress over time
    - Active alerts
    - Biomarker trends
    """
    try:
        supabase = supabase_admin
        
        # Get latest log
        latest_log = supabase.table('growth_logs')\
            .select('*')\
            .eq('plot_id', plot_id)\
            .order('timestamp', desc=True)\
            .limit(1)\
            .execute()
        
        if not latest_log.data:
            raise HTTPException(status_code=404, detail="No logs found for this plot")
        
        log = latest_log.data[0]
        health_analysis = log.get('health_analysis', {})
        growth_comparison = log.get('growth_comparison', {})
        
        # Get historical data for trends
        all_logs = supabase.table('growth_logs')\
            .select('*')\
            .eq('plot_id', plot_id)\
            .order('timestamp', desc=False)\
            .execute()
        
        # Build trend data
        health_trend = [
            {
                "timestamp": l.get('timestamp'),
                "health_score": l.get('health_analysis', {}).get('overall_health_score', 0),
                "chlorophyll_index": l.get('health_analysis', {}).get('chlorophyll_index', 0)
            }
            for l in all_logs.data
        ]
        
        return {
            "success": True,
            "dashboard": {
                "current_status": {
                    "health_score": health_analysis.get('overall_health_score', 0),
                    "health_grade": health_analysis.get('health_grade', 'N/A'),
                    "chlorophyll_index": health_analysis.get('chlorophyll_index', 0),
                    "nitrogen_status": health_analysis.get('nitrogen_status', 'Unknown'),
                    "water_stress": health_analysis.get('water_stress', 'Unknown'),
                    "growth_stage": health_analysis.get('growth_stage', 'Unknown')
                },
                "growth_progress": growth_comparison,
                "alerts": health_analysis.get('alerts', []),
                "biomarkers": health_analysis.get('biomarkers', {}),
                "trends": {
                    "health_history": health_trend
                },
                "last_updated": log.get('timestamp')
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# 3. PEST & DISEASE DIAGNOSIS
# ============================================================

@router.post("/diagnosis/comprehensive")
async def diagnose_pest_disease_comprehensive(request: DiagnosePestDiseaseRequest):
    """
    Comprehensive pest/disease diagnosis with regional intelligence
    
    AI analyzes:
    1. Visual symptoms (powdery mildew, aphid damage, leaf spots)
    2. Regional weather and nearby reports
    3. Impact on yield and quality
    4. Actionable treatment plan
    
    Output includes:
    - "Alert: Hornworms reported by 3 growers within 15 miles. Your risk is High."
    - "Early Blight will reduce yield by 30-40% if untreated"
    - Specific treatment recommendations
    """
    try:
        supabase = supabase_admin
        service = AdvancedGrowthTrackingService(supabase)
        
        diagnosis = await service.diagnose_pest_disease_regional(
            plot_id=request.plot_id,
            image_url=request.image_url,
            location=request.location.dict()
        )
        
        # Save diagnosis to database
        diagnosis_data = {
            "plot_id": request.plot_id,
            "user_id": request.user_id if hasattr(request, 'user_id') else None,
            "image_url": request.image_url,
            "location": request.location.dict(),
            "diagnosis": diagnosis.get("diagnosis"),
            "regional_intelligence": diagnosis.get("regional_intelligence"),
            "impact_assessment": diagnosis.get("impact_assessment"),
            "treatment_plan": diagnosis.get("treatment_plan")
        }
        
        saved_diagnosis = supabase.table('pest_disease_diagnoses').insert(diagnosis_data).execute()
        
        # 🌱 AI CALENDAR: Auto-schedule treatment events
        calendar_result = None
        try:
            from ..services.growth_calendar_integration import schedule_treatment_from_diagnosis
            
            calendar_result = await schedule_treatment_from_diagnosis(
                plot_id=request.plot_id,
                user_id=request.user_id if hasattr(request, 'user_id') else None,
                diagnosis=diagnosis.get("diagnosis"),
                treatment_plan=diagnosis.get("treatment_plan"),
                supabase_client=supabase
            )
        except Exception as e:
            print(f"Treatment scheduling error: {e}")
        
        return {
            "success": True,
            "diagnosis": diagnosis,
            "diagnosis_id": saved_diagnosis.data[0]["id"] if saved_diagnosis.data else None,
            "treatment_schedule": calendar_result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/diagnosis/regional-risk/{plot_id}")
async def get_regional_pest_risk(plot_id: str):
    """
    Get regional pest/disease risk for a plot
    
    Shows:
    - Nearby pest/disease reports
    - Active threats in the region
    - Weather factors
    - Risk level
    """
    try:
        supabase = supabase_admin
        
        # Get plot location
        plot = supabase.table('digital_plots')\
            .select('location')\
            .eq('id', plot_id)\
            .single()\
            .execute()
        
        location = plot.data.get('location', {})
        service = AdvancedGrowthTrackingService(supabase)
        
        risk = await service._assess_regional_risk(location, [])
        
        return {
            "success": True,
            "regional_risk": risk
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# 4. HARVEST & QUALITY FORECASTING
# ============================================================

@router.get("/forecast/harvest/{plot_id}")
async def forecast_harvest(plot_id: str):
    """
    AI-powered harvest forecasting
    
    Uses:
    - Planting date
    - Current health score
    - Growth rate
    - Pest pressure
    
    Predicts:
    - Estimated harvest date
    - Quality score (A+ to C-)
    - Yield estimate
    - Recommendations for improvement
    
    Example output:
    - "Estimated Harvest: August 10-20"
    - "5 days later than average due to early-season water stress"
    - "Current Predicted Quality: B-"
    - "You can improve to A by treating Early Blight this week"
    """
    try:
        supabase = supabase_admin
        service = AdvancedGrowthTrackingService(supabase)
        
        forecast = await service.forecast_harvest_quality(plot_id)
        
        return {
            "success": True,
            "forecast": forecast
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast/quality/{plot_id}")
async def get_quality_prediction(plot_id: str):
    """
    Get quality prediction and improvement recommendations
    
    Shows:
    - Current predicted quality score
    - Factors affecting quality
    - Recommendations to improve
    - Potential quality gain from each action
    """
    try:
        supabase = supabase_admin
        service = AdvancedGrowthTrackingService(supabase)
        
        forecast = await service.forecast_harvest_quality(plot_id)
        
        return {
            "success": True,
            "quality_prediction": forecast.get('quality_prediction', {}),
            "recommendations": forecast.get('recommendations', [])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# CALENDAR & SCHEDULED EVENTS ENDPOINTS
# ============================================================

@router.get("/calendar/{plot_id}")
async def get_plot_calendar(plot_id: str, status: Optional[str] = None):
    """
    Get scheduled events for a plot
    
    Filters:
    - status: scheduled, completed, in_progress, skipped, cancelled
    
    Returns all farm practices, photo reminders, and treatments
    """
    try:
        supabase = supabase_admin
        
        query = supabase.table('scheduled_events')\
            .select('*')\
            .eq('plot_id', plot_id)\
            .order('scheduled_date', desc=False)
        
        if status:
            query = query.eq('status', status)
        
        events = query.execute()
        
        # Group by event type
        grouped_events = {
            "farm_practices": [],
            "photo_reminders": [],
            "treatment_applications": [],
            "urgent_practices": [],
            "alert_actions": []
        }
        
        for event in events.data:
            event_type = event.get('event_type', 'farm_practice')
            if event_type in grouped_events:
                grouped_events[event_type].append(event)
        
        return {
            "success": True,
            "plot_id": plot_id,
            "total_events": len(events.data),
            "grouped_events": grouped_events,
            "all_events": events.data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/calendar/user/{user_id}/upcoming")
async def get_user_upcoming_events(
    user_id: str,
    days_ahead: int = 7
):
    """
    Get upcoming events for user across all plots
    
    Perfect for dashboard "What's Next" section
    """
    try:
        supabase = supabase_admin
        
        future_date = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat()
        
        events = supabase.table('scheduled_events')\
            .select('*, digital_plots(plot_name, crop_name)')\
            .eq('user_id', user_id)\
            .eq('status', 'scheduled')\
            .gte('scheduled_date', datetime.utcnow().isoformat())\
            .lte('scheduled_date', future_date)\
            .order('scheduled_date', desc=False)\
            .execute()
        
        # Group by date
        events_by_date = {}
        for event in events.data:
            date_key = event['scheduled_date'][:10]  # YYYY-MM-DD
            if date_key not in events_by_date:
                events_by_date[date_key] = []
            events_by_date[date_key].append(event)
        
        return {
            "success": True,
            "user_id": user_id,
            "days_ahead": days_ahead,
            "total_events": len(events.data),
            "events_by_date": events_by_date,
            "all_events": events.data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/calendar/event/{event_id}/complete")
async def complete_event(
    event_id: str,
    completion_notes: Optional[str] = None,
    actual_labor_hours: Optional[float] = None,
    completion_images: Optional[List[str]] = None
):
    """
    Mark event as completed
    
    Records:
    - Completion date
    - Notes
    - Actual labor hours
    - Photos of completed work
    """
    try:
        supabase = supabase_admin
        
        update_data = {
            "status": "completed",
            "completed_date": datetime.utcnow().isoformat()
        }
        
        if completion_notes:
            update_data["completion_notes"] = completion_notes
        if actual_labor_hours:
            update_data["actual_labor_hours"] = actual_labor_hours
        if completion_images:
            update_data["completion_images"] = completion_images
        
        result = supabase.table('scheduled_events')\
            .update(update_data)\
            .eq('id', event_id)\
            .execute()
        
        return {
            "success": True,
            "message": "Event marked as completed",
            "event": result.data[0] if result.data else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/calendar/event/{event_id}/reschedule")
async def reschedule_event(
    event_id: str,
    new_date: str,
    reason: Optional[str] = None
):
    """
    Reschedule an event
    
    Useful when weather, health issues, or other factors delay work
    """
    try:
        supabase = supabase_admin
        
        # Get original date
        event = supabase.table('scheduled_events')\
            .select('scheduled_date')\
            .eq('id', event_id)\
            .single()\
            .execute()
        
        update_data = {
            "scheduled_date": new_date,
            "original_date": event.data.get('scheduled_date'),
            "adjustment_reason": reason or "User rescheduled",
            "adjusted_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table('scheduled_events')\
            .update(update_data)\
            .eq('id', event_id)\
            .execute()
        
        return {
            "success": True,
            "message": "Event rescheduled successfully",
            "event": result.data[0] if result.data else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calendar/event/custom")
async def create_custom_event(
    plot_id: str,
    user_id: str,
    practice_name: str,
    scheduled_date: str,
    description: Optional[str] = None,
    priority: str = "moderate"
):
    """
    Create custom event (user-created, not AI-generated)
    
    Allows farmers to add their own practices to calendar
    """
    try:
        supabase = supabase_admin
        
        event_data = {
            "plot_id": plot_id,
            "user_id": user_id,
            "event_type": "farm_practice",
            "practice_name": practice_name,
            "scheduled_date": scheduled_date,
            "description": description or f"Custom practice: {practice_name}",
            "priority": priority,
            "status": "scheduled",
            "source": "user_created",
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table('scheduled_events')\
            .insert(event_data)\
            .execute()
        
        return {
            "success": True,
            "message": "Custom event created",
            "event": result.data[0] if result.data else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/calendar/event/{event_id}")
async def delete_event(event_id: str):
    """Delete/cancel scheduled event"""
    try:
        supabase = supabase_admin
        
        result = supabase.table('scheduled_events')\
            .delete()\
            .eq('id', event_id)\
            .execute()
        
        return {
            "success": True,
            "message": "Event deleted successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# UTILITY ENDPOINTS
# ============================================================

@router.post("/seed-demo-data/{user_id}")
async def seed_demo_data(user_id: str):
    """
    Create demo plot and events for testing
    
    DEPRECATED: Use POST /plots with is_demo=true instead
    
    Useful when a user has no plots yet to show them how the system works
    """
    try:
        supabase = supabase_admin
        from datetime import timedelta
        import uuid
        
        # Create demo plot with is_demo=true
        plot_id = str(uuid.uuid4())
        plot_data = {
            "id": plot_id,
            "user_id": user_id,
            "plot_name": "Demo Maize Plot",
            "crop_name": "Maize",
            "initial_image_url": "https://example.com/maize-initial.jpg",
            "planting_date": datetime.utcnow().isoformat(),
            "location": {
                "latitude": -1.286389,
                "longitude": 36.817223
            },
            "area_size": 2.5,
            "notes": "Demo plot for growth tracking - You can edit this plot or create your own!",
            "is_demo": True,  # NEW: Mark as demo plot
            "setup_completed_at": datetime.utcnow().isoformat()
        }
        
        supabase.table('digital_plots').insert(plot_data).execute()
        
        # Create demo events
        events = [
            {
                "id": str(uuid.uuid4()),
                "plot_id": plot_id,
                "user_id": user_id,
                "event_type": "farm_practice",
                "practice_name": "Irrigation",
                "scheduled_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
                "status": "scheduled",
                "description": "Water the crops - soil moisture is low",
                "priority": "urgent",
                "estimated_labor_hours": 3
            },
            {
                "id": str(uuid.uuid4()),
                "plot_id": plot_id,
                "user_id": user_id,
                "event_type": "photo_reminder",
                "practice_name": "Weekly Photo Check",
                "scheduled_date": (datetime.utcnow() + timedelta(days=2)).isoformat(),
                "status": "scheduled",
                "description": "Take photos of plant growth for AI analysis",
                "priority": "medium",
                "estimated_labor_hours": 0.5
            },
            {
                "id": str(uuid.uuid4()),
                "plot_id": plot_id,
                "user_id": user_id,
                "event_type": "farm_practice",
                "practice_name": "Weeding",
                "scheduled_date": (datetime.utcnow() + timedelta(days=3)).isoformat(),
                "status": "scheduled",
                "description": "Manual weeding to remove competing plants",
                "priority": "high",
                "estimated_labor_hours": 4
            },
            {
                "id": str(uuid.uuid4()),
                "plot_id": plot_id,
                "user_id": user_id,
                "event_type": "alert_action",
                "practice_name": "Pest Monitoring",
                "scheduled_date": (datetime.utcnow() + timedelta(days=5)).isoformat(),
                "status": "scheduled",
                "description": "Check for fall armyworm and other pests",
                "priority": "high",
                "estimated_labor_hours": 1
            },
            {
                "id": str(uuid.uuid4()),
                "plot_id": plot_id,
                "user_id": user_id,
                "event_type": "farm_practice",
                "practice_name": "Fertilizer Application",
                "scheduled_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
                "status": "scheduled",
                "description": "Apply NPK 23:23:0 fertilizer",
                "priority": "high",
                "estimated_labor_hours": 2
            }
        ]
        
        supabase.table('scheduled_events').insert(events).execute()
        
        return {
            "success": True,
            "message": f"Demo data created successfully for user {user_id}",
            "plot_id": plot_id,
            "events_created": len(events)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Health check for advanced growth tracking system"""
    return {
        "status": "healthy",
        "service": "Advanced Growth Tracking",
        "features": [
            "Digital plot setup with soil analysis",
            "Regular health check-ins with biomarker tracking",
            "Pest/disease diagnosis with regional risk",
            "Harvest forecasting and quality prediction"
        ],
        "version": "1.0.0"
    }

@router.get("/stats/user/{user_id}")
async def get_user_stats(user_id: str):
    """Get user statistics across all plots"""
    try:
        supabase = supabase_admin
        
        # Get all user plots
        plots = supabase.table('digital_plots')\
            .select('*')\
            .eq('user_id', user_id)\
            .execute()
        
        # Get all logs
        total_logs = 0
        avg_health = []
        
        for plot in plots.data:
            logs = supabase.table('growth_logs')\
                .select('*')\
                .eq('plot_id', plot['id'])\
                .execute()
            
            total_logs += len(logs.data)
            
            for log in logs.data:
                health = log.get('health_analysis', {}).get('overall_health_score')
                if health:
                    avg_health.append(health)
        
        return {
            "success": True,
            "stats": {
                "total_plots": len(plots.data),
                "active_plots": sum(1 for p in plots.data if p.get('status') == 'active'),
                "total_check_ins": total_logs,
                "average_health_score": round(sum(avg_health) / len(avg_health), 1) if avg_health else 0,
                "plots_monitored": [
                    {
                        "id": p['id'],
                        "name": p['plot_name'],
                        "crop": p['crop_name'],
                        "days_since_planting": (datetime.utcnow() - datetime.fromisoformat(p['planting_date'])).days
                    }
                    for p in plots.data
                ]
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
