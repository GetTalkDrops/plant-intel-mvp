"""
Unit tests for auto-analysis orchestrator
"""
import pytest
from orchestrators.auto_analysis_orchestrator import AutoAnalysisOrchestrator

class TestAutoAnalysis:
    def test_orchestrator_initialization(self):
        """Test orchestrator initializes correctly"""
        orchestrator = AutoAnalysisOrchestrator()
        assert orchestrator is not None
    
    def test_tier_detection(self):
        """Test data tier detection"""
        orchestrator = AutoAnalysisOrchestrator()
        
        # Tier 1: Basic cost data
        tier1_headers = ["Work Order Number", "Planned Material Cost", "Actual Material Cost"]
        tier = orchestrator._detect_data_tier(tier1_headers)
        assert tier == 1
        
        # Tier 2: With equipment
        tier2_headers = tier1_headers + ["Equipment ID", "Machine ID"]
        tier = orchestrator._detect_data_tier(tier2_headers)
        assert tier == 2
        
        # Tier 3: Full data
        tier3_headers = tier2_headers + ["Units Scrapped", "Quality Issues"]
        tier = orchestrator._detect_data_tier(tier3_headers)
        assert tier == 3
