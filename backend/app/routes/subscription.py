from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def Subscription_endpoint():
    return {"message": "Subscription endpoint"}