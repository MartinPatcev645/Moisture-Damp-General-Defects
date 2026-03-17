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
  description?: string;
  relevance?: string;
  issues?: string;
  improvements?: string;
  captions?: string[];
};

function parseImageAnalysis(text: string): { analysis: ImageAnalysisJson | null; parseError: string | null } {
  const trimmed = text.trim();
  try {
    return { analysis: JSON.parse(trimmed) as ImageAnalysisJson, parseError: null };
  } catch {
    const extracted = extractFirstJsonObject(trimmed);
    if (!extracted) {
      return {
        analysis: null,
        parseError: "Failed to parse Gemini response as JSON. Showing raw text instead.",
      };
    }
    try {
      return { analysis: JSON.parse(extracted) as ImageAnalysisJson, parseError: null };
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

