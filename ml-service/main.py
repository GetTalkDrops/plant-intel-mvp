from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from cost_analyzer import CostAnalyzer
from equipment_predictor import EquipmentPredictor
from quality_analyzer import QualityAnalyzer
from efficiency_analyzer import EfficiencyAnalyzer

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
equipment_predictor = EquipmentPredictor()
quality_analyzer = QualityAnalyzer()
efficiency_analyzer = EfficiencyAnalyzer()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-engine"}

@app.get("/analyze/cost-variance")
async def analyze_cost_variance(facility_id: int = 1):
    return cost_analyzer.predict_cost_variance(facility_id)

@app.get("/analyze/equipment-failure")
async def analyze_equipment_failure(facility_id: int = 1):
    return equipment_predictor.predict_failures(facility_id)

@app.get("/analyze/quality-patterns")
async def analyze_quality_patterns(facility_id: int = 1):
    return quality_analyzer.analyze_quality_patterns(facility_id)

@app.get("/analyze/efficiency-patterns")
async def analyze_efficiency_patterns(facility_id: int = 1):
    return efficiency_analyzer.analyze_efficiency_patterns(facility_id)