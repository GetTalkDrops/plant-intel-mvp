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
      const batchId = `batch_${Date.now()}_${fileHash.substring(0, 8)}`;

      // Store the CSV rows in Supabase
      const { data, error } = await supabase
        .from("csv_uploads")
        .insert(
          mappedData.map((row) => ({
            user_email: userEmail,
            batch_id: batchId,
            file_name: fileName,
            file_hash: fileHash,
            header_signature: headerSignature,
            mapping_name: mappingName,
            data: row,
            created_at: new Date().toISOString(),
          }))
        )
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
        facilityId,
        demoMode,
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
