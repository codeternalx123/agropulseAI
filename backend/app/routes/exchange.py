from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def Exchange_endpoint():
    return {"message": "Exchange endpoint"}