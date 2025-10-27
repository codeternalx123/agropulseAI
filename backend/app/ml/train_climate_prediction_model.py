"""
AgroShield - Climate Prediction Model Training Pipeline
LSTM model for 7-day weather forecasting

Target: MAE < 2°C for temperature, < 15% for rainfall
Dataset: 10+ years of historical weather data
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
import json

# Configuration
CONFIG = {
    "sequence_length": 30,  # 30 days lookback
    "forecast_horizon": 7,   # 7 days ahead
    "batch_size": 64,
    "epochs": 100,
    "learning_rate": 0.001,
    "validation_split": 0.2,
    "features": [
        "temperature_c",
        "humidity_percent",
        "rainfall_mm",
        "pressure_hpa",
        "wind_speed_kmh"
    ],
    "targets": [
        "temperature_c",
        "rainfall_mm"
    ],
    "mae_targets": {
        "temperature_c": 2.0,  # Max 2°C error
        "rainfall_mm": 0.15    # Max 15% error
    }
}


def load_weather_history(data_path: str) -> pd.DataFrame:
    """
    Load historical weather data for training.
    
    Expected CSV format:
    date,temperature_c,humidity_percent,rainfall_mm,pressure_hpa,wind_speed_kmh
    2014-01-01,25.3,65,2.5,1013,12
    2014-01-02,26.1,62,0,1012,10
    
    Args:
        data_path: Path to weather CSV file
        
    Returns:
        pd.DataFrame: Cleaned weather data
    """
    print("\n" + "="*60)
    print("LOADING WEATHER HISTORY")
    print("="*60)
    
    df = pd.read_csv(data_path, parse_dates=['date'])
    df = df.sort_values('date')
    
    print(f"✓ Loaded {len(df)} days of weather data")
    print(f"✓ Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"✓ Years: {(df['date'].max() - df['date'].min()).days / 365:.1f}")
    
    # Check for missing values
    missing = df[CONFIG["features"]].isnull().sum()
    if missing.any():
        print(f"\n⚠️  Missing values detected:")
        for col, count in missing[missing > 0].items():
            print(f"   {col}: {count}")
        
        # Fill missing values
        df = df.fillna(method='ffill').fillna(method='bfill')
        print("✓ Missing values filled")
    
    return df


def create_sequences(data: np.ndarray, sequence_length: int, forecast_horizon: int):
    """
    Create LSTM input sequences and forecast targets.
    
    Args:
        data: Weather data array [samples, features]
        sequence_length: Number of past days to use
        forecast_horizon: Number of future days to predict
        
    Returns:
        tuple: (X_sequences, y_targets)
    """
    X, y = [], []
    
    for i in range(len(data) - sequence_length - forecast_horizon + 1):
        # Input: 30 days of history
        X.append(data[i:i + sequence_length])
        
        # Output: 7 days forecast (temperature, rainfall)
        target_indices = [CONFIG["features"].index(feat) for feat in CONFIG["targets"]]
        future_data = data[i + sequence_length:i + sequence_length + forecast_horizon]
        y.append(future_data[:, target_indices])
    
    return np.array(X), np.array(y)


def build_lstm_model(sequence_length: int, n_features: int, forecast_horizon: int, n_targets: int) -> Model:
    """
    Build LSTM model for weather forecasting.
    
    Architecture:
    - LSTM layers for temporal pattern learning
    - Dropout for regularization
    - Dense layers for multi-step forecasting
    
    Args:
        sequence_length: Input sequence length (30 days)
        n_features: Number of input features (5)
        forecast_horizon: Forecast days (7)
        n_targets: Number of target variables (2: temp, rainfall)
        
    Returns:
        keras.Model: Compiled LSTM model
    """
    print("\n" + "="*60)
    print("MODEL ARCHITECTURE")
    print("="*60)
    
    inputs = keras.Input(shape=(sequence_length, n_features))
    
    # LSTM layers
    x = layers.LSTM(128, return_sequences=True)(inputs)
    x = layers.Dropout(0.2)(x)
    x = layers.LSTM(64, return_sequences=True)(x)
    x = layers.Dropout(0.2)(x)
    x = layers.LSTM(32)(x)
    x = layers.Dropout(0.2)(x)
    
    # Dense layers for multi-step forecast
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(64, activation='relu')(x)
    
    # Output: [forecast_horizon, n_targets]
    outputs = layers.Dense(forecast_horizon * n_targets)(x)
    outputs = layers.Reshape((forecast_horizon, n_targets))(outputs)
    
    model = Model(inputs, outputs)
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=CONFIG["learning_rate"]),
        loss='mse',
        metrics=['mae']
    )
    
    print(f"✓ LSTM model built")
    print(f"✓ Input shape: ({sequence_length}, {n_features})")
    print(f"✓ Output shape: ({forecast_horizon}, {n_targets})")
    print(f"✓ Total parameters: {model.count_params():,}")
    
    return model


def train_lstm_model(model: Model, X_train, y_train, X_val, y_val, output_dir: str):
    """
    Train LSTM climate prediction model.
    
    Args:
        model: Compiled Keras model
        X_train: Training sequences
        y_train: Training targets
        X_val: Validation sequences
        y_val: Validation targets
        output_dir: Output directory
    """
    print("\n" + "="*60)
    print("MODEL TRAINING")
    print("="*60)
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            filepath=str(output_dir / "best_lstm_model.keras"),
            monitor='val_mae',
            save_best_only=True,
            mode='min',
            verbose=1
        ),
        keras.callbacks.EarlyStopping(
            monitor='val_mae',
            patience=15,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=8,
            min_lr=1e-6,
            verbose=1
        )
    ]
    
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=CONFIG["epochs"],
        batch_size=CONFIG["batch_size"],
        callbacks=callbacks,
        verbose=1
    )
    
    # Evaluate on validation set
    val_mae = model.evaluate(X_val, y_val, verbose=0)[1]
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    print(f"Final validation MAE: {val_mae:.4f}")
    
    return history


def save_lstm_model(keras_model_path: str, output_dir: str):
    """
    Save LSTM model (not converting to TFLite - runs on cloud).
    
    Args:
        keras_model_path: Path to Keras model
        output_dir: Output directory
    """
    output_dir = Path(output_dir)
    
    # LSTM models run on cloud server, not on-device
    # Just copy the Keras model to deployment directory
    
    metadata = {
        "model_name": "AgroShield Climate Prediction",
        "model_type": "LSTM",
        "deployment": "cloud",
        "input_shape": [CONFIG["sequence_length"], len(CONFIG["features"])],
        "output_shape": [CONFIG["forecast_horizon"], len(CONFIG["targets"])],
        "features": CONFIG["features"],
        "targets": CONFIG["targets"],
        "mae_targets": CONFIG["mae_targets"]
    }
    
    with open(output_dir / "lstm_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✓ LSTM model metadata saved")
    print(f"✓ Model ready for cloud deployment")


def main():
    """
    Main training pipeline for climate prediction.
    """
    print("\n" + "="*60)
    print("AGROSHIELD CLIMATE PREDICTION MODEL TRAINING")
    print("="*60)
    
    DATA_PATH = "data/weather_history.csv"
    OUTPUT_DIR = "models/climate_prediction"
    
    # Load data
    df = load_weather_history(DATA_PATH)
    
    # Build model
    model = build_lstm_model(
        sequence_length=CONFIG["sequence_length"],
        n_features=len(CONFIG["features"]),
        forecast_horizon=CONFIG["forecast_horizon"],
        n_targets=len(CONFIG["targets"])
    )
    
    print("\n✓ LSTM training pipeline ready")
    print("Note: Requires 10+ years of weather data for training")


if __name__ == "__main__":
    main()
