const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

// responseMimeType forces Gemini to emit only valid JSON — no markdown, no prose
const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0,
  maxOutputTokens: 256,
  generationConfig: {
    responseMimeType: 'application/json',
  },
});

const VALID_PRIORITIES = new Set(['URGENT', 'ROUTINE', 'COSMETIC']);
const VALID_TAGS = new Set(['Plumbing', 'Electrical', 'HVAC', 'Structural', 'Pest', 'Appliance', 'Other']);

/**
 * Classify a maintenance ticket into a priority and category tag using Gemini.
 * Returns { priority: string, tag: string }.
 */
const triageTicket = async (title, description) => {
  const prompt = `You are a property management triage assistant. Analyze this maintenance request.

Title: ${title}
Description: ${description}

Priority rules:
- URGENT: safety hazards, no running water/heat, flooding, gas leaks, broken entry locks, electrical sparks
- ROUTINE: functional issues needing prompt attention but not dangerous (leaky faucet, broken appliance, slow drain)
- COSMETIC: purely aesthetic issues (scuffs, paint, loose cabinet handle)

Return a JSON object with exactly these two keys:
- "priority": one of URGENT, ROUTINE, COSMETIC
- "tag": one of Plumbing, Electrical, HVAC, Structural, Pest, Appliance, Other`;

  const response = await model.invoke(prompt);

  // response.content is already clean JSON when responseMimeType is set,
  // but we still guard against markdown fences from older SDK fallbacks
  const raw = Array.isArray(response.content)
    ? response.content.map((c) => c.text ?? '').join('')
    : String(response.content);

  const jsonStr =
    raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)?.[1] ?? // fenced block
    raw.match(/(\{[\s\S]*?\})/)?.[1] ??                         // bare object
    raw;

  let parsed;
  try {
    parsed = JSON.parse(jsonStr.trim());
  } catch {
    throw new Error(`Triage: invalid JSON from model — raw: ${raw.slice(0, 200)}`);
  }

  return {
    priority: VALID_PRIORITIES.has(parsed.priority) ? parsed.priority : 'ROUTINE',
    tag: VALID_TAGS.has(parsed.tag) ? parsed.tag : 'Other',
  };
};

module.exports = { triageTicket };
