"use client";

import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Reports
            </h1>
            <p className="text-sm text-gray-600">
              View and generate manufacturing intelligence reports
            </p>
          </div>

          {/* Empty State */}
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Reports Coming Soon
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Weekly summary reports and custom analytics will be available
                here. Upload manufacturing data to start building insights.
              </p>
            </CardContent>
          </Card>

          {/* Placeholder Cards - Remove when building actual reports */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl mb-2"></div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    Weekly Summary
                  </h4>
                  <p className="text-xs text-gray-500">
                    Automated weekly reports
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl mb-2"></div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    Cost Analysis
                  </h4>
                  <p className="text-xs text-gray-500">Savings opportunities</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl mb-2"></div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    Equipment Insights
                  </h4>
                  <p className="text-xs text-gray-500">Performance metrics</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
