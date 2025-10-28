from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def VillageGroups_endpoint():
    return {"message": "VillageGroups endpoint"}