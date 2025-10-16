import { supabase } from "./supabase";

export interface ROIOpportunity {
  id: string;
  customer_profile_id: string;
  analysis_review_id?: string;
  identified_date: string;
  description: string;
  category?: "material" | "labor" | "quality" | "equipment";
  savings_identified: number;
  savings_captured: number;
  status: "identified" | "in-progress" | "captured" | "not-pursued";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ROISummary {
  total_identified: number;
  total_captured: number;
  conversion_rate: number;
  opportunities_count: number;
  by_status: {
    identified: number;
    in_progress: number;
    captured: number;
    not_pursued: number;
  };
  by_category: {
    material: number;
    labor: number;
    quality: number;
    equipment: number;
  };
}

/**
 * Add a new ROI opportunity
 */
export async function addOpportunity(
  profileId: string,
  description: string,
  savings: number,
  category?: ROIOpportunity["category"],
  analysisReviewId?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("roi_opportunities")
      .insert({
        customer_profile_id: profileId,
        analysis_review_id: analysisReviewId,
        identified_date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
        description,
        savings_identified: savings,
        category: category || "material",
        status: "identified",
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding opportunity:", error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("Failed to add opportunity:", error);
    return null;
  }
}

/**
 * Update opportunity as captured with amount
 */
export async function updateOpportunityCaptured(
  opportunityId: string,
  capturedAmount: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("roi_opportunities")
      .update({
        savings_captured: capturedAmount,
        status: "captured",
      })
      .eq("id", opportunityId);

    if (error) {
      console.error("Error updating opportunity:", error);
      return false;
    }

    // Also update the customer profile's total captured
    const { data: opportunity } = await supabase
      .from("roi_opportunities")
      .select("customer_profile_id")
      .eq("id", opportunityId)
      .single();

    if (opportunity) {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("total_savings_captured")
        .eq("id", opportunity.customer_profile_id)
        .single();

      if (profile) {
        const newTotal = (profile.total_savings_captured || 0) + capturedAmount;

        await supabase
          .from("customer_profiles")
          .update({ total_savings_captured: newTotal })
          .eq("id", opportunity.customer_profile_id);
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to update opportunity:", error);
    return false;
  }
}

/**
 * Update opportunity status
 */
export async function updateOpportunityStatus(
  opportunityId: string,
  status: ROIOpportunity["status"],
  notes?: string
): Promise<boolean> {
  try {
    const updates: Record<string, unknown> = { status };
    if (notes) {
      updates.notes = notes;
    }

    const { error } = await supabase
      .from("roi_opportunities")
      .update(updates)
      .eq("id", opportunityId);

    if (error) {
      console.error("Error updating opportunity status:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to update opportunity status:", error);
    return false;
  }
}

/**
 * Get ROI summary for a customer profile
 */
export async function getROISummary(profileId: string): Promise<ROISummary> {
  try {
    const { data: opportunities, error } = await supabase
      .from("roi_opportunities")
      .select("*")
      .eq("customer_profile_id", profileId);

    if (error || !opportunities) {
      console.error("Error fetching opportunities:", error);
      return getEmptySummary();
    }

    const total_identified = opportunities.reduce(
      (sum, opp) => sum + (opp.savings_identified || 0),
      0
    );

    const total_captured = opportunities.reduce(
      (sum, opp) => sum + (opp.savings_captured || 0),
      0
    );

    const conversion_rate =
      total_identified > 0 ? (total_captured / total_identified) * 100 : 0;

    const by_status = {
      identified: opportunities.filter((o) => o.status === "identified").length,
      in_progress: opportunities.filter((o) => o.status === "in-progress")
        .length,
      captured: opportunities.filter((o) => o.status === "captured").length,
      not_pursued: opportunities.filter((o) => o.status === "not-pursued")
        .length,
    };

    const by_category = {
      material: opportunities
        .filter((o) => o.category === "material")
        .reduce((sum, o) => sum + (o.savings_identified || 0), 0),
      labor: opportunities
        .filter((o) => o.category === "labor")
        .reduce((sum, o) => sum + (o.savings_identified || 0), 0),
      quality: opportunities
        .filter((o) => o.category === "quality")
        .reduce((sum, o) => sum + (o.savings_identified || 0), 0),
      equipment: opportunities
        .filter((o) => o.category === "equipment")
        .reduce((sum, o) => sum + (o.savings_identified || 0), 0),
    };

    return {
      total_identified,
      total_captured,
      conversion_rate: Math.round(conversion_rate),
      opportunities_count: opportunities.length,
      by_status,
      by_category,
    };
  } catch (error) {
    console.error("Failed to get ROI summary:", error);
    return getEmptySummary();
  }
}

/**
 * Get all opportunities for a customer profile
 */
export async function getOpportunities(
  profileId: string,
  status?: ROIOpportunity["status"]
): Promise<ROIOpportunity[]> {
  try {
    let query = supabase
      .from("roi_opportunities")
      .select("*")
      .eq("customer_profile_id", profileId)
      .order("identified_date", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching opportunities:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch opportunities:", error);
    return [];
  }
}

/**
 * Delete an opportunity
 */
export async function deleteOpportunity(
  opportunityId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("roi_opportunities")
      .delete()
      .eq("id", opportunityId);

    if (error) {
      console.error("Error deleting opportunity:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to delete opportunity:", error);
    return false;
  }
}

// Helper function
function getEmptySummary(): ROISummary {
  return {
    total_identified: 0,
    total_captured: 0,
    conversion_rate: 0,
    opportunities_count: 0,
    by_status: {
      identified: 0,
      in_progress: 0,
      captured: 0,
      not_pursued: 0,
    },
    by_category: {
      material: 0,
      labor: 0,
      quality: 0,
      equipment: 0,
    },
  };
}
