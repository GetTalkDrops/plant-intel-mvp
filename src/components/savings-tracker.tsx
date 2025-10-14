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
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Savings amount */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm font-medium text-gray-700">
                Identified Savings:
              </span>
              <span className="text-lg font-semibold text-green-700">
                ${savings.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Center: Progress bar */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${percentOfGoal}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                {percentOfGoal.toFixed(0)}% of $50K
              </span>
            </div>
          </div>

          {/* Right: Status and dismiss */}
          <div className="flex items-center gap-3">
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
        </div>
      </div>
    </div>
  );
}
