from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List
from pydantic import BaseModel
import os
import uuid
from datetime import datetime
import shutil
from pathlib import Path

router = APIRouter()

# Configuration
UPLOAD_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
IMAGE_CATEGORIES = ['plant', 'leaf', 'soil', 'farm', 'pest', 'disease', 'general']

# Create upload directories
for category in IMAGE_CATEGORIES:
    (UPLOAD_DIR / category).mkdir(parents=True, exist_ok=True)


# ============================================================================
# MODELS
# ============================================================================

class UploadResponse(BaseModel):
    url: str
    filename: str
    category: str
    size: int
    uploaded_at: str


class BatchUploadResponse(BaseModel):
    uploaded: List[UploadResponse]
    failed: List[dict]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def validate_file(file: UploadFile) -> tuple[bool, Optional[str]]:
    """Validate uploaded file"""
    # Check extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    
    # Check content type
    if not file.content_type.startswith('image/'):
        return False, "File must be an image"
    
    return True, None


def save_upload_file(upload_file: UploadFile, category: str) -> tuple[str, str, int]:
    """
    Save uploaded file to disk
    
    Returns:
        tuple: (file_path, filename, file_size)
    """
    # Generate unique filename
    file_ext = Path(upload_file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    # Create category directory if not exists
    category_dir = UPLOAD_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = category_dir / unique_filename
    file_size = 0
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
        file_size = file_path.stat().st_size
    
    return str(file_path), unique_filename, file_size


# ============================================================================
# ROUTES
# ============================================================================

@router.post("/photo", response_model=UploadResponse)
async def upload_photo(
    photo: UploadFile = File(...),
    category: str = Form(default="general")
):
    """
    Upload a single photo with optional category
    
    Categories: plant, leaf, soil, farm, pest, disease, general
    """
    # Validate category
    if category not in IMAGE_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Allowed: {', '.join(IMAGE_CATEGORIES)}"
        )
    
    # Validate file
    is_valid, error_msg = validate_file(photo)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Check file size
    photo.file.seek(0, 2)  # Seek to end
    file_size = photo.file.tell()
    photo.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE / (1024*1024):.0f}MB"
        )
    
    try:
        # Save file
        file_path, filename, size = save_upload_file(photo, category)
        
        # Generate URL (in production, use actual domain)
        url = f"/uploads/{category}/{filename}"
        
        return UploadResponse(
            url=url,
            filename=filename,
            category=category,
            size=size,
            uploaded_at=datetime.utcnow().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/photos/batch", response_model=BatchUploadResponse)
async def upload_photos_batch(
    photos: List[UploadFile] = File(...),
    category: str = Form(default="general")
):
    """
    Upload multiple photos at once
    
    Max 10 files per batch
    """
    if len(photos) > 10:
        raise HTTPException(status_code=400, detail="Max 10 files per batch")
    
    # Validate category
    if category not in IMAGE_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Allowed: {', '.join(IMAGE_CATEGORIES)}"
        )
    
    uploaded = []
    failed = []
    
    for photo in photos:
        try:
            # Validate file
            is_valid, error_msg = validate_file(photo)
            if not is_valid:
                failed.append({"filename": photo.filename, "error": error_msg})
                continue
            
            # Check file size
            photo.file.seek(0, 2)
            file_size = photo.file.tell()
            photo.file.seek(0)
            
            if file_size > MAX_FILE_SIZE:
                failed.append({
                    "filename": photo.filename,
                    "error": f"File too large (max {MAX_FILE_SIZE / (1024*1024):.0f}MB)"
                })
                continue
            
            # Save file
            file_path, filename, size = save_upload_file(photo, category)
            url = f"/uploads/{category}/{filename}"
            
            uploaded.append(UploadResponse(
                url=url,
                filename=filename,
                category=category,
                size=size,
                uploaded_at=datetime.utcnow().isoformat()
            ))
        
        except Exception as e:
            failed.append({"filename": photo.filename, "error": str(e)})
    
    return BatchUploadResponse(uploaded=uploaded, failed=failed)


@router.post("/plant", response_model=UploadResponse)
async def upload_plant_image(photo: UploadFile = File(...)):
    """Upload plant image (full plant photos)"""
    return await upload_photo(photo, category="plant")


@router.post("/leaf", response_model=UploadResponse)
async def upload_leaf_image(photo: UploadFile = File(...)):
    """Upload leaf image (close-up leaf photos for disease detection)"""
    return await upload_photo(photo, category="leaf")


@router.post("/soil", response_model=UploadResponse)
async def upload_soil_image(photo: UploadFile = File(...)):
    """Upload soil image (soil analysis photos)"""
    return await upload_photo(photo, category="soil")


@router.post("/farm", response_model=UploadResponse)
async def upload_farm_image(photo: UploadFile = File(...)):
    """Upload farm image (field/landscape photos)"""
    return await upload_photo(photo, category="farm")


@router.delete("/{category}/{filename}")
async def delete_photo(category: str, filename: str):
    """Delete uploaded photo"""
    if category not in IMAGE_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    file_path = UPLOAD_DIR / category / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        file_path.unlink()
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@router.get("/stats")
async def get_upload_stats():
    """Get upload statistics by category"""
    stats = {}
    total_size = 0
    total_files = 0
    
    for category in IMAGE_CATEGORIES:
        category_dir = UPLOAD_DIR / category
        if category_dir.exists():
            files = list(category_dir.glob("*"))
            count = len(files)
            size = sum(f.stat().st_size for f in files if f.is_file())
            
            stats[category] = {
                "count": count,
                "size_bytes": size,
                "size_mb": round(size / (1024 * 1024), 2)
            }
            
            total_files += count
            total_size += size
    
    return {
        "categories": stats,
        "total": {
            "files": total_files,
            "size_bytes": total_size,
            "size_mb": round(total_size / (1024 * 1024), 2)
        }
    }
