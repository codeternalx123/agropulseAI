from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def storage_endpoint():
    return {"message": "Storage endpoint"}