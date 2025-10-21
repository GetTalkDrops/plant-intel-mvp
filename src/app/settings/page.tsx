"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MappingsTab } from "./components/mappings-tab";
import { ConfigTab } from "./components/config-tab";
import { AccountTab } from "./components/account-tab";

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your analysis configuration and saved mappings
        </p>
      </div>

      <Tabs defaultValue="mappings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="mappings">CSV Mappings</TabsTrigger>
          <TabsTrigger value="config">Analysis Config</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="mappings">
          <MappingsTab />
        </TabsContent>

        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>

        <TabsContent value="account">
          <AccountTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
