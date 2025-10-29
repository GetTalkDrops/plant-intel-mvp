"""
Data Tier Detection System
Analyzes incoming CSV to determine what insights are possible

Tiers:
- Tier 1 (Basic): Cost tracking only
- Tier 2 (Good): Pattern detection (materials, suppliers)
- Tier 3 (Excellent): Predictive analysis (equipment, quality)
- Tier 4 (Premium): Root cause analysis (cycle times, timestamps)
"""

from typing import Dict, List, Set
from dataclasses import dataclass


@dataclass
class DataTier:
    """Result of tier detection"""
    tier: int
    tier_name: str
    capabilities: List[str]
    missing_for_next_tier: List[str]
    available_analyzers: List[str]
    column_coverage: Dict[str, bool]


class DataTierDetector:
    """Detects data quality tier based on available columns"""
    
    # Define what each tier requires
    TIER_REQUIREMENTS = {
        1: {
            "name": "Basic",
            "description": "Cost tracking",
            "required_any": [
                ["planned_material_cost", "actual_material_cost"],
                ["planned_labor_hours", "actual_labor_hours"]
            ],
            "analyzers": ["cost_analyzer"],
            "capabilities": [
                "Track cost variances",
                "Identify over-budget work orders"
            ]
        },
        2: {
            "name": "Good",
            "description": "Pattern detection",
            "required_all": ["material_code"],
            "optional_boost": ["supplier_id"],
            "analyzers": ["cost_analyzer"],
            "capabilities": [
                "Detect material cost patterns",
                "Identify supplier issues",
                "Track recurring variances"
            ]
        },
        3: {
            "name": "Excellent",
            "description": "Predictive analysis",
            "required_any": [
                ["equipment_id"],
                ["scrapped_quantity", "rework_quantity"]
            ],
            "analyzers": ["cost_analyzer", "equipment_predictor", "quality_analyzer"],
            "capabilities": [
                "Predict equipment failures",
                "Detect quality degradation",
                "Forecast maintenance needs"
            ]
        },
        4: {
            "name": "Premium",
            "description": "Root cause analysis",
            "required_any": [
                ["cycle_time"],
                ["start_date", "completion_date"],
                ["operation_start_time", "operation_end_time"]
            ],
            "analyzers": ["cost_analyzer", "equipment_predictor", "quality_analyzer", "efficiency_analyzer"],
            "capabilities": [
                "Root cause analysis",
                "Process efficiency tracking",
                "Time-based correlations",
                "Performance trending"
            ]
        }
    }
    
    # Map common CSV headers to our standard fields
    COLUMN_PATTERNS = {
        # Cost fields
        "planned_material_cost": ["planned material cost", "material budget", "est material cost", "planned mat cost"],
        "actual_material_cost": ["actual material cost", "material actual", "actual mat cost", "material cost"],
        "planned_labor_hours": ["planned labor hours", "labor budget hrs", "est labor hours", "planned hours"],
        "actual_labor_hours": ["actual labor hours", "labor actual hrs", "actual hours", "labor hours"],
        
        # Pattern detection fields
        "material_code": ["material code", "material number", "material id", "part number", "mat code"],
        "supplier_id": ["supplier id", "supplier code", "supplier number", "vendor id", "vendor code"],
        
        # Predictive fields
        "equipment_id": ["equipment id", "equipment code", "machine id", "asset id", "equipment number"],
        "scrapped_quantity": ["scrapped quantity", "scrap qty", "scrapped qty", "scrap", "scrap units"],
        "rework_quantity": ["rework quantity", "rework qty", "rework", "rework units"],
        
        # Root cause fields
        "cycle_time": ["cycle time", "process time", "runtime", "cycle duration"],
        "start_date": ["start date", "start time", "begin date", "operation start"],
        "completion_date": ["completion date", "end date", "finish date", "operation end"],
        "operation_start_time": ["operation start time", "op start", "start timestamp"],
        "operation_end_time": ["operation end time", "op end", "end timestamp"]
    }
    
    def detect_tier(self, csv_headers: List[str]) -> DataTier:
        """
        Analyze CSV headers and determine data tier
        
        Args:
            csv_headers: List of column names from CSV
            
        Returns:
            DataTier object with detected capabilities
        """
        # Normalize headers for matching
        normalized = [h.lower().strip() for h in csv_headers]
        
        # Map CSV columns to our standard fields
        mapped_fields = self._map_headers(normalized)
        
        # Check tier requirements from highest to lowest
        achieved_tier = 1
        for tier_level in [4, 3, 2, 1]:
            if self._meets_tier_requirements(tier_level, mapped_fields):
                achieved_tier = tier_level
                break
        
        # Get tier info
        tier_info = self.TIER_REQUIREMENTS[achieved_tier]
        
        # Determine what's missing for next tier
        missing = []
        if achieved_tier < 4:
            next_tier = achieved_tier + 1
            missing = self._get_missing_fields(next_tier, mapped_fields)
        
        # Build capability list
        capabilities = tier_info["capabilities"].copy()
        
        return DataTier(
            tier=achieved_tier,
            tier_name=tier_info["name"],
            capabilities=capabilities,
            missing_for_next_tier=missing,
            available_analyzers=tier_info["analyzers"],
            column_coverage=mapped_fields
        )
    
    def _map_headers(self, normalized_headers: List[str]) -> Dict[str, bool]:
        """Map CSV headers to standard field names"""
        mapped = {}
        
        for standard_field, patterns in self.COLUMN_PATTERNS.items():
            # Check if any pattern matches
            found = False
            for header in normalized_headers:
                if any(pattern in header for pattern in patterns):
                    found = True
                    break
            mapped[standard_field] = found
        
        return mapped
    
    def _meets_tier_requirements(self, tier_level: int, mapped_fields: Dict[str, bool]) -> bool:
        """Check if mapped fields meet tier requirements"""
        requirements = self.TIER_REQUIREMENTS[tier_level]
        
        # Check required_all (all must be present)
        if "required_all" in requirements:
            for field in requirements["required_all"]:
                if not mapped_fields.get(field, False):
                    return False
        
        # Check required_any (at least one group must be complete)
        if "required_any" in requirements:
            any_group_met = False
            for field_group in requirements["required_any"]:
                if all(mapped_fields.get(field, False) for field in field_group):
                    any_group_met = True
                    break
            if not any_group_met:
                return False
        
        return True
    
    def _get_missing_fields(self, tier_level: int, mapped_fields: Dict[str, bool]) -> List[str]:
        """Determine what fields are missing for a given tier"""
        requirements = self.TIER_REQUIREMENTS[tier_level]
        missing = []
        
        # Check required_all
        if "required_all" in requirements:
            for field in requirements["required_all"]:
                if not mapped_fields.get(field, False):
                    missing.append(self._format_field_name(field))
        
        # Check required_any - suggest first missing group
        if "required_any" in requirements:
            for field_group in requirements["required_any"]:
                missing_in_group = [
                    self._format_field_name(field) 
                    for field in field_group 
                    if not mapped_fields.get(field, False)
                ]
                if missing_in_group:
                    # Suggest this group (first incomplete one)
                    missing.extend(missing_in_group)
                    break
        
        return missing
    
    def _format_field_name(self, field: str) -> str:
        """Convert field name to user-friendly format"""
        # Convert snake_case to Title Case
        return field.replace('_', ' ').title()
    
    def generate_feedback_message(self, tier: DataTier) -> str:
        """Generate user-friendly feedback message"""
        
        if tier.tier == 4:
            return (
                f"Premium Data Detected! You're getting our most powerful insights including "
                f"root cause analysis and process efficiency tracking."
            )
        
        capability_summary = ", ".join(tier.capabilities[:2])
        
        message = (
            f"{tier.tier_name} Data Tier - Unlocking: {capability_summary}"
        )
        
        if tier.missing_for_next_tier:
            next_tier_name = self.TIER_REQUIREMENTS[tier.tier + 1]["name"]
            missing_fields = ", ".join(tier.missing_for_next_tier[:2])
            
            message += (
                f"\n\nTo unlock {next_tier_name} tier insights, add these columns next time: "
                f"{missing_fields}"
            )
        
        return message


# Example usage
if __name__ == "__main__":
    detector = DataTierDetector()
    
    # Test different CSV configurations
    test_cases = [
        # Tier 1: Basic cost data
        ["Work Order Number", "Planned Material Cost", "Actual Material Cost"],
        
        # Tier 2: With material codes
        ["Work Order Number", "Material Code", "Planned Material Cost", "Actual Material Cost", "Planned Labor Hours", "Actual Labor Hours"],
        
        # Tier 3: With equipment
        ["Work Order Number", "Material Code", "Equipment ID", "Planned Material Cost", "Actual Material Cost", "Scrapped Quantity"],
        
        # Tier 4: With cycle times
        ["Work Order Number", "Material Code", "Equipment ID", "Cycle Time", "Start Date", "Completion Date", "Planned Material Cost", "Actual Material Cost"]
    ]
    
    for i, headers in enumerate(test_cases, 1):
        print(f"\n{'='*60}")
        print(f"Test Case {i}:")
        print(f"Headers: {headers}")
        
        tier = detector.detect_tier(headers)
        
        print(f"\nTier: {tier.tier} ({tier.tier_name})")
        print(f"Capabilities: {', '.join(tier.capabilities)}")
        print(f"Available Analyzers: {', '.join(tier.available_analyzers)}")
        
        if tier.missing_for_next_tier:
            print(f"Missing for next tier: {', '.join(tier.missing_for_next_tier)}")
        
        print(f"\n{detector.generate_feedback_message(tier)}")