import os
from typing import List, Dict, Optional
from supabase import create_client
from dotenv import load_dotenv
import pandas as pd
import numpy as np

class CostAnalyzer:
    def __init__(self):
        load_dotenv('../.env.local')
        
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
        
        self.supabase = create_client(url, key)
        self.LABOR_RATE_PER_HOUR = 200

    def predict_cost_variance(self, facility_id: int = 1, batch_id: Optional[str] = None) -> Dict:
        """Analyze cost variances with pattern detection across work orders"""
        
        query = self.supabase.table("work_orders").select("*").eq("facility_id", facility_id)
        
        if batch_id:
            query = query.eq("uploaded_csv_batch", batch_id)
        else:
            # Get most recent batch if no batch_id specified
            recent_batch = self.supabase.table("work_orders")\
                .select("uploaded_csv_batch")\
                .eq("facility_id", facility_id)\
                .order("uploaded_csv_batch")\
                .execute()
            
            if recent_batch.data and len(recent_batch.data) > 0:
                batch_id = recent_batch.data[-1]["uploaded_csv_batch"]
                query = query.eq("uploaded_csv_batch", batch_id)
        
        response = query.execute()
        
        if not response.data or len(response.data) == 0:
            return {
                "status": "error",
                "error": "no_data",
                "message": "No work order data found for analysis.",
            }
        
        df = pd.DataFrame(response.data)
        
        # Validate required fields
        required_fields = [
            "planned_material_cost",
            "actual_material_cost",
            "planned_labor_hours",
            "actual_labor_hours",
        ]
        
        missing_fields = []
        empty_fields = []
        
        for field in required_fields:
            if field not in df.columns:
                missing_fields.append(field)
            elif df[field].isna().all() or (df[field] == 0).all():
                empty_fields.append(field)
        
        if missing_fields or empty_fields:
            all_missing = missing_fields + empty_fields
            return {
                "status": "insufficient_data",
                "error": "insufficient_data",
                "message": f"Cannot analyze cost variance. Missing or empty fields: {', '.join(all_missing)}",
                "missing_fields": all_missing,
            }
        
        # Calculate variances
        df["material_variance"] = df["actual_material_cost"] - df["planned_material_cost"]
        df["labor_cost_planned"] = df["planned_labor_hours"] * self.LABOR_RATE_PER_HOUR
        df["labor_cost_actual"] = df["actual_labor_hours"] * self.LABOR_RATE_PER_HOUR
        df["labor_variance"] = df["labor_cost_actual"] - df["labor_cost_planned"]
        df["total_variance"] = df["material_variance"] + df["labor_variance"]
        
        # Calculate average order value for threshold
        df["total_planned"] = df["planned_material_cost"] + df["labor_cost_planned"]
        avg_order_value = df["total_planned"].mean()
        variance_threshold = max(1000, avg_order_value * 0.05)
        
        # Filter significant variances
        significant = df[abs(df["total_variance"]) > variance_threshold].copy()
        
        if len(significant) == 0:
            return {
                "status": "success",
                "predictions": [],
                "patterns": [],
                "total_impact": 0,
                "message": f"No significant cost variances detected (threshold: ${variance_threshold:,.0f})",
            }
        
        # Detect patterns - Material codes
        material_patterns = []
        if "material_code" in df.columns and df["material_code"].notna().any():
            material_groups = significant.groupby("material_code").agg({
                "total_variance": ["count", "sum", "mean"],
                "work_order_number": lambda x: list(x)
            }).reset_index()
            
            material_groups.columns = ["material_code", "order_count", "total_impact", "avg_variance", "work_orders"]
            material_groups = material_groups[material_groups["order_count"] >= 3]
            
            for _, row in material_groups.iterrows():
                material_patterns.append({
                    "type": "material",
                    "identifier": row["material_code"],
                    "order_count": int(row["order_count"]),
                    "total_impact": float(row["total_impact"]),
                    "avg_variance": float(row["avg_variance"]),
                    "work_orders": row["work_orders"]
                })
        
        # Detect patterns - Supplier IDs
        supplier_patterns = []
        if "supplier_id" in df.columns and df["supplier_id"].notna().any():
            supplier_groups = significant.groupby("supplier_id").agg({
                "total_variance": ["count", "sum", "mean"],
                "work_order_number": lambda x: list(x)
            }).reset_index()
            
            supplier_groups.columns = ["supplier_id", "order_count", "total_impact", "avg_variance", "work_orders"]
            supplier_groups = supplier_groups[supplier_groups["order_count"] >= 3]
            
            for _, row in supplier_groups.iterrows():
                supplier_patterns.append({
                    "type": "supplier",
                    "identifier": row["supplier_id"],
                    "order_count": int(row["order_count"]),
                    "total_impact": float(row["total_impact"]),
                    "avg_variance": float(row["avg_variance"]),
                    "work_orders": row["work_orders"]
                })
        
        all_patterns = material_patterns + supplier_patterns
        all_patterns.sort(key=lambda x: abs(x["total_impact"]), reverse=True)
        
        # Build predictions for individual work orders
        predictions = []
        for _, row in significant.nlargest(20, "total_variance", keep="all").iterrows():
            material_pct = (abs(row["material_variance"]) / abs(row["total_variance"]) * 100) if row["total_variance"] != 0 else 50
            labor_pct = 100 - material_pct
            
            risk_level = "critical" if abs(row["total_variance"]) > variance_threshold * 5 else \
                         "high" if abs(row["total_variance"]) > variance_threshold * 2 else \
                         "medium"
            
            predictions.append({
                "work_order_number": row["work_order_number"],
                "predicted_variance": float(row["total_variance"]),
                "confidence": 0.85,
                "risk_level": risk_level,
                "analysis": {
                    "variance_breakdown": {
                        "material": {
                            "planned": float(row["planned_material_cost"]),
                            "actual": float(row["actual_material_cost"]),
                            "variance": float(row["material_variance"]),
                            "percentage": float(material_pct),
                            "variance_pct": float(material_pct),
                            "driver": "Material cost variance"
                        },
                        "labor": {
                            "planned": float(row["labor_cost_planned"]),
                            "actual": float(row["labor_cost_actual"]),
                            "variance": float(row["labor_variance"]),
                            "percentage": float(labor_pct),
                            "variance_pct": float(labor_pct),
                            "hours_variance": float(row["actual_labor_hours"] - row["planned_labor_hours"]),
                            "driver": "Labor hours variance"
                        }
                    },
                    "primary_driver": "material" if material_pct > 50 else "labor"
                }
            })
        
        total_impact = float(significant["total_variance"].sum())
        
        return {
            "status": "success",
            "predictions": predictions,
            "patterns": all_patterns,
            "total_impact": total_impact,
            "message": f"Found {len(predictions)} work orders with significant cost variances and {len(all_patterns)} patterns"
        }