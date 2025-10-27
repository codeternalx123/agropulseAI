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

def create_data_generators(dataset_path: str):
    """
    Create augmented training and validation data generators.
    
    Args:
        dataset_path: Path to dataset root directory
        
    Returns:
        tuple: (train_generator, val_generator, test_generator)
    """
    print("\n" + "="*60)
    print("DATA AUGMENTATION SETUP")
    print("="*60)
    
    # Training data augmentation (aggressive)
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=CONFIG["augmentation"]["rotation_range"],
        width_shift_range=CONFIG["augmentation"]["width_shift_range"],
        height_shift_range=CONFIG["augmentation"]["height_shift_range"],
        horizontal_flip=CONFIG["augmentation"]["horizontal_flip"],
        vertical_flip=CONFIG["augmentation"]["vertical_flip"],
        zoom_range=CONFIG["augmentation"]["zoom_range"],
        brightness_range=CONFIG["augmentation"]["brightness_range"],
        fill_mode=CONFIG["augmentation"]["fill_mode"],
        validation_split=CONFIG["validation_split"] + CONFIG["test_split"]
    )
    
    # Validation/test data (no augmentation, only rescaling)
    val_test_datagen = ImageDataGenerator(
        rescale=1./255,
        validation_split=CONFIG["test_split"] / (CONFIG["validation_split"] + CONFIG["test_split"])
    )
    
    # Training generator
    train_generator = train_datagen.flow_from_directory(
        dataset_path,
        target_size=CONFIG["image_size"],
        batch_size=CONFIG["batch_size"],
        class_mode='categorical',
        subset='training',
        shuffle=True,
        seed=42
    )
    
    # Validation + Test generator (split later)
    val_test_generator = train_datagen.flow_from_directory(
        dataset_path,
        target_size=CONFIG["image_size"],
        batch_size=CONFIG["batch_size"],
        class_mode='categorical',
        subset='validation',
        shuffle=False,
        seed=42
    )
    
    print(f"✓ Training samples: {train_generator.samples}")
    print(f"✓ Validation+Test samples: {val_test_generator.samples}")
    print(f"✓ Classes: {list(train_generator.class_indices.keys())}")
    
    return train_generator, val_test_generator


def build_mobilenet_model(num_classes: int) -> Model:
    """
    Build MobileNet V3 Small model with custom head for disease classification.
    
    Architecture:
    - Base: MobileNet V3 Small (pretrained on ImageNet)
    - Head: Global Average Pooling + Dropout + Dense layers
    - Optimization: Fine-tuning enabled after initial training
    
    Args:
        num_classes: Number of disease classes
        
    Returns:
        keras.Model: Compiled model ready for training
    """
    print("\n" + "="*60)
    print("MODEL ARCHITECTURE")
    print("="*60)
    
    # Load pretrained MobileNet V3 Small
    base_model = MobileNetV3Small(
        input_shape=CONFIG["image_size"] + (3,),
        include_top=False,
        weights='imagenet',
        pooling=None
    )
    
    # Freeze base model initially (transfer learning)
    base_model.trainable = False
    
    # Build custom head
    inputs = keras.Input(shape=CONFIG["image_size"] + (3,))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(256, activation='relu', kernel_regularizer=keras.regularizers.l2(0.01))(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs, outputs)
    
    # Compile model
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=CONFIG["learning_rate"]),
        loss='categorical_crossentropy',
        metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
    )
    
    print(f"✓ Model built: MobileNet V3 Small")
    print(f"✓ Input shape: {CONFIG['image_size'] + (3,)}")
    print(f"✓ Output classes: {num_classes}")
    print(f"✓ Total parameters: {model.count_params():,}")
    print(f"✓ Trainable parameters: {sum([tf.size(w).numpy() for w in model.trainable_weights]):,}")
    
    return model

def train_model(model: Model, train_gen, val_gen, output_dir: str) -> dict:
    """
    Train the plant health model with callbacks and checkpointing.
    
    Training strategy:
    1. Phase 1 (20 epochs): Train only custom head with frozen base
    2. Phase 2 (30 epochs): Fine-tune entire model with lower learning rate
    
    Args:
        model: Compiled Keras model
        train_gen: Training data generator
        val_gen: Validation data generator
        output_dir: Directory to save model and logs
        
    Returns:
        dict: Training history and metrics
    """
    print("\n" + "="*60)
    print("MODEL TRAINING")
    print("="*60)
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Callbacks
    callbacks = [
        # Save best model
        keras.callbacks.ModelCheckpoint(
            filepath=str(output_dir / "best_model.keras"),
            monitor='val_accuracy',
            save_best_only=True,
            mode='max',
            verbose=1
        ),
        
        # Early stopping
        keras.callbacks.EarlyStopping(
            monitor='val_accuracy',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        
        # Reduce learning rate on plateau
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        ),
        
        # TensorBoard logging
        keras.callbacks.TensorBoard(
            log_dir=str(output_dir / "logs"),
            histogram_freq=1
        ),
        
        # CSV logger
        keras.callbacks.CSVLogger(
            filename=str(output_dir / "training_log.csv")
        )
    ]
    
    # Phase 1: Train custom head only (frozen base)
    print("\n--- PHASE 1: Training custom head (20 epochs) ---")
    history_phase1 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=20,
        callbacks=callbacks,
        verbose=1
    )
    
    # Phase 2: Fine-tune entire model
    print("\n--- PHASE 2: Fine-tuning entire model (30 epochs) ---")
    
    # Unfreeze base model
    model.layers[1].trainable = True  # base_model is layer 1
    
    # Recompile with lower learning rate
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=CONFIG["learning_rate"] * 0.1),
        loss='categorical_crossentropy',
        metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
    )
    
    print(f"✓ Unfrozen base model for fine-tuning")
    print(f"✓ Trainable parameters: {sum([tf.size(w).numpy() for w in model.trainable_weights]):,}")
    
    # Continue training
    history_phase2 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=30,
        initial_epoch=20,
        callbacks=callbacks,
        verbose=1
    )
    
    # Combine histories
    history = {
        "accuracy": history_phase1.history['accuracy'] + history_phase2.history['accuracy'],
        "val_accuracy": history_phase1.history['val_accuracy'] + history_phase2.history['val_accuracy'],
        "loss": history_phase1.history['loss'] + history_phase2.history['loss'],
        "val_loss": history_phase1.history['val_loss'] + history_phase2.history['val_loss'],
        "top_3_accuracy": history_phase1.history['top_3_accuracy'] + history_phase2.history['top_3_accuracy'],
        "val_top_3_accuracy": history_phase1.history['val_top_3_accuracy'] + history_phase2.history['val_top_3_accuracy']
    }
    
    # Print final metrics
    final_val_accuracy = history["val_accuracy"][-1]
    final_val_top3 = history["val_top_3_accuracy"][-1]
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    print(f"Final validation accuracy: {final_val_accuracy:.4f}")
    print(f"Final validation top-3 accuracy: {final_val_top3:.4f}")
    
    if final_val_accuracy >= CONFIG["min_accuracy_target"]:
        print(f"✓ Target accuracy achieved! ({CONFIG['min_accuracy_target']:.2%})")
    else:
        print(f"⚠️  Target accuracy not met. Need {CONFIG['min_accuracy_target']:.2%}, got {final_val_accuracy:.2%}")
    
    return history

def convert_to_tflite(keras_model_path: str, output_dir: str) -> dict:
    """
    Convert trained Keras model to TensorFlow Lite with optimizations.
    
    Optimizations:
    - Dynamic range quantization (8-bit weights)
    - Reduced model size (~75% reduction)
    - Faster inference on mobile devices
    
    Args:
        keras_model_path: Path to saved Keras model
        output_dir: Directory to save TFLite models
        
    Returns:
        dict: Conversion metrics and file paths
    """
    print("\n" + "="*60)
    print("TFLITE CONVERSION")
    print("="*60)
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load Keras model
    model = keras.models.load_model(keras_model_path)
    
    # Convert to TFLite with quantization
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]  # Dynamic range quantization
    
    tflite_model = converter.convert()
    
    # Save TFLite model
    tflite_path = output_dir / "plant_health_model.tflite"
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
    
    # Get file sizes
    keras_size = Path(keras_model_path).stat().st_size
    tflite_size = tflite_path.stat().st_size
    compression_ratio = (1 - tflite_size / keras_size) * 100
    
    print(f"✓ TFLite model saved: {tflite_path}")
    print(f"✓ Keras model size: {keras_size / 1024 / 1024:.2f} MB")
    print(f"✓ TFLite model size: {tflite_size / 1024 / 1024:.2f} MB")
    print(f"✓ Compression: {compression_ratio:.1f}% size reduction")
    
    # Test inference speed
    print("\nTesting inference speed...")
    interpreter = tf.lite.Interpreter(model_path=str(tflite_path))
    interpreter.allocate_tensors()
    
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    # Run 100 inferences
    import time
    dummy_input = np.random.rand(1, 224, 224, 3).astype(np.float32)
    
    times = []
    for _ in range(100):
        start = time.time()
        interpreter.set_tensor(input_details[0]['index'], dummy_input)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]['index'])
        times.append((time.time() - start) * 1000)  # ms
    
    avg_inference_time = np.mean(times)
    print(f"✓ Average inference time: {avg_inference_time:.2f} ms")
    
    if avg_inference_time <= 150:
        print("✓ Inference speed target met (<150ms)")
    else:
        print(f"⚠️  Inference slower than target (150ms)")
    
    return {
        "keras_size_mb": keras_size / 1024 / 1024,
        "tflite_size_mb": tflite_size / 1024 / 1024,
        "compression_ratio": compression_ratio,
        "avg_inference_time_ms": avg_inference_time,
        "tflite_path": str(tflite_path)
    }

def save_metadata(output_dir: str, validation_report: dict, history: dict, tflite_metrics: dict):
    """
    Save training metadata and model card.
    
    Args:
        output_dir: Output directory
        validation_report: Dataset validation results
        history: Training history
        tflite_metrics: TFLite conversion metrics
    """
    output_dir = Path(output_dir)
    
    metadata = {
        "model_name": "AgroShield Plant Health Detection",
        "model_type": "MobileNet V3 Small",
        "training_date": datetime.now().isoformat(),
        "config": CONFIG,
        "dataset": validation_report,
        "training": {
            "final_val_accuracy": float(history["val_accuracy"][-1]),
            "final_val_top3_accuracy": float(history["val_top_3_accuracy"][-1]),
            "final_train_accuracy": float(history["accuracy"][-1]),
            "total_epochs": len(history["accuracy"])
        },
        "tflite": tflite_metrics,
        "deployment": {
            "target_platform": "Android/iOS",
            "input_shape": [1, 224, 224, 3],
            "output_shape": [1, len(CONFIG["classes"])],
            "classes": CONFIG["classes"],
            "preprocessing": "Rescale to [0, 1] by dividing by 255"
        }
    }
    
    # Save JSON
    with open(output_dir / "model_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # Save model card (Markdown)
    model_card = f"""# AgroShield Plant Health Detection Model

## Model Overview
- **Model Type**: MobileNet V3 Small (Transfer Learning)
- **Task**: Multi-class image classification (plant disease detection)
- **Training Date**: {metadata['training_date']}
- **Target Accuracy**: {CONFIG['min_accuracy_target']:.1%}
- **Achieved Accuracy**: {metadata['training']['final_val_accuracy']:.2%}

## Dataset
- **Total Images**: {validation_report['total_images']}
- **Classes**: {len(CONFIG['classes'])}
- **Images per Class**: {CONFIG['min_images_per_class']}+

### Disease Classes
{chr(10).join(f"- {cls}" for cls in CONFIG['classes'])}

## Model Performance
- **Validation Accuracy**: {metadata['training']['final_val_accuracy']:.2%}
- **Top-3 Accuracy**: {metadata['training']['final_val_top3_accuracy']:.2%}
- **Training Epochs**: {metadata['training']['total_epochs']}

## TensorFlow Lite Deployment
- **Model Size**: {tflite_metrics['tflite_size_mb']:.2f} MB
- **Inference Time**: {tflite_metrics['avg_inference_time_ms']:.2f} ms (CPU)
- **Compression**: {tflite_metrics['compression_ratio']:.1f}% size reduction

## Usage

### Android (Kotlin)
```kotlin
val interpreter = Interpreter(loadModelFile("plant_health_model.tflite"))
val input = preprocessImage(bitmap) // [1, 224, 224, 3]
val output = Array(1) {{ FloatArray({len(CONFIG['classes'])}) }}
interpreter.run(input, output)
val predictedClass = output[0].indices.maxByOrNull {{ output[0][it] }}
```

### Python (TensorFlow Lite)
```python
import tensorflow as tf
interpreter = tf.lite.Interpreter(model_path="plant_health_model.tflite")
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()
interpreter.set_tensor(input_details[0]['index'], input_data)
interpreter.invoke()
predictions = interpreter.get_tensor(output_details[0]['index'])
```

## Preprocessing
1. Resize image to 224×224 pixels
2. Convert to RGB (3 channels)
3. Rescale pixel values: `pixel_value / 255.0`

## Postprocessing
1. Get class probabilities from softmax output
2. Select class with highest probability
3. Apply confidence threshold (recommended: 0.75)

## Limitations
- Trained on Kenyan crop diseases (generalization to other regions may vary)
- Requires well-lit images with clear disease symptoms
- Performance degrades with motion blur or poor lighting

## Citation
```
AgroShield Plant Health Detection Model
Trained: {metadata['training_date'].split('T')[0]}
Architecture: MobileNet V3 Small
Framework: TensorFlow Lite
```
"""
    
    with open(output_dir / "MODEL_CARD.md", 'w') as f:
        f.write(model_card)
    
    print(f"\n✓ Metadata saved: {output_dir / 'model_metadata.json'}")
    print(f"✓ Model card saved: {output_dir / 'MODEL_CARD.md'}")


def plot_training_history(history: dict, output_dir: str):
    """
    Plot training curves and save figures.
    
    Args:
        history: Training history dictionary
        output_dir: Output directory for plots
    """
    output_dir = Path(output_dir)
    
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # Accuracy
    axes[0, 0].plot(history['accuracy'], label='Train')
    axes[0, 0].plot(history['val_accuracy'], label='Validation')
    axes[0, 0].axhline(y=CONFIG['min_accuracy_target'], color='r', linestyle='--', label='Target')
    axes[0, 0].set_title('Model Accuracy')
    axes[0, 0].set_xlabel('Epoch')
    axes[0, 0].set_ylabel('Accuracy')
    axes[0, 0].legend()
    axes[0, 0].grid(True)
    
    # Loss
    axes[0, 1].plot(history['loss'], label='Train')
    axes[0, 1].plot(history['val_loss'], label='Validation')
    axes[0, 1].set_title('Model Loss')
    axes[0, 1].set_xlabel('Epoch')
    axes[0, 1].set_ylabel('Loss')
    axes[0, 1].legend()
    axes[0, 1].grid(True)
    
    # Top-3 Accuracy
    axes[1, 0].plot(history['top_3_accuracy'], label='Train')
    axes[1, 0].plot(history['val_top_3_accuracy'], label='Validation')
    axes[1, 0].set_title('Top-3 Accuracy')
    axes[1, 0].set_xlabel('Epoch')
    axes[1, 0].set_ylabel('Accuracy')
    axes[1, 0].legend()
    axes[1, 0].grid(True)
    
    # Learning rate (if available)
    axes[1, 1].text(0.5, 0.5, 'Training Complete\n\n' + 
                    f'Final Val Accuracy: {history["val_accuracy"][-1]:.2%}\n' +
                    f'Final Top-3 Accuracy: {history["val_top_3_accuracy"][-1]:.2%}',
                    ha='center', va='center', fontsize=14)
    axes[1, 1].axis('off')
    
    plt.tight_layout()
    plt.savefig(output_dir / 'training_curves.png', dpi=150)
    print(f"✓ Training curves saved: {output_dir / 'training_curves.png'}")

def main():
    """
    Main training pipeline.
    """
    print("\n" + "="*60)
    print("AGROSHIELD PLANT HEALTH MODEL TRAINING")
    print("="*60)
    print(f"Target: MobileNet V3 Small with >{CONFIG['min_accuracy_target']:.0%} accuracy")
    print(f"Classes: {len(CONFIG['classes'])}")
    print("="*60)
    
    # Paths
    DATASET_PATH = "data/plant_diseases"  # Update this path
    OUTPUT_DIR = "models/plant_health"
    
    # Step 1: Validate dataset
    validation_report = validate_dataset(DATASET_PATH)
    if not validation_report["valid"]:
        print("\n❌ Dataset validation failed!")
        print("Please ensure dataset structure is correct:")
        print(f"  {DATASET_PATH}/")
        for cls in CONFIG["classes"]:
            print(f"    {cls}/ ({CONFIG['min_images_per_class']}+ images)")
        return
    
    # Step 2: Create data generators
    train_gen, val_gen = create_data_generators(DATASET_PATH)
    
    # Step 3: Build model
    model = build_mobilenet_model(num_classes=len(CONFIG["classes"]))
    
    # Step 4: Train model
    history = train_model(model, train_gen, val_gen, OUTPUT_DIR)
    
    # Step 5: Convert to TFLite
    keras_model_path = os.path.join(OUTPUT_DIR, "best_model.keras")
    tflite_metrics = convert_to_tflite(keras_model_path, OUTPUT_DIR)
    
    # Step 6: Save metadata
    save_metadata(OUTPUT_DIR, validation_report, history, tflite_metrics)
    
    # Step 7: Plot training curves
    plot_training_history(history, OUTPUT_DIR)
    
    print("\n" + "="*60)
    print("✓ TRAINING PIPELINE COMPLETE")
    print("="*60)
    print(f"Model saved: {OUTPUT_DIR}")
    print(f"TFLite model: {tflite_metrics['tflite_path']}")
    print(f"Ready for deployment to mobile devices!")


if __name__ == "__main__":
    main()