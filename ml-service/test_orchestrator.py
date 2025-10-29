#!/usr/bin/env python3
"""Test if auto-analysis orchestrator can find uploaded data"""

from orchestrators.auto_analysis_orchestrator import AutoAnalysisOrchestrator

# Initialize orchestrator
orch = AutoAnalysisOrchestrator()

# Test with the batch that was just uploaded
batch_id = "1761683865081_scenario_4_efficiency_wins.csv"
facility_id = 1

print("Testing auto-analysis orchestrator...")
print(f"Batch ID: {batch_id}")
print(f"Facility ID: {facility_id}")
print("-" * 60)

# Run analysis
result = orch.analyze(
    facility_id=facility_id,
    batch_id=batch_id,
    csv_headers=[
        "Work Order Number",
        "Material Code", 
        "Planned Material Cost",
        "Actual Material Cost",
        "Planned Labor Hours",
        "Actual Labor Hours",
        "Supplier ID"
    ]
)

print("\nRESULTS:")
print(f"Success: {result['success']}")

if result['success']:
    print(f"\nData Tier: {result['data_tier']['tier']} ({result['data_tier']['tier_name']})")
    print(f"Message: {result['data_tier']['message']}")
    
    print(f"\nTotal Insights: {result['insights']['summary']['total_insights']}")
    print(f"  - Urgent: {result['insights']['summary']['urgent_count']}")
    print(f"  - Notable: {result['insights']['summary']['notable_count']}")
    print(f"  - Background: {result['insights']['summary']['background_count']}")
    
    print(f"\nTotal Financial Impact: ${result['insights']['summary']['total_financial_impact']:,.2f}")
    
    # Show a few urgent insights
    if result['insights']['urgent']:
        print("\nURGENT INSIGHTS:")
        for i, insight in enumerate(result['insights']['urgent'][:3], 1):
            print(f"  {i}. {insight['type']}: ${insight['financial_impact']:,.2f}")
    
    print(f"\nProcessing Time: {result['metadata']['processing_time_seconds']}s")
else:
    print(f"\nError: {result.get('error')}")