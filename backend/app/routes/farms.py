from fastapi import APIRouter
router = APIRouter()
@router.get('/')
async def list_farms():
    return {'farms': []}
