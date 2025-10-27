from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import (
    predict, farms, scan, growth, storage, partners, groups, notifications, 
    climate, village_groups, upload, subscription, premium, payments, regional, 
    farmer_marketplace, buyer_marketplace, auth, location, exchange, market_linkages, 
    drone_intelligence, ai_prediction, model_training_routes, advanced_growth_routes,
    plot_analytics_routes
)
from pathlib import Path

app = FastAPI(title='AgroShield Final')

app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

# Mount uploads directory for serving static files
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Authentication routes
app.include_router(auth.router, prefix='/api/auth', tags=['Authentication'])

# Location & Climate Intelligence
app.include_router(location.router, prefix='/api/location', tags=['Location'])

# Feature routes
app.include_router(predict.router, prefix='/api/predict')
app.include_router(farms.router, prefix='/api/farms')
app.include_router(scan.router, prefix='/api/scan')
app.include_router(growth.router, prefix='/api/growth')
app.include_router(storage.router, prefix='/api/storage')
app.include_router(partners.router, prefix='/api/partners')
app.include_router(groups.router, prefix='/api/groups')
app.include_router(village_groups.router, prefix='/api/village-groups')
app.include_router(notifications.router, prefix='/api/notifications')
app.include_router(climate.router, prefix='/api/climate')
app.include_router(upload.router, prefix='/api/upload')
app.include_router(subscription.router, prefix='/api/subscription')
app.include_router(premium.router, prefix='/api/premium')
app.include_router(payments.router, prefix='/api/payments')
app.include_router(regional.router, prefix='/api/regional')
app.include_router(farmer_marketplace.router, prefix='/api/marketplace/farmer')
app.include_router(buyer_marketplace.router, prefix='/api/marketplace/buyer')
app.include_router(exchange.router, prefix='/api/exchange', tags=['Exchange'])
app.include_router(market_linkages.router, prefix='/api/market-linkages', tags=['Market Linkages'])
app.include_router(drone_intelligence.router, prefix='/api/drone', tags=['Drone Intelligence'])
app.include_router(ai_prediction.router, prefix='/api/ai', tags=['AI Prediction'])
app.include_router(model_training_routes.router, prefix='/api/model-training', tags=['Model Training'])
app.include_router(advanced_growth_routes.router, prefix='/api/advanced-growth', tags=['Advanced Growth Tracking'])
app.include_router(plot_analytics_routes.router, prefix='/api', tags=['Plot Analytics & AI'])

