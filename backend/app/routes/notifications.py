from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def Notifications_endpoint():
    return {"message": "Notifications endpoint"}