from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def scan_endpoint():
    return {"message": "Scan endpoint"}