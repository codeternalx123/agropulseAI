from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
router = APIRouter()
@router.post('/create')
async def create_group(request: Request):
    body = await request.json()
    return JSONResponse({'status':'ok','group':body})
@router.get('/list')
async def list_groups():
    return JSONResponse({'groups':[]})
