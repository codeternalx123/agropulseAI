from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def Auth_endpoint():
    return {"message": "Auth endpoint"}