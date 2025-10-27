"""
AgroShield - Plant Health Model Training Pipeline
MobileNet V3 training for disease detection with TensorFlow Lite optimization

Target: >88% accuracy on validation set
Dataset: 500+ images per disease class for Kenyan crops
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import MobileNetV3Small
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import os
import json
import numpy as np
from datetime import datetime
from pathlib import Path
import matplotlib.pyplot as plt

# Configuration
CONFIG = {
    "image_size": (224, 224),
    "batch_size": 32,
    "epochs": 50,
    "learning_rate": 0.001,
    "validation_split": 0.2,
    "test_split": 0.1,
    "min_accuracy_target": 0.88,
    "classes": [
        "healthy",
        "late_blight",
        "early_blight",
        "bacterial_wilt",
        "powdery_mildew",
        "leaf_rust",
        "fall_armyworm",
        "maize_streak_virus",
        "anthracnose",
        "fusarium_wilt"
    ],
    "min_images_per_class": 500,
    "augmentation": {
        "rotation_range": 20,
        "width_shift_range": 0.2,
        "height_shift_range": 0.2,
        "horizontal_flip": True,
        "vertical_flip": False,
        "zoom_range": 0.15,
        "brightness_range": [0.8, 1.2],
        "fill_mode": "nearest"
    }
}

def validate_dataset(dataset_path: str) -> dict:
    """
    Validate dataset structure and image counts.
    
    Expected structure:
    dataset_path/
        healthy/
            image_001.jpg
            image_002.jpg
            ...
        late_blight/
            image_001.jpg
            ...
        
    Returns:
        dict: Validation report with counts and warnings
    """
    print("\n" + "="*60)
    print("DATASET VALIDATION")
    print("="*60)
    
    dataset_path = Path(dataset_path)
    validation_report = {
        "total_images": 0,
        "classes": {},
        "warnings": [],
        "valid": True
    }
    
    if not dataset_path.exists():
        validation_report["valid"] = False
        validation_report["warnings"].append(f"Dataset path does not exist: {dataset_path}")
        return validation_report
    
    # Check each class folder
    for class_name in CONFIG["classes"]:
        class_path = dataset_path / class_name
        
        if not class_path.exists():
            validation_report["valid"] = False
            validation_report["warnings"].append(f"Missing class folder: {class_name}")
            validation_report["classes"][class_name] = 0
            continue
        
        # Count images
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
        images = [f for f in class_path.iterdir() 
                 if f.suffix.lower() in image_extensions]
        image_count = len(images)
        
        validation_report["classes"][class_name] = image_count
        validation_report["total_images"] += image_count
        
        # Check minimum requirement
        if image_count < CONFIG["min_images_per_class"]:
            validation_report["warnings"].append(
                f"⚠️  {class_name}: {image_count} images "
                f"(need {CONFIG['min_images_per_class']})"
            )
        else:
            print(f"✓ {class_name}: {image_count} images")
    
    # Print summary
    print(f"\nTotal images: {validation_report['total_images']}")
    print(f"Total classes: {len(CONFIG['classes'])}")
    
    if validation_report["warnings"]:
        print("\n⚠️  WARNINGS:")
        for warning in validation_report["warnings"]:
            print(f"   {warning}")
    
    return validation_report

    