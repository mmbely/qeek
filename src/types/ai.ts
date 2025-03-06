/**
 * Types for AI-related functionality in Qeek
 */

/**
 * AI analysis metadata for repository files
 */
export interface AIAnalysis {
  /** Overall file summary */
  summary?: string;
  /** Import statements with their purposes */
  imports?: Array<{
    path: string;
    purpose?: string;
  }>;
  /** Exported items with their purposes */
  exports?: Array<{
    name: string;
    purpose?: string;
  }>;
  /** Class definitions with their purposes */
  classes?: Array<{
    name: string;
    purpose?: string;
  }>;
  /** Integration points with other parts of the system */
  integrationPoints?: Array<{
    type: string;
    name: string;
    purpose: string;
  }>;
}

/**
 * Response from Gemini AI service
 */
export interface GeminiResponse {
  /** Error message if request failed */
  error?: string;
  /** Response candidates from the model */
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}
