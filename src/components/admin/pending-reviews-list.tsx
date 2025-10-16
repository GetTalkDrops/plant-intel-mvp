import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, FileText } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface PendingReview {
  id: string;
  batch_id: string;
  customer_name: string;
  file_name: string;
  created_at: string;
  savings_identified: number;
  issues_found: number;
}

export async function PendingReviewsList() {
  const supabase = await createClient();
  
  // Fetch pending reviews
  const { data: reviews, error } = await supabase
    .from('analysis_reviews')
    .select(`
      id,
      batch_id,
      savings_identified,
      issues_found,
      created_at,
      customer_profile:customer_profiles(company_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching reviews:', error);
    return <div className="text-red-500">Error loading reviews</div>;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-gray-500 text-center">
          No pending reviews. Reviews will appear here when customers upload data.
        </p>
      </Card>
    );
  }

  // Calculate time waiting for each review
  const reviewsWithWaitTime = reviews.map(review => {
    const createdAt = new Date(review.created_at);
    const now = new Date();
    const hoursWaiting = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    const isUrgent = hoursWaiting > 4;
    
    return {
      ...review,
      hoursWaiting,
      isUrgent,
      customerName: review.customer_profile?.company_name || 'Unknown Customer',
      fileName: review.batch_id.split('_').slice(1).join('_') || 'Unknown File',
      timeWaiting: hoursWaiting < 1 
        ? 'Less than 1 hour ago'
        : hoursWaiting === 1
        ? '1 hour ago'
        : `${hoursWaiting} hours ago`
    };
  });

  return (
    <div className="space-y-3">
      {reviewsWithWaitTime.map((review) => (
        <Card key={review.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              {/* Customer Info */}
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{review.customerName}</h3>
                {review.isUrgent && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Urgent
                  </Badge>
                )}
              </div>
              
              {/* File Info */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {review.fileName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {review.timeWaiting}
                </span>
              </div>

              {/* ML Results Preview */}
              <div className="flex gap-4 text-sm">
                <Badge variant="outline">
                  {review.issues_found || 0} issues found
                </Badge>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  ${((review.savings_identified || 0) / 1000).toFixed(0)}K savings
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/review/${review.id}`}>
                  Quick View
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/admin/review/${review.id}`}>
                  Review Analysis
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
