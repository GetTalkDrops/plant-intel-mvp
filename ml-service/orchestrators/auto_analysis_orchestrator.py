"""
Auto-Analysis Orchestrator
Automatically triggers all applicable analyzers on CSV upload and returns prioritized insights

Flow:
1. Detect data tier (what analyses are possible)
2. Update baselines with new data
3. Run all applicable analyzers in parallel
4. Collect and prioritize results
5. Return top 5 URGENT, next 10 NOTABLE, rest as background
"""

import asyncio
from typing import Dict, List, Optional
from datetime import datetime
import traceback

# Import analyzers
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analyzers.cost_analyzer import CostAnalyzer
# from analyzers.equipment_predictor import EquipmentPredictor  # Import when ready
# from analyzers.quality_analyzer import QualityAnalyzer  # Import when ready
# from analyzers.efficiency_analyzer import EfficiencyAnalyzer  # Import when ready

from utils.data_tier_detector import DataTierDetector
from utils.insight_prioritizer import InsightPrioritizer
from analytics.baseline_tracker import BaselineTracker

# Supabase client for baseline tracker
from supabase import create_client
from dotenv import load_dotenv


class AutoAnalysisOrchestrator:
    """Orchestrates automatic analysis on CSV upload"""
    
    def __init__(self):
        self.tier_detector = DataTierDetector()
        self.prioritizer = InsightPrioritizer()
        
        # Initialize Supabase for baseline tracker
        load_dotenv('../.env.local')
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        if url and key:
            supabase = create_client(url, key)
            self.baseline_tracker = BaselineTracker(supabase)
        else:
            self.baseline_tracker = None
        
        # Initialize analyzers
        self.cost_analyzer = CostAnalyzer()
        # self.equipment_predictor = EquipmentPredictor()  # Add when ready
        # self.quality_analyzer = QualityAnalyzer()  # Add when ready
        # self.efficiency_analyzer = EfficiencyAnalyzer()  # Add when ready
    
    def analyze(
        self,
        facility_id: int,
        batch_id: str,
        csv_headers: List[str],
        config: Optional[Dict] = None
    ) -> Dict:
        """
        Main entry point - run all applicable analyses
        
        Args:
            facility_id: Facility ID from upload
            batch_id: Batch ID from upload
            csv_headers: List of CSV column names
            config: Optional config overrides
            
        Returns:
            Dictionary with prioritized insights and metadata
        """
        start_time = datetime.now()
        
        try:
            # Step 1: Detect data tier
            tier = self.tier_detector.detect_tier(csv_headers)
            tier_message = self.tier_detector.generate_feedback_message(tier)
            
            # Step 2: Update baselines with new data
            baseline_updates = {}
            if self.baseline_tracker:
                try:
                    baseline_updates = self.baseline_tracker.update_baselines(
                        facility_id=facility_id,
                        batch_id=batch_id
                    )
                except Exception as e:
                    print(f"Warning: Baseline update failed: {str(e)}")
                    baseline_updates = {'error': str(e)}
            
            # Step 3: Run applicable analyzers
            analyzer_results = self._run_analyzers(
                facility_id=facility_id,
                batch_id=batch_id,
                tier=tier,
                config=config
            )
            
            # Step 4: Prioritize insights
            prioritized = self.prioritizer.prioritize_insights(
                cost_results=analyzer_results.get('cost_analyzer'),
                equipment_results=analyzer_results.get('equipment_predictor'),
                quality_results=analyzer_results.get('quality_analyzer'),
                efficiency_results=analyzer_results.get('efficiency_analyzer')
            )

            # Step 5: Create investigations from urgent insights
            all_insights = prioritized.get('urgent', []) + prioritized.get('notable', [])

            # DEBUG: Show insight structure
            if len(all_insights) > 0:
                print("\n=== SAMPLE INSIGHT STRUCTURE ===")
                sample = all_insights[0]
                print(f"Type: {sample.insight_type}")
                print(f"Source: {sample.source_analyzer}")
                print(f"Data keys: {list(sample.insight_data.keys())}")
                if 'root_cause' in sample.insight_data:
                    print(f"Root cause: {sample.insight_data['root_cause']}")
                if 'correlations' in sample.insight_data:
                    print(f"Correlations: {sample.insight_data['correlations']}")

            investigations = self._create_investigations(all_insights)

            # Step 6: Format response
            formatted_insights = self.prioritizer.format_prioritized_feed(prioritized)      
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                'success': True,
                'data_tier': {
                    'tier': tier.tier,
                    'tier_name': tier.tier_name,
                    'capabilities': tier.capabilities,
                    'message': tier_message,
                    'missing_for_next_tier': tier.missing_for_next_tier
                },
                'insights': formatted_insights,
                'investigations': investigations,
                'analyzer_details': {
                    'analyzers_run': list(analyzer_results.keys()),
                    'cost_analyzer': self._summarize_analyzer_result(analyzer_results.get('cost_analyzer')),
                    'equipment_predictor': self._summarize_analyzer_result(analyzer_results.get('equipment_predictor')),
                    'quality_analyzer': self._summarize_analyzer_result(analyzer_results.get('quality_analyzer')),
                    'efficiency_analyzer': self._summarize_analyzer_result(analyzer_results.get('efficiency_analyzer'))
                },
                'baseline_updates': baseline_updates,
                'metadata': {
                    'batch_id': batch_id,
                    'facility_id': facility_id,
                    'analysis_timestamp': datetime.now().isoformat(),
                    'processing_time_seconds': round(processing_time, 2)
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Auto-analysis failed: {str(e)}",
                'technical_details': traceback.format_exc(),
                'metadata': {
                    'batch_id': batch_id,
                    'facility_id': facility_id,
                    'analysis_timestamp': datetime.now().isoformat()
                }
            }
    
    def _run_analyzers(
        self,
        facility_id: int,
        batch_id: str,
        tier,
        config: Optional[Dict]
    ) -> Dict:
        """
        Run all applicable analyzers based on data tier
        
        Args:
            facility_id: Facility ID
            batch_id: Batch ID
            tier: DataTier object
            config: Optional config
            
        Returns:
            Dictionary with results from each analyzer
        """
        results = {}
        available_analyzers = set(tier.available_analyzers)
        
        # Cost Analyzer - always runs if tier >= 1
        if 'cost_analyzer' in available_analyzers:
            try:
                results['cost_analyzer'] = self.cost_analyzer.predict_cost_variance(
                    facility_id=facility_id,
                    batch_id=batch_id,
                    config=config
                )
            except Exception as e:
                results['cost_analyzer'] = {
                    'status': 'error',
                    'error': str(e),
                    'message': f"Cost analysis failed: {str(e)}"
                }
        
        # Equipment Predictor - runs if tier >= 3
        if 'equipment_predictor' in available_analyzers:
            try:
                # Uncomment when ready
                # results['equipment_predictor'] = self.equipment_predictor.predict_failures(
                #     facility_id=facility_id,
                #     batch_id=batch_id,
                #     config=config
                # )
                results['equipment_predictor'] = {
                    'status': 'not_implemented',
                    'message': 'Equipment predictor coming soon'
                }
            except Exception as e:
                results['equipment_predictor'] = {
                    'status': 'error',
                    'error': str(e)
                }
        
        # Quality Analyzer - runs if tier >= 3
        if 'quality_analyzer' in available_analyzers:
            try:
                # Uncomment when ready
                # results['quality_analyzer'] = self.quality_analyzer.analyze_quality(
                #     facility_id=facility_id,
                #     batch_id=batch_id,
                #     config=config
                # )
                results['quality_analyzer'] = {
                    'status': 'not_implemented',
                    'message': 'Quality analyzer coming soon'
                }
            except Exception as e:
                results['quality_analyzer'] = {
                    'status': 'error',
                    'error': str(e)
                }
        
        # Efficiency Analyzer - runs if tier >= 4
        if 'efficiency_analyzer' in available_analyzers:
            try:
                # Uncomment when ready
                # results['efficiency_analyzer'] = self.efficiency_analyzer.find_opportunities(
                #     facility_id=facility_id,
                #     batch_id=batch_id,
                #     config=config
                # )
                results['efficiency_analyzer'] = {
                    'status': 'not_implemented',
                    'message': 'Efficiency analyzer coming soon'
                }
            except Exception as e:
                results['efficiency_analyzer'] = {
                    'status': 'error',
                    'error': str(e)
                }
        
        return results
    
    def _summarize_analyzer_result(self, result: Optional[Dict]) -> Dict:
        """Create summary of analyzer result for metadata"""
        if not result:
            return {'status': 'not_run'}
        
        if result.get('status') == 'error':
            return {
                'status': 'error',
                'error': result.get('error', 'Unknown error')
            }
        
        if result.get('status') == 'not_implemented':
            return {
                'status': 'not_implemented'
            }
        
        if result.get('status') == 'insufficient_data':
            return {
                'status': 'insufficient_data',
                'message': result.get('message', 'Insufficient data')
            }
        
        if result.get('status') == 'success':
            # Summarize what was found
            summary = {
                'status': 'success',
                'insights_found': 0
            }
            
            # Count insights
            predictions = result.get('predictions', [])
            patterns = result.get('patterns', [])
            quality_issues = result.get('quality_issues', [])
            opportunities = result.get('opportunities', [])
            
            summary['insights_found'] = (
                len(predictions) + 
                len(patterns) + 
                len(quality_issues) + 
                len(opportunities)
            )
            
            # Add financial impact if available
            if 'total_impact' in result:
                summary['total_impact'] = result['total_impact']
            
            if 'total_savings_opportunity' in result:
                summary['total_savings'] = result['total_savings_opportunity']
            
            return summary
        
        return {'status': 'unknown'}
    
    def _create_investigations(self, insights):
        """Group related insights into investigation summaries"""
        from datetime import datetime
        
        try:
            investigations = []
            processed_ids = set()  # Track IDs, not objects
            
            # Group 1: Multiple material/supplier patterns (potential supplier crisis)
            material_patterns = [
                i for i in insights
                if i.insight_type == 'pattern' 
                and i.insight_data.get('type') in ['material', 'supplier']
                and i.insight_data.get('identifier') not in processed_ids
            ]
            
            print(f"\n=== INVESTIGATION GROUPING ===")
            print(f"Total insights: {len(insights)}")
            print(f"Material patterns found: {len(material_patterns)}")
            
            if len(material_patterns) >= 2:
                total_impact = sum([i.financial_impact for i in material_patterns])
                
                investigation = {
                    'type': 'investigation_summary',
                    'id': f"inv_supplier_{int(datetime.now().timestamp())}",
                    'title': 'Supplier Change Crisis',
                    'total_impact': total_impact,
                    'trend': self._aggregate_trends(material_patterns),
                    'connected_insights': [
                        f"{i.source_analyzer}_{i.insight_type}_{i.insight_data.get('identifier', 'unknown')}"
                        for i in material_patterns
                    ],
                    'priority': 'URGENT' if any(str(i.priority_level) == 'urgent' for i in material_patterns) else 'NOTABLE',
                    'insight_count': len(material_patterns),
                    'materials_affected': [
                        i.insight_data.get('identifier', 'Unknown')
                        for i in material_patterns
                    ]
                }
                investigations.append(investigation)
                
                # Track processed IDs
                for i in material_patterns:
                    processed_ids.add(i.insight_data.get('identifier'))
                
                print(f"Created 1 investigation with {len(material_patterns)} patterns")
            
            return investigations
            
        except Exception as e:
            print(f"\n!!! ERROR IN INVESTIGATION GROUPING: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
    
    def _aggregate_trends(self, insights):
        """Aggregate trend status across multiple insights"""
        statuses = [i.insight_data.get('trend', {}).get('status', 'STABLE') for i in insights]
        
        if 'ACCELERATING' in statuses:
            return {'status': 'ACCELERATING', 'direction': '↗'}
        elif 'DECELERATING' in statuses:
            return {'status': 'DECELERATING', 'direction': '↘'}
        else:
            return {'status': 'STABLE', 'direction': '→'}


# Example usage
if __name__ == "__main__":
    orchestrator = AutoAnalysisOrchestrator()
    
    # Test with different data tiers
    print("="*60)
    print("Testing Auto-Analysis Orchestrator")
    print("="*60)
    
    # Tier 1: Basic cost data
    print("\nTest 1: Basic cost data (Tier 1)")
    headers_tier1 = [
        "Work Order Number",
        "Planned Material Cost",
        "Actual Material Cost",
        "Planned Labor Hours",
        "Actual Labor Hours"
    ]
    
    result1 = orchestrator.analyze(
        facility_id=1,
        batch_id="test_batch_001",
        csv_headers=headers_tier1
    )
    
    if result1['success']:
        print(f"Data Tier: {result1['data_tier']['tier']} ({result1['data_tier']['tier_name']})")
        print(f"Message: {result1['data_tier']['message']}")
        print(f"Analyzers Run: {', '.join(result1['analyzer_details']['analyzers_run'])}")
        print(f"Total Insights: {result1['insights']['summary']['total_insights']}")
        print(f"  - Urgent: {result1['insights']['summary']['urgent_count']}")
        print(f"  - Notable: {result1['insights']['summary']['notable_count']}")
        print(f"Processing Time: {result1['metadata']['processing_time_seconds']}s")
        if result1.get('baseline_updates'):
            print(f"Baseline Updates: {result1['baseline_updates']}")
    else:
        print(f"Error: {result1['error']}")
    
    # Tier 3: With equipment data
    print("\n" + "="*60)
    print("Test 2: With equipment data (Tier 3)")
    headers_tier3 = headers_tier1 + [
        "Material Code",
        "Supplier ID",
        "Equipment ID",
        "Scrapped Quantity"
    ]
    
    result2 = orchestrator.analyze(
        facility_id=1,
        batch_id="test_batch_002",
        csv_headers=headers_tier3
    )
    
    if result2['success']:
        print(f"Data Tier: {result2['data_tier']['tier']} ({result2['data_tier']['tier_name']})")
        print(f"Analyzers Run: {', '.join(result2['analyzer_details']['analyzers_run'])}")
        print(f"Capabilities: {', '.join(result2['data_tier']['capabilities'][:2])}")
    else:
        print(f"Error: {result2['error']}")