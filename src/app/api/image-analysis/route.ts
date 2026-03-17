import { NextResponse } from "next/server";
import { generateVisionWithFallback } from "@/lib/llm";

export const runtime = "nodejs";

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
    return NextResponse.json({ text, provider, upstreamStatus, retryAfter });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const upstreamStatus =
      typeof (e as any)?.upstreamStatus === "number" ? (e as any).upstreamStatus : undefined;
    const retryAfter =
      typeof (e as any)?.retryAfter === "string" ? (e as any).retryAfter : null;
    return NextResponse.json({ error: msg, upstreamStatus, retryAfter }, { status: 502 });
  }
}

