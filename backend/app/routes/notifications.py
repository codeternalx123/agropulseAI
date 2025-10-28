from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
router = APIRouter()
@router.post('/partner_alert')
async def partner_alert(request: Request):
    body = await request.json()
    return JSONResponse({'sent':[]})
