from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def Premium_endpoint():
    return {"message": "Premium endpoint"}