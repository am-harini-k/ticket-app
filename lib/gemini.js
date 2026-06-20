import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function summarizeTicket(title, description) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a support ticket assistant. Summarize this ticket in 1-2 short sentences for a support agent to quickly understand the issue. Be clear and direct.

Title: ${title}
Description: ${description}

Summary:`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return summary.trim();
  } catch (error) {
    console.error('Gemini error:', error);
    return 'AI summary unavailable';
  }
}