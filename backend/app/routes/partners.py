from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def partners_endpoint():
    return {"message": "Partners endpoint"}