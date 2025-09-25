export type ChatMessage = {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  costImpact?: number;
};

export type ManufacturingInsight = {
  response: string;
  costImpact?: number;
  alertsCreated?: number;
};

interface AutoSummaryResponse {
  type: string;
  message: string;
  alerts: any[];
  total_impact: number;
  summary_stats: {
    cost_issues: number;
    equipment_issues: number;
    quality_issues: number;
    efficiency_opportunities: number;
  };
}

interface MLChatResponse {
  type: string;
  message: string;
  insights: any;
  total_impact: number;
}

// Call the auto-analysis endpoint
async function callAutoSummary(facilityId: number = 1): Promise<AutoSummaryResponse> {
  const response = await fetch(`http://localhost:8000/analyze/auto-summary?facility_id=${facilityId}`);
  
  if (!response.ok) {
    throw new Error(`Auto-analysis error: ${response.status}`);
  }
  
  return response.json();
}

// Call the intelligent query router
async function callMLChatService(query: string, facilityId: number = 1): Promise<MLChatResponse> {
  const response = await fetch(`http://localhost:8000/chat/query?query=${encodeURIComponent(query)}&facility_id=${facilityId}`);
  
  if (!response.ok) {
    throw new Error(`ML service error: ${response.status}`);
  }
  
  return response.json();
}

// Main query processor with auto-summary support
export async function processManufacturingQuery(
  query: string,
  facilityId?: number
): Promise<ManufacturingInsight> {
  const targetFacility = facilityId || 1;
  const queryLower = query.toLowerCase().trim();

  try {
    // Check for demo trigger
    if (queryLower.includes('show me how') || queryLower === 'demo' || queryLower === '') {
      const autoSummary = await callAutoSummary(targetFacility);
      
      return {
        response: autoSummary.message,
        costImpact: autoSummary.total_impact || 0,
        alertsCreated: autoSummary.alerts.length
      };
    }

    // Regular query processing
    const mlResponse = await callMLChatService(query, targetFacility);
    
    return {
      response: mlResponse.message,
      costImpact: mlResponse.total_impact || 0,
    };
  } catch (error) {
    console.error("ML service error:", error);
    
    // Fallback response
    return {
      response: "I can analyze your manufacturing data for cost variance, equipment risks, quality issues, and operational efficiency. Try asking 'Show me how this works' to see a demo analysis.",
    };
  }
}
