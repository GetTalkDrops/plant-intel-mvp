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

interface MLChatResponse {
  type: string;
  message: string;
  insights: any;
  total_impact: number;
}

// Call the new intelligent query router
async function callMLChatService(query: string, facilityId: number = 1): Promise<MLChatResponse> {
  const response = await fetch(`http://localhost:8000/chat/query?query=${encodeURIComponent(query)}&facility_id=${facilityId}`);
  
  if (!response.ok) {
    throw new Error(`ML service error: ${response.status}`);
  }
  
  return response.json();
}

// Main query processor - now uses intelligent routing
export async function processManufacturingQuery(
  query: string,
  facilityId?: number
): Promise<ManufacturingInsight> {
  const targetFacility = facilityId || 1;

  try {
    const mlResponse = await callMLChatService(query, targetFacility);
    
    return {
      response: mlResponse.message,
      costImpact: mlResponse.total_impact || 0,
    };
  } catch (error) {
    console.error("ML service error:", error);
    
    // Fallback response
    return {
      response: "I can analyze your manufacturing data for:\n\n• **Cost variance analysis** - identify orders at risk of budget overruns\n• **Equipment failure prediction** - prevent costly downtime with maintenance insights\n• **Quality pattern analysis** - detect materials and processes causing defects\n• **Operational efficiency analysis** - optimize labor productivity and resource utilization\n\nWhat would you like to explore?",
    };
  }
}
