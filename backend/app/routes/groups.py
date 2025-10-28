from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def groups_endpoint():
    return {"message": "Groups endpoint"}