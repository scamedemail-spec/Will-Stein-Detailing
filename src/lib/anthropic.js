const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class MissingApiKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set. Add it in Vercel → Settings → Environment Variables.");
    this.name = "MissingApiKeyError";
  }
}

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") throw new MissingApiKeyError();
  return apiKey;
}

export async function callClaude({ system, messages, maxTokens = 1024, temperature = 0.8 }) {
  const apiKey = getApiKey();
  const model = DEFAULT_MODEL;

  // Convert OpenAI-style messages to Gemini contents format
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    contents,
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  };

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

export async function callClaudeForJson(options) {
  const raw = await callClaude(options);
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Gemini did not return valid JSON. Raw reply was:\n" + raw.slice(0, 500));
  }
}
