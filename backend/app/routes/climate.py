from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def Climate_endpoint():
    return {"message": "Climate endpoint"}