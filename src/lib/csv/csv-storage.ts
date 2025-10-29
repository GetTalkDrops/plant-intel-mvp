import { supabase } from "@/lib/supabase";

interface StoreCsvResult {
  success: boolean;
  error?: string;
  batchId?: string;
  recordsInserted?: number;
  facilityId?: number;
  demoMode?: boolean;
}

class CsvStorageService {
  async storeCsvData(
    mappedData: any[],
    userEmail: string,
    mapping: any,
    fileName: string,
    headerSignature: string,
    fileHash: string,
    mappingName?: string,
    facilityId?: number,
    demoMode?: boolean
  ): Promise<StoreCsvResult> {
    try {
      // Generate batch ID for this upload
      const batchId = `${Date.now()}_${fileName}`;

      // Determine facility ID if not provided
      const finalFacilityId =
        facilityId || (userEmail === "skinner.chris@gmail.com" ? 1 : 2);
      const finalDemoMode = demoMode || userEmail === "skinner.chris@gmail.com";

      // Transform mapped data to work_orders format
      // Only include columns that exist in the work_orders table
      const workOrders = mappedData.map((row, index) => ({
        facility_id: finalFacilityId,
        demo_mode: finalDemoMode,
        uploaded_csv_batch: batchId,
        work_order_number:
          row.work_order_number || `UPLOAD-${batchId}-${index + 1}`,
        material_code: row.material_code || null,
        supplier_id: row.supplier_id || null,
        planned_material_cost: row.planned_material_cost || 0,
        actual_material_cost: row.actual_material_cost || 0,
        planned_labor_hours: row.planned_labor_hours || 0,
        actual_labor_hours: row.actual_labor_hours || 0,
      }));

      // Store in work_orders table
      const { data, error } = await supabase
        .from("work_orders")
        .insert(workOrders)
        .select();

      if (error) {
        console.error("Error storing CSV data:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        batchId,
        recordsInserted: mappedData.length,
        facilityId: finalFacilityId,
        demoMode: finalDemoMode,
      };
    } catch (error) {
      console.error("Unexpected error storing CSV data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const csvStorageService = new CsvStorageService();
