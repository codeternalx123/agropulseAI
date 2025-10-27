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
