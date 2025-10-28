from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def FarmerMarketplace_endpoint():
    return {"message": "FarmerMarketplace endpoint"}