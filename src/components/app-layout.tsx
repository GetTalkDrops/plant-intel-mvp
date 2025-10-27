"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PlantIntelLogo } from "./plant-intel-logo";
import { ChatSessionItem } from "./chat-session-item";

type ChatSession = {
  id: number;
  user_id: string;
  title: string;
  upload_id: number | null;
  total_savings: number;
  created_at: string;
  updated_at: string;
};

interface AppLayoutProps {
  children: React.ReactNode;
  onNewChat?: () => void;
  isLandingPage?: boolean;
}

export function AppLayout({
  children,
  onNewChat,
  isLandingPage = false,
}: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSessionId = searchParams.get("session");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState("demo_plant");
  const { user, isLoaded } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  const [recentSessions, setRecentSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("recent_sessions");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (recentSessions.length > 0) {
      localStorage.setItem("recent_sessions", JSON.stringify(recentSessions));
    }
  }, [recentSessions]);

  useEffect(() => {
    if (!user && isLoaded) {
      localStorage.removeItem("recent_sessions");
      setRecentSessions([]);
    }
  }, [user, isLoaded, userEmail]);

  const userPlants = [{ id: "demo_plant", name: "Demo Plant" }];

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

  useEffect(() => {
    if (pathname === "/settings" && !isMobile) {
      setIsDrawerOpen(true);
    }
  }, [pathname, isMobile]);

  // Consolidated session loading function with useCallback to prevent unnecessary re-renders
  const refreshSessions = useCallback(async () => {
    if (!userEmail) return;

    try {
      const { data: sessions } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", userEmail)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (sessions && sessions.length > 0) {
        setRecentSessions(sessions);
      } else {
        setRecentSessions([]);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  }, [userEmail]);

  // Load sessions on mount and when userEmail changes
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const handleChatClick = () => {
    if (isLandingPage) return;
    if (onNewChat) {
      onNewChat();
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
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
        {!isDrawerOpen && !isMobile && (
          <div className="flex flex-col items-center py-4 space-y-4 flex-1">
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Chat"
              aria-label="Chat"
              onClick={handleChatClick}
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </button>

            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Chats"
              aria-label="Chats"
              onClick={() => router.push("/chats")}
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
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
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
              onClick={() => router.push("/reports")}
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
              onClick={() => router.push("/settings")}
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

            <div className="flex-1"></div>

            {user && (
              <div className="mt-auto">
                {!isDrawerOpen && (
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Expand sidebar"
                    aria-label="Expand sidebar"
                    onClick={() => setIsDrawerOpen(true)}
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isDrawerOpen && (
          <>
            <div className="pt-15 pb-4 px-4 sm:p-4 border-b border-gray-200">
              <div className="mb-4 flex justify-start">
                <PlantIntelLogo width={150} height={45} className="w-38 h-11" />
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2.5">
                {user ? "Your Plant" : "Demo Plant"}
              </div>
            </div>

            <div className="p-3 border-b border-gray-200">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-9 text-gray-600 hover:bg-gray-100"
                  onClick={() => router.push("/")}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New Chat
                </Button>

                <Button
                  variant="ghost"
                  className={`w-full justify-start text-sm h-9 ${
                    pathname === "/chats"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600"
                  }`}
                  onClick={() => router.push("/chats")}
                >
                  Chats
                </Button>

                <Button
                  variant="ghost"
                  className={`w-full justify-start text-sm h-9 ${
                    pathname === "/reports"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600"
                  }`}
                  onClick={() => router.push("/reports")}
                >
                  Reports
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-sm h-9 ${
                    pathname === "/settings"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600"
                  }`}
                  onClick={() => router.push("/settings")}
                >
                  Settings
                </Button>
              </div>
            </div>

            <div className="flex-1 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recent Data
                </h3>
                {recentSessions.length > 0 && (
                  <button
                    onClick={() => router.push("/chats")}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </button>
                )}
              </div>

              {recentSessions.length > 0 ? (
                <div className="space-y-1">
                  {recentSessions.map((session) => (
                    <ChatSessionItem
                      key={session.id}
                      session={session}
                      onClick={() => router.push(`/?session=${session.id}`)}
                      onUpdate={refreshSessions}
                      isActive={currentSessionId === String(session.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-2">
                    No recent uploads
                  </p>
                  <p className="text-xs text-gray-400">
                    Upload data to get started
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200">
              {user ? (
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      userButtonAvatarBox: "w-10 h-10",
                    },
                  }}
                />
              ) : (
                <Button
                  onClick={() => router.push("/sign-in")}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Sign In
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col relative">
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

        <div className="flex-1 overflow-hidden">{children}</div>
      </div>

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
