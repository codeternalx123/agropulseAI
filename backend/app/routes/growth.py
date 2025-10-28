from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os
import uuid
from pathlib import Path
import json
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

# Create directories for storing plots and data
PLOTS_DIR = Path("uploads/growth_plots")
DATA_DIR = Path("uploads/growth_data")
PLOTS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

class GrowthData(BaseModel):
    plant_id: str
    height: float
    leaf_count: int
    stem_diameter: float
    date: str
    notes: Optional[str] = ""

class PlotRequest(BaseModel):
    plant_id: str
    plot_type: str = "height"  # height, leaf_count, stem_diameter, all
    days_back: int = 30

# Sample data storage (in production, use a database)
growth_records = {}

@router.post("/record")
async def record_growth_data(data: GrowthData):
    """Record new growth measurement"""
    if data.plant_id not in growth_records:
        growth_records[data.plant_id] = []
    
    growth_records[data.plant_id].append(data.dict())
    
    # Save to file for persistence
    data_file = DATA_DIR / f"{data.plant_id}.json"
    with open(data_file, 'w') as f:
        json.dump(growth_records[data.plant_id], f, indent=2)
    
    return {"message": "Growth data recorded successfully", "plant_id": data.plant_id}

@router.get("/data/{plant_id}")
async def get_growth_data(plant_id: str):
    """Get growth data for a specific plant"""
    # Try to load from file if not in memory
    if plant_id not in growth_records:
        data_file = DATA_DIR / f"{plant_id}.json"
        if data_file.exists():
            with open(data_file, 'r') as f:
                growth_records[plant_id] = json.load(f)
        else:
            raise HTTPException(status_code=404, detail="Plant data not found")
    
    return {"plant_id": plant_id, "data": growth_records[plant_id]}

@router.post("/plot")
async def generate_growth_plot(request: PlotRequest):
    """Generate growth tracking plot"""
    plant_id = request.plant_id
    
    # Load data
    if plant_id not in growth_records:
        data_file = DATA_DIR / f"{plant_id}.json"
        if data_file.exists():
            with open(data_file, 'r') as f:
                growth_records[plant_id] = json.load(f)
        else:
            # Generate sample data if none exists
            growth_records[plant_id] = generate_sample_data(plant_id)
    
    data = growth_records[plant_id]
    
    if not data:
        raise HTTPException(status_code=404, detail="No growth data found for this plant")
    
    # Convert to DataFrame for easier plotting
    df = pd.DataFrame(data)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    
    # Filter by date range
    cutoff_date = datetime.now() - timedelta(days=request.days_back)
    df = df[df['date'] >= cutoff_date]
    
    if df.empty:
        raise HTTPException(status_code=404, detail="No data in the specified date range")
    
    # Generate plot
    plot_filename = f"{plant_id}_{request.plot_type}_{uuid.uuid4().hex[:8]}.png"
    plot_path = PLOTS_DIR / plot_filename
    
    # Create the plot
    plt.style.use('default')
    fig, ax = plt.subplots(figsize=(12, 8))
    fig.patch.set_facecolor('white')
    
    if request.plot_type == "all":
        # Multiple subplots
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        fig.patch.set_facecolor('white')
        fig.suptitle(f'Growth Tracking - Plant {plant_id}', fontsize=16, fontweight='bold')
        
        # Height plot
        axes[0, 0].plot(df['date'], df['height'], 'b-o', linewidth=2, markersize=6)
        axes[0, 0].set_title('Plant Height (cm)', fontweight='bold')
        axes[0, 0].set_ylabel('Height (cm)')
        axes[0, 0].grid(True, alpha=0.3)
        axes[0, 0].tick_params(axis='x', rotation=45)
        
        # Leaf count plot
        axes[0, 1].plot(df['date'], df['leaf_count'], 'g-s', linewidth=2, markersize=6)
        axes[0, 1].set_title('Leaf Count', fontweight='bold')
        axes[0, 1].set_ylabel('Number of Leaves')
        axes[0, 1].grid(True, alpha=0.3)
        axes[0, 1].tick_params(axis='x', rotation=45)
        
        # Stem diameter plot
        axes[1, 0].plot(df['date'], df['stem_diameter'], 'r-^', linewidth=2, markersize=6)
        axes[1, 0].set_title('Stem Diameter (mm)', fontweight='bold')
        axes[1, 0].set_ylabel('Diameter (mm)')
        axes[1, 0].set_xlabel('Date')
        axes[1, 0].grid(True, alpha=0.3)
        axes[1, 0].tick_params(axis='x', rotation=45)
        
        # Growth rate plot (height change)
        if len(df) > 1:
            growth_rate = df['height'].diff().fillna(0)
            axes[1, 1].bar(df['date'], growth_rate, color='orange', alpha=0.7)
            axes[1, 1].set_title('Height Growth Rate (cm/day)', fontweight='bold')
            axes[1, 1].set_ylabel('Growth Rate (cm)')
            axes[1, 1].set_xlabel('Date')
            axes[1, 1].grid(True, alpha=0.3)
            axes[1, 1].tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        
    else:
        # Single plot
        if request.plot_type == "height":
            ax.plot(df['date'], df['height'], 'b-o', linewidth=3, markersize=8, label='Height')
            ax.set_ylabel('Height (cm)', fontsize=12)
            ax.set_title(f'Plant Height Growth - {plant_id}', fontsize=14, fontweight='bold')
            
        elif request.plot_type == "leaf_count":
            ax.plot(df['date'], df['leaf_count'], 'g-s', linewidth=3, markersize=8, label='Leaf Count')
            ax.set_ylabel('Number of Leaves', fontsize=12)
            ax.set_title(f'Leaf Count Growth - {plant_id}', fontsize=14, fontweight='bold')
            
        elif request.plot_type == "stem_diameter":
            ax.plot(df['date'], df['stem_diameter'], 'r-^', linewidth=3, markersize=8, label='Stem Diameter')
            ax.set_ylabel('Diameter (mm)', fontsize=12)
            ax.set_title(f'Stem Diameter Growth - {plant_id}', fontsize=14, fontweight='bold')
        
        ax.set_xlabel('Date', fontsize=12)
        ax.grid(True, alpha=0.3)
        ax.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
    
    # Save the plot with high DPI
    plt.savefig(plot_path, dpi=300, bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()  # Important: close the figure to free memory
    
    # Return the plot URL
    plot_url = f"/uploads/growth_plots/{plot_filename}"
    
    return {
        "message": "Plot generated successfully",
        "plot_url": plot_url,
        "plot_path": str(plot_path),
        "data_points": len(df)
    }

@router.get("/plot/{plant_id}")
async def get_latest_plot(plant_id: str, plot_type: str = "height"):
    """Get the latest plot for a plant"""
    # Check if any plots exist for this plant
    plot_files = list(PLOTS_DIR.glob(f"{plant_id}_{plot_type}_*.png"))
    
    if not plot_files:
        # Generate a new plot
        request = PlotRequest(plant_id=plant_id, plot_type=plot_type)
        result = await generate_growth_plot(request)
        return result
    
    # Return the most recent plot
    latest_plot = max(plot_files, key=os.path.getctime)
    plot_url = f"/uploads/growth_plots/{latest_plot.name}"
    
    return {
        "message": "Latest plot retrieved",
        "plot_url": plot_url,
        "plot_path": str(latest_plot)
    }

@router.get("/plants")
async def list_plants():
    """List all plants with data"""
    plants = []
    
    # Check memory
    for plant_id in growth_records.keys():
        plants.append(plant_id)
    
    # Check files
    for data_file in DATA_DIR.glob("*.json"):
        plant_id = data_file.stem
        if plant_id not in plants:
            plants.append(plant_id)
    
    return {"plants": plants}

def generate_sample_data(plant_id: str) -> List[dict]:
    """Generate sample growth data for testing"""
    base_date = datetime.now() - timedelta(days=30)
    sample_data = []
    
    # Starting values
    height = 10.0
    leaf_count = 5
    stem_diameter = 2.0
    
    for i in range(31):  # 31 days of data
        date = base_date + timedelta(days=i)
        
        # Simulate growth with some randomness
        height += np.random.normal(0.5, 0.2)  # Average 0.5cm growth per day
        leaf_count += np.random.choice([0, 0, 0, 1], p=[0.7, 0.1, 0.1, 0.1])  # Occasional new leaf
        stem_diameter += np.random.normal(0.05, 0.02)  # Slow diameter growth
        
        # Ensure positive values
        height = max(height, 1.0)
        leaf_count = max(leaf_count, 1)
        stem_diameter = max(stem_diameter, 1.0)
        
        sample_data.append({
            "plant_id": plant_id,
            "height": round(height, 1),
            "leaf_count": int(leaf_count),
            "stem_diameter": round(stem_diameter, 1),
            "date": date.isoformat(),
            "notes": f"Day {i+1} measurement"
        })
    
    return sample_data

@router.delete("/plant/{plant_id}")
async def delete_plant_data(plant_id: str):
    """Delete all data for a specific plant"""
    # Remove from memory
    if plant_id in growth_records:
        del growth_records[plant_id]
    
    # Remove data file
    data_file = DATA_DIR / f"{plant_id}.json"
    if data_file.exists():
        data_file.unlink()
    
    # Remove plot files
    plot_files = list(PLOTS_DIR.glob(f"{plant_id}_*.png"))
    for plot_file in plot_files:
        plot_file.unlink()
    
    return {"message": f"All data for plant {plant_id} deleted successfully"}