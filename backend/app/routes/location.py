"""
Location tracking and climate intelligence endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime

from app.services.supabase_auth import supabase_client
from app.services.geolocation_service import geolocation_service

router = APIRouter(prefix="/api/location", tags=["location"])


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    village: Optional[str] = None
    subcounty: Optional[str] = None


class LocationResponse(BaseModel):
    success: bool
    message: str
    location: Optional[Dict] = None
    weather: Optional[Dict] = None


@router.post("/update", response_model=LocationResponse)
async def update_farmer_location(location: LocationUpdate, user_id: str):
    """
    Update farmer's current location
    Stores coordinates and performs reverse geocoding
    """
    try:
        # Reverse geocode to get location details
        location_details = geolocation_service.reverse_geocode(
            location.latitude, 
            location.longitude
        )
        
        # Get current weather
        current_weather = geolocation_service.get_current_weather(
            location.latitude,
            location.longitude
        )
        
        # Update user profile in Supabase
        update_data = {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "county": location_details.get("county"),
            "state": location_details.get("state"),
            "country": location_details.get("country", "Kenya"),
            "village": location.village,
            "subcounty": location.subcounty,
            "location_accuracy": location.accuracy,
            "altitude": location.altitude,
            "location_updated_at": datetime.now().isoformat(),
            "current_temperature": current_weather.get("temperature"),
            "current_weather": current_weather.get("weather")
        }
        
        response = supabase_client.table("profiles").update(update_data).eq(
            "id", user_id
        ).execute()
        
        # Store location history
        history_entry = {
            "user_id": user_id,
            "latitude": location.latitude,
            "longitude": location.longitude,
            "accuracy": location.accuracy,
            "county": location_details.get("county"),
            "timestamp": datetime.now().isoformat()
        }
        
        supabase_client.table("location_history").insert(history_entry).execute()
        
        return LocationResponse(
            success=True,
            message="Location updated successfully",
            location=location_details,
            weather=current_weather
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update location: {str(e)}"
        )


@router.get("/weather-forecast/{user_id}")
async def get_weather_forecast(user_id: str):
    """
    Get 6-month weather forecast for farmer's location
    Includes AI predictions and farming calendar
    """
    try:
        # Get user's location from profile
        response = supabase_client.table("profiles").select(
            "latitude, longitude, county"
        ).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        profile = response.data[0]
        latitude = profile.get("latitude")
        longitude = profile.get("longitude")
        
        if not latitude or not longitude:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location not set. Please update your location first."
            )
        
        # Get 6-month forecast
        forecast = geolocation_service.get_6_month_forecast(latitude, longitude)
        
        return {
            "success": True,
            "user_id": user_id,
            "county": profile.get("county"),
            "forecast": forecast
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get forecast: {str(e)}"
        )


@router.get("/crop-recommendations/{user_id}")
async def get_crop_recommendations(user_id: str, soil_type: Optional[str] = None):
    """
    Get AI-powered crop recommendations based on location and climate
    """
    try:
        # Get user's location
        response = supabase_client.table("profiles").select(
            "latitude, longitude, county, soil_type"
        ).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        profile = response.data[0]
        latitude = profile.get("latitude")
        longitude = profile.get("longitude")
        
        if not latitude or not longitude:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location not set. Please update your location first."
            )
        
        # Use provided soil type or profile soil type
        soil = soil_type or profile.get("soil_type")
        
        # Get suitable crops
        recommendations = geolocation_service.get_suitable_crops(
            latitude, longitude, soil
        )
        
        return {
            "success": True,
            "user_id": user_id,
            "recommendations": recommendations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recommendations: {str(e)}"
        )


@router.get("/current-weather/{user_id}")
async def get_current_weather(user_id: str):
    """Get current weather at farmer's location"""
    try:
        # Get user's location
        response = supabase_client.table("profiles").select(
            "latitude, longitude, county"
        ).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        profile = response.data[0]
        latitude = profile.get("latitude")
        longitude = profile.get("longitude")
        
        if not latitude or not longitude:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location not set"
            )
        
        weather = geolocation_service.get_current_weather(latitude, longitude)
        
        return {
            "success": True,
            "county": profile.get("county"),
            "weather": weather
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get weather: {str(e)}"
        )


@router.get("/location-history/{user_id}")
async def get_location_history(user_id: str, limit: int = 50):
    """Get farmer's location history"""
    try:
        response = supabase_client.table("location_history").select(
            "*"
        ).eq("user_id", user_id).order(
            "timestamp", desc=True
        ).limit(limit).execute()
        
        return {
            "success": True,
            "user_id": user_id,
            "history": response.data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get history: {str(e)}"
        )


@router.post("/reverse-geocode")
async def reverse_geocode_endpoint(latitude: float, longitude: float):
    """
    Convert coordinates to location details
    Public endpoint for location lookup
    """
    try:
        location = geolocation_service.reverse_geocode(latitude, longitude)
        return {
            "success": True,
            "location": location
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reverse geocoding failed: {str(e)}"
        )


@router.get("/nearby-farmers/{user_id}")
async def get_nearby_farmers(user_id: str, radius_km: float = 10):
    """
    Find farmers within specified radius
    Useful for forming groups or local marketplace
    """
    try:
        # Get user's location
        response = supabase_client.table("profiles").select(
            "latitude, longitude"
        ).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_lat = response.data[0]["latitude"]
        user_lon = response.data[0]["longitude"]
        
        if not user_lat or not user_lon:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User location not set"
            )
        
        # Get all farmers with locations
        all_farmers = supabase_client.table("profiles").select(
            "id, full_name, latitude, longitude, county, user_type"
        ).eq("user_type", "farmer").not_.is_(
            "latitude", "null"
        ).not_.is_("longitude", "null").execute()
        
        # Calculate distances and filter
        nearby = []
        for farmer in all_farmers.data:
            if farmer["id"] == user_id:
                continue
            
            # Haversine formula for distance
            from math import radians, sin, cos, sqrt, atan2
            
            lat1, lon1 = radians(user_lat), radians(user_lon)
            lat2, lon2 = radians(farmer["latitude"]), radians(farmer["longitude"])
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            distance = 6371 * c  # Earth radius in km
            
            if distance <= radius_km:
                nearby.append({
                    "farmer_id": farmer["id"],
                    "name": farmer["full_name"],
                    "county": farmer["county"],
                    "distance_km": round(distance, 2)
                })
        
        # Sort by distance
        nearby.sort(key=lambda x: x["distance_km"])
        
        return {
            "success": True,
            "user_location": {"latitude": user_lat, "longitude": user_lon},
            "radius_km": radius_km,
            "farmers_found": len(nearby),
            "nearby_farmers": nearby
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find nearby farmers: {str(e)}"
        )
