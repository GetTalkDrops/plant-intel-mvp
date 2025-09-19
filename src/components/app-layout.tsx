"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState("plant_alpha");

  // Mock user's authorized plants (later from auth)
  const userPlants = [
    { id: "plant_alpha", name: "Plant Alpha" },
    { id: "plant_beta", name: "Plant Beta" },
    { id: "plant_charlie", name: "Plant Charlie" },
  ];

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsDrawerOpen(false);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleUserProfileClick = () => {
    // TODO: Open auth modal or handle authentication
    console.log("User profile clicked - open auth");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Drawer */}
      <div
        className={`
          transition-all duration-300 overflow-hidden bg-white border-r border-gray-200 flex flex-col
          ${
            isMobile
              ? isDrawerOpen
                ? "absolute inset-y-0 left-0 z-40 shadow-xl w-80"
                : "w-0"
              : isDrawerOpen
              ? "w-80"
              : "w-14"
          }
        `}
      >
        {/* Collapsed State - Icons Only (Desktop Only) */}
        {!isDrawerOpen && !isMobile && (
          <div className="flex flex-col items-center py-4 space-y-4 flex-1">
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Chat"
              aria-label="Chat"
            >
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>

            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Alerts"
              aria-label="Alerts"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </button>

            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Reports"
              aria-label="Reports"
            >
              <svg
                className="w-5 h-5 text-gray-600"
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
            </button>

            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            {/* User Profile Icon */}
            <div className="mt-auto">
              <button
                onClick={handleUserProfileClick}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Demo User - Click to sign in"
                aria-label="Demo User - Click to sign in"
              >
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Full Drawer Content */}
        {isDrawerOpen && (
          <>
            {/* Drawer Header with Plant Selector */}
            <div className="pt-15 pb-4 px-4 sm:p-4 border-b border-gray-200">
              <div className="mb-4 flex justify-start">
                <svg
                  width="150"
                  height="45"
                  viewBox="0 0 200 60"
                  className="w-38 h-11"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Gear/dot pattern icon */}
                  <g transform="translate(20, 30)">
                    {/* Center circle */}
                    <circle
                      cx="0"
                      cy="0"
                      r="3"
                      fill="currentColor"
                      className="text-blue-600"
                    />

                    {/* Surrounding dots in gear pattern */}
                    <circle
                      cx="8"
                      cy="0"
                      r="2"
                      fill="currentColor"
                      className="text-blue-600"
                    />
                    <circle
                      cx="-8"
                      cy="0"
                      r="2"
                      fill="currentColor"
                      className="text-blue-600"
                    />
                    <circle
                      cx="0"
                      cy="8"
                      r="2"
                      fill="currentColor"
                      className="text-blue-600"
                    />
                    <circle
                      cx="0"
                      cy="-8"
                      r="2"
                      fill="currentColor"
                      className="text-blue-600"
                    />
                    <circle
                      cx="6"
                      cy="6"
                      r="1.5"
                      fill="currentColor"
                      className="text-blue-600"
                    />
                    <circle
                      cx="-6"
                      cy="6"
                      r="1.5"
                      fill="currentColor"
                      className="text-blue-600"
                    />
                    <circle
                      cx="6"
                      cy="-6"
                      r="1.5"
                      fill="currentColor"
                      className="text-blue-600"
                    />
                    <circle
                      cx="-6"
                      cy="-6"
                      r="1.5"
                      fill="currentColor"
                      className="text-blue-600"
                    />
                  </g>

                  {/* PLANT INTEL text */}
                  <text
                    x="50"
                    y="37"
                    fontFamily="Inter, sans-serif"
                    fontSize="18"
                    fontWeight="700"
                    fill="currentColor"
                    className="text-gray-800"
                  >
                    PLANT INTEL
                  </text>
                </svg>
              </div>
              <div className="relative">
                <select
                  value={selectedPlant}
                  onChange={(e) => setSelectedPlant(e.target.value)}
                  className="w-full text-xs sm:text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-3 sm:px-3 sm:py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {userPlants.map((plant) => (
                    <option key={plant.id} value={plant.id}>
                      {plant.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Navigation */}
            <div className="p-3 border-b border-gray-200">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-9 bg-blue-50 text-blue-700"
                >
                  Chat
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-9 text-gray-600"
                >
                  Alerts
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-9 text-gray-600"
                >
                  Reports
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-9 text-gray-600"
                >
                  Settings
                </Button>
              </div>
            </div>

            {/* Recent Data Uploads */}
            <div className="flex-1 p-3">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Recent Data
              </h3>
              <div className="space-y-2">
                <div className="text-sm text-gray-700 hover:text-blue-600 cursor-pointer py-1 px-2 hover:bg-blue-50 rounded">
                  Production Data - Sep 18, 2:14 PM
                </div>
                <div className="text-sm text-gray-700 hover:text-blue-600 cursor-pointer py-1 px-2 hover:bg-blue-50 rounded">
                  Quality Report - Sep 18, 9:30 AM
                </div>
              </div>

              {/* Empty state when no data */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-400 mb-2">No recent uploads</p>
                <p className="text-xs text-gray-400">
                  Upload data to get started
                </p>
              </div>
            </div>

            {/* User Profile Section */}
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={handleUserProfileClick}
                className="w-full flex items-center space-x-3 p-2 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">Demo User</p>
                  <p className="text-xs text-gray-500">Click to sign in</p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Bar */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 relative z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="mr-4"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                isDrawerOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>

      {/* Mobile backdrop */}
      {isMobile && isDrawerOpen && (
        <div
          className="absolute inset-0 bg-transparent z-10"
          onClick={() => setIsDrawerOpen(false)}
          style={{ left: isDrawerOpen ? "320px" : "0px" }}
        />
      )}
    </div>
  );
}
