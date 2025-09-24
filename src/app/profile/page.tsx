"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      console.log("Profile page: Starting sign out...");

      // Force sign out directly with Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
      } else {
        console.log("Profile page: Signed out successfully");
      }

      // Force redirect regardless of error
      router.push("/login");
    } catch (error) {
      console.error("Sign out failed:", error);
      // Force redirect even if sign out fails
      router.push("/login");
    }
  };

  const handleBackToApp = () => {
    router.push("/");
  };

  // Show loading while auth initializes
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Redirect if not logged in after auth is loaded
  if (!user) {
    router.push("/login");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Plant Intel</h1>
          <p className="text-gray-600 mt-2">Account Management</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
            <CardDescription>
              Manage your Plant Intel account settings
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                {user?.email}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3">
            <Button
              onClick={handleBackToApp}
              className="w-full"
              variant="default"
            >
              Back to Plant Intel
            </Button>

            <Button
              onClick={handleSignOut}
              className="w-full"
              variant="outline"
            >
              Sign Out
            </Button>
          </CardFooter>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Need help? Contact support@plantintel.ai</p>
        </div>
      </div>
    </div>
  );
}
