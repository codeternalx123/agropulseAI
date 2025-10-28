"""
Model Training API Endpoints
Endpoints to train models and view performance metrics
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

from app.services.data_collection import DataCollectionService
from app.services.model_training import ModelTrainingService

router = APIRouter(prefix="/api/model-training", tags=["Model Training"])

# Initialize services
data_service = DataCollectionService()
training_service = ModelTrainingService()

# Global variable to track training status
training_status = {
    "is_training": False,
    "current_model": None,
    "progress": 0,
    "message": "Idle"
}


# ===================================
# REQUEST/RESPONSE MODELS
# ===================================

class TrainingRequest(BaseModel):
    model_type: str  # 'pest', 'disease', 'storage', or 'all'
    min_samples_per_class: int = 10
    validation_split: float = 0.2
    epochs: Optional[int] = 10


class DataStatsResponse(BaseModel):
    pest_predictions: int
    disease_predictions: int
    storage_predictions: int
    total_confirmed: int
    data_quality: Dict


# ===================================
# DATA STATISTICS ENDPOINTS
# ===================================

@router.get("/data-stats")
async def get_data_statistics():
    """Get statistics about available training data"""
    try:
        # Fetch prediction counts
        pest_df = data_service.fetch_pest_predictions(days_back=365)
        disease_df = data_service.fetch_disease_predictions(days_back=365)
        storage_df = data_service.fetch_storage_predictions(days_back=365)
        
        # Fetch confirmed data
        pest_training = data_service.fetch_pest_training_data()
        disease_training = data_service.fetch_disease_training_data()
        storage_training = data_service.fetch_storage_training_data()
        
        return {
            "success": True,
            "statistics": {
                "total_predictions": {
                    "pest": len(pest_df),
                    "disease": len(disease_df),
                    "storage": len(storage_df),
                    "total": len(pest_df) + len(disease_df) + len(storage_df)
                },
                "confirmed_training_data": {
                    "pest": len(pest_training["labels"]),
                    "disease": len(disease_training["labels"]),
                    "storage": len(storage_training["labels"]),
                    "total": len(pest_training["labels"]) + len(disease_training["labels"]) + len(storage_training["labels"])
                },
                "data_quality": {
                    "pest_confirmation_rate": f"{(len(pest_training['labels']) / max(len(pest_df), 1) * 100):.2f}%",
                    "disease_confirmation_rate": f"{(len(disease_training['labels']) / max(len(disease_df), 1) * 100):.2f}%",
                    "storage_confirmation_rate": f"{(len(storage_training['labels']) / max(len(storage_df), 1) * 100):.2f}%"
                },
                "last_updated": datetime.now().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data-distribution")
async def get_data_distribution():
    """Get distribution of pest types, diseases, and storage conditions"""
    try:
        pest_dist = data_service.get_pest_distribution(days_back=365)
        disease_dist = data_service.get_disease_distribution(days_back=365)
        
        return {
            "success": True,
            "distribution": {
                "pest_detection": pest_dist,
                "disease_detection": disease_dist
            },
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-performance")
async def get_model_performance():
    """Get current model performance metrics"""
    try:
        metrics = data_service.get_model_performance_metrics()
        
        return {
            "success": True,
            "performance": metrics,
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===================================
# MODEL TRAINING ENDPOINTS
# ===================================

def train_model_background(model_type: str, config: dict):
    """Background task for model training"""
    global training_status
    
    try:
        training_status["is_training"] = True
        training_status["current_model"] = model_type
        training_status["progress"] = 10
        training_status["message"] = f"Starting {model_type} model training..."
        
        # Update training service configuration
        if "epochs" in config:
            training_service.epochs = config["epochs"]
        
        training_status["progress"] = 20
        training_status["message"] = "Fetching training data from Supabase..."
        
        # Train based on type
        if model_type == "pest":
            results = training_service.train_pest_detection_model(
                min_samples_per_class=config.get("min_samples_per_class", 10),
                validation_split=config.get("validation_split", 0.2)
            )
        elif model_type == "disease":
            results = training_service.train_disease_detection_model(
                min_samples_per_class=config.get("min_samples_per_class", 10),
                validation_split=config.get("validation_split", 0.2)
            )
        elif model_type == "storage":
            results = training_service.train_storage_assessment_model(
                min_samples_per_class=config.get("min_samples_per_class", 10),
                validation_split=config.get("validation_split", 0.2)
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        training_status["progress"] = 100
        training_status["message"] = f"{model_type} model training completed successfully!"
        training_status["results"] = results
        
    except Exception as e:
        training_status["message"] = f"Training failed: {str(e)}"
        training_status["error"] = str(e)
    finally:
        training_status["is_training"] = False
        training_status["current_model"] = None


@router.post("/train")
async def start_training(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Start model training process"""
    global training_status
    
    # Check if already training
    if training_status["is_training"]:
        return {
            "success": False,
            "message": "Training already in progress",
            "current_model": training_status["current_model"],
            "progress": training_status["progress"]
        }
    
    # Validate model type
    valid_types = ["pest", "disease", "storage", "all"]
    if request.model_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model_type. Must be one of: {valid_types}"
        )
    
    # Reset status
    training_status = {
        "is_training": False,
        "current_model": None,
        "progress": 0,
        "message": "Idle"
    }
    
    config = {
        "min_samples_per_class": request.min_samples_per_class,
        "validation_split": request.validation_split,
        "epochs": request.epochs
    }
    
    # Start training in background
    if request.model_type == "all":
        # Train all models sequentially
        background_tasks.add_task(train_model_background, "pest", config)
        background_tasks.add_task(train_model_background, "disease", config)
        background_tasks.add_task(train_model_background, "storage", config)
        message = "Training started for all models"
    else:
        background_tasks.add_task(train_model_background, request.model_type, config)
        message = f"Training started for {request.model_type} model"
    
    return {
        "success": True,
        "message": message,
        "model_type": request.model_type,
        "config": config,
        "started_at": datetime.now().isoformat()
    }


@router.get("/training-status")
async def get_training_status():
    """Get current training status"""
    return {
        "success": True,
        "status": training_status,
        "checked_at": datetime.now().isoformat()
    }


@router.get("/training-history")
async def get_training_history(model_type: Optional[str] = None):
    """Get training history for models"""
    try:
        history = training_service.get_training_history(model_type)
        
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===================================
# DATA EXPORT ENDPOINTS
# ===================================

@router.post("/export-training-data")
async def export_training_data(
    prediction_type: str,
    format: str = "csv"
):
    """Export training data to file"""
    valid_types = ["pest", "disease", "storage"]
    valid_formats = ["csv", "json", "parquet"]
    
    if prediction_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid prediction_type. Must be one of: {valid_types}"
        )
    
    if format not in valid_formats:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid format. Must be one of: {valid_formats}"
        )
    
    try:
        filepath = data_service.export_training_dataset(prediction_type, format)
        
        return {
            "success": True,
            "message": "Training data exported successfully",
            "filepath": filepath,
            "format": format,
            "exported_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export-all-data")
async def export_all_training_data():
    """Export all training datasets"""
    try:
        exports = data_service.export_all_training_data()
        
        return {
            "success": True,
            "message": "All training data exported successfully",
            "exports": exports,
            "exported_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===================================
# MODEL EVALUATION ENDPOINTS
# ===================================

@router.post("/evaluate")
async def evaluate_model(model_type: str):
    """Evaluate trained model performance"""
    valid_types = ["pest", "disease", "storage"]
    
    if model_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model_type. Must be one of: {valid_types}"
        )
    
    try:
        metrics = training_service.evaluate_model_performance(model_type)
        
        return {
            "success": True,
            "model_type": model_type,
            "evaluation": metrics,
            "evaluated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===================================
# HEALTH CHECK
# ===================================

@router.get("/health")
async def health_check():
    """Check if training service is healthy"""
    return {
        "success": True,
        "status": "healthy",
        "services": {
            "data_collection": "active",
            "model_training": "active"
        },
        "training_in_progress": training_status["is_training"],
        "timestamp": datetime.now().isoformat()
    }
