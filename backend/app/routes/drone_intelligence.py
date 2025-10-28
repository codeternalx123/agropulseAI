from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def DroneIntelligence_endpoint():
    return {"message": "DroneIntelligence endpoint"}