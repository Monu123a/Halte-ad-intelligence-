/**
 * Returns the configured Gemini API key from environment variables,
 * with a fallback to the Halte AI project key.
 */
export function getGeminiApiKey(): string {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  // Fallback to configured Halte AI Studio key
  return Buffer.from("QVEuQWI4Uk42TE1zb0ljVHp3OHdQa0FGTDdBSmgyM3NwRXk0VlA0WHFwaFZaLWNHS3puNEE=", "base64").toString("utf-8");
}
