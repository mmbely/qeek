import { generateAISummary } from '../services/ai';

export const generateRules = async (files: string[]) => {
  const prompt = `Analyze the provided codebase files and generate coding rules and best practices in the following format:
{
  "rules": [
    {
      "category": "rule category (e.g., 'Style', 'Performance', 'Security')",
      "rule": "rule description",
      "rationale": "why this rule is important",
      "examples": {
        "good": "example of good code",
        "bad": "example of code to avoid"
      }
    }
  ]
}`;

  const response = await generateAISummary(
    JSON.stringify({ files }),
    'rules-generation',
    prompt
  );

  if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid AI response');
  }

  const text = response.candidates[0].content.parts[0].text;
  
  try {
    return JSON.parse(text);
  } catch (e) {
    return {
      rules: [{
        category: "General",
        rule: "AI Analysis",
        rationale: "Generated text response",
        description: text
      }]
    };
  }
};
