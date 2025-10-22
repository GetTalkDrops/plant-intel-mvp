"use client";

import { X } from "lucide-react";

interface SavingsTrackerProps {
  savings: number;
  onDismiss: () => void;
}

export function SavingsTracker({ savings, onDismiss }: SavingsTrackerProps) {
  const percentOfGoal = Math.min((savings / 50000) * 100, 100);
  const isGoalMet = percentOfGoal >= 100;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm mb-4">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3">
        {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
          {/* Savings amount - full width on mobile */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                Identified Savings:
              </span>
              <span className="text-base sm:text-lg font-semibold text-green-700">
                ${savings.toLocaleString()}
              </span>
            </div>

            {/* Dismiss button - mobile only (top right) */}
            <button
              onClick={onDismiss}
              className="sm:hidden text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Dismiss savings tracker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar - full width on mobile, flexible on desktop */}
          <div className="flex-1 sm:max-w-md">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${percentOfGoal}%` }}
                />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">
                {percentOfGoal.toFixed(0)}% of $50K
              </span>
            </div>
          </div>

          {/* Status and dismiss - desktop only */}
          <div className="hidden sm:flex items-center gap-3">
            {isGoalMet && (
              <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Goal Exceeded
              </span>
            )}
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Dismiss savings tracker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Goal status - mobile only (bottom) */}
          {isGoalMet && (
            <div className="sm:hidden flex justify-center">
              <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Goal Exceeded
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
