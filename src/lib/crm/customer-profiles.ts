import { supabase, supabaseAdmin } from "../supabase";

export interface CustomerProfile {
  id: string;
  user_id: string;
  company_name: string;
  industry?: string;
  primary_contact?: string;
  pilot_start_date?: string;
  pilot_end_date?: string;
  pilot_status: "active" | "completed" | "cancelled";
  variance_threshold_pct: number;
  min_variance_amount: number;
  confidence_threshold_pct: number;
  focus_material_costs: boolean;
  focus_labor_efficiency: boolean;
  focus_quality_issues: boolean;
  focus_equipment: boolean;
  excluded_suppliers: string[];
  excluded_materials: string[];
  excluded_wo_types: string[];
  company_overview?: string;
  seasonal_patterns?: string;
  known_issues?: string;
  supplier_relationships?: string;
  success_metrics?: string;
  roi_guarantee_target: number;
  total_savings_identified: number;
  total_savings_captured: number;
  created_at: string;
  updated_at: string;
}

/**
 * Load or create a customer profile for a user
 */
export async function loadCustomerProfile(
  userId: string
): Promise<CustomerProfile | null> {
  try {
    const { data, error } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error loading customer profile:", error);
      return null;
    }

    // If no profile exists, create a default one
    if (!data) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!profile) return null;

      const newProfile = {
        user_id: userId,
        company_name: profile.company_name || "Unknown Company",
        pilot_status: "active" as const,
        variance_threshold_pct: 15,
        min_variance_amount: 1000,
        confidence_threshold_pct: 65,
        focus_material_costs: true,
        focus_labor_efficiency: true,
        focus_quality_issues: true,
        focus_equipment: true,
        roi_guarantee_target: 50000,
        total_savings_identified: 0,
        total_savings_captured: 0,
      };

      const { data: created, error: createError } = await supabase
        .from("customer_profiles")
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error("Error creating customer profile:", createError);
        return null;
      }

      return created;
    }

    return data;
  } catch (error) {
    console.error("Failed to load customer profile:", error);
    return null;
  }
}

/**
 * Update customer profile configuration
 */
export async function updateCustomerProfile(
  profileId: string,
  updates: Partial<CustomerProfile>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("customer_profiles")
      .update(updates)
      .eq("id", profileId);

    if (error) {
      console.error("Error updating customer profile:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to update customer profile:", error);
    return false;
  }
}

/**
 * Get all active pilot customers
 */
export async function getActiveProfiles(): Promise<CustomerProfile[]> {
  try {
    const { data, error } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("pilot_status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching active profiles:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch active profiles:", error);
    return [];
  }
}

/**
 * Calculate ROI progress for a customer
 */
export async function calculateROIProgress(profileId: string): Promise<{
  identified: number;
  captured: number;
  target: number;
  percentToTarget: number;
  conversionRate: number;
  daysRemaining: number;
}> {
  try {
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const identified = profile.total_savings_identified || 0;
    const captured = profile.total_savings_captured || 0;
    const target = profile.roi_guarantee_target || 50000;

    const percentToTarget = (identified / target) * 100;
    const conversionRate = identified > 0 ? (captured / identified) * 100 : 0;

    // Calculate days remaining in pilot
    let daysRemaining = 0;
    if (profile.pilot_end_date) {
      const endDate = new Date(profile.pilot_end_date);
      const today = new Date();
      daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      );
    }

    return {
      identified,
      captured,
      target,
      percentToTarget: Math.round(percentToTarget),
      conversionRate: Math.round(conversionRate),
      daysRemaining,
    };
  } catch (error) {
    console.error("Failed to calculate ROI progress:", error);
    return {
      identified: 0,
      captured: 0,
      target: 50000,
      percentToTarget: 0,
      conversionRate: 0,
      daysRemaining: 0,
    };
  }
}
