import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAccount } from '../context/AccountContext';

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

export const generateAISummary = async (
  data: string,
  context: string,
  prompt: string
): Promise<GeminiResponse> => {
  try {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found in environment variables');
    }

    console.log('Sending request to Gemini API...'); // Debug log
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 1,
            topK: 40
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error?.message || 'Failed to generate summary');
      } catch (e) {
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('Gemini API Response:', result);

    // Validate response structure
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid response structure:', result);
      throw new Error('Invalid response structure from Gemini API');
    }

    return result;
  } catch (error) {
    console.error('Failed to generate AI summary:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      candidates: [{
        content: {
          parts: [{
            text: 'Failed to generate summary. Please try again.'
          }]
        }
      }]
    };
  }
};
