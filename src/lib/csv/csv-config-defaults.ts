/**
 * Global default configuration values for CSV analysis
 * These are used when no template exists or user hasn't specified values
 *
 * Note: These can be moved to user profiles in future iterations
 */

export interface AnalysisConfig {
  labor_rate_hourly: number;
  scrap_cost_per_unit: number;
  variance_threshold_pct: number;
  pattern_min_orders: number;
}

/**
 * Global defaults for all new uploads/templates
 */
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  labor_rate_hourly: 55,
  scrap_cost_per_unit: 75,
  variance_threshold_pct: 15,
  pattern_min_orders: 3,
};

/**
 * Configuration variable definitions for UI display
 */
export interface ConfigVariable {
  key: keyof AnalysisConfig;
  label: string;
  description: string;
  defaultValue: number;
  unit: string;
  type: "number" | "percentage";
  required: boolean;
  helpText: string;
  example: string;
}

export const CONFIG_VARIABLES: ConfigVariable[] = [
  {
    key: "labor_rate_hourly",
    label: "Labor Rate",
    description: "Average hourly labor cost for this facility/line",
    defaultValue: 55,
    unit: "$/hour",
    type: "number",
    required: true,
    helpText:
      "Include base wage + benefits + overhead. Typical range: $35-95/hr depending on region and skill level.",
    example: "$35/hr (low-cost) to $95/hr (high-skill/premium location)",
  },
  {
    key: "scrap_cost_per_unit",
    label: "Scrap Cost",
    description: "Average cost per scrapped unit",
    defaultValue: 75,
    unit: "$/unit",
    type: "number",
    required: true,
    helpText:
      "Include material + labor already invested. Varies significantly by product complexity.",
    example: "$5-25 (commodity) to $250+ (precision assemblies)",
  },
  {
    key: "variance_threshold_pct",
    label: "Variance Alert Threshold",
    description: "Percentage variance to trigger an alert",
    defaultValue: 15,
    unit: "%",
    type: "percentage",
    required: false,
    helpText:
      "Lower = more sensitive (more alerts). Higher = only major issues. Adjust based on your tolerances.",
    example: "5-10% (tight tolerances) to 20-30% (commodity goods)",
  },
  {
    key: "pattern_min_orders",
    label: "Pattern Detection",
    description: "Minimum orders needed to identify a pattern",
    defaultValue: 3,
    unit: "orders",
    type: "number",
    required: false,
    helpText:
      "Lower = faster detection but less certainty. Higher = more reliable patterns.",
    example: "2-3 (small batches) to 5-10 (large volumes)",
  },
];
