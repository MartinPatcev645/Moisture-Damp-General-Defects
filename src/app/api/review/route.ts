import { NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/llm";

export const runtime = "nodejs";

type SurveyValue = string | string[] | null;
type SurveyData = Record<string, SurveyValue>;
type Lang = "pt" | "en";

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

  const langRaw = (body as any)?.lang as unknown;
  const lang: Lang = langRaw === "en" || langRaw === "pt" ? (langRaw as Lang) : "pt";

  const surveyJson = JSON.stringify(survey, null, 2);
  const headingPattern =
    lang === "pt" ? `### Secção 01 — <título>` : `### Section 01 — <title>`;
  const overallHeading = lang === "pt" ? "### Prioridades gerais" : "### Overall priorities";
  const sectionTitles =
    lang === "pt"
      ? [
          "01 Informações básicas do edifício",
          "02 Características do edifício",
          "03 Pontos de entrada de humidade (exterior)",
          "04 Sinais internos de humidade e bolor",
          "05 Medições e perfilagem de humidade",
          "06 Ventilação, humidade e ambiente",
          "07 Tipos de humidade e fontes prováveis",
          "08 Defeitos em madeira e materiais",
          "09 Defeitos estruturais e do edifício",
          "10 Histórico e intervenções anteriores",
          "11 Avaliação de risco e impactos",
          "12 Inspeções e métodos utilizados",
          "13 Segurança, recomendações e remediação",
        ]
      : [
          "01 Basic Building Information",
          "02 Building Characteristics",
          "03 External Moisture Ingress Points",
          "04 Internal Signs of Damp & Mould",
          "05 Moisture Measurements & Profiling",
          "06 Ventilation, Humidity & Environment",
          "07 Types of Damp & Moisture Sources",
          "08 Timber & Material Defects",
          "09 Structural & Building Defects",
          "10 History & Previous Interventions",
          "11 Risk Assessment & Impacts",
          "12 Inspections & Methods Used",
          "13 Safety, Recommendations & Remediation",
        ];

  const prompt = `You are an expert damp and moisture building surveyor with 20 years of field experience.

You will be given a completed damp/moisture survey in JSON.

Your job: produce a professional AI review where **each of the 13 survey sections is reviewed separately** (not a generic overall summary).

OUTPUT RULES (strict):
- Write the entire output in ${lang === "pt" ? "Portuguese (Portugal)" : "English"}.
- Use Markdown headings with exactly this pattern for each section: "${headingPattern}"
- Produce ALL sections 01 through 13, in order, even if data is missing.
- Under each section heading, write EXACTLY ONE professional paragraph (2–3 sentences). This means the output will contain **13 paragraphs total**, one per section.
- In that single paragraph for each section, include: (a) what the answers imply, (b) likely concerns / data gaps, (c) practical next checks / actions.
- If a section has little/no data, say what is missing and what you would need to confirm on site.
- Do NOT add any sub-headings or bullet points inside sections 01–13.
- After Section 13, include ONE final heading: "${overallHeading}" followed by a numbered list (1–6) of the most important actions.
- IMPORTANT: ensure there is a blank line between every heading and its paragraph, and between each section, so the UI renders separate blocks.

Use these section titles (exactly):
${sectionTitles.join("\n")}

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

