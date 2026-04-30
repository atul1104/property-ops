const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

// responseMimeType forces Gemini to emit only valid JSON — no markdown, no prose
const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash-lite',
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0,
  maxOutputTokens: 512,
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
// const triageTicket = async (title, description) => {
//   const prompt = `You are a property management triage assistant. Analyze this maintenance request.

// Title: ${title}
// Description: ${description}

// Priority rules:
// - URGENT: safety hazards, no running water/heat, flooding, gas leaks, broken entry locks, electrical sparks
// - ROUTINE: functional issues needing prompt attention but not dangerous (leaky faucet, broken appliance, slow drain)
// - COSMETIC: purely aesthetic issues (scuffs, paint, loose cabinet handle)

// Return a JSON object with exactly these two keys:
// - "priority": one of URGENT, ROUTINE, COSMETIC
// - "tag": one of Plumbing, Electrical, HVAC, Structural, Pest, Appliance, Other`;

//   const response = await model.invoke(prompt);

//   // response.content is already clean JSON when responseMimeType is set,
//   // but we still guard against markdown fences from older SDK fallbacks
//   const raw = Array.isArray(response.content)
//     ? response.content.map((c) => c.text ?? '').join('')
//     : String(response.content);

//   const jsonStr =
//     raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)?.[1] ?? // fenced block
//     raw.match(/(\{[\s\S]*?\})/)?.[1] ??                         // bare object
//     raw;

//   let parsed;
//   try {
//     parsed = JSON.parse(jsonStr.trim());
//   } catch {
//     throw new Error(`Triage: invalid JSON from model — raw: ${raw.slice(0, 200)}`);
//   }

//   return {
//     priority: VALID_PRIORITIES.has(parsed.priority) ? parsed.priority : 'ROUTINE',
//     tag: VALID_TAGS.has(parsed.tag) ? parsed.tag : 'Other',
//   };
// };

const triageTicket = async (title, description) => {
  const prompt = `You are a property management triage assistant.
Analyze the maintenance request and return ONLY a valid JSON object.
Do not use markdown or code fences.

Title: ${title}
Description: ${description}

Allowed values:
priority: URGENT | ROUTINE | COSMETIC
tag: Plumbing | Electrical | HVAC | Structural | Pest | Appliance | Other

Output format:
{"priority":"ROUTINE","tag":"Other"}`;

  let lastRaw = '';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await model.invoke(prompt);

    const raw = Array.isArray(response.content)
      ? response.content.map((c) => c?.text ?? '').join('')
      : String(response.content ?? '');

    lastRaw = raw;

    // Strip common fence wrapper if present
    const cleaned = raw
      .replace(/^\s*```json\s*/i, '')
      .replace(/^\s*```\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return {
        priority: VALID_PRIORITIES.has(parsed.priority) ? parsed.priority : 'ROUTINE',
        tag: VALID_TAGS.has(parsed.tag) ? parsed.tag : 'Other',
      };
    } catch {
      console.warn(`Triage attempt ${attempt} failed to parse JSON. Retrying...`);
    }
  }

  console.warn('Triage JSON parse failed after retries:', lastRaw.slice(0, 500));
  return { priority: 'ROUTINE', tag: 'Other' };
};

module.exports = { triageTicket };
