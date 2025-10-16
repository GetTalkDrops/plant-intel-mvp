import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar } from "lucide-react";
import Link from "next/link";

interface CustomerProfile {
  id: string;
  company_name: string;
  industry: string | null;
  pilot_start_date: string | null;
  pilot_end_date: string | null;
  variance_threshold_pct: number;
  min_variance_amount: number;
  focus_material_costs: boolean;
  focus_labor_efficiency: boolean;
  focus_quality_issues: boolean;
  focus_equipment: boolean;
  business_context: string | null;
}

interface CustomerContextCardProps {
  profile: CustomerProfile;
}

export function CustomerContextCard({ profile }: CustomerContextCardProps) {
  // Calculate pilot progress
  let pilotProgress = 0;
  let daysRemaining = 0;
  let totalDays = 30;

  if (profile.pilot_start_date && profile.pilot_end_date) {
    const start = new Date(profile.pilot_start_date);
    const end = new Date(profile.pilot_end_date);
    const now = new Date();
    
    totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    daysRemaining = Math.max(0, totalDays - elapsed);
    pilotProgress = Math.min(100, Math.floor((elapsed / totalDays) * 100));
  }

  // Get focus areas
  const focusAreas = [];
  if (profile.focus_material_costs) focusAreas.push("Material costs");
  if (profile.focus_labor_efficiency) focusAreas.push("Labor efficiency");
  if (profile.focus_quality_issues) focusAreas.push("Quality issues");
  if (profile.focus_equipment) focusAreas.push("Equipment");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Customer Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{profile.company_name}</span>
          </div>
          {profile.industry && (
            <Badge variant="secondary">{profile.industry}</Badge>
          )}
        </div>

        {/* Pilot Progress */}
        {profile.pilot_start_date && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>Day {totalDays - daysRemaining} of {totalDays}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all" 
                style={{ width: `${pilotProgress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              {daysRemaining} days remaining
            </div>
          </div>
        )}

        {/* Current Configuration */}
        <div className="space-y-2 text-sm">
          <div className="font-medium">Active Settings:</div>
          <div className="space-y-1 text-xs text-gray-500">
            <div>• Variance threshold: {profile.variance_threshold_pct}%</div>
            <div>• Min amount: ${profile.min_variance_amount.toLocaleString()}</div>
            {focusAreas.length > 0 && (
              <div>• Focus: {focusAreas.join(", ")}</div>
            )}
          </div>
        </div>

        {/* Business Context */}
        {profile.business_context && (
          <div className="space-y-2 text-sm">
            <div className="font-medium">Notes:</div>
            <div className="text-xs text-gray-500 line-clamp-4">
              {profile.business_context}
            </div>
          </div>
        )}

        {/* Edit Profile Button */}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/admin/customers/${profile.id}/profile`}>
            Edit Profile
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
