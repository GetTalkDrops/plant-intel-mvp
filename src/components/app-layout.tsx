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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Drawer */}
      <div
        className={`
          ${isDrawerOpen ? "w-80" : "w-0"} 
          transition-all duration-300 overflow-hidden bg-white border-r border-gray-200 flex flex-col
          ${
            isMobile && isDrawerOpen
              ? "absolute inset-y-0 left-0 z-40 shadow-xl"
              : "relative"
          }
        `}
      >
        {/* Drawer Header with Plant Selector */}
        <div
          className="p-4 border-b border-gray-200"
          style={{ minHeight: "100px" }}
        >
          <h2 className="font-semibold text-gray-800 mb-4 text-sm sm:text-base">
            Plant Intel
          </h2>
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
            <p className="text-xs text-gray-400">Upload data to get started</p>
          </div>
        </div>
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
