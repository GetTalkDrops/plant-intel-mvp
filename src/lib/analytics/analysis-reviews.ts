import { supabase } from "../supabase";

// ML Results types
export interface VarianceBreakdown {
  material?: {
    planned: number;
    actual: number;
    variance: number;
    percentage: number;
    driver: string;
    context?: string;
  };
  labor?: {
    planned: number;
    actual: number;
    variance: number;
    percentage: number;
    driver: string;
    context?: string;
  };
  primary_driver?: string;
}

export interface MLResults {
  status: string;
  predictions?: Array<{
    work_order_number: string;
    predicted_variance: number;
    confidence: number;
    risk_level: string;
    analysis?: VarianceBreakdown;
  }>;
  patterns?: Array<{
    type: string;
    identifier: string;
    order_count: number;
    total_impact: number;
    narrative?: {
      recommended_actions?: Array<{
        estimated_monthly_savings?: number;
      }>;
    };
  }>;
  total_impact?: number;
  total_savings_opportunity?: number;
  message?: string;
}

export interface AnalysisReview {
  id: string;
  customer_profile_id: string;
  batch_id: string;
  facility_id: number;
  status: "pending" | "in_review" | "approved" | "published";
  reviewed_by?: string;
  reviewed_at?: string;
  original_results?: MLResults;
  edited_results?: MLResults;
  internal_notes?: string;
  checklist_completed: boolean;
  savings_identified: number;
  issues_found: number;
  created_at: string;
  published_at?: string;
}

/**
 * Create a new analysis review (pending state)
 */
export async function createReview(
  customerProfileId: string,
  batchId: string,
  facilityId: number,
  mlResults: MLResults
): Promise<string | null> {
  try {
    // Calculate savings and issues from ML results
    const savings = calculateTotalSavings(mlResults);
    const issues = countIssues(mlResults);

    const { data, error } = await supabase
      .from("analysis_reviews")
      .insert({
        customer_profile_id: customerProfileId,
        batch_id: batchId,
        facility_id: facilityId,
        status: "pending",
        original_results: mlResults,
        savings_identified: savings,
        issues_found: issues,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating review:", error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("Failed to create review:", error);
    return null;
  }
}

/**
 * Update review status and results
 */
export async function updateReviewStatus(
  reviewId: string,
  status: AnalysisReview["status"],
  editedResults?: MLResults,
  reviewedBy?: string
): Promise<boolean> {
  try {
    const updates: Record<string, unknown> = {
      status,
    };

    if (editedResults) {
      updates.edited_results = editedResults;
    }

    if (status === "published") {
      updates.published_at = new Date().toISOString();
      updates.reviewed_by = reviewedBy;
      updates.reviewed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("analysis_reviews")
      .update(updates)
      .eq("id", reviewId);

    if (error) {
      console.error("Error updating review status:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to update review status:", error);
    return false;
  }
}

/**
 * Get all pending reviews (for admin dashboard)
 */
export async function getPendingReviews(): Promise<AnalysisReview[]> {
  try {
    const { data, error } = await supabase
      .from("analysis_reviews")
      .select(
        `
        *,
        customer_profiles!inner(company_name, user_id)
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }); // FIFO - oldest first

    if (error) {
      console.error("Error fetching pending reviews:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch pending reviews:", error);
    return [];
  }
}

/**
 * Get a single review by ID
 */
export async function getReview(
  reviewId: string
): Promise<AnalysisReview | null> {
  try {
    const { data, error } = await supabase
      .from("analysis_reviews")
      .select("*")
      .eq("id", reviewId)
      .single();

    if (error) {
      console.error("Error fetching review:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch review:", error);
    return null;
  }
}

/**
 * Publish analysis (mark as approved and notify customer)
 */
export async function publishAnalysis(
  reviewId: string,
  reviewedBy: string
): Promise<boolean> {
  try {
    // Update review to published
    const success = await updateReviewStatus(
      reviewId,
      "published",
      undefined,
      reviewedBy
    );

    if (!success) return false;

    // Get the review to update customer profile
    const review = await getReview(reviewId);
    if (!review) return false;

    // Update customer profile with new savings - simple direct update
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("total_savings_identified")
      .eq("id", review.customer_profile_id)
      .single();

    if (profile) {
      const newTotal =
        (profile.total_savings_identified || 0) + review.savings_identified;

      await supabase
        .from("customer_profiles")
        .update({ total_savings_identified: newTotal })
        .eq("id", review.customer_profile_id);
    }

    // TODO: Trigger customer notification (Package 5)

    return true;
  } catch (error) {
    console.error("Failed to publish analysis:", error);
    return false;
  }
}

/**
 * Save draft changes to a review
 */
export async function saveDraft(
  reviewId: string,
  editedResults: MLResults,
  internalNotes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("analysis_reviews")
      .update({
        edited_results: editedResults,
        internal_notes: internalNotes,
      })
      .eq("id", reviewId);

    if (error) {
      console.error("Error saving draft:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to save draft:", error);
    return false;
  }
}

// Helper functions
function calculateTotalSavings(mlResults: MLResults | undefined): number {
  if (!mlResults) return 0;

  let total = 0;

  // Sum from patterns if they have recommended actions
  if (mlResults.patterns) {
    mlResults.patterns.forEach((pattern) => {
      if (pattern.narrative?.recommended_actions) {
        pattern.narrative.recommended_actions.forEach((action) => {
          if (action.estimated_monthly_savings) {
            total += action.estimated_monthly_savings;
          }
        });
      }
    });
  }

  return total;
}

function countIssues(mlResults: MLResults | undefined): number {
  if (!mlResults) return 0;

  let count = 0;

  // Count predictions
  if (mlResults.predictions) {
    count += mlResults.predictions.length;
  }

  // Count patterns
  if (mlResults.patterns) {
    count += mlResults.patterns.length;
  }

  return count;
}
