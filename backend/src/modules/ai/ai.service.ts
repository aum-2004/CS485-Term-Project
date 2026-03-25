import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CommentAnalysis, DebateSummaryData } from "./ai.types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the first JSON value (object or array) from a Gemini response. */
function extractJson(text: string): unknown {
  const stripped = text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/```\s*$/m, "")
    .trim();
  const match = stripped.match(/[\[{][\s\S]*[\]}]/);
  if (!match) throw new Error(`No JSON found in: ${text.substring(0, 200)}`);
  return JSON.parse(match[0]);
}

/**
 * Retry up to maxRetries times on 429 per-minute rate-limit errors.
 * Daily quota exhaustion (quotaId contains "PerDay") is not retried — fail fast.
 * Waits 65 s on first retry (clears the 1-min RPM window), 90 s on second.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  const delays = [65_000, 90_000]; // 65 s clears 1-min RPM window; 90 s for safety
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = (err as Error).message ?? "";
      const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("quota");
      // Daily quota exhaustion cannot be cleared by waiting — fail immediately
      const isDailyQuota = msg.toLowerCase().includes("perday");
      if (isRateLimit && !isDailyQuota && attempt < maxRetries) {
        const waitMs = delays[attempt - 1] ?? 65_000;
        console.warn(`[AI] Rate limit – retrying in ${waitMs / 1000}s (attempt ${attempt}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitMs));
      } else {
        if (isDailyQuota) {
          console.warn("[AI] Daily quota exhausted – analysis will retry automatically when quota resets.");
        }
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

// ---------------------------------------------------------------------------
// AIService
// ---------------------------------------------------------------------------

export class AIService {
  /**
   * Analyse a BATCH of comments in a single Gemini API call.
   * Returns one CommentAnalysis per input comment (same order).
   * THROWS on failure so callers can decide whether to store the result.
   * Externally visible.
   */
  async analyseComments(contents: string[]): Promise<CommentAnalysis[]> {
    if (contents.length === 0) return [];

    const items = contents
      .map((c, i) => `${i}: ${c.replace(/`/g, "'").replace(/"/g, "'").slice(0, 500)}`)
      .join("\n---\n");

    const prompt = `You are an expert debate analyst. Analyse each Reddit comment and return a JSON ARRAY — one object per comment in the same order. No markdown, no explanation, no code fences.

Comments (index: text):
${items}

Return ONLY a JSON array:
[{"index":0,"reasoningScore":<0-100>,"summary":"<one sentence>"},...]

reasoningScore: 0=incoherent, 50=average, 100=exceptional logic+evidence.`;

    const parsed = await withRetry(async () => {
      const result = await model.generateContent(prompt);
      return extractJson(result.response.text());
    });

    const arr = parsed as Array<{ index: number; reasoningScore: unknown; summary: unknown }>;
    if (!Array.isArray(arr)) throw new Error("Expected JSON array from Gemini");

    return contents.map((_, i) => {
      const item = arr.find((x) => Number(x.index) === i);
      if (!item) return { reasoningScore: 50, summary: "Analysis unavailable." };
      const score = typeof item.reasoningScore === "number"
        ? item.reasoningScore
        : parseInt(String(item.reasoningScore), 10);
      return {
        reasoningScore: Math.min(100, Math.max(0, Math.round(isNaN(score) ? 50 : score))),
        summary: typeof item.summary === "string" && item.summary.trim()
          ? item.summary.trim()
          : "Analysis unavailable.",
      };
    });
  }

  /** Single-comment wrapper (kept for backwards compatibility). */
  async analyseComment(content: string): Promise<CommentAnalysis> {
    const results = await this.analyseComments([content]);
    return results[0];
  }

  /**
   * Generate a structured debate summary from comment texts.
   * Externally visible.
   */
  async generateDebateSummary(comments: string[]): Promise<DebateSummaryData> {
    const numbered = comments
      .slice(0, 20)
      .map((c, i) => `${i + 1}. ${c.replace(/`/g, "'").substring(0, 400)}`)
      .join("\n");

    const prompt = `You are a neutral debate moderator. Read the Reddit comments below and respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.

Comments:
${numbered}

JSON format (use these exact keys):
{"mainPositions":["...","..."],"supportingEvidence":["...","...","..."],"areasOfDisagreement":["...","...","..."]}

Base every item specifically on the actual comment content above.`;

    // Let errors propagate — callers must NOT persist failed results
    const parsed = await withRetry(async () => {
      const result = await model.generateContent(prompt);
      return extractJson(result.response.text());
    });

    const data = parsed as Partial<DebateSummaryData>;
    return {
      mainPositions: Array.isArray(data.mainPositions) && data.mainPositions.length
        ? data.mainPositions : ["Multiple perspectives were expressed."],
      supportingEvidence: Array.isArray(data.supportingEvidence) && data.supportingEvidence.length
        ? data.supportingEvidence : ["See individual comments for details."],
      areasOfDisagreement: Array.isArray(data.areasOfDisagreement) && data.areasOfDisagreement.length
        ? data.areasOfDisagreement : ["Participants disagreed on key points."],
    };
  }
}
