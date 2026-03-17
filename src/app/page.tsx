"use client";

import React, { ChangeEvent, useMemo, useRef, useState } from "react";

type SurveyValue = string | string[] | null;
type SurveyData = Record<string, SurveyValue>;

type ChipOption = {
  label: string;
  value: string;
  className?: string;
};

type Question =
  | {
      kind: "chips";
      key: string;
      label: string;
      required?: boolean;
      mode: "single" | "multi";
      options: ChipOption[];
    }
  | {
      kind: "inputs";
      fields: Array<{
        key: string;
        label: string;
        type: "text" | "number";
        placeholder?: string;
      }>;
    }
  | { kind: "textarea"; key: string; label: string; placeholder?: string };

type Step = {
  id: number;
  title: string;
  desc: string;
  questions: Question[];
};

type ImageAnalysisResult = {
  description?: string;
  relevance?: string;
  issues?: string;
  improvements?: string;
  captions?: string[];
  rawText?: string;
  parseError?: string | null;
};

type SectionImageState = {
  file: File | null;
  previewUrl: string | null;
  result: ImageAnalysisResult | null;
  loading: boolean;
  error: string | null;
  nextAllowedAt?: number | null;
};

function parseRetryDelayMsFromGeminiError(raw: string): number | null {
  try {
    const obj = JSON.parse(raw) as any;
    const retryDelay = obj?.error?.details?.find?.(
      (d: any) => d?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
    )?.retryDelay as string | undefined;
    if (typeof retryDelay === "string") {
      const m = retryDelay.match(/^(\d+)(ms|s)$/i);
      if (m) {
        const n = Number(m[1]);
        const unit = m[2].toLowerCase();
        return unit === "s" ? n * 1000 : n;
      }
    }
  } catch {
    // ignore
  }

  const m = raw.match(/retry in\s+([\d.]+)\s*(ms|s)/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2].toLowerCase() === "s" ? Math.ceil(n * 1000) : Math.ceil(n);
}

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

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, idx) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={idx}>{m[1]}</strong>;
    return <span key={idx}>{p}</span>;
  });
}

function MarkdownLite({ text }: { text: string }) {
  const blocks = useMemo(() => {
    return text
      .replace(/\r\n/g, "\n")
      // Ensure headings always start new blocks
      .replace(/\n(#{2,3}\s+)/g, "\n\n$1")
      .split("\n\n")
      .map((b) => b.trim())
      .filter(Boolean);
  }, [text]);

  return (
    <div className="ds-ai">
      {blocks.map((block, i) => {
        if (block.startsWith("### ")) {
          return <h3 key={i}>{block.slice(4).trim()}</h3>;
        }
        if (block.startsWith("## ")) {
          return <h3 key={i}>{block.slice(3).trim()}</h3>;
        }

        const lines = block.split("\n").filter(Boolean);
        const isUl = lines.every((l) => l.startsWith("- "));
        if (isUl) {
          return (
            <ul key={i}>
              {lines.map((l, li) => (
                <li key={li}>{renderInlineBold(l.slice(2))}</li>
              ))}
            </ul>
          );
        }

        const isOl = lines.every((l) => /^\d+\.\s+/.test(l));
        if (isOl) {
          return (
            <ol key={i}>
              {lines.map((l, li) => (
                <li key={li}>{renderInlineBold(l.replace(/^\d+\.\s+/, ""))}</li>
              ))}
            </ol>
          );
        }

        return <p key={i}>{renderInlineBold(block)}</p>;
      })}
    </div>
  );
}

function isSelected(value: SurveyValue, opt: string) {
  if (value === null) return false;
  if (Array.isArray(value)) return value.includes(opt);
  return value === opt;
}

function toggleMulti(prev: SurveyValue, opt: string): string[] {
  const arr = Array.isArray(prev) ? prev : [];
  return arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt];
}

const TOTAL = 13;

function buildSectionContext(step: Step, data: SurveyData): string {
  const lines: string[] = [];
  for (const q of step.questions) {
    if ("key" in q) {
      const value = data[q.key];
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        if (!value.length) continue;
        lines.push(`${q.key}: ${value.join(", ")}`);
      } else if (typeof value === "string" && value.trim().length > 0) {
        lines.push(`${q.key}: ${value}`);
      }
    } else if (q.kind === "inputs") {
      for (const f of q.fields) {
        const v = data[f.key];
        if (typeof v === "string" && v.trim().length > 0) {
          lines.push(`${f.key}: ${v}`);
        }
      }
    }
  }
  if (!lines.length) return "No answers provided yet.";
  return lines.join("\n");
}

function buildGeminiPrompt(step: Step, data: SurveyData): string {
  const answers = buildSectionContext(step, data);
  return [
    "You are an expert damp and moisture building surveyor with 20 years of field experience.",
    "You are reviewing a site photograph submitted as part of a professional damp survey report.",
    `The section being surveyed is: ${step.title}`,
    "The surveyor's current answers for this section are: ",
    answers,
    "",
    "Analyse the photo strictly in the context of damp, moisture, mould, structural defects,",
    "timber condition, ventilation, or whatever is relevant to this section.",
    "",
    "Be concise to avoid truncation: keep each string value under ~400 characters.",
    "If something is not visible/unknown, say so briefly (do not invent details).",
    "",
    'Respond ONLY in this exact JSON format with no markdown, no code block, no preamble:',
    "{",
    '  "description": "...",',
    '  "relevance": "...",',
    '  "issues": "...",',
    '  "improvements": "...",',
    '  "captions": ["...", "..."]',
    "}",
  ].join("\n");
}

async function callGeminiImageAnalysis(
  file: File,
  step: Step,
  data: SurveyData
): Promise<ImageAnalysisResult> {
  const toBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const base64 = result.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(f);
    });

  const base64Data = await toBase64(file);
  const mimeType = file.type || "image/jpeg";
  const prompt = buildGeminiPrompt(step, data);

  const res = await fetch("/api/image-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      image: { mimeType, base64Data },
    }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as
      | { error?: string; upstreamStatus?: number; retryAfter?: string | null }
      | null;
    const statusHint =
      typeof json?.upstreamStatus === "number"
        ? ` (Gemini status ${json.upstreamStatus})`
        : ` (status ${res.status})`;
    const retryHint = json?.retryAfter ? ` Retry-After: ${json.retryAfter}.` : "";
    throw new Error((json?.error || "Image analysis failed.") + statusHint + retryHint);
  }

  const json = (await res.json()) as {
    text?: string;
    rawText?: string;
    analysis?: any;
    parseError?: string | null;
    error?: string;
  };

  // Prefer server-parsed JSON (more reliable), but keep client fallback for older deployments.
  const rawText = (json.rawText ?? json.text ?? "").trim() || "No analysis text returned from Gemini.";
  const analysis = json.analysis ?? null;
  if (analysis && typeof analysis === "object") {
    return {
      description: analysis.description,
      relevance: analysis.relevance,
      issues: analysis.issues,
      improvements: analysis.improvements,
      captions: Array.isArray(analysis.captions) ? analysis.captions : [],
      rawText,
      parseError: json.parseError ?? null,
    };
  }

  // Fallback: parse client-side (in case the server hasn't been redeployed yet).
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const extracted = extractFirstJsonObject(rawText);
    if (extracted) {
      try {
        parsed = JSON.parse(extracted);
      } catch {
        return {
          rawText,
          parseError: "Failed to parse Gemini response as JSON. Showing raw text instead.",
        };
      }
    } else {
      return {
        rawText,
        parseError: "Failed to parse Gemini response as JSON. Showing raw text instead.",
      };
    }
  }

  return {
    description: parsed.description,
    relevance: parsed.relevance,
    issues: parsed.issues,
    improvements: parsed.improvements,
    captions: Array.isArray(parsed.captions) ? parsed.captions : [],
    rawText,
    parseError: null,
  };
}

function SectionImageAnalysis({
  step,
  data,
}: {
  step: Step;
  data: SurveyData;
}) {
  const [sections, setSections] = useState<Record<number, SectionImageState>>(
    {}
  );
  const retryTimersRef = useRef<Record<number, number>>({});
  const lastFileSigRef = useRef<Record<number, string>>({});

  const state: SectionImageState =
    sections[step.id] ?? {
      file: null,
      previewUrl: null,
      result: null,
      loading: false,
      error: null,
      nextAllowedAt: null,
    };

  function update(partial: Partial<SectionImageState>) {
    setSections((prev) => ({
      ...prev,
      [step.id]: {
        ...state,
        ...partial,
      },
    }));
  }

  function fileSignature(f: File) {
    return `${f.name}:${f.size}:${f.lastModified}:${f.type}`;
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    update({ file, previewUrl, result: null, error: null, nextAllowedAt: null });
    // Auto-run analysis on attach (with rate-limit guarding inside runAnalysis).
    void runAnalysis(file);
  }

  async function runAnalysis(existingFile?: File) {
    const file = existingFile ?? state.file;
    if (!file) return;

    const now = Date.now();
    const nextAllowedAt = state.nextAllowedAt ?? null;
    if (nextAllowedAt && now < nextAllowedAt) {
      const secs = Math.max(1, Math.ceil((nextAllowedAt - now) / 1000));
      update({ error: `Rate limit reached. Please retry in ${secs}s.` });
      return;
    }

    update({ loading: true, error: null });
    try {
      lastFileSigRef.current[step.id] = fileSignature(file);
      const result = await callGeminiImageAnalysis(file, step, data);
      update({ result, loading: false, nextAllowedAt: null });
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : "Unexpected error analysing image.";
      const retryMs = parseRetryDelayMsFromGeminiError(raw);
      if (retryMs !== null) {
        const ms = Math.max(750, retryMs);
        const next = Date.now() + ms;
        const secs = Math.max(1, Math.ceil(ms / 1000));
        update({
          loading: false,
          nextAllowedAt: next,
          error: `Rate limit reached. Retrying automatically in ${secs}s...`,
        });

        // Auto-retry once the server tells us it's safe.
        const prevTimer = retryTimersRef.current[step.id];
        if (prevTimer) window.clearTimeout(prevTimer);
        const sig = fileSignature(file);
        retryTimersRef.current[step.id] = window.setTimeout(() => {
          // Only retry if the same file is still attached for this section.
          const currentSig = lastFileSigRef.current[step.id];
          if (currentSig && currentSig === sig) {
            void runAnalysis(file);
          }
        }, ms + 150);
      } else {
        update({ loading: false, error: raw });
      }
    }
  }

  function handleClear() {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    const prevTimer = retryTimersRef.current[step.id];
    if (prevTimer) window.clearTimeout(prevTimer);
    delete retryTimersRef.current[step.id];
    delete lastFileSigRef.current[step.id];
    update({
      file: null,
      previewUrl: null,
      result: null,
      error: null,
      loading: false,
      nextAllowedAt: null,
    });
  }

  const hasContent =
    !!state.previewUrl || !!state.result || !!state.error || state.loading;

  return (
    <div
      className={[
        "ds-img-panel",
        "ai-check-section",
        state.loading ? "is-analyzing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="ds-img-header">
        <span className="ds-img-title section-header">Section Photo & AI Check</span>
        <p className="ds-img-sub section-description">
          Attach a photo for this section to get a damp-focused AI review and
          report-ready captions.
        </p>
      </div>
      <div className="ds-img-actions button-group">
        <label className="ds-btn ds-btn-primary btn-primary ds-img-upload">
          Attach Photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />
        </label>
        <span className="ai-sep" aria-hidden />
        <button
          type="button"
          className="ds-btn ds-btn-ghost btn-ghost"
          onClick={() => void runAnalysis()}
          disabled={!state.file || state.loading}
        >
          Re-analyse
        </button>
        <span className="ai-sep" aria-hidden />
        <button
          type="button"
          className="ds-btn ds-btn-ghost btn-ghost"
          onClick={handleClear}
          disabled={!state.file && !state.previewUrl && !state.result}
        >
          Clear photo
        </button>
      </div>

      {hasContent ? (
        <div className={["ds-img-content", !state.previewUrl ? "no-preview" : ""].filter(Boolean).join(" ")}>
          {state.previewUrl ? (
            <div className="ds-img-preview-wrap">
              <img
                src={state.previewUrl}
                alt={`Section ${step.id} photo`}
                className="ds-img-preview"
              />
            </div>
          ) : null}
          <div className="ds-img-review">
            {state.loading ? (
              <div className="ds-loading ds-img-loading">
                <div className="ds-spinner" />
                <span>Analysing photo for this section...</span>
              </div>
            ) : state.error ? (
              <div className="ds-img-field">
                <div className="ds-img-label">ERROR</div>
                <div className="ds-img-value">{state.error}</div>
              </div>
            ) : state.result ? (
              <>
                {state.result.parseError ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">PARSING NOTE</div>
                    <div className="ds-img-value">
                      {state.result.parseError}
                    </div>
                  </div>
                ) : null}
                {state.result.description ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">DESCRIPTION</div>
                    <div className="ds-img-value">
                      {state.result.description}
                    </div>
                  </div>
                ) : null}
                {state.result.relevance ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">RELEVANCE</div>
                    <div className="ds-img-value">
                      {state.result.relevance}
                    </div>
                  </div>
                ) : null}
                {state.result.issues ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">ISSUES / MISMATCHES</div>
                    <div className="ds-img-value">
                      {state.result.issues}
                    </div>
                  </div>
                ) : null}
                {state.result.improvements ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">IMPROVEMENTS</div>
                    <div className="ds-img-value">
                      {state.result.improvements}
                    </div>
                  </div>
                ) : null}
                {state.result.captions && state.result.captions.length ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">CAPTIONS</div>
                    <div className="ds-img-value">
                      <ul className="ds-img-captions">
                        {state.result.captions.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
                {state.result.parseError && state.result.rawText ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">RAW RESPONSE</div>
                    <div className="ds-img-value ds-img-raw">
                      {state.result.rawText}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="ds-img-field">
                <div className="ds-img-label">STATUS</div>
                <div className="ds-img-value">
                  Attach a photo to begin analysis for this section.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const steps: Step[] = useMemo(
    () => [
      {
        id: 1,
        title: "Basic Building Information",
        desc: "Start with foundational details about the property being assessed.",
        questions: [
          {
            kind: "chips",
            key: "buildingType",
            label: "Type of building",
            required: true,
            mode: "single",
            options: [
              { label: "Apartment", value: "Apartment" },
              { label: "House", value: "House" },
              { label: "Commercial", value: "Commercial" },
              { label: "Basement / Garage", value: "Basement/Garage" },
              { label: "Other", value: "Other" },
            ],
          },
          {
            kind: "chips",
            key: "constructionType",
            label: "Type of construction",
            mode: "multi",
            options: [
              { label: "Concrete", value: "Concrete" },
              { label: "Brick", value: "Brick" },
              { label: "Stone", value: "Stone" },
              { label: "Timber frame", value: "Timber frame" },
              { label: "Solid wall", value: "Solid wall" },
              { label: "Cavity wall", value: "Cavity wall" },
              { label: "Mixed", value: "Mixed" },
            ],
          },
          {
            kind: "chips",
            key: "ownership",
            label: "Type of ownership",
            mode: "single",
            options: [
              { label: "Owner", value: "Owner" },
              { label: "Tenant", value: "Tenant" },
              { label: "Rental property", value: "Rental property" },
              { label: "Social housing", value: "Social housing" },
            ],
          },
          {
            kind: "inputs",
            fields: [
              {
                key: "yearBuilt",
                label: "Year of Construction",
                type: "number",
                placeholder: "e.g. 1978",
              },
              {
                key: "buildingArea",
                label: "Building Area (m²)",
                type: "number",
                placeholder: "e.g. 120",
              },
              {
                key: "floorsAffected",
                label: "Number of Floors Affected",
                type: "number",
                placeholder: "e.g. 2",
              },
              {
                key: "location",
                label: "Address / Location",
                type: "text",
                placeholder: "City or area",
              },
            ],
          },
          {
            kind: "chips",
            key: "floodRisk",
            label: "Elevation / Flood risk",
            mode: "single",
            options: [
              { label: "Low risk", value: "Low risk" },
              { label: "Medium risk", value: "Medium risk" },
              { label: "High / flood zone", value: "High / flood zone" },
              { label: "Unknown", value: "Unknown" },
            ],
          },
        ],
      },
      {
        id: 2,
        title: "Building Characteristics",
        desc: "Moisture-relevant structural and material features of the building.",
        questions: [
          {
            kind: "chips",
            key: "wallMaterials",
            label: "Wall materials",
            mode: "multi",
            options: [
              { label: "Brick", value: "Brick" },
              { label: "Stone", value: "Stone" },
              { label: "Concrete block", value: "Concrete block" },
              { label: "Sand/cement render", value: "Sand/cement render" },
              { label: "Lime render", value: "Lime render" },
              { label: "Porous masonry", value: "Porous masonry" },
              { label: "Non-porous cladding", value: "Non-porous cladding" },
            ],
          },
          {
            kind: "chips",
            key: "dpcPresent",
            label: "DPC (Damp Proof Course) present?",
            mode: "single",
            options: [
              { label: "Yes – physical DPC", value: "Yes – physical DPC" },
              { label: "Yes – chemical injection", value: "Yes – chemical injection" },
              { label: "No DPC", value: "No DPC" },
              { label: "Unknown", value: "Unknown" },
            ],
          },
          {
            kind: "chips",
            key: "dpcCondition",
            label: "DPC condition",
            mode: "single",
            options: [
              { label: "Intact / functioning", value: "Intact / functioning" },
              { label: "Bridged or bypassed", value: "Bridged or bypassed" },
              { label: "Failed / degraded", value: "Failed / degraded" },
              { label: "Cannot determine", value: "Cannot determine" },
            ],
          },
          {
            kind: "chips",
            key: "floorType",
            label: "Floor construction type",
            mode: "single",
            options: [
              { label: "Solid concrete slab", value: "Solid concrete slab" },
              { label: "Suspended timber", value: "Suspended timber" },
              { label: "Beam & block", value: "Beam & block" },
              { label: "Mixed", value: "Mixed" },
            ],
          },
          {
            kind: "chips",
            key: "roofType",
            label: "Roof construction",
            mode: "multi",
            options: [
              { label: "Pitched – tiles", value: "Pitched – tiles" },
              { label: "Pitched – slate", value: "Pitched – slate" },
              { label: "Flat roof membrane", value: "Flat roof membrane" },
              { label: "EPDM / felt flat", value: "EPDM / felt flat" },
              { label: "Green roof", value: "Green roof" },
            ],
          },
          {
            kind: "chips",
            key: "glazing",
            label: "Glazing type",
            mode: "single",
            options: [
              { label: "Single glazed", value: "Single glazed" },
              { label: "Double glazed", value: "Double glazed" },
              { label: "Triple glazed", value: "Triple glazed" },
              { label: "Mixed", value: "Mixed" },
            ],
          },
          {
            kind: "chips",
            key: "groundLevel",
            label: "Ground level vs internal floor",
            mode: "single",
            options: [
              { label: "External lower (normal)", value: "External lower (normal)" },
              { label: "External at same level", value: "External at same level" },
              {
                label: "External higher (bridging risk)",
                value: "External higher (bridging risk)",
              },
            ],
          },
          {
            kind: "chips",
            key: "subfloorVent",
            label: "Subfloor ventilation",
            mode: "single",
            options: [
              { label: "Adequate grilles – clear", value: "Adequate grilles – clear" },
              { label: "Grilles present – blocked", value: "Grilles present – blocked" },
              { label: "No grilles / vents", value: "No grilles / vents" },
              { label: "N/A (solid floor)", value: "N/A (solid floor)" },
            ],
          },
          {
            kind: "chips",
            key: "wallThickness",
            label: "Wall thickness",
            mode: "single",
            options: [
              { label: "<200mm (thin)", value: "<200mm (thin)" },
              { label: "200–300mm", value: "200–300mm" },
              { label: "300–500mm (solid)", value: "300–500mm (solid)" },
              { label: ">500mm (thick stone)", value: ">500mm (thick stone)" },
            ],
          },
        ],
      },
      {
        id: 3,
        title: "External Moisture Ingress Points",
        desc: "Identify external defects that may allow water into the building.",
        questions: [
          {
            kind: "chips",
            key: "roofCondition",
            label: "Roof condition",
            mode: "multi",
            options: [
              { label: "Good – no defects", value: "Good – no defects" },
              { label: "Missing/broken tiles", value: "Missing/broken tiles" },
              { label: "Defective flashings", value: "Defective flashings" },
              { label: "Chimney pointing failed", value: "Chimney pointing failed" },
              { label: "Valley defects", value: "Valley defects" },
              { label: "Active leak confirmed", value: "Active leak confirmed" },
            ],
          },
          {
            kind: "chips",
            key: "gutters",
            label: "Gutters & downpipes",
            mode: "multi",
            options: [
              { label: "Clear and functioning", value: "Clear and functioning" },
              { label: "Blocked gutters", value: "Blocked gutters" },
              { label: "Leaking joints", value: "Leaking joints" },
              { label: "Overflowing", value: "Overflowing" },
              {
                label: "Downpipe discharging near wall",
                value: "Downpipe discharging near wall",
              },
              { label: "Missing sections", value: "Missing sections" },
            ],
          },
          {
            kind: "chips",
            key: "externalWallDefects",
            label: "External wall defects",
            mode: "multi",
            options: [
              { label: "No defects", value: "No defects" },
              { label: "Failed pointing", value: "Failed pointing" },
              { label: "Render cracks", value: "Render cracks" },
              { label: "Masonry spalling", value: "Masonry spalling" },
              { label: "No waterproofing", value: "No waterproofing" },
              { label: "Crack at DPC level", value: "Crack at DPC level" },
            ],
          },
          {
            kind: "chips",
            key: "windowDefects",
            label: "Window & door junctions",
            mode: "multi",
            options: [
              { label: "All sealed – good", value: "All sealed – good" },
              { label: "Failed seals/beading", value: "Failed seals/beading" },
              { label: "Missing sill or drip", value: "Missing sill or drip" },
              { label: "Cracked lintels", value: "Cracked lintels" },
              {
                label: "Defective flashing at head",
                value: "Defective flashing at head",
              },
            ],
          },
          {
            kind: "chips",
            key: "drainage",
            label: "Landscaping & site drainage",
            mode: "multi",
            options: [
              { label: "Ground slopes away – good", value: "Ground slopes away – good" },
              {
                label: "Ground slopes toward building",
                value: "Ground slopes toward building",
              },
              { label: "Standing water observed", value: "Standing water observed" },
              { label: "Paved area causing bridging", value: "Paved area causing bridging" },
              { label: "Soil raised above DPC", value: "Soil raised above DPC" },
            ],
          },
          {
            kind: "chips",
            key: "externalPlumbing",
            label: "External plumbing issues",
            mode: "multi",
            options: [
              { label: "No issues", value: "No issues" },
              { label: "Known pipe burst history", value: "Known pipe burst history" },
              { label: "Suspected leak", value: "Suspected leak" },
              { label: "Drainage failure", value: "Drainage failure" },
            ],
          },
          {
            kind: "textarea",
            key: "externalNotes",
            label: "Additional notes on external defects",
            placeholder:
              "Describe any specific external observations, locations, severity...",
          },
        ],
      },
      {
        id: 4,
        title: "Internal Signs of Damp & Mould",
        desc: "Document visible internal evidence of moisture problems.",
        questions: [
          {
            kind: "chips",
            key: "visibleSigns",
            label: "Visible signs present",
            mode: "multi",
            options: [
              { label: "Tide marks / staining", value: "Tide marks / staining" },
              { label: "Black mould", value: "Black mould" },
              { label: "Green/white mould", value: "Green/white mould" },
              { label: "Peeling paint/plaster", value: "Peeling paint/plaster" },
              { label: "Efflorescence (salt deposits)", value: "Efflorescence (salt deposits)" },
              { label: "Musty odour", value: "Musty odour" },
              { label: "No visible signs", value: "No visible signs" },
            ],
          },
          {
            kind: "chips",
            key: "locations",
            label: "Locations / rooms affected",
            mode: "multi",
            options: [
              { label: "Ground floor walls – base", value: "Ground floor walls – base" },
              { label: "Upper wall areas", value: "Upper wall areas" },
              { label: "Ceiling", value: "Ceiling" },
              { label: "Floor surface", value: "Floor surface" },
              { label: "Skirtings", value: "Skirtings" },
              { label: "Corners", value: "Corners" },
              { label: "Behind furniture", value: "Behind furniture" },
              { label: "Bathroom/kitchen", value: "Bathroom/kitchen" },
              { label: "Basement/cellar", value: "Basement/cellar" },
            ],
          },
          {
            kind: "chips",
            key: "condensation",
            label: "Condensation evidence",
            mode: "multi",
            options: [
              { label: "None observed", value: "None observed" },
              { label: "On windows", value: "On windows" },
              { label: "On cold pipes", value: "On cold pipes" },
              { label: "On cold wall surfaces", value: "On cold wall surfaces" },
              { label: "On ceilings", value: "On ceilings" },
            ],
          },
          {
            kind: "chips",
            key: "timberDecay",
            label: "Timber decay / insect activity",
            mode: "multi",
            options: [
              { label: "None", value: "None" },
              { label: "Wet rot", value: "Wet rot" },
              { label: "Dry rot", value: "Dry rot" },
              { label: "Fungal growth", value: "Fungal growth" },
              { label: "Active woodworm", value: "Active woodworm" },
              { label: "Inactive woodworm", value: "Inactive woodworm" },
            ],
          },
          {
            kind: "chips",
            key: "floodHistory",
            label: "Internal flooding / pooling history",
            mode: "single",
            options: [
              { label: "No history", value: "No history" },
              { label: "Single event", value: "Single event" },
              { label: "Recurring events", value: "Recurring events" },
              { label: "Currently affected", value: "Currently affected" },
            ],
          },
          {
            kind: "textarea",
            key: "internalNotes",
            label: "Internal observations / notes",
            placeholder:
              "Detail specific room locations, heights of damage, colours of mould, approx affected area m²...",
          },
        ],
      },
      {
        id: 5,
        title: "Moisture Measurements & Profiling",
        desc: "Record instrumental readings and moisture data from the survey.",
        questions: [
          {
            kind: "chips",
            key: "meterType",
            label: "Moisture meter type used",
            mode: "multi",
            options: [
              { label: "Pin meter", value: "Pin meter" },
              { label: "Non-invasive / RF meter", value: "Non-invasive / RF meter" },
              { label: "Both", value: "Both" },
              { label: "Not used", value: "Not used" },
            ],
          },
          {
            kind: "chips",
            key: "mcBase",
            label: "Moisture content (MC%) readings at base of wall",
            mode: "single",
            options: [
              { label: "Dry (<10%)", value: "Dry (<10%)" },
              { label: "Slightly damp (10–15%)", value: "Slightly damp (10–15%)" },
              { label: "Damp (15–20%)", value: "Damp (15–20%)" },
              { label: "Very wet (>20%)", value: "Very wet (>20%)" },
              { label: "Not measured", value: "Not measured" },
            ],
          },
          {
            kind: "chips",
            key: "moistureHeight",
            label: "Height profile of moisture rise",
            mode: "single",
            options: [
              { label: "<300mm (very low)", value: "<300mm (very low)" },
              { label: "300–600mm", value: "300–600mm" },
              { label: "600mm–1m", value: "600mm–1m" },
              { label: ">1m (high rise)", value: ">1m (high rise)" },
              { label: "Uniform (not rising damp)", value: "Uniform (not rising damp)" },
              { label: "Not measured", value: "Not measured" },
            ],
          },
          {
            kind: "chips",
            key: "rh",
            label: "Relative Humidity (%RH) measured",
            mode: "single",
            options: [
              { label: "Below 60% – acceptable", value: "Below 60% – acceptable" },
              { label: "60–70% – elevated", value: "60–70% – elevated" },
              { label: "70–80% – high", value: "70–80% – high" },
              { label: ">80% – very high", value: ">80% – very high" },
              { label: "Not measured", value: "Not measured" },
            ],
          },
          {
            kind: "chips",
            key: "thermal",
            label: "Thermal imaging / infrared survey",
            mode: "single",
            options: [
              { label: "Performed – no anomalies", value: "Performed – no anomalies" },
              { label: "Performed – cold bridges found", value: "Performed – cold bridges found" },
              { label: "Performed – hidden moisture found", value: "Performed – hidden moisture found" },
              { label: "Not performed", value: "Not performed" },
            ],
          },
          {
            kind: "chips",
            key: "saltTest",
            label: "Hygroscopic/salt analysis performed?",
            mode: "single",
            options: [
              { label: "Yes – negative (no significant salts)", value: "Yes – negative (no significant salts)" },
              { label: "Yes – positive (nitrates detected)", value: "Yes – positive (nitrates detected)" },
              { label: "Yes – positive (chlorides detected)", value: "Yes – positive (chlorides detected)" },
              { label: "Yes – high levels (lab confirmed)", value: "Yes – high levels (lab confirmed)" },
              { label: "Not performed", value: "Not performed" },
            ],
          },
          {
            kind: "textarea",
            key: "measurementNotes",
            label: "Measurement notes & readings",
            placeholder:
              "Record specific readings, locations, dew point, surface temperatures, moisture mapping sketch description...",
          },
        ],
      },
      {
        id: 6,
        title: "Ventilation, Humidity & Environment",
        desc: "Assess ventilation systems and environmental conditions in the building.",
        questions: [
          {
            kind: "chips",
            key: "ventType",
            label: "Type of ventilation present",
            mode: "multi",
            options: [
              { label: "Natural – openable windows", value: "Natural – openable windows" },
              { label: "Mechanical extractor fans", value: "Mechanical extractor fans" },
              { label: "Trickle vents in frames", value: "Trickle vents in frames" },
              { label: "Subfloor air bricks", value: "Subfloor air bricks" },
              { label: "MVHR (heat recovery)", value: "MVHR (heat recovery)" },
              { label: "PIV (positive input)", value: "PIV (positive input)" },
              { label: "No ventilation", value: "No ventilation" },
            ],
          },
          {
            kind: "chips",
            key: "ventEffectiveness",
            label: "Ventilation effectiveness",
            mode: "single",
            options: [
              { label: "Adequate", value: "Adequate" },
              { label: "Partially adequate", value: "Partially adequate" },
              { label: "Inadequate", value: "Inadequate" },
              { label: "Very poor / none", value: "Very poor / none" },
            ],
          },
          {
            kind: "chips",
            key: "humidSources",
            label: "Indoor humidity sources",
            mode: "multi",
            options: [
              { label: "High occupancy", value: "High occupancy" },
              { label: "Cooking without extraction", value: "Cooking without extraction" },
              { label: "Showering without extraction", value: "Showering without extraction" },
              { label: "Drying clothes indoors", value: "Drying clothes indoors" },
              { label: "Many houseplants", value: "Many houseplants" },
              { label: "Fish tanks / humidifiers", value: "Fish tanks / humidifiers" },
              { label: "Low occupancy / minimal sources", value: "Low occupancy / minimal sources" },
            ],
          },
          {
            kind: "chips",
            key: "occupancy",
            label: "Hours at home / occupancy pattern",
            mode: "single",
            options: [
              { label: "All day (high exposure)", value: "All day (high exposure)" },
              { label: "Most of day", value: "Most of day" },
              { label: "Evenings/weekends only", value: "Evenings/weekends only" },
              { label: "Mostly unoccupied", value: "Mostly unoccupied" },
            ],
          },
          {
            kind: "chips",
            key: "dewPointRisk",
            label: "Dew point / condensation risk level",
            mode: "single",
            options: [
              { label: "Low risk (<55% RH, warm surfaces)", value: "Low risk (<55% RH, warm surfaces)" },
              { label: "Moderate risk (55–65% RH)", value: "Moderate risk (55–65% RH)" },
              { label: "High risk (>65% RH, cold surfaces)", value: "High risk (>65% RH, cold surfaces)" },
              { label: "Not assessed", value: "Not assessed" },
            ],
          },
          {
            kind: "textarea",
            key: "ventNotes",
            label: "Ventilation/environment notes",
            placeholder:
              "Note any air leakage points, window habits, heating patterns, or other relevant lifestyle factors...",
          },
        ],
      },
      {
        id: 7,
        title: "Types of Damp & Moisture Sources",
        desc: "Identify the probable type(s) of damp and their root causes.",
        questions: [
          {
            kind: "chips",
            key: "dampTypes",
            label: "Primary damp type(s) identified",
            mode: "multi",
            options: [
              { label: "Condensation", value: "Condensation (poor ventilation)" },
              { label: "Rising damp", value: "Rising damp / capillary action" },
              { label: "Penetrating damp", value: "Penetrating damp (rain ingress)" },
              { label: "Plumbing leak", value: "Plumbing leak" },
              { label: "Construction moisture", value: "Construction moisture" },
              { label: "Hygroscopic salts", value: "Hygroscopic / deliquescent salts" },
              { label: "Interstitial condensation", value: "Interstitial condensation" },
              { label: "Flood damage", value: "Flood / post-water damage" },
            ],
          },
          {
            kind: "chips",
            key: "diagnosisConfidence",
            label: "Confidence in diagnosis",
            mode: "single",
            options: [
              { label: "High – clear evidence", value: "High – clear evidence" },
              { label: "Medium – probable", value: "Medium – probable" },
              { label: "Low – uncertain, needs further investigation", value: "Low – uncertain, needs further investigation" },
            ],
          },
          {
            kind: "chips",
            key: "risingDampIndicators",
            label: "Rising damp indicators (if applicable)",
            mode: "multi",
            options: [
              { label: "Tide marks on lower walls", value: "Tide marks on lower walls" },
              { label: "Salt deposits at low level", value: "Salt deposits at low level" },
              { label: "Moisture tapers from base upward", value: "Moisture tapers from base upward" },
              { label: "DPC absent/failed", value: "DPC absent/failed" },
              { label: "N/A", value: "N/A" },
            ],
          },
          {
            kind: "chips",
            key: "penetratingIndicators",
            label: "Penetrating damp indicators (if applicable)",
            mode: "multi",
            options: [
              { label: "Damp at window reveals", value: "Damp at window reveals" },
              { label: "Damp below roof line", value: "Damp below roof line" },
              { label: "Localised patch after rain", value: "Localised patch after rain" },
              { label: "Damp at chimney breast", value: "Damp at chimney breast" },
              { label: "N/A", value: "N/A" },
            ],
          },
          {
            kind: "textarea",
            key: "dampDiagNotes",
            label: "Additional diagnostic notes",
            placeholder:
              "Describe the logic behind your diagnosis, any conflicting signs, or tests performed to differentiate types...",
          },
        ],
      },
      {
        id: 8,
        title: "Timber & Material Defects",
        desc: "Assess condition of timber elements, insulation and floor coverings.",
        questions: [
          {
            kind: "chips",
            key: "timberCondition",
            label: "Timber condition (skirtings, joists, floorboards)",
            mode: "multi",
            options: [
              { label: "Sound – no defects", value: "Sound – no defects" },
              { label: "Surface staining only", value: "Surface staining only" },
              { label: "Wet rot present", value: "Wet rot present" },
              { label: "Dry rot present", value: "Dry rot present" },
              { label: "Fungal strands observed", value: "Fungal strands observed" },
              { label: "Structural compromise", value: "Structural compromise" },
            ],
          },
          {
            kind: "chips",
            key: "insects",
            label: "Insect infestation",
            mode: "single",
            options: [
              { label: "None", value: "None" },
              { label: "Active woodworm", value: "Active woodworm" },
              { label: "Inactive woodworm", value: "Inactive woodworm" },
              { label: "Termites", value: "Termites" },
              { label: "Other", value: "Other" },
            ],
          },
          {
            kind: "chips",
            key: "insulationCondition",
            label: "Insulation condition",
            mode: "single",
            options: [
              { label: "Good – dry and intact", value: "Good – dry and intact" },
              { label: "Wet / saturated", value: "Wet / saturated" },
              { label: "Compressed and degraded", value: "Compressed and degraded" },
              { label: "Mouldy", value: "Mouldy" },
              { label: "Not present / N/A", value: "Not present / N/A" },
            ],
          },
          {
            kind: "chips",
            key: "floorCoverings",
            label: "Floor coverings condition",
            mode: "multi",
            options: [
              { label: "Dry and sound", value: "Dry and sound" },
              { label: "Damp under carpet", value: "Damp under carpet" },
              { label: "Damp under vinyl/laminate", value: "Damp under vinyl/laminate" },
              { label: "Underlay saturated", value: "Underlay saturated" },
              { label: "Lifting / bubbling", value: "Lifting / bubbling" },
            ],
          },
          {
            kind: "chips",
            key: "timberMC",
            label: "Timber MC% readings",
            mode: "single",
            options: [
              { label: "Dry (<18%)", value: "Dry (<18%)" },
              { label: "Slightly elevated (18–20%)", value: "Slightly elevated (18–20%)" },
              { label: "At risk (20–25%)", value: "At risk (20–25%)" },
              { label: "Wet rot risk (>25%)", value: "Wet rot risk (>25%)" },
              { label: "Not measured", value: "Not measured" },
            ],
          },
          {
            kind: "textarea",
            key: "timberNotes",
            label: "Timber/material notes",
            placeholder:
              "Note locations, extent of decay, which elements affected, any fruiting bodies, smell of dry rot...",
          },
        ],
      },
      {
        id: 9,
        title: "Structural & Building Defects",
        desc: "Record cracks, structural anomalies and other building defects.",
        questions: [
          {
            kind: "chips",
            key: "cracks",
            label: "Cracks observed",
            mode: "multi",
            options: [
              { label: "No cracks", value: "No cracks" },
              { label: "Hairline cracks – cosmetic", value: "Hairline cracks – cosmetic" },
              { label: "Diagonal cracks – settlement", value: "Diagonal cracks – settlement" },
              { label: "Horizontal cracks – structural concern", value: "Horizontal cracks – structural concern" },
              { label: "Vertical cracks", value: "Vertical cracks" },
              { label: "Active (widening)", value: "Active (widening)" },
              { label: "Historic (stable)", value: "Historic (stable)" },
            ],
          },
          {
            kind: "chips",
            key: "crackWidth",
            label: "Crack width",
            mode: "single",
            options: [
              { label: "<1mm (fine)", value: "<1mm (fine)" },
              { label: "1–5mm (moderate)", value: "1–5mm (moderate)" },
              { label: "5–15mm (wide – concern)", value: "5–15mm (wide – concern)" },
              { label: ">15mm (severe)", value: ">15mm (severe)" },
              { label: "N/A – no cracks", value: "N/A – no cracks" },
            ],
          },
          {
            kind: "chips",
            key: "subsidence",
            label: "Subsidence / settlement signs",
            mode: "single",
            options: [
              { label: "None observed", value: "None observed" },
              { label: "Minor – monitoring advised", value: "Minor – monitoring advised" },
              { label: "Suspected – investigation needed", value: "Suspected – investigation needed" },
              { label: "Active subsidence", value: "Active subsidence" },
            ],
          },
          {
            kind: "chips",
            key: "chimneyDefects",
            label: "Chimney / fireplace defects",
            mode: "multi",
            options: [
              { label: "No defects / N/A", value: "No defects / N/A" },
              { label: "Damp at chimney breast", value: "Damp at chimney breast" },
              { label: "Salt deposits at breast", value: "Salt deposits at breast" },
              { label: "Capping absent", value: "Capping absent" },
              { label: "Failed flashing", value: "Failed flashing" },
            ],
          },
          {
            kind: "chips",
            key: "otherStructural",
            label: "Other structural concerns",
            mode: "multi",
            options: [
              { label: "None", value: "None" },
              { label: "Blocked cavity wall", value: "Blocked cavity wall" },
              { label: "Wall tie failure suspected", value: "Wall tie failure suspected" },
              { label: "Service penetrations (unsealed)", value: "Service penetrations (unsealed)" },
              {
                label: "Foundation damp-proofing visible failure",
                value: "Foundation damp-proofing visible failure",
              },
            ],
          },
          {
            kind: "textarea",
            key: "structuralNotes",
            label: "Structural notes",
            placeholder:
              "Describe crack patterns, locations, any structural engineer involvement or concerns...",
          },
        ],
      },
      {
        id: 10,
        title: "History & Previous Interventions",
        desc: "Document prior treatments, repairs, and moisture events.",
        questions: [
          {
            kind: "chips",
            key: "prevTreatments",
            label: "Previous damp treatments",
            mode: "multi",
            options: [
              { label: "No previous treatments", value: "No previous treatments" },
              { label: "Chemical DPC injection", value: "Chemical DPC injection" },
              { label: "Membranes / tanking", value: "Waterproof membranes / tanking" },
              { label: "Waterproof renders", value: "Waterproof renders applied" },
              { label: "Timber treatment", value: "Timber treatment (fungicide)" },
              { label: "Drainage / sump", value: "Drainage / sump installed" },
            ],
          },
          {
            kind: "chips",
            key: "priorSurvey",
            label: "Prior survey / guarantee",
            mode: "single",
            options: [
              { label: "Yes – recent (within 5 years)", value: "Yes – recent (within 5 years)" },
              { label: "Yes – older", value: "Yes – older" },
              { label: "Guarantee in place", value: "Guarantee in place" },
              { label: "No prior survey", value: "No prior survey" },
            ],
          },
          {
            kind: "chips",
            key: "mouldRemediation",
            label: "Previous mould remediation",
            mode: "multi",
            options: [
              { label: "None", value: "None" },
              { label: "Surface cleaning", value: "Surface cleaning performed" },
              { label: "Dry fogging", value: "Dry fogging / antimicrobial" },
              { label: "Ventilation upgrade", value: "Ventilation upgrade" },
              { label: "Material removal", value: "Material removal" },
            ],
          },
          {
            kind: "chips",
            key: "maintenance",
            label: "Maintenance history",
            mode: "multi",
            options: [
              { label: "Regular maintenance", value: "Regular maintenance" },
              { label: "Roof repairs done", value: "Roof repairs done" },
              { label: "Gutter cleaning done", value: "Gutter cleaning done" },
              { label: "Re-rendering done", value: "Re-rendering done" },
              { label: "Plumbing fixes done", value: "Plumbing fixes done" },
              { label: "No maintenance", value: "No maintenance" },
            ],
          },
          {
            kind: "textarea",
            key: "historyNotes",
            label: "History notes",
            placeholder:
              "Dates of previous works, names of contractors, outcomes of prior treatments, dates of flood events...",
          },
        ],
      },
      {
        id: 11,
        title: "Risk Assessment & Impacts",
        desc: "Evaluate severity, health risks, structural impacts and urgency.",
        questions: [
          {
            kind: "chips",
            key: "severity",
            label: "Overall severity rating",
            mode: "single",
            options: [
              { label: "🟢 Low", value: "Low", className: "sev-low" },
              { label: "🟡 Medium", value: "Medium", className: "sev-med" },
              { label: "🟠 High", value: "High", className: "sev-high" },
              { label: "🔴 Severe", value: "Severe", className: "sev-sev" },
            ],
          },
          {
            kind: "chips",
            key: "extentAffected",
            label: "Estimated extent of affected surfaces",
            mode: "single",
            options: [
              { label: "<5m² (minor)", value: "<5m² (minor)" },
              { label: "5–20m² (moderate)", value: "5–20m² (moderate)" },
              { label: "20–50m² (significant)", value: "20–50m² (significant)" },
              { label: ">50m² (extensive)", value: ">50m² (extensive)" },
            ],
          },
          {
            kind: "chips",
            key: "healthRisks",
            label: "Health & safety risks identified",
            mode: "multi",
            options: [
              { label: "Mould spore exposure", value: "Mould spore exposure" },
              { label: "Respiratory risk", value: "Respiratory risk" },
              { label: "Allergic / asthma risk", value: "Allergic reactions / asthma" },
              { label: "Dust mites", value: "Dust mites (elevated humidity)" },
              { label: "VOCs from mould", value: "VOCs from mould" },
              { label: "Slip risk (wet floors)", value: "Slip risk (wet floors)" },
              { label: "Minimal health risk", value: "Minimal health risk" },
            ],
          },
          {
            kind: "chips",
            key: "vulnerable",
            label: "Vulnerable occupants present?",
            mode: "multi",
            options: [
              { label: "Children", value: "Children" },
              { label: "Elderly", value: "Elderly" },
              { label: "Asthma / respiratory", value: "Asthma / respiratory conditions" },
              { label: "Immunocompromised", value: "Immunocompromised" },
              { label: "None / unknown", value: "None / unknown" },
            ],
          },
          {
            kind: "chips",
            key: "structuralRisk",
            label: "Structural risk level",
            mode: "single",
            options: [
              { label: "No structural risk", value: "No structural risk" },
              { label: "Timber weakening risk", value: "Timber weakening risk" },
              { label: "Material degradation ongoing", value: "Material degradation ongoing" },
              { label: "Active structural concern", value: "Active structural concern" },
            ],
          },
          {
            kind: "chips",
            key: "urgency",
            label: "Urgency of action",
            mode: "single",
            options: [
              { label: "Monitor only", value: "Monitor only" },
              { label: "Within 3–6 months", value: "Within 3–6 months" },
              { label: "Within 1 month", value: "Within 1 month" },
              { label: "Immediate action required", value: "Immediate action required" },
            ],
          },
        ],
      },
      {
        id: 12,
        title: "Inspections & Methods Used",
        desc: "Record the inspection methods, equipment and verification approaches used.",
        questions: [
          {
            kind: "chips",
            key: "inspectionMethods",
            label: "Inspection methods performed",
            mode: "multi",
            options: [
              { label: "Visual inspection", value: "Visual inspection" },
              { label: "Moisture profiling (pin)", value: "Moisture profiling (pin meter)" },
              { label: "Moisture profiling (non-invasive)", value: "Moisture profiling (non-invasive)" },
              { label: "Thermal imaging", value: "Thermal imaging / IR camera" },
              { label: "Hygrometer / dew point", value: "Hygrometer / dew point assessment" },
              { label: "Salt analysis", value: "Salt / hygroscopic analysis" },
              { label: "Laboratory testing", value: "Laboratory testing" },
              { label: "Borescope / endoscope", value: "Borescope / endoscope" },
              { label: "Airborne spore sampling", value: "Airborne spore sampling" },
              { label: "Photographic log", value: "Photographic evidence log" },
              { label: "Client remote intake", value: "Client remote intake (photos/video)" },
            ],
          },
          {
            kind: "chips",
            key: "dpcInspection",
            label: "DPC / damp-proof membrane inspection",
            mode: "single",
            options: [
              { label: "Inspected – adequate", value: "Inspected – adequate" },
              { label: "Inspected – defective", value: "Inspected – defective" },
              { label: "Inspected – absent", value: "Inspected – absent" },
              { label: "Not accessible", value: "Not accessible / not inspected" },
            ],
          },
          {
            kind: "chips",
            key: "evidenceQuality",
            label: "Photographic / video evidence quality",
            mode: "single",
            options: [
              { label: "Comprehensive", value: "Comprehensive – all areas documented" },
              { label: "Partial", value: "Partial – some areas" },
              { label: "Minimal", value: "Minimal – key areas only" },
              { label: "None", value: "None" },
            ],
          },
          {
            kind: "textarea",
            key: "inspectionNotes",
            label: "Inspection method notes",
            placeholder:
              "List specific equipment used (make/model), any access limitations, areas not inspected and reasons...",
          },
        ],
      },
      {
        id: 13,
        title: "Safety, Recommendations & Remediation",
        desc: "Define the remediation plan, treatments and long-term prevention strategy.",
        questions: [
          {
            kind: "chips",
            key: "remediationActions",
            label: "Recommended remediation actions",
            mode: "multi",
            options: [
              { label: "Ventilation upgrade", value: "Ventilation upgrade (mechanical)" },
              { label: "Dehumidifier", value: "Dehumidifier / humidity control" },
              { label: "DPC chemical injection", value: "DPC chemical injection" },
              { label: "New DPC membrane", value: "New DPC membrane" },
              { label: "Re-pointing / render", value: "Re-pointing / render replacement" },
              { label: "External waterproofing", value: "External waterproofing" },
              { label: "Window / door seals", value: "Window / door seal replacement" },
              { label: "Timber treatment", value: "Timber treatment / replacement" },
              { label: "Drainage / gutters", value: "Drainage / gutter improvements" },
              { label: "Ground level adjustment", value: "Ground level adjustment" },
              { label: "Insulation upgrade", value: "Insulation upgrade (breathable)" },
              { label: "Dry fogging", value: "Dry fogging / antimicrobial treatment" },
              { label: "Material removal", value: "Material removal (drywall / insulation)" },
            ],
          },
          {
            kind: "chips",
            key: "costBand",
            label: "Estimated cost band",
            mode: "single",
            options: [
              { label: "Low (<€1,000)", value: "Low (<€1,000)" },
              { label: "Medium (€1,000–€5,000)", value: "Medium (€1,000–€5,000)" },
              { label: "High (€5,000–€15,000)", value: "High (€5,000–€15,000)" },
              { label: "Very high (>€15,000)", value: "Very high (>€15,000)" },
            ],
          },
          {
            kind: "chips",
            key: "specialists",
            label: "Specialist referrals needed",
            mode: "multi",
            options: [
              { label: "None required", value: "None required" },
              { label: "Structural engineer", value: "Structural engineer" },
              { label: "Waterproofing specialist", value: "Waterproofing specialist" },
              { label: "Timber specialist", value: "Timber / dry rot specialist" },
              { label: "Plumber", value: "Plumber" },
              { label: "Building surveyor", value: "Building surveyor" },
              { label: "Environmental health", value: "Environmental health" },
            ],
          },
          {
            kind: "chips",
            key: "prevention",
            label: "Long-term prevention measures",
            mode: "multi",
            options: [
              { label: "Annual monitoring plan", value: "Annual monitoring plan" },
              { label: "Breathable materials", value: "Breathable materials only" },
              { label: "Lifestyle advice", value: "Lifestyle advice to occupant" },
              { label: "Regular maintenance", value: "Regular gutter/roof maintenance" },
              { label: "Hygrometer installation", value: "Hygrometer installation" },
              { label: "Building fabric upgrade", value: "Building fabric upgrade" },
            ],
          },
          {
            kind: "textarea",
            key: "finalNotes",
            label: "Surveyor's final notes & observations",
            placeholder:
              "Any additional context, client communication notes, priority actions, or caveats to include in the report...",
          },
        ],
      },
    ],
    [],
  );

  const [current, setCurrent] = useState(1);
  const [data, setData] = useState<SurveyData>({});
  const [isReview, setIsReview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  function normalizeReviewText(raw: string) {
    return raw
      .replace(/\r\n/g, "\n")
      // Force blank line before headings (UI renders blocks on blank lines)
      .replace(/\n(#{2,3}\s+)/g, "\n\n$1")
      // Force blank line after headings
      .replace(/(#{2,3}[^\n]*)(\n)(?!\n)/g, "$1\n\n")
      .trim();
  }

  const pct = Math.round(((current - 1) / TOTAL) * 100);
  const step = steps.find((s) => s.id === current)!;

  function setChip(key: string, mode: "single" | "multi", value: string) {
    setData((prev) => {
      const existing = prev[key] ?? (mode === "multi" ? [] : null);
      if (mode === "single") return { ...prev, [key]: value };
      return { ...prev, [key]: toggleMulti(existing, value) };
    });
  }

  function setField(key: string, value: string) {
    setData((prev) => ({ ...prev, [key]: value.length ? value : null }));
  }

  async function generateReview() {
    setIsLoading(true);
    setAiError(null);
    setAiText(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey: data }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to generate review.");
      setAiText(
        normalizeReviewText(json.text || "Unable to generate review. Please try again.")
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setAiError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function goNext() {
    if (current === TOTAL) {
      setIsReview(true);
      void generateReview();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setCurrent((c) => Math.min(TOTAL, c + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setCurrent((c) => Math.max(1, c - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restartSurvey() {
    setCurrent(1);
    setData({});
    setIsReview(false);
    setIsLoading(false);
    setAiText(null);
    setAiError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="ds-app">
      <header className="ds-header">
        <div className="ds-logo" aria-hidden>
          <img src="/logo.png" alt="" className="ds-logo-img" />
        </div>
        <div>
          <h1>Professional Moisture & Damp Assessment Tool</h1>
          <p>Professional Moisture & Damp Assessment Tool</p>
        </div>
      </header>

      <div className="ds-progress-wrap">
        <div className="ds-progress-meta">
          <span className="ds-step-label">
            {isReview ? "Survey Complete" : `Section ${current} of ${TOTAL}`}
          </span>
          <span className="ds-step-count">
            {isReview ? "100% complete" : `${pct}% complete`}
          </span>
        </div>
        <div className="ds-progress-bg">
          <div
            className="ds-progress-fill"
            style={{ width: isReview ? "100%" : `${pct}%` }}
          />
        </div>
      </div>

      <div className="ds-dots" aria-label="Progress">
        {Array.from({ length: TOTAL }, (_, idx) => {
          const n = idx + 1;
          const className =
            n < current ? "ds-dot done" : n === current ? "ds-dot active" : "ds-dot";
          return (
            <button
              key={n}
              type="button"
              className={className}
              title={`Section ${n}`}
              onClick={() => {
                if (!isReview && n <= current) setCurrent(n);
              }}
              aria-label={`Go to section ${n}`}
              disabled={isReview || n > current}
            />
          );
        })}
      </div>

      {!isReview ? (
        <section className="ds-card">
          <div className="ds-step-num">{`Section ${String(step.id).padStart(
            2,
            "0"
          )}`}</div>
          <h2>{step.title}</h2>
          <p className="ds-desc">{step.desc}</p>

          {step.questions.map((q, qi) => {
            if (q.kind === "chips") {
              const v = data[q.key] ?? (q.mode === "multi" ? [] : null);
              return (
                <div className="ds-q" key={`${q.key}-${qi}`}>
                  <span className="ds-label">
                    {q.label}
                    {q.required ? <span className="ds-req">*</span> : null}
                  </span>
                  <div className="ds-chips">
                    {q.options.map((opt) => {
                      const selected = isSelected(v, opt.value);
                      const chipClass = [
                        "ds-chip",
                        q.mode === "single" ? "single" : "",
                        opt.className ? opt.className : "",
                        selected ? "selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <div
                          key={opt.value}
                          className={chipClass}
                          onClick={() => setChip(q.key, q.mode, opt.value)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setChip(q.key, q.mode, opt.value);
                            }
                          }}
                          aria-pressed={selected}
                        >
                          {opt.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (q.kind === "inputs") {
              return (
                <div className="ds-q" key={`inputs-${qi}`}>
                  <div className="ds-divider" />
                  <div className="ds-row">
                    {q.fields.map((f) => (
                      <div className="ds-group" key={f.key}>
                        <label>{f.label}</label>
                        <input
                          className="ds-input"
                          type={f.type}
                          placeholder={f.placeholder}
                          value={
                            typeof data[f.key] === "string"
                              ? (data[f.key] as string)
                              : ""
                          }
                          onChange={(e) => setField(f.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div className="ds-q" key={`${q.key}-${qi}`}>
                <span className="ds-label">{q.label}</span>
                <textarea
                  className="ds-textarea"
                  placeholder={q.placeholder}
                  value={
                    typeof data[q.key] === "string"
                      ? (data[q.key] as string)
                      : ""
                  }
                  onChange={(e) => setField(q.key, e.target.value)}
                />
              </div>
            );
          })}

          <div className="ds-divider" />
          <SectionImageAnalysis step={step} data={data} />
        </section>
      ) : (
        <section>
          <div className="ds-review-header">
            <h2>Survey Complete — AI Review</h2>
            <p>Generating a comprehensive analysis based on your 13-section survey data...</p>
          </div>
          <div className="ds-review-box">
            {isLoading ? (
              <div className="ds-loading">
                <div className="ds-spinner" />
                <span>Analysing survey data...</span>
              </div>
            ) : aiError ? (
              <MarkdownLite text={`### Error\n\n${aiError}`} />
            ) : aiText ? (
              <MarkdownLite text={aiText} />
            ) : (
              <MarkdownLite text={"### Ready\n\nClick **Generate Full AI Review** to run the analysis."} />
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              className="ds-btn ds-btn-review"
              type="button"
              onClick={() => void generateReview()}
              disabled={isLoading}
            >
              Generate Full AI Review
            </button>
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="ds-btn ds-btn-ghost" type="button" onClick={restartSurvey} style={{ width: "100%" }}>
              Start New Survey
            </button>
          </div>
        </section>
      )}

      {!isReview ? (
        <div className="ds-nav">
          <button className="ds-btn ds-btn-ghost" type="button" onClick={goBack} disabled={current === 1}>
            ← Back
          </button>
          <button
            className={`ds-btn ${current === TOTAL ? "ds-btn-complete" : "ds-btn-primary"}`}
            type="button"
            onClick={goNext}
          >
            {current === TOTAL ? "Complete Survey ✓" : "Next →"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
