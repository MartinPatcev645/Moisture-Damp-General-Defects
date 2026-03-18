"use client";

import React, { ChangeEvent, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import type { AppLang } from "@/i18n/translations";
import { getSteps, TOTAL_SECTIONS, type SurveyData, type SurveyValue, type Step } from "./surveySteps";

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
  translations?: Partial<Record<AppLang, ImageAnalysisResult>>;
  outputLang?: AppLang;
  translating?: boolean;
  translateError?: string | null;
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

function buildGeminiPrompt(step: Step, data: SurveyData, lang: AppLang): string {
  const answers = buildSectionContext(step, data);
  const outputLang =
    lang === "pt"
      ? "Portuguese (Portugal)"
      : "English";
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
    `Write ALL JSON string values in ${outputLang}.`,
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
  data: SurveyData,
  lang: AppLang,
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
  const prompt = buildGeminiPrompt(step, data, lang);

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
  const { lang, t } = useI18n();
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
      translations: {},
      outputLang: lang,
      translating: false,
      translateError: null,
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

  async function translateResult(targetLang: AppLang) {
    if (!state.result) return;
    if (targetLang === state.outputLang) return;

    // If we already have it cached, just switch view.
    const cached = state.translations?.[targetLang];
    if (cached) {
      update({ outputLang: targetLang, translateError: null });
      return;
    }

    const base = state.result;
    const parts: Array<{
      key: "description" | "relevance" | "issues" | "improvements" | "caption";
      idx?: number;
      text: string;
    }> = [];

    if (base.description) parts.push({ key: "description", text: base.description });
    if (base.relevance) parts.push({ key: "relevance", text: base.relevance });
    if (base.issues) parts.push({ key: "issues", text: base.issues });
    if (base.improvements) parts.push({ key: "improvements", text: base.improvements });
    if (base.captions?.length) {
      base.captions.forEach((c, idx) => parts.push({ key: "caption", idx, text: c }));
    }

    if (!parts.length) {
      update({ outputLang: targetLang, translateError: null });
      return;
    }

    update({ translating: true, translateError: null });
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLang, texts: parts.map((p) => p.text) }),
      });
      const json = (await res.json()) as { translations?: string[]; error?: string };
      if (!res.ok || !Array.isArray(json.translations)) {
        throw new Error(json.error || "Translation failed.");
      }

      const out: ImageAnalysisResult = {
        parseError: base.parseError ?? null,
      };

      const captions: string[] = [];
      json.translations.forEach((tr, i) => {
        const p = parts[i];
        if (!p) return;
        if (p.key === "description") out.description = tr;
        if (p.key === "relevance") out.relevance = tr;
        if (p.key === "issues") out.issues = tr;
        if (p.key === "improvements") out.improvements = tr;
        if (p.key === "caption") captions[p.idx ?? captions.length] = tr;
      });
      if (captions.length) out.captions = captions.filter((c) => typeof c === "string" && c.length);

      update({
        translating: false,
        outputLang: targetLang,
        translations: { ...(state.translations ?? {}), [targetLang]: out },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Translation failed.";
      update({ translating: false, translateError: msg });
    }
  }

  async function runAnalysis(existingFile?: File) {
    const file = existingFile ?? state.file;
    if (!file) return;

    const now = Date.now();
    const nextAllowedAt = state.nextAllowedAt ?? null;
    if (nextAllowedAt && now < nextAllowedAt) {
      const secs = Math.max(1, Math.ceil((nextAllowedAt - now) / 1000));
      update({ error: t("rateLimitReachedRetryIn", { secs }) });
      return;
    }

    update({ loading: true, error: null });
    try {
      lastFileSigRef.current[step.id] = fileSignature(file);
      const result = await callGeminiImageAnalysis(file, step, data, lang);
      update({
        result,
        loading: false,
        nextAllowedAt: null,
        outputLang: lang,
        translations: {},
        translateError: null,
        translating: false,
      });
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : t("unexpectedImageError");
      const retryMs = parseRetryDelayMsFromGeminiError(raw);
      if (retryMs !== null) {
        const ms = Math.max(750, retryMs);
        const next = Date.now() + ms;
        const secs = Math.max(1, Math.ceil(ms / 1000));
        update({
          loading: false,
          nextAllowedAt: next,
          error: t("rateLimitRetrying", { secs }),
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

  const activeResult = state.result;
  const outputLang = (state.outputLang ?? lang) as AppLang;
  const displayedResult =
    outputLang === lang
      ? activeResult
      : state.translations?.[outputLang] ?? activeResult;
  const fmtSectionPlain = (n: number) => t("sectionPlain", { n });

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
        <span className="ds-img-title section-header">
          {t("sectionPhotoAndAiCheck")}
        </span>
        <p className="ds-img-sub section-description">
          {t("sectionPhotoAndAiCheckSub")}
        </p>
      </div>
      <div className="ds-img-actions button-group">
        <label className="ds-btn ds-btn-primary btn-primary ds-img-upload">
          {t("attachPhoto")}
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
          {t("reanalyse")}
        </button>
        <span className="ai-sep" aria-hidden />
        <button
          type="button"
          className="ds-btn ds-btn-ghost btn-ghost"
          onClick={handleClear}
          disabled={!state.file && !state.previewUrl && !state.result}
        >
          {t("clearPhoto")}
        </button>
      </div>

      {hasContent ? (
        <div className={["ds-img-content", !state.previewUrl ? "no-preview" : ""].filter(Boolean).join(" ")}>
          {state.previewUrl ? (
            <div className="ds-img-preview-wrap">
              <img
                src={state.previewUrl}
                alt={t("sectionPhotoAlt", { section: fmtSectionPlain(step.id) })}
                className="ds-img-preview"
              />
            </div>
          ) : null}
          <div className="ds-img-review">
            {state.loading ? (
              <div className="ds-loading ds-img-loading">
                <div className="ds-spinner" />
                <span>{t("analysingPhoto")}</span>
              </div>
            ) : state.error ? (
              <div className="ds-img-field">
                <div className="ds-img-label">{t("errorLabel")}</div>
                <div className="ds-img-value">{state.error}</div>
              </div>
            ) : activeResult ? (
              <>
                <div className="ds-img-actions button-group" style={{ justifyContent: "flex-start", marginBottom: 10 }}>
                  <span className="ds-img-lang-label" style={{ opacity: 0.8 }}>
                    {outputLang === "en" ? "EN" : "PT"}
                  </span>
                  <span className="ai-sep" aria-hidden />
                  <button
                    type="button"
                    className={`ds-btn ds-btn-ghost btn-ghost ${outputLang === "en" ? "selected" : ""}`}
                    onClick={() => void translateResult("en")}
                    disabled={state.translating || !activeResult}
                    aria-pressed={outputLang === "en"}
                    title="Translate to English"
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    className={`ds-btn ds-btn-ghost btn-ghost ${outputLang === "pt" ? "selected" : ""}`}
                    onClick={() => void translateResult("pt")}
                    disabled={state.translating || !activeResult}
                    aria-pressed={outputLang === "pt"}
                    title="Traduzir para Português"
                  >
                    PT
                  </button>
                  {state.translating ? (
                    <>
                      <span className="ai-sep" aria-hidden />
                      <span style={{ opacity: 0.85 }}>{outputLang === "pt" ? "A traduzir…" : "Translating…"}</span>
                    </>
                  ) : null}
                </div>
                {state.translateError ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">{t("errorLabel")}</div>
                    <div className="ds-img-value">{state.translateError}</div>
                  </div>
                ) : null}
                {displayedResult?.parseError ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">{t("parsingNote")}</div>
                    <div className="ds-img-value">
                      {displayedResult?.parseError}
                    </div>
                  </div>
                ) : null}
                {displayedResult?.description ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">{t("descriptionLabel")}</div>
                    <div className="ds-img-value">
                      {displayedResult.description}
                    </div>
                  </div>
                ) : null}
                {displayedResult?.relevance ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">{t("relevanceLabel")}</div>
                    <div className="ds-img-value">
                      {displayedResult.relevance}
                    </div>
                  </div>
                ) : null}
                {displayedResult?.issues ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">{t("issuesLabel")}</div>
                    <div className="ds-img-value">
                      {displayedResult.issues}
                    </div>
                  </div>
                ) : null}
                {displayedResult?.improvements ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">{t("improvementsLabel")}</div>
                    <div className="ds-img-value">
                      {displayedResult.improvements}
                    </div>
                  </div>
                ) : null}
                {displayedResult?.captions && displayedResult.captions.length ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">{t("captionsLabel")}</div>
                    <div className="ds-img-value">
                      <ul className="ds-img-captions">
                        {displayedResult.captions.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
                {activeResult.parseError && activeResult.rawText ? (
                  <div className="ds-img-field">
                    <div className="ds-img-label">{t("rawResponseLabel")}</div>
                    <div className="ds-img-value ds-img-raw">
                      {activeResult.rawText}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="ds-img-field">
                <div className="ds-img-label">{t("statusLabel")}</div>
                <div className="ds-img-value">
                  {t("attachToBegin")}
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
  const { lang, setLang, t } = useI18n();
  const stepsView: Step[] = useMemo(() => getSteps(lang), [lang]);

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

  const pct = Math.round(((current - 1) / TOTAL_SECTIONS) * 100);
  const stepView = stepsView.find((s) => s.id === current)!;

  const fmtSectionPill = (n: number) => t("sectionPill", { n });
  const fmtSectionPlain = (n: number) => t("sectionPlain", { n });

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
        body: JSON.stringify({ survey: data, lang }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(json.error || t("failedToGenerateReview"));
      setAiText(
        normalizeReviewText(json.text || t("unableToGenerateReviewTryAgain"))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("unknownError");
      setAiError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function goNext() {
    if (current === TOTAL_SECTIONS) {
      setIsReview(true);
      void generateReview();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setCurrent((c) => Math.min(TOTAL_SECTIONS, c + 1));
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
          <h1>
            {t("appTitle")}
          </h1>
          <p>
            {t("appSubtitle")}
          </p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <div className="button-group" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className={`ds-btn ds-btn-ghost btn-ghost ${lang === "en" ? "selected" : ""}`}
              onClick={() => {
                setLang("en");
              }}
              aria-pressed={lang === "en"}
              disabled={false}
            >
              EN
            </button>
            <button
              type="button"
              className={`ds-btn ds-btn-ghost btn-ghost ${lang === "pt" ? "selected" : ""}`}
              onClick={() => {
                setLang("pt");
              }}
              aria-pressed={lang === "pt"}
              disabled={false}
            >
              PT
            </button>
          </div>
        </div>
      </header>

      <div className="ds-progress-wrap">
        <div className="ds-progress-meta">
          <span className="ds-step-label">
            {isReview ? t("surveyComplete") : t("sectionOfTotal", { current, total: TOTAL_SECTIONS })}
          </span>
          <span className="ds-step-count">
            {isReview ? t("surveyCompletePct") : t("pctComplete", { pct })}
          </span>
        </div>
        <div className="ds-progress-bg">
          <div
            className="ds-progress-fill"
            style={{ width: isReview ? "100%" : `${pct}%` }}
          />
        </div>
      </div>

      <div className="ds-dots" aria-label={t("progressAriaLabel")}>
        {Array.from({ length: TOTAL_SECTIONS }, (_, idx) => {
          const n = idx + 1;
          const className =
            n < current ? "ds-dot done" : n === current ? "ds-dot active" : "ds-dot";
          return (
            <button
              key={n}
              type="button"
              className={className}
              title={fmtSectionPlain(n)}
              onClick={() => {
                if (!isReview && n <= current) setCurrent(n);
              }}
              aria-label={t("goToSection", { n })}
              disabled={isReview || n > current}
            />
          );
        })}
      </div>

      {!isReview ? (
        <section className="ds-card">
          <div className="ds-step-num">{fmtSectionPill(stepView.id)}</div>
          <h2>{stepView.title}</h2>
          <p className="ds-desc">{stepView.desc}</p>

          {stepView.questions.map((q, qi) => {
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
          <SectionImageAnalysis step={stepView} data={data} />
        </section>
      ) : (
        <section>
          <div className="ds-review-header">
            <h2>{t("reviewTitle")}</h2>
            <p>
              {t("reviewIntro")}
            </p>
          </div>
          <div className="ds-review-box">
            {isLoading ? (
              <div className="ds-loading">
                <div className="ds-spinner" />
                <span>{t("analysingSurveyData")}</span>
              </div>
            ) : aiError ? (
              <MarkdownLite text={`### ${t("errorHeading")}\n\n${aiError}`} />
            ) : aiText ? (
              <MarkdownLite text={aiText} />
            ) : (
              <MarkdownLite
                text={`### ${t("readyHeading")}\n\n${t("readyBody")}`}
              />
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              className="ds-btn ds-btn-review"
              type="button"
              onClick={() => void generateReview()}
              disabled={isLoading}
            >
              {t("generateFullAiReview")}
            </button>
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="ds-btn ds-btn-ghost" type="button" onClick={restartSurvey} style={{ width: "100%" }}>
              {t("startNewSurvey")}
            </button>
          </div>
        </section>
      )}

      {!isReview ? (
        <div className="ds-nav">
          <button className="ds-btn ds-btn-ghost" type="button" onClick={goBack} disabled={current === 1}>
            {t("back")}
          </button>
          <button
            className={`ds-btn ${current === TOTAL_SECTIONS ? "ds-btn-complete" : "ds-btn-primary"}`}
            type="button"
            onClick={goNext}
          >
            {current === TOTAL_SECTIONS ? t("completeSurvey") : t("next")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
