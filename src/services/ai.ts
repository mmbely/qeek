export const generateAISummary = async (data: string, context: string, prompt: string) => {
  // AI summary generation logic
  return { candidates: [{ content: { parts: [{ text: 'Generated summary' }] } }] };
};
