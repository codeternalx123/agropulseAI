from fastapi import APIRouter, File, UploadFile, Form
from fastapi.responses import JSONResponse
import os, datetime
router = APIRouter()
os.makedirs('./storage/growth', exist_ok=True)

@router.post('/upload')
async def upload_growth_image(farm_id: int = Form(...), file: UploadFile = File(...)):
    contents = await file.read()
    ts = datetime.datetime.utcnow().isoformat()
    fname = f'farm_{farm_id}_{ts}.jpg'
    with open(os.path.join('./storage/growth', fname),'wb') as f:
        f.write(contents)
    return JSONResponse({'status':'ok','filename':fname})

@router.get('/progress/{farm_id}')
async def progress(farm_id: int):
    files = []
    for f in os.listdir('./storage/growth'):
        if f.startswith(f'farm_{farm_id}_'):
            files.append(f)
    files.sort()
    progress = [{'image':f,'progress_percent':min(100,(i+1)*20)} for i,f in enumerate(files)]
    return JSONResponse({'farm_id':farm_id,'progress':progress})
