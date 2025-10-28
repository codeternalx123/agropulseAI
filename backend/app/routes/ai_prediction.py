from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def AiPrediction_endpoint():
    return {"message": "AiPrediction endpoint"}