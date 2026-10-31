import "server-only";
import { ChatOpenAI } from "@langchain/openai";

/**
 * One OpenAI-compatible chat client for the whole app. Defaults to NVIDIA's free build.nvidia.com
 * endpoint; any OpenAI-compatible host (Groq, OpenRouter, a local server) works by changing env only.
 * Returns null when no key is configured so callers can fall back to offline behaviour.
 */
export function getChatModel(): ChatOpenAI | null {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;
  return new ChatOpenAI({
    // Verified against NVIDIA's catalogue on 2026-10-30 (llama-3.3-70b-instruct was retired 2026-08-26).
    model: process.env.AI_CHAT_MODEL ?? "nvidia/nemotron-3.5-lightning-30b-a3b",
    apiKey,
    temperature: 0,
    maxTokens: 700,
    timeout: 30_000,
    maxRetries: 1,
    configuration: { baseURL: process.env.AI_BASE_URL ?? "https://integrate.api.nvidia.com/v1" },
  });
}

export function aiProviderLabel() {
  return process.env.AI_API_KEY ? `${process.env.AI_CHAT_MODEL} via ${new URL(process.env.AI_BASE_URL ?? "https://integrate.api.nvidia.com/v1").host}` : "offline (no AI key)";
}
