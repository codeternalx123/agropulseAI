from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def MarketLinkages_endpoint():
    return {"message": "MarketLinkages endpoint"}