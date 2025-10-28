from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def Payments_endpoint():
    return {"message": "Payments endpoint"}