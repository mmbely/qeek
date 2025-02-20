// Frontend version
export {};

// Add response type interface
export interface GeminiResponse {
  error?: string;
  modelVersion?: string;
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason?: string;
    avgLogprobs?: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    promptTokensDetails: Array<{
      modality: string;
      tokenCount: number;
    }>;
    candidatesTokensDetails: Array<{
      modality: string;
      tokenCount: number;
    }>;
  };
  // Add other response properties as needed
}

export async function generateAISummary(
    content: string | undefined,
    filePath: string,
    customPrompt: string
): Promise<GeminiResponse> {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }

    // Validate content
    if (!content) {
      return {
        error: 'No content provided for analysis'
      };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: customPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate AI summary');
      }

      return response.json();
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to generate AI summary'
      };
    }
}