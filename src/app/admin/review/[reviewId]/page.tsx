import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CustomerContextCard } from "@/components/admin/customer-context-card";

export default async function ReviewAnalysis({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  const supabase = await createClient();

  // Fetch the analysis review
  const { data: review, error } = await supabase
    .from("analysis_reviews")
    .select(
      `
      *,
      customer_profile:customer_profiles(*)
    `
    )
    .eq("id", reviewId)
    .single();

  if (error || !review) {
    notFound();
  }

  const customerName =
    review.customer_profile?.company_name || "Unknown Customer";
  const fileName =
    review.batch_id.split("_").slice(1).join("_") || "Unknown File";

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Analysis</h1>
          <p className="text-gray-500 mt-1">
            {customerName} - {fileName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Save Draft</Button>
          <Button size="lg">Approve & Publish</Button>
        </div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Customer Context (3 columns) */}
        <div className="col-span-3 space-y-4">
          {review.customer_profile && (
            <CustomerContextCard profile={review.customer_profile} />
          )}

          {/* Internal Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add your internal notes here..."
                className="min-h-[150px] text-sm"
                defaultValue={review.internal_notes || ""}
              />
              <p className="text-xs text-gray-500 mt-2">
                These notes are internal only and not shown to the customer.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Center: ML Results (6 columns) */}
        <div className="col-span-6 space-y-4">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                Executive Summary
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[100px]"
                placeholder="Executive summary will appear here..."
                defaultValue={
                  review.original_results?.executive_summary ||
                  "No executive summary available"
                }
              />
            </CardContent>
          </Card>

          {/* ML Results Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Cost Predictions</div>
                    <div className="text-sm text-gray-500">
                      {review.issues_found || 0} issues found
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Review
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Patterns Detected</div>
                    <div className="text-sm text-gray-500">
                      {review.original_results?.patterns?.length || 0} patterns
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Review
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Savings Identified</div>
                    <div className="text-sm text-gray-500">
                      ${((review.savings_identified || 0) / 1000).toFixed(1)}K
                      total
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-600"
                  >
                    High Impact
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Placeholder for detailed predictions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Individual Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Detailed prediction review interface coming next...
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: ROI Tracker (3 columns) */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ROI Guarantee Tracker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-semibold">
                    $
                    {(
                      (review.customer_profile?.total_savings_identified || 0) /
                      1000
                    ).toFixed(0)}
                    K / $
                    {(
                      (review.customer_profile?.roi_guarantee_target || 50000) /
                      1000
                    ).toFixed(0)}
                    K
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        ((review.customer_profile?.total_savings_identified ||
                          0) /
                          (review.customer_profile?.roi_guarantee_target ||
                            50000)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="text-sm font-medium">This Analysis:</div>
                <div className="text-2xl font-bold text-green-600">
                  ${((review.savings_identified || 0) / 1000).toFixed(1)}K
                </div>
                <p className="text-xs text-gray-500">
                  New savings identified ({review.issues_found || 0}{" "}
                  opportunities)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Review Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Review Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Confidence scores realistic</span>
              </label>
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Root causes make sense</span>
              </label>
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Savings calculations verified</span>
              </label>
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Narratives customer-appropriate</span>
              </label>
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>ROI tracker updated</span>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
