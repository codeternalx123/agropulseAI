from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def Location_endpoint():
    return {"message": "Location endpoint"}