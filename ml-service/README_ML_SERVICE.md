# Plant Intel ML Service

Production-ready machine learning analytics service for manufacturing optimization.

## Architecture

### Core Components

1. **Auto-Analysis Orchestrator** (`orchestrators/`)
   - Automatic data tier detection
   - Smart analyzer selection
   - Unified insight generation

2. **Analyzers** (`analyzers/`)
   - Cost Analyzer: Material and labor variance analysis
   - Equipment Predictor: Failure risk and performance analysis
   - Quality Analyzer: Defect pattern and scrap analysis

3. **Analytics Engine** (`analytics/`)
   - Baseline Tracker: Rolling 30-day performance baselines
   - Trend Detector: Deviation and trend analysis
   - Degradation Detector: Time-series performance degradation
   - Correlation Analyzer: Root cause identification

4. **AI/Narrative Layer** (`ai/`)
   - Pattern Explainer: Technical analysis with data gap identification
   - Action Recommender: Consultant-style narrative generation

5. **Utilities** (`utils/`)
   - Insight Prioritizer: Multi-dimensional scoring and ranking

## Features

### Automatic Analysis
- Upload CSV, receive instant insights
- Automatic detection of data capabilities (Tier 1/2/3)
- Smart analyzer selection based on available data

### Baseline Tracking
- 30-day rolling baselines for materials, labor, equipment
- "vs your typical" comparisons
- Historical performance context

### Trend Detection
- Cost trends (material price increases/decreases)
- Equipment degradation (performance declining over time)
- Quality drift (scrap rates increasing)
- Inflection point detection (when did trend start?)

### Root Cause Analysis
- Correlation with supplier changes
- Batch/lot quality issues
- Maintenance schedule gaps
- Equipment-specific patterns

### Professional Narratives
- Consultant-style insight presentation
- What/Why/Impact/Action format
- Specific recommendations with timeframes
- Urgency classification

### Insight Prioritization
- Multi-factor scoring: financial impact, deviation, urgency, confidence
- Automatic categorization: URGENT (top 5), NOTABLE (next 10), BACKGROUND
- Focus on highest-value opportunities

## Data Tiers

**Tier 1: Basic Cost Analysis**
- Required: work order, planned/actual costs, planned/actual hours
- Analyzes: cost variances, labor efficiency

**Tier 2: Equipment Analysis**
- Tier 1 + equipment/machine IDs
- Analyzes: equipment performance, failure risk

**Tier 3: Quality Analysis**
- Tier 2 + scrap units, quality flags
- Analyzes: defect patterns, quality trends

## API Usage
```python
from orchestrators.auto_analysis_orchestrator import AutoAnalysisOrchestrator

orchestrator = AutoAnalysisOrchestrator()

result = orchestrator.analyze(
    facility_id=1,
    batch_id="batch_id",
    csv_headers=["Work Order Number", "Material Code", ...]
)

# Returns:
{
    "success": true,
    "insights": {
        "urgent": [...],      # Top 5 critical issues
        "notable": [...],     # Next 10 important items
        "background": [...],  # Remaining insights
        "summary": {
            "total_insights": 24,
            "urgent_count": 5,
            "notable_count": 10,
            "total_financial_impact": 125000
        }
    }
}
```

## Insight Structure

Each insight includes:
- **Priority**: urgent/notable/background
- **Score**: Multi-factor priority score (0-100)
- **Financial Impact**: Dollar amount
- **Narrative**: Professional consultant-style description
  - Headline: Brief, actionable summary
  - What's Happening: Specific details with numbers/timeframes
  - Why It Matters: Business impact and consequences
  - Recommended Action: Specific next step with timeframe
  - Urgency Level: critical/high/medium/low

## Configuration

Key configuration options in analyzers:
```python
config = {
    'labor_rate_hourly': 200,
    'scrap_cost_per_unit': 75,
    'variance_threshold_pct': 5,
    'pattern_min_orders': 3,
    'excluded_suppliers': [],
    'excluded_materials': []
}
```

## Dependencies

- supabase-py: Database connectivity
- pandas: Data manipulation
- numpy: Numerical operations
- python-dotenv: Environment configuration

## Testing

Run unit tests:
```bash
pytest tests/
```

## Production Deployment

1. Set environment variables in `.env.local`:
```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

2. Install dependencies:
```bash
   pip install -r requirements.txt
```

3. Import and use orchestrator in your API endpoints

## Performance

- Typical analysis time: 15-20 seconds for 100-200 work orders
- Parallel analyzer execution
- Efficient baseline caching
- Optimized database queries

## Future Enhancements

Potential additions:
- Predictive forecasting (beyond trend detection)
- Email alerts for critical insights
- PDF report generation
- Custom alerting thresholds
- Historical trend visualization
- Multi-facility comparative analysis

## License

Proprietary - Plant Intel
