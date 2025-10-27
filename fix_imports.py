#!/usr/bin/env python3
"""
Import Fixer for plant-intel-mvp Backend Refactor
Fixes imports for your actual local files after reorganization
"""

import os
import sys

def replace_in_file(filepath, replacements):
    """Replace multiple text patterns in a file"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original_content = content
        changes_made = 0
        
        for old_text, new_text in replacements:
            if old_text in content:
                content = content.replace(old_text, new_text)
                changes_made += 1
        
        if content != original_content:
            with open(filepath, 'w') as f:
                f.write(content)
            return changes_made
        return 0
    except Exception as e:
        print(f"   ERROR: {e}")
        return 0

def main():
    # Get the ml-service directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_service_dir = os.path.join(script_dir, 'ml-service')
    
    # If script is run from ml-service directory
    if os.path.exists(os.path.join(script_dir, 'main.py')):
        ml_service_dir = script_dir
    
    if not os.path.exists(os.path.join(ml_service_dir, 'main.py')):
        print("ERROR: Cannot find ml-service/main.py")
        print("Please run this script from either:")
        print("  - The plant-intel-mvp root directory")
        print("  - The ml-service directory")
        sys.exit(1)
    
    print("Fixing imports in ml-service files...")
    print()
    
    total_changes = 0
    
    # Fix 1: main.py
    print("1. Checking main.py...")
    main_file = os.path.join(ml_service_dir, 'main.py')
    
    main_replacements = [
        ("from cost_analyzer import CostAnalyzer", "from analyzers.cost_analyzer import CostAnalyzer"),
        ("from equipment_predictor import EquipmentPredictor", "from analyzers.equipment_predictor import EquipmentPredictor"),
        ("from quality_analyzer import QualityAnalyzer", "from analyzers.quality_analyzer import QualityAnalyzer"),
        ("from efficiency_analyzer import EfficiencyAnalyzer", "from analyzers.efficiency_analyzer import EfficiencyAnalyzer"),
        ("from auto_analysis_system import ConversationalAutoAnalysis", "from ai.auto_analysis_system import ConversationalAutoAnalysis"),
        ("from query_router import EnhancedQueryRouter", "from handlers.query_router import EnhancedQueryRouter"),
        ("from csv_upload_service import", "from handlers.csv_upload_service import"),
    ]
    
    changes = replace_in_file(main_file, main_replacements)
    if changes > 0:
        print(f"   SUCCESS: Fixed {changes} import(s)")
        total_changes += changes
    else:
        print("   OK: No changes needed")
    
    # Fix 2: handlers/query_router.py
    print("2. Checking handlers/query_router.py...")
    router_file = os.path.join(ml_service_dir, 'handlers', 'query_router.py')
    
    router_replacements = [
        ("from cost_analyzer import CostAnalyzer", "from analyzers.cost_analyzer import CostAnalyzer"),
        ("from equipment_predictor import EquipmentPredictor", "from analyzers.equipment_predictor import EquipmentPredictor"),
        ("from quality_analyzer import QualityAnalyzer", "from analyzers.quality_analyzer import QualityAnalyzer"),
        ("from efficiency_analyzer import EfficiencyAnalyzer", "from analyzers.efficiency_analyzer import EfficiencyAnalyzer"),
        ("from data_aware_responder import DataAwareResponder", "from handlers.data_aware_responder import DataAwareResponder"),
        ("from conversational_templates import ConversationalTemplates", "from ai.conversational_templates import ConversationalTemplates"),
        ("from query_preprocessor import QueryPreprocessor", "from handlers.query_preprocessor import QueryPreprocessor"),
        ("from query_classifier import QueryClassifier", "from handlers.query_classifier import QueryClassifier"),
        ("from data_query_handler import DataQueryHandler", "from handlers.data_query_handler import DataQueryHandler"),
        ("from scenario_handler import ScenarioHandler", "from handlers.scenario_handler import ScenarioHandler"),
    ]
    
    changes = replace_in_file(router_file, router_replacements)
    if changes > 0:
        print(f"   SUCCESS: Fixed {changes} import(s)")
        total_changes += changes
    else:
        print("   OK: No changes needed")
    
    # Fix 3: handlers/csv_upload_service.py
    print("3. Checking handlers/csv_upload_service.py...")
    csv_service_file = os.path.join(ml_service_dir, 'handlers', 'csv_upload_service.py')
    
    csv_replacements = [
        ("from flexible_column_mapper import FlexibleColumnMapper", "from utils.flexible_column_mapper import FlexibleColumnMapper"),
    ]
    
    changes = replace_in_file(csv_service_file, csv_replacements)
    if changes > 0:
        print(f"   SUCCESS: Fixed {changes} import(s)")
        total_changes += changes
    else:
        print("   OK: No changes needed")
    
    # Fix 4: analyzers/cost_analyzer.py
    print("4. Checking analyzers/cost_analyzer.py...")
    cost_file = os.path.join(ml_service_dir, 'analyzers', 'cost_analyzer.py')
    
    cost_replacements = [
        ("from pattern_explainer import PatternExplainer", "from ai.pattern_explainer import PatternExplainer"),
    ]
    
    changes = replace_in_file(cost_file, cost_replacements)
    if changes > 0:
        print(f"   SUCCESS: Fixed {changes} import(s)")
        total_changes += changes
    else:
        print("   OK: No changes needed")
    
    # Fix 5: ai/auto_analysis_system.py
    print("5. Checking ai/auto_analysis_system.py...")
    auto_file = os.path.join(ml_service_dir, 'ai', 'auto_analysis_system.py')
    
    auto_replacements = [
        ("from cost_analyzer import CostAnalyzer", "from analyzers.cost_analyzer import CostAnalyzer"),
        ("from equipment_predictor import EquipmentPredictor", "from analyzers.equipment_predictor import EquipmentPredictor"),
        ("from quality_analyzer import QualityAnalyzer", "from analyzers.quality_analyzer import QualityAnalyzer"),
        ("from efficiency_analyzer import EfficiencyAnalyzer", "from analyzers.efficiency_analyzer import EfficiencyAnalyzer"),
    ]
    
    changes = replace_in_file(auto_file, auto_replacements)
    if changes > 0:
        print(f"   SUCCESS: Fixed {changes} import(s)")
        total_changes += changes
    else:
        print("   OK: No changes needed")
    
    print()
    print(f"Complete! Fixed {total_changes} total import(s)")
    print()
    print("Next steps:")
    print("1. Test your backend:")
    print("   cd ml-service")
    print("   uvicorn main:app --reload --host 0.0.0.0 --port 8000")
    print()
    print("2. Check what changed:")
    print("   git status")
    print("   git diff")
    print()
    print("3. Review changes in VS Code")

if __name__ == "__main__":
    main()