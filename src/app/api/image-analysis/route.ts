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

function sanitizeParsedAnalysis(obj: any): ImageAnalysisJson | null {
  if (!obj || typeof obj !== "object") return null;

  const rawTopicRelevant = obj.topicRelevant;
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
      rejectionReason: typeof obj.rejectionReason === "string" ? obj.rejectionReason : undefined,
    };
  }

  if (topicRelevant === true) {
    return {
      topicRelevant: true,
      description: typeof obj.description === "string" ? obj.description : undefined,
      diagnosis: typeof obj.diagnosis === "string" ? obj.diagnosis : undefined,
      relevance: typeof obj.relevance === "string" ? obj.relevance : undefined,
      issues: typeof obj.issues === "string" ? obj.issues : undefined,
      improvements: typeof obj.improvements === "string" ? obj.improvements : undefined,
      severityIndicator: typeof obj.severityIndicator === "string" ? obj.severityIndicator : undefined,
      captions: Array.isArray(obj.captions) ? obj.captions.filter((x: any) => typeof x === "string") : undefined,
    };
  }

  // Backward compatibility: older model versions may omit `topicRelevant`.
  return {
    description: typeof obj.description === "string" ? obj.description : undefined,
    relevance: typeof obj.relevance === "string" ? obj.relevance : undefined,
    issues: typeof obj.issues === "string" ? obj.issues : undefined,
    improvements: typeof obj.improvements === "string" ? obj.improvements : undefined,
    captions: Array.isArray(obj.captions) ? obj.captions.filter((x: any) => typeof x === "string") : undefined,
    diagnosis: typeof obj.diagnosis === "string" ? obj.diagnosis : undefined,
    severityIndicator: typeof obj.severityIndicator === "string" ? obj.severityIndicator : undefined,
    rejectionReason: typeof obj.rejectionReason === "string" ? obj.rejectionReason : undefined,
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
    const upstreamStatus =
      typeof (e as any)?.upstreamStatus === "number" ? (e as any).upstreamStatus : undefined;
    const retryAfter =
      typeof (e as any)?.retryAfter === "string" ? (e as any).retryAfter : null;
    return NextResponse.json({ error: msg, upstreamStatus, retryAfter }, { status: 502 });
  }
}

