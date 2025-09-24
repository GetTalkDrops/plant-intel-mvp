from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from cost_analyzer import CostAnalyzer
from equipment_predictor import EquipmentPredictor

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cost_analyzer = CostAnalyzer()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-engine"}

@app.get("/analyze/cost-variance")
async def analyze_cost_variance(facility_id: int = 1):
    return cost_analyzer.predict_cost_variance(facility_id)

equipment_predictor = EquipmentPredictor()

@app.get("/analyze/equipment-failure")
async def analyze_equipment_failure(facility_id: int = 1):
    return equipment_predictor.predict_failures(facility_id)