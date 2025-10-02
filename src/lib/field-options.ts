// Available target fields for CSV mapping
export interface TargetField {
  value: string;
  label: string;
  description: string;
}

export const TARGET_FIELDS: TargetField[] = [
  {
    value: "work_order_id",
    label: "Work Order ID",
    description: "Unique identifier for the work order",
  },
  {
    value: "material_code",
    label: "Material Code",
    description: "Product or material identifier",
  },
  {
    value: "planned_quantity",
    label: "Planned Quantity",
    description: "Planned production quantity",
  },
  {
    value: "actual_quantity",
    label: "Actual Quantity",
    description: "Actual quantity produced",
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
    value: "equipment_id",
    label: "Equipment ID",
    description: "Machine or equipment identifier",
  },
  {
    value: "status",
    label: "Status",
    description: "Work order status (completed, in progress, etc.)",
  },
  {
    value: "planned_start_date",
    label: "Planned Start Date",
    description: "Scheduled start date",
  },
  {
    value: "actual_start_date",
    label: "Actual Start Date",
    description: "Actual start date",
  },
  {
    value: "planned_end_date",
    label: "Planned End Date",
    description: "Scheduled completion date",
  },
  {
    value: "actual_end_date",
    label: "Actual End Date",
    description: "Actual completion date",
  },
  {
    value: "quality_result",
    label: "Quality Result",
    description: "Quality inspection outcome",
  },
  {
    value: "units_scrapped",
    label: "Units Scrapped",
    description: "Number of defective units",
  },
  {
    value: "quality_issues",
    label: "Quality Issues",
    description: "Description of quality problems",
  },
  { value: "shift", label: "Shift", description: "Work shift identifier" },
  {
    value: "plant",
    label: "Plant/Facility",
    description: "Manufacturing plant or facility",
  },
  {
    value: "department",
    label: "Department",
    description: "Department or work center",
  },
  {
    value: "operator",
    label: "Operator",
    description: "Machine operator or worker ID",
  },
  {
    value: "supervisor",
    label: "Supervisor",
    description: "Supervisor or manager",
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
