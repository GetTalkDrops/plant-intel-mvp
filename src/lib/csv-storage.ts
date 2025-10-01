// src/lib/csv-storage.ts
import { supabase } from "@/lib/supabase";
import { isDemoAccount, DEMO_FACILITY_ID } from "@/lib/demo-account";
import { ColumnMapping as CsvMapperMapping } from "@/lib/csvMapper";

export interface CsvUploadResult {
  success: boolean;
  recordsInserted: number;
  facilityId: number;
  demoMode: boolean;
  batchId?: string; // Add this
  error?: string;
}

export interface WorkOrderRecord {
  work_order_number: string;
  facility_id: number;
  demo_mode: boolean;
  uploaded_csv_batch: string;
  [key: string]: string | number | boolean | null; // Allow dynamic fields
}

export class CsvStorageService {
  async storeCsvData(
    mappedData: Record<string, string | number>[],
    userEmail: string,
    confirmedMappings: CsvMapperMapping[],
    fileName: string,
    headerSignature?: string,
    fileHash?: string
  ): Promise<CsvUploadResult> {
    const isDemo = isDemoAccount(userEmail);
    const facilityId: number = isDemo ? DEMO_FACILITY_ID : 2;
    const batchId = `${Date.now()}_${fileName}`;

    try {
      // Build a lookup map: sourceColumn -> targetField
      const mappingLookup: Record<string, string> = {};
      confirmedMappings.forEach((m) => {
        mappingLookup[m.sourceColumn] = m.targetField;
      });

      // Transform each row dynamically based on confirmed mappings
      const workOrders: WorkOrderRecord[] = mappedData.map((row, index) => {
        const workOrder: WorkOrderRecord = {
          work_order_number: `UPLOAD-${batchId}-${index + 1}`,
          facility_id: facilityId,
          demo_mode: isDemo,
          uploaded_csv_batch: batchId,
        };

        // Process each source column that has a mapping
        Object.entries(mappingLookup).forEach(([sourceColumn, targetField]) => {
          const sourceValue = row[sourceColumn];

          if (
            sourceValue !== undefined &&
            sourceValue !== null &&
            sourceValue !== ""
          ) {
            // Handle special fields
            if (targetField === "work_order_id") {
              workOrder.work_order_number = String(sourceValue);
            } else if (
              targetField.includes("cost") ||
              targetField.includes("hours") ||
              targetField.includes("quantity") ||
              targetField.includes("scrapped")
            ) {
              // Numeric fields
              workOrder[targetField] = this.parseNumber(sourceValue);
            } else if (targetField.includes("date")) {
              // Date fields
              workOrder[targetField] = this.parseDate(sourceValue);
            } else {
              // String fields
              workOrder[targetField] = String(sourceValue);
            }
          }
        });

        return workOrder;
      });

      console.log(
        `Storing ${workOrders.length} records with dynamic fields:`,
        Object.keys(workOrders[0] || {})
      );

      // Check if this exact file (same hash) was uploaded before
      if (fileHash) {
        const { data: existingBatch } = await supabase
          .from("csv_mappings")
          .select("*")
          .eq("user_email", userEmail)
          .eq("file_hash", fileHash)
          .single();

        if (existingBatch) {
          console.log("Exact file match found - replacing old data");

          // Delete old work orders from this exact file
          await supabase
            .from("work_orders")
            .delete()
            .eq("facility_id", facilityId)
            .eq("demo_mode", isDemo)
            .eq("uploaded_csv_batch", existingBatch.file_name);
        }
      }

      // Store in Supabase
      const { data, error } = await supabase
        .from("work_orders")
        .insert(workOrders)
        .select();

      if (error) {
        console.error("Error storing CSV data:", error);
        return {
          success: false,
          recordsInserted: 0,
          facilityId,
          demoMode: isDemo,
          batchId,
          error: error.message,
        };
      }

      // Store CSV mapping for reuse
      await this.storeCsvMapping(
        userEmail,
        facilityId,
        confirmedMappings,
        fileName,
        headerSignature,
        fileHash
      );

      return {
        success: true,
        recordsInserted: workOrders.length,
        facilityId,
        demoMode: isDemo,
        batchId, // Add this - it's already defined at the top of the method
      };
    } catch (error) {
      console.error("CSV storage failed:", error);
      return {
        success: false,
        recordsInserted: 0,
        facilityId,
        demoMode: isDemo,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async storeCsvMapping(
    userEmail: string,
    facilityId: number,
    mapping: CsvMapperMapping[],
    fileName: string,
    headerSignature?: string,
    fileHash?: string
  ): Promise<void> {
    try {
      // Check if mapping with this header signature already exists
      if (headerSignature) {
        const { data: existing } = await supabase
          .from("csv_mappings")
          .select("id")
          .eq("user_email", userEmail)
          .eq("header_signature", headerSignature)
          .single();

        if (existing) {
          // Update existing mapping
          await supabase
            .from("csv_mappings")
            .update({
              mapping_config: mapping,
              file_name: fileName,
              file_hash: fileHash,
              created_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          console.log("Updated existing mapping");
          return;
        }
      }

      // Insert new mapping
      const { error } = await supabase.from("csv_mappings").insert({
        user_email: userEmail,
        facility_id: facilityId,
        file_name: fileName,
        mapping_config: mapping,
        header_signature: headerSignature,
        file_hash: fileHash,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error storing CSV mapping:", error);
      } else {
        console.log("Saved new mapping");
      }
    } catch (error) {
      console.error("CSV mapping storage failed:", error);
    }
  }

  private parseNumber(
    value: string | number | null | undefined,
    defaultValue: number = 0
  ): number {
    if (value === null || value === undefined || value === "") {
      return defaultValue;
    }

    const parsed = parseFloat(String(value).replace(/[,$]/g, ""));
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private parseDate(value: string | number | null | undefined): string | null {
    if (!value) return null;

    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }
}

export const csvStorageService = new CsvStorageService();
