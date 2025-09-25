from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from cost_analyzer import CostAnalyzer
from equipment_predictor import EquipmentPredictor
from quality_analyzer import QualityAnalyzer
from efficiency_analyzer import EfficiencyAnalyzer
from auto_analysis_system import ConversationalAutoAnalysis
from query_router import EnhancedQueryRouter

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analyzers
cost_analyzer = CostAnalyzer()
equipment_predictor = EquipmentPredictor()
quality_analyzer = QualityAnalyzer()
efficiency_analyzer = EfficiencyAnalyzer()
auto_analysis = ConversationalAutoAnalysis()
query_router = EnhancedQueryRouter()

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

@app.get("/analyze/auto-summary")
async def get_auto_summary(facility_id: int = 1):
    """Get automatic action alert summary"""
    return auto_analysis.generate_conversational_summary(facility_id)

@app.post("/chat/query")
async def process_chat_query(query_data: dict):
    """Process natural language queries and return formatted responses"""
    query = query_data.get('query', '')
    facility_id = query_data.get('facility_id', 1)
    
    if not query:
        return {"error": "Query is required"}
    
    try:
        result = query_router.route_query(query, facility_id)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.get("/chat/query")
async def process_chat_query_get(query: str, facility_id: int = 1):
    """GET version for easy testing"""
    try:
        result = query_router.route_query(query, facility_id)
        return result
    except Exception as e:
        return {"error": str(e)}
