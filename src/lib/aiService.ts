export interface AIEnhancedResponse {
  enhancedMessage: string;
  estimatedCost: number;
  usedAI: boolean;
}

export async function enhanceMLResponse(
  mlResponse: string,
  userQuery: string,
  costImpact?: number
): Promise<AIEnhancedResponse> {
  try {
    const response = await fetch("/api/enhance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mlResponse,
        userQuery,
        costImpact,
      }),
    });

    if (!response.ok) {
      throw new Error("AI service error");
    }

    return await response.json();
  } catch (error) {
    console.error("AI enhancement error:", error);

    return {
      enhancedMessage: mlResponse,
      estimatedCost: 0,
      usedAI: false,
    };
  }
}
