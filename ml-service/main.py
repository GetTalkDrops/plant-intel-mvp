from dotenv import load_dotenv
import os

load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException  # UPDATED
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse  # NEW
from typing import Optional  # NEW
import json  # NEW

from analyzers.cost_analyzer import CostAnalyzer
from analyzers.equipment_predictor import EquipmentPredictor
from analyzers.quality_analyzer import QualityAnalyzer
from analyzers.efficiency_analyzer import EfficiencyAnalyzer
from ai.auto_analysis_system import ConversationalAutoAnalysis
from handlers.query_router import EnhancedQueryRouter
from handlers.csv_upload_service import CsvUploadService  # NEW

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
csv_service = CsvUploadService()  # NEW

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

@app.post("/analyze")
async def process_analyze_query(query_data: dict):
    """Process queries with user email for demo account detection"""
    query = query_data.get('query', '')
    user_email = query_data.get('user_email', '')
    facility_id = query_data.get('facility_id', 1)
    batch_id = query_data.get('batch_id', None)
    config = query_data.get('config', None)
    
    if not query:
        return {"error": "Query is required"}
    
    # Demo account detection
    is_demo = user_email == 'skinner.chris@gmail.com'
    if is_demo:
        facility_id = 1
    
    try:
        result = query_router.route_query(query, facility_id, batch_id, config)
        return result
    except Exception as e:
        return {"error": str(e), "type": "error"}

@app.get("/chat/query")
async def process_chat_query_get(query: str, facility_id: int = 1):
    """GET version for easy testing"""
    try:
        result = query_router.route_query(query, facility_id)
        return result
    except Exception as e:
        return {"error": str(e)}


# ============================================================================
# CSV UPLOAD ENDPOINTS (NEW)
# ============================================================================

@app.post("/upload/csv")
async def upload_csv(
    file: UploadFile = File(...),
    user_email: str = Form(...),
    confirmed_mapping: Optional[str] = Form(None)
):
    """Upload CSV file with automatic column mapping"""
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        mapping_dict = None
        if confirmed_mapping:
            try:
                mapping_dict = json.loads(confirmed_mapping)
            except:
                pass
        
        result = csv_service.process_upload(
            file_content=content_str,
            user_email=user_email,
            filename=file.filename,
            confirmed_mapping=mapping_dict
        )
        
        if result.success:
            return JSONResponse(
                status_code=200,
                content={
                    'success': True,
                    'message': f'Successfully uploaded {result.rows_inserted} work orders',
                    'data': result.to_dict()
                }
            )
        else:
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'error': result.error,
                    'technical_details': result.technical_details
                }
            )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Server error: {str(e)}'
            }
        )


@app.post("/upload/csv/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    """Analyze CSV and return mapping suggestions without uploading"""
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        result = csv_service.get_mapping_suggestions(content_str)
        
        if result['success']:
            return JSONResponse(status_code=200, content=result)
        else:
            return JSONResponse(status_code=400, content=result)
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={'success': False, 'error': f'Analysis failed: {str(e)}'}
        )