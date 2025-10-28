from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def ModelTrainingRoutes_endpoint():
    return {"message": "ModelTrainingRoutes endpoint"}