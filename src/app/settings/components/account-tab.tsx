"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";

interface CustomerProfile {
  company_name?: string;
  industry?: string;
  primary_contact?: string;
}

export function AccountTab() {
  const { user } = useUser();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch("/api/customer/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-gray-600">Email</div>
            <div className="font-medium">
              {user?.emailAddresses[0]?.emailAddress}
            </div>
          </div>
          {profile?.company_name && (
            <div>
              <div className="text-sm text-gray-600">Company</div>
              <div className="font-medium">{profile.company_name}</div>
            </div>
          )}
          {profile?.industry && (
            <div>
              <div className="text-sm text-gray-600">Industry</div>
              <div className="font-medium">{profile.industry}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
