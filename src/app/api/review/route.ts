import { NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/llm";

export const runtime = "nodejs";

type SurveyValue = string | string[] | null;
type SurveyData = Record<string, SurveyValue>;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const survey = (body as { survey?: SurveyData }).survey;
  if (!survey || typeof survey !== "object") {
    return NextResponse.json({ error: "Body must be { survey: { ... } }." }, { status: 400 });
  }

  const surveyJson = JSON.stringify(survey, null, 2);
  const prompt = `You are an expert damp and moisture building surveyor with 20 years of field experience.

You will be given a completed damp/moisture survey in JSON.

Your job: produce a professional AI review where **each of the 13 survey sections is reviewed separately** (not a generic overall summary).

OUTPUT RULES (strict):
- Use Markdown headings with exactly this pattern for each section: "### Section 01 — <title>"
- Produce ALL sections 01 through 13, in order, even if data is missing.
- Under each section heading, write EXACTLY ONE professional paragraph (2–3 sentences). This means the output will contain **13 paragraphs total**, one per section.
- In that single paragraph for each section, include: (a) what the answers imply, (b) likely concerns / data gaps, (c) practical next checks / actions.
- If a section has little/no data, say what is missing and what you would need to confirm on site.
- Do NOT add any sub-headings or bullet points inside sections 01–13.
- After Section 13, include ONE final heading: "### Overall priorities" followed by a numbered list (1–6) of the most important actions.
- IMPORTANT: ensure there is a blank line between every heading and its paragraph, and between each section, so the UI renders separate blocks.

Use these section titles:
01 Basic Building Information
02 Building Characteristics
03 External Moisture Ingress Points
04 Internal Signs of Damp & Mould
05 Moisture Measurements & Profiling
06 Ventilation, Humidity & Environment
07 Types of Damp & Moisture Sources
08 Timber & Material Defects
09 Structural & Building Defects
10 History & Previous Interventions
11 Risk Assessment & Impacts
12 Inspections & Methods Used
13 Safety, Recommendations & Remediation

Survey Data (JSON):
${surveyJson}`;

  try {
    const { text, provider } = await generateTextWithFallback(prompt);
    return NextResponse.json({ text, provider });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const upstreamStatus =
      typeof (e as any)?.upstreamStatus === "number" ? (e as any).upstreamStatus : undefined;
    const retryAfter =
      typeof (e as any)?.retryAfter === "string" ? (e as any).retryAfter : null;
    return NextResponse.json({ error: msg, upstreamStatus, retryAfter }, { status: 502 });
  }
}

