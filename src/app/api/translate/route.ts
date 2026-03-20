import { NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/llm";

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

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type Lang = "en" | "pt" | "es";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const targetLang = (body as { targetLang?: unknown })?.targetLang as unknown;
  if (targetLang !== "en" && targetLang !== "pt" && targetLang !== "es") {
    return jsonError('Body must include { targetLang: "en" | "pt" | "es" }.');
  }

  const text = (body as { text?: unknown })?.text as unknown;
  const texts = (body as { texts?: unknown })?.texts as unknown;

  if (typeof text !== "string" && !Array.isArray(texts)) {
    return jsonError("Body must include either { text } or { texts }.");
  }
  if (Array.isArray(texts) && texts.some((t) => typeof t !== "string")) {
    return jsonError("{ texts } must be an array of strings.");
  }

  const to = targetLang as Lang;

  // Keep prompt short but strict; preserve Markdown/layout.
  if (typeof text === "string") {
    const prompt = [
      "You are a professional translator for technical building-survey reports.",
      `Translate the user's text into ${
        to === "pt" ? "Portuguese (Portugal)" : to === "es" ? "Spanish (Spain)" : "English"
      }.\n`,
      "Rules (strict):",
      "- Preserve meaning; do not add new content.",
      "- Preserve Markdown headings, lists, and spacing exactly as much as possible.",
      "- Keep numbers, measurements, and proper nouns unchanged.",
      "- Output ONLY the translated text with no quotes, no markdown fences, no preamble.",
      "",
      "TEXT:",
      text,
    ].join("\n");

    try {
      const { text: out, provider } = await generateTextWithFallback(prompt);
      return NextResponse.json({ text: out, provider });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  const input = (texts as string[]).map((s) => (s ?? "").toString());
  const prompt = [
    "You are a professional translator for technical building-survey reports.",
    `Translate each item into ${
      to === "pt" ? "Portuguese (Portugal)" : to === "es" ? "Spanish (Spain)" : "English"
    }.\n`,
    "Rules (strict):",
    "- Preserve meaning; do not add new content.",
    "- Keep numbers, measurements, and proper nouns unchanged.",
    "- Return ONLY valid JSON in this exact schema: {\"translations\":[\"...\",\"...\"]}",
    "- The translations array MUST be the same length as the input array, in the same order.",
    "",
    "INPUT JSON:",
    JSON.stringify({ texts: input }),
  ].join("\n");

  try {
    const { text: out, provider } = await generateTextWithFallback(prompt);
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(out);
    } catch {
      const extracted = extractFirstJsonObject(out);
      if (extracted) {
        parsed = JSON.parse(extracted);
      }
    }

    const translationsCandidate = isRecord(parsed) ? parsed.translations : undefined;
    const translations = Array.isArray(translationsCandidate) ? translationsCandidate : null;
    if (!translations || translations.some((t) => typeof t !== "string")) {
      return NextResponse.json(
        { error: "Translator returned invalid JSON. Please retry.", rawText: out, provider },
        { status: 502 },
      );
    }

    // Enforce length match; if off, pad/truncate safely.
    const fixed = translations.slice(0, input.length);
    while (fixed.length < input.length) fixed.push("");

    return NextResponse.json({ translations: fixed, provider });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

