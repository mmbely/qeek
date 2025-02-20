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

export async function generateAISummary(
    content: string,
    filePath: string,
    customPrompt?: string
): Promise<GeminiResponse> {
    const defaultPrompt = `Analyze this code file and provide a structured summary:
      File: ${filePath}
      Content: ${content}
      
      Please provide:
      1. A brief description of the file's purpose
      2. Key functions/classes and their roles
      3. Important dependencies
      4. Any notable patterns or concerns`;
  
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent', {
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
        }]
      })
    });
  
    return response.json();
}
