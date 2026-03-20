import { NextResponse } from "next/server";
import { generateVisionWithFallback } from "@/lib/llm";

export const runtime = "nodejs";

function extractFirstJsonObject(text: string): string | null {
  const cleaned = text.replace(/```json\s*/gi, "```").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) return cleaned.slice(start, i + 1);
  }
  return null;
}

type ImageAnalysisJson = {
  topicRelevant?: boolean;
  rejectionReason?: string;
  description?: string;
  diagnosis?: string;
  relevance?: string;
  issues?: string;
  improvements?: string;
  severityIndicator?: string;
  captions?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getUpstreamStatus(e: unknown): number | undefined {
  if (!isRecord(e)) return undefined;
  return typeof e.upstreamStatus === "number" ? e.upstreamStatus : undefined;
}

function getRetryAfter(e: unknown): string | null {
  if (!isRecord(e)) return null;
  return typeof e.retryAfter === "string" ? e.retryAfter : null;
}

function sanitizeParsedAnalysis(obj: unknown): ImageAnalysisJson | null {
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;

  const rawTopicRelevant = rec.topicRelevant;
  const topicRelevant =
    typeof rawTopicRelevant === "boolean"
      ? rawTopicRelevant
      : typeof rawTopicRelevant === "string"
        ? rawTopicRelevant.toLowerCase() === "true"
          ? true
          : rawTopicRelevant.toLowerCase() === "false"
            ? false
            : undefined
        : undefined;

  // Enforce the strict rejection schema so downstream UI can't accidentally render analysis fields.
  if (topicRelevant === false) {
    return {
      topicRelevant: false,
      rejectionReason: typeof rec.rejectionReason === "string" ? rec.rejectionReason : undefined,
    };
  }

  if (topicRelevant === true) {
    return {
      topicRelevant: true,
      description: typeof rec.description === "string" ? rec.description : undefined,
      diagnosis: typeof rec.diagnosis === "string" ? rec.diagnosis : undefined,
      relevance: typeof rec.relevance === "string" ? rec.relevance : undefined,
      issues: typeof rec.issues === "string" ? rec.issues : undefined,
      improvements: typeof rec.improvements === "string" ? rec.improvements : undefined,
      severityIndicator: typeof rec.severityIndicator === "string" ? rec.severityIndicator : undefined,
      captions: Array.isArray(rec.captions)
        ? rec.captions.filter((x): x is string => typeof x === "string")
        : undefined,
    };
  }

  // Backward compatibility: older model versions may omit `topicRelevant`.
  return {
    description: typeof rec.description === "string" ? rec.description : undefined,
    relevance: typeof rec.relevance === "string" ? rec.relevance : undefined,
    issues: typeof rec.issues === "string" ? rec.issues : undefined,
    improvements: typeof rec.improvements === "string" ? rec.improvements : undefined,
    captions: Array.isArray(rec.captions)
      ? rec.captions.filter((x): x is string => typeof x === "string")
      : undefined,
    diagnosis: typeof rec.diagnosis === "string" ? rec.diagnosis : undefined,
    severityIndicator: typeof rec.severityIndicator === "string" ? rec.severityIndicator : undefined,
    rejectionReason: typeof rec.rejectionReason === "string" ? rec.rejectionReason : undefined,
  };
}

function parseImageAnalysis(text: string): { analysis: ImageAnalysisJson | null; parseError: string | null } {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return { analysis: sanitizeParsedAnalysis(parsed), parseError: null };
  } catch {
    const extracted = extractFirstJsonObject(trimmed);
    if (!extracted) {
      return {
        analysis: null,
        parseError: "Failed to parse Gemini response as JSON. Showing raw text instead.",
      };
    }
    try {
      const parsed = JSON.parse(extracted);
      return { analysis: sanitizeParsedAnalysis(parsed), parseError: null };
    } catch {
      return {
        analysis: null,
        parseError: "Failed to parse Gemini response as JSON. Showing raw text instead.",
      };
    }
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = (body as { prompt?: unknown }).prompt;
  const image = (body as { image?: unknown }).image as
    | { mimeType?: unknown; base64Data?: unknown }
    | undefined;

  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "Body must include a non-empty { prompt }." }, { status: 400 });
  }

  const mimeType = typeof image?.mimeType === "string" ? image.mimeType : "";
  const base64Data = typeof image?.base64Data === "string" ? image.base64Data : "";
  if (!mimeType || !base64Data) {
    return NextResponse.json(
      { error: "Body must include { image: { mimeType, base64Data } }." },
      { status: 400 },
    );
  }

  try {
    const { text, provider, upstreamStatus, retryAfter } = await generateVisionWithFallback({
      prompt,
      mimeType,
      base64Data,
    });
    const { analysis, parseError } = parseImageAnalysis(text);

    // Guarantee rejectionReason exists for rejected responses (one-sentence rejection guidance).
    if (analysis?.topicRelevant === false && typeof analysis.rejectionReason !== "string") {
      analysis.rejectionReason = "This photo does not clearly show building fabric or damp/moisture survey-relevant evidence for this section.";
    }

    // Keep `text` for backwards compatibility with older clients.
    return NextResponse.json({
      text,
      rawText: text,
      analysis,
      parseError,
      provider,
      upstreamStatus,
      retryAfter,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const upstreamStatus = getUpstreamStatus(e);
    const retryAfter = getRetryAfter(e);
    return NextResponse.json({ error: msg, upstreamStatus, retryAfter }, { status: 502 });
  }
}

