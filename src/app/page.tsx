"use client";

import { AppLayout } from "@/components/app-layout";
import { UnifiedChatInterface } from "@/components/unified-chat-interface";
import { useState } from "react";

export default function Home() {
  const [chatKey, setChatKey] = useState(0);

  const handleNewChat = () => {
    setChatKey((prev) => prev + 1);
  };

  return (
    <AppLayout onNewChat={handleNewChat} isLandingPage={false}>
      <UnifiedChatInterface key={chatKey} />
    </AppLayout>
  );
}
