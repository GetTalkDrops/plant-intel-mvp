// src/hooks/useSession.ts
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { InsightCard } from "@/lib/insight-types";

// ============================================================================
// TYPES
// ============================================================================

export type ChatMessage = {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  cards?: InsightCard[];
  followUps?: string[];
};

type SavedMessage = {
  id: number;
  session_id: number;
  role: string;
  content: string;
  metadata: {
    cost?: {
      text: string;
      cards?: InsightCard[];
      followUps?: string[];
    };
    equipment?: {
      text: string;
      cards?: InsightCard[];
      followUps?: string[];
    };
    quality?: {
      text: string;
      cards?: InsightCard[];
      followUps?: string[];
    };
    efficiency?: {
      text: string;
      cards?: InsightCard[];
      followUps?: string[];
    };
  } | null;
  created_at: string;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a timestamp for display
 */
function formatTimestamp(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Reconstruct chat messages from saved Supabase messages
 * This handles the complex logic of splitting assistant messages with metadata
 * into separate message bubbles
 */
function reconstructMessagesFromSaved(
  savedMessages: SavedMessage[]
): ChatMessage[] {
  const loadedMessages: ChatMessage[] = [];

  savedMessages.forEach((msg: SavedMessage) => {
    if (msg.role === "user") {
      // User messages - add as-is
      loadedMessages.push({
        id: msg.id.toString(),
        message: msg.content,
        isUser: true,
        timestamp: formatTimestamp(msg.created_at),
      });
    } else if (msg.metadata) {
      // Assistant message with metadata - split into separate messages

      // Executive summary
      loadedMessages.push({
        id: msg.id.toString() + "-summary",
        message: msg.content,
        isUser: false,
        timestamp: formatTimestamp(msg.created_at),
      });

      // Cost analysis
      if (msg.metadata.cost?.cards) {
        loadedMessages.push({
          id: msg.id.toString() + "-cost",
          message: msg.metadata.cost.text,
          isUser: false,
          timestamp: formatTimestamp(msg.created_at),
          cards: msg.metadata.cost.cards,
          followUps: msg.metadata.cost.followUps,
        });
      }

      // Equipment analysis
      if (msg.metadata.equipment) {
        loadedMessages.push({
          id: msg.id.toString() + "-equipment",
          message: msg.metadata.equipment.text,
          isUser: false,
          timestamp: formatTimestamp(msg.created_at),
          cards: msg.metadata.equipment.cards,
          followUps: msg.metadata.equipment.followUps,
        });
      }

      // Quality analysis
      if (msg.metadata.quality) {
        loadedMessages.push({
          id: msg.id.toString() + "-quality",
          message: msg.metadata.quality.text,
          isUser: false,
          timestamp: formatTimestamp(msg.created_at),
          cards: msg.metadata.quality.cards,
          followUps: msg.metadata.quality.followUps,
        });
      }

      // Efficiency analysis
      if (msg.metadata.efficiency) {
        loadedMessages.push({
          id: msg.id.toString() + "-efficiency",
          message: msg.metadata.efficiency.text,
          isUser: false,
          timestamp: formatTimestamp(msg.created_at),
          cards: msg.metadata.efficiency.cards,
          followUps: msg.metadata.efficiency.followUps,
        });
      }
    } else {
      // Plain assistant message without metadata
      loadedMessages.push({
        id: msg.id.toString(),
        message: msg.content,
        isUser: false,
        timestamp: formatTimestamp(msg.created_at),
      });
    }
  });

  return loadedMessages;
}

// ============================================================================
// HOOK
// ============================================================================

interface UseSessionOptions {
  userEmail: string | undefined;
  sessionId: string | null;
}

interface UseSessionReturn {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  cumulativeSavings: number;
  setCumulativeSavings: React.Dispatch<React.SetStateAction<number>>;
  isLoadingSession: boolean;
}

/**
 * Custom hook for managing session state and loading saved sessions
 *
 * Handles:
 * - Loading sessions from Supabase when sessionId changes
 * - Reconstructing messages from saved data
 * - Managing cumulative savings
 * - Clearing state when no session is active
 *
 * @param userEmail - Current user's email
 * @param sessionId - Session ID from URL params (null = show landing page)
 * @returns Session state and setters
 */
export function useSession({
  userEmail,
  sessionId,
}: UseSessionOptions): UseSessionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cumulativeSavings, setCumulativeSavings] = useState(0);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Load saved session on mount or when sessionId changes
  useEffect(() => {
    if (!userEmail) return;

    const loadSession = async () => {
      // If no session param, clear messages and show landing page
      if (!sessionId) {
        setMessages([]);
        setCumulativeSavings(0);
        return;
      }

      setIsLoadingSession(true);

      try {
        // Load specific session from URL
        const { data: sessions } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("id", parseInt(sessionId))
          .eq("user_id", userEmail)
          .limit(1);

        if (!sessions || sessions.length === 0) {
          setIsLoadingSession(false);
          return;
        }

        const session = sessions[0];

        // Load messages for this session
        const { data: savedMessages } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", session.id)
          .order("created_at", { ascending: true });

        if (savedMessages && savedMessages.length > 0) {
          const loadedMessages = reconstructMessagesFromSaved(savedMessages);
          setMessages(loadedMessages);
          setCumulativeSavings(session.total_savings || 0);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadSession();
  }, [userEmail, sessionId]);

  return {
    messages,
    setMessages,
    cumulativeSavings,
    setCumulativeSavings,
    isLoadingSession,
  };
}
