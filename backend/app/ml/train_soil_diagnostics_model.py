"""
AgroShield - Soil Diagnostics Model Training Pipeline
EfficientNet B0 training for NPK deficiency detection

Target: >80% accuracy on validation set
Dataset: Soil images correlated with lab NPK measurements
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import EfficientNetB0
import numpy as np
import pandas as pd
from pathlib import Path
import json
from datetime import datetime

# Configuration
CONFIG = {
    "image_size": (224, 224),
    "batch_size": 32,
    "epochs": 40,
    "learning_rate": 0.0005,
    "validation_split": 0.2,
    "min_accuracy_target": 0.80,
    "npk_ranges": {
        "nitrogen": {"low": 20, "medium": 40, "high": 60},  # ppm
        "phosphorus": {"low": 10, "medium": 25, "high": 40},  # ppm
        "potassium": {"low": 100, "medium": 200, "high": 300}  # ppm
    },
    "classes": [
        "npk_adequate",
        "n_deficient",
        "p_deficient",
        "k_deficient",
        "np_deficient",
        "nk_deficient",
        "pk_deficient",
        "npk_deficient"
    ]
}


def load_soil_dataset(dataset_path: str) -> tuple:
    """
    Load soil images with NPK lab measurements.
    
    Expected CSV format:
    image_path,nitrogen_ppm,phosphorus_ppm,potassium_ppm
    soil_001.jpg,45,18,250
    soil_002.jpg,15,8,120
    
    Args:
        dataset_path: Path to dataset directory with images/ and labels.csv
        
    Returns:
        tuple: (images_array, labels_array, metadata_df)
    """
    print("\n" + "="*60)
    print("LOADING SOIL DATASET")
    print("="*60)
    
    dataset_path = Path(dataset_path)
    labels_df = pd.read_csv(dataset_path / "labels.csv")
    
    print(f"✓ Found {len(labels_df)} soil samples")
    
    # Classify based on NPK levels
    def classify_soil(row):
        n_def = row['nitrogen_ppm'] < CONFIG['npk_ranges']['nitrogen']['low']
        p_def = row['phosphorus_ppm'] < CONFIG['npk_ranges']['phosphorus']['low']
        k_def = row['potassium_ppm'] < CONFIG['npk_ranges']['potassium']['low']
        
        if not (n_def or p_def or k_def):
            return "npk_adequate"
        elif n_def and p_def and k_def:
            return "npk_deficient"
        elif n_def and p_def:
            return "np_deficient"
        elif n_def and k_def:
            return "nk_deficient"
        elif p_def and k_def:
            return "pk_deficient"
        elif n_def:
            return "n_deficient"
        elif p_def:
            return "p_deficient"
        else:
            return "k_deficient"
    
    labels_df['soil_class'] = labels_df.apply(classify_soil, axis=1)
    
    # Print class distribution
    print("\nClass distribution:")
    for cls, count in labels_df['soil_class'].value_counts().items():
        print(f"  {cls}: {count}")
    
    return labels_df


def build_efficientnet_model(num_classes: int) -> Model:
    """
    Build EfficientNet B0 model for soil diagnostics.
    
    Args:
        num_classes: Number of soil deficiency classes
        
    Returns:
        keras.Model: Compiled model
    """
    print("\n" + "="*60)
    print("MODEL ARCHITECTURE")
    print("="*60)
    
    base_model = EfficientNetB0(
        input_shape=CONFIG["image_size"] + (3,),
        include_top=False,
        weights='imagenet'
    )
    
    base_model.trainable = False
    
    inputs = keras.Input(shape=CONFIG["image_size"] + (3,))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs, outputs)
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=CONFIG["learning_rate"]),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    print(f"✓ EfficientNet B0 model built")
    print(f"✓ Total parameters: {model.count_params():,}")
    
    return model


def convert_to_tflite_soil(keras_model_path: str, output_dir: str):
    """
    Convert soil diagnostics model to TFLite.
    
    Args:
        keras_model_path: Path to Keras model
        output_dir: Output directory
    """
    model = keras.models.load_model(keras_model_path)
    
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()
    
    tflite_path = Path(output_dir) / "soil_diagnostics_model.tflite"
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
    
    print(f"✓ TFLite soil model saved: {tflite_path}")
    return str(tflite_path)


def main():
    """
    Main training pipeline for soil diagnostics.
    """
    print("\n" + "="*60)
    print("AGROSHIELD SOIL DIAGNOSTICS MODEL TRAINING")
    print("="*60)
    
    DATASET_PATH = "data/soil_images"
    OUTPUT_DIR = "models/soil_diagnostics"
    
    # Load dataset
    labels_df = load_soil_dataset(DATASET_PATH)
    
    # Build model
    model = build_efficientnet_model(num_classes=len(CONFIG["classes"]))
    
    print("\n✓ Model training pipeline ready")
    print("Note: Implement full training loop similar to plant_health_model.py")


if __name__ == "__main__":
    main()
