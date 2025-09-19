export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  costImpact?: number;
  timestamp: string;
}

export const mockMessages: ChatMessage[] = [
  {
    id: "1",
    message: "Show me today's critical alerts",
    isUser: true,
    timestamp: "2:14 PM",
  },
  {
    id: "2",
    message:
      "I found 3 critical issues that need immediate attention:\n\n**CRITICAL: Line 3 Quality Alert** - Defect rate increased 23% in the last 2 hours. Material batch M-445 showing quality variance.\n\n**WARNING: Equipment Alert** - Machine M-204 efficiency dropped 18%. Predicted maintenance needed within 6 hours.\n\n**COST VARIANCE** - Work Order WO-8847 is 31% over budget due to extended cycle times.",
    isUser: false,
    costImpact: 47000,
    timestamp: "2:14 PM",
  },
  {
    id: "3",
    message: "Why is Line 3 over budget?",
    isUser: true,
    timestamp: "2:16 PM",
  },
  {
    id: "4",
    message:
      "Line 3 is over budget due to three main factors:\n\n**1. Material Quality Issues (60% of variance)**\nBatch M-445 from supplier ACE-Materials has 15% higher rejection rate than standard batches.\n\n**2. Extended Cycle Times (25% of variance)**\nAverage cycle time increased from 4.2 to 5.8 minutes due to quality checks.\n\n**3. Overtime Labor (15% of variance)**\nShift extended 2.5 hours to meet production targets.\n\n**Recommended Actions:**\n• Switch to backup supplier for next batch\n• Schedule machine calibration during next downtime\n• Review quality control procedures with team lead",
    isUser: false,
    costImpact: 23000,
    timestamp: "2:16 PM",
  },
];
