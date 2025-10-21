// src/lib/utils/messageUtils.ts
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

// ============================================================================
// TIMESTAMP UTILITIES
// ============================================================================

/**
 * Format the current time for display in messages
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatCurrentTimestamp(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Generate a unique message ID based on current timestamp
 * @param suffix Optional suffix to make ID more unique
 * @returns Unique message ID
 */
export function generateMessageId(suffix?: string): string {
  const timestamp = Date.now().toString();
  return suffix ? `${timestamp}-${suffix}` : timestamp;
}

// ============================================================================
// MESSAGE FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a user message object
 * @param message The message text
 * @returns ChatMessage object for a user message
 */
export function createUserMessage(message: string): ChatMessage {
  return {
    id: generateMessageId(),
    message,
    isUser: true,
    timestamp: formatCurrentTimestamp(),
  };
}

/**
 * Create an assistant message object
 * @param message The message text
 * @param cards Optional insight cards to display
 * @param followUps Optional follow-up questions
 * @returns ChatMessage object for an assistant message
 */
export function createAssistantMessage(
  message: string,
  cards?: InsightCard[],
  followUps?: string[]
): ChatMessage {
  return {
    id: generateMessageId(),
    message,
    isUser: false,
    timestamp: formatCurrentTimestamp(),
    cards,
    followUps,
  };
}

/**
 * Create a system/status message (shown as assistant message)
 * Useful for upload confirmations, errors, etc.
 * @param message The message text
 * @param idPrefix Optional prefix for the message ID (e.g., "upload", "error")
 * @returns ChatMessage object for a system message
 */
export function createSystemMessage(
  message: string,
  idPrefix?: string
): ChatMessage {
  return {
    id: generateMessageId(idPrefix),
    message,
    isUser: false,
    timestamp: formatCurrentTimestamp(),
  };
}

/**
 * Create an upload notification message
 * @param fileName The name of the uploaded file
 * @returns ChatMessage for upload notification
 */
export function createUploadMessage(fileName: string): ChatMessage {
  return {
    id: generateMessageId("upload"),
    message: `Analyzing uploaded data: ${fileName}`,
    isUser: true,
    timestamp: formatCurrentTimestamp(),
  };
}

/**
 * Create an error message
 * @param error The error message or Error object
 * @returns ChatMessage for error display
 */
export function createErrorMessage(error: string | Error): ChatMessage {
  const errorMessage = error instanceof Error ? error.message : error;
  return {
    id: generateMessageId("error"),
    message: `Error: ${errorMessage}`,
    isUser: false,
    timestamp: formatCurrentTimestamp(),
  };
}

/**
 * Create a success message for file upload
 * @param recordCount Number of records imported
 * @param fileName Name of the file
 * @returns ChatMessage for success display
 */
export function createUploadSuccessMessage(
  recordCount: number,
  fileName: string
): ChatMessage {
  return {
    id: generateMessageId("storage-success"),
    message: `Successfully imported ${recordCount} work orders from ${fileName}`,
    isUser: false,
    timestamp: formatCurrentTimestamp(),
  };
}

/**
 * Create an analysis message (for auto-analysis results)
 * @param messageText The analysis text
 * @param analysisType Type of analysis (cost, equipment, quality, efficiency, summary)
 * @param cards Optional insight cards
 * @param followUps Optional follow-up questions
 * @returns ChatMessage for analysis display
 */
export function createAnalysisMessage(
  messageText: string,
  analysisType: "summary" | "cost" | "equipment" | "quality" | "efficiency",
  cards?: InsightCard[],
  followUps?: string[]
): ChatMessage {
  return {
    id: generateMessageId(analysisType),
    message: messageText,
    isUser: false,
    timestamp: formatCurrentTimestamp(),
    cards,
    followUps,
  };
}
