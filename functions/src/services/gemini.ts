export {};  // Add empty export

export interface GeminiResponse {
  error?: string;
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Configuration for different Gemini models
const GEMINI_MODELS = {
  FLASH_LITE: 'gemini-2.0-flash-lite', // $0.0001/1K chars
  FLASH: 'gemini-2.0-flash',           // $0.0005/1K chars
  PRO: 'gemini-1.5-pro'                // $0.0025/1K chars
} as const;

// Default configuration for optimal performance
const DEFAULT_CONFIG = {
  temperature: 0.3,
  topK: 40,
  topP: 0.8,
  model: GEMINI_MODELS.FLASH_LITE
};

export async function generateAISummary(
    content: string,
    filePath: string,
    customPrompt?: string,
    config: Partial<typeof DEFAULT_CONFIG> = {}
): Promise<GeminiResponse> {
    const defaultPrompt = `Analyze this code file and provide a structured summary:
      File: ${filePath}
      Content: ${content}
      
      Please provide:
      1. A brief description of the file's purpose
      2. Key functions/classes and their roles
      3. Important dependencies
      4. Any notable patterns or concerns
      5. TypeScript-specific patterns and type safety considerations`;
  
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${finalConfig.model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: customPrompt || defaultPrompt
          }]
        }],
        generationConfig: {
          temperature: finalConfig.temperature,
          topK: finalConfig.topK,
          topP: finalConfig.topP
        }
      })
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: `API Error: ${errorData.error?.message || response.statusText}`
      };
    }
  
    return response.json();
}
