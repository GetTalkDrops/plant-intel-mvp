// Available target fields for CSV mapping
export interface TargetField {
  value: string;
  label: string;
  description: string;
}

export const TARGET_FIELDS: TargetField[] = [
  {
    value: "SELECT",
    label: "⚠️ Select a field...",
    description: "Choose how to map this column",
  },
  {
    value: "work_order_number",
    label: "Work Order ID",
    description: "Unique identifier for the work order",
  },
  {
    value: "facility_id",
    label: "Facility ID",
    description: "Plant or facility identifier",
  },
  {
    value: "material_code",
    label: "Material Code",
    description: "Product or material identifier",
  },
  {
    value: "supplier_id",
    label: "Supplier ID",
    description: "Supplier or vendor identifier",
  },
  {
    value: "units_produced",
    label: "Units Produced",
    description: "Quantity produced",
  },
  {
    value: "units_scrapped",
    label: "Units Scrapped",
    description: "Number of defective units",
  },
  {
    value: "planned_material_cost",
    label: "Planned Material Cost",
    description: "Budgeted material cost",
  },
  {
    value: "actual_material_cost",
    label: "Actual Material Cost",
    description: "Actual material cost incurred",
  },
  {
    value: "planned_labor_hours",
    label: "Planned Labor Hours",
    description: "Budgeted labor hours",
  },
  {
    value: "actual_labor_hours",
    label: "Actual Labor Hours",
    description: "Actual labor hours used",
  },
  {
    value: "machine_id",
    label: "Machine ID",
    description: "Machine or equipment identifier",
  },
  {
    value: "quality_issues",
    label: "Quality Issues",
    description: "Description of quality problems",
  },
  {
    value: "production_period_start",
    label: "Production Start",
    description: "Production period start date/time",
  },
  {
    value: "production_period_end",
    label: "Production End",
    description: "Production period end date/time",
  },
  {
    value: "IGNORE",
    label: "Don't Import",
    description: "Skip this column during import",
  },
];

export const getFieldByValue = (value: string): TargetField | undefined => {
  return TARGET_FIELDS.find((f) => f.value === value);
};

export const getFieldLabel = (value: string): string => {
  return getFieldByValue(value)?.label || value;
};
