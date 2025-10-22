"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MappingsTab } from "./components/mappings-tab";
import { ConfigTab } from "./components/config-tab";
import { AccountTab } from "./components/account-tab";

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage your analysis configuration and saved mappings
          </p>
        </div>

        <Tabs defaultValue="mappings" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-grid">
            <TabsTrigger value="mappings" className="text-xs sm:text-sm">
              CSV Mappings
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs sm:text-sm">
              Analysis Config
            </TabsTrigger>
            <TabsTrigger value="account" className="text-xs sm:text-sm">
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mappings" className="mt-4 sm:mt-6">
            <MappingsTab />
          </TabsContent>

          <TabsContent value="config" className="mt-4 sm:mt-6">
            <ConfigTab />
          </TabsContent>

          <TabsContent value="account" className="mt-4 sm:mt-6">
            <AccountTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
