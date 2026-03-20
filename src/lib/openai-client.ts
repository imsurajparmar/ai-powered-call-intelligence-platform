import OpenAI from "openai";

export function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set. Copy .env.example to .env.local.");
  }
  return new OpenAI({ apiKey: key });
}

export function getModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}
