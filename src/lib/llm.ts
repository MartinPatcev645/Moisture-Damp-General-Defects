type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

type OpenRouterChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string };
};

function isRetriableUpstreamStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}

function uniqNonEmpty(list: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const v = raw.trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function parseCsvEnv(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function geminiModelList() {
  const primary = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const fallbacks = parseCsvEnv("GEMINI_MODEL_FALLBACKS");
  // A reasonable built-in ladder (kept last so user overrides win).
  const defaults = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ];
  return uniqNonEmpty([primary, ...fallbacks, ...defaults]);
}

function looksLikeModelIssue(status: number, msg: string) {
  if (status === 404) return true;
  if (status !== 400) return false;
  const m = msg.toLowerCase();
  return m.includes("model") && (m.includes("not found") || m.includes("unknown") || m.includes("does not exist"));
}

function textFromGemini(json: GeminiGenerateContentResponse) {
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("").trim();
}

function textFromOpenRouter(json: OpenRouterChatCompletionResponse) {
  return (json?.choices?.[0]?.message?.content ?? "").trim();
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export type LlmProviderUsed = "gemini" | "openrouter";

export async function generateTextWithFallback(prompt: string): Promise<{ text: string; provider: LlmProviderUsed }> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || "";
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || "";

  const canUseGemini = !!geminiKey;
  const canUseOpenRouter = !!openRouterKey;

  if (!canUseGemini && !canUseOpenRouter) {
    throw new Error("No LLM API key configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY in .env.local.");
  }

  // Prefer Gemini if available, otherwise OpenRouter.
  const order: Array<LlmProviderUsed> = canUseGemini ? ["gemini", "openrouter"] : ["openrouter", "gemini"];

  let lastErr: unknown = null;

  for (const provider of order) {
    if (provider === "gemini") {
      if (!canUseGemini) continue;
      try {
        const models = geminiModelList();
        for (const model of models) {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            model,
          )}:generateContent?key=${encodeURIComponent(geminiKey)}`;

          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
            }),
          });

          const json = (await safeJson(res)) as GeminiGenerateContentResponse | null;
          if (!res.ok) {
            const msg = json?.error?.message || `Gemini API error (status ${res.status}).`;
            // Try next Gemini model on rate-limit, 5xx, or obvious model-name issue.
            if (isRetriableUpstreamStatus(res.status) || looksLikeModelIssue(res.status, msg)) {
              lastErr = new Error(`${msg} (model: ${model})`);
              continue;
            }
            throw new Error(`${msg} (model: ${model})`);
          }

          const text = json ? textFromGemini(json) : "";
          return { text: text || "No text returned from Gemini.", provider: "gemini" };
        }

        // All Gemini models failed: fall through to OpenRouter if available.
        if (canUseOpenRouter) continue;
        throw lastErr instanceof Error ? lastErr : new Error("Gemini request failed.");
      } catch (e) {
        lastErr = e;
        if (canUseOpenRouter) continue;
        throw e instanceof Error ? e : new Error("Gemini request failed.");
      }
    }

    if (provider === "openrouter") {
      if (!canUseOpenRouter) continue;
      try {
        const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${openRouterKey}`,
            ...(process.env.OPENROUTER_SITE_URL ? { "http-referer": process.env.OPENROUTER_SITE_URL } : {}),
            ...(process.env.OPENROUTER_APP_NAME ? { "x-title": process.env.OPENROUTER_APP_NAME } : {}),
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 4096,
          }),
        });

        const json = (await safeJson(res)) as OpenRouterChatCompletionResponse | null;
        if (!res.ok) {
          const msg = json?.error?.message || `OpenRouter API error (status ${res.status}).`;
          if (isRetriableUpstreamStatus(res.status) && canUseGemini) {
            lastErr = new Error(msg);
            continue;
          }
          throw new Error(msg);
        }

        const text = json ? textFromOpenRouter(json) : "";
        return { text: text || "No text returned from OpenRouter.", provider: "openrouter" };
      } catch (e) {
        lastErr = e;
        if (canUseGemini) continue;
        throw e instanceof Error ? e : new Error("OpenRouter request failed.");
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("LLM request failed.");
}

export async function generateVisionWithFallback(args: {
  prompt: string;
  mimeType: string;
  base64Data: string;
}): Promise<{ text: string; provider: LlmProviderUsed; retryAfter?: string | null; upstreamStatus?: number }> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || "";
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || "";

  const canUseGemini = !!geminiKey;
  const canUseOpenRouter = !!openRouterKey;

  if (!canUseGemini && !canUseOpenRouter) {
    throw new Error("No LLM API key configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY in .env.local.");
  }

  const order: Array<LlmProviderUsed> = canUseGemini ? ["gemini", "openrouter"] : ["openrouter", "gemini"];
  let lastErr: unknown = null;

  for (const provider of order) {
    if (provider === "gemini") {
      if (!canUseGemini) continue;
      try {
        const models = geminiModelList();
        for (const model of models) {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            model,
          )}:generateContent?key=${encodeURIComponent(geminiKey)}`;

          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: args.prompt },
                    { inline_data: { mime_type: args.mimeType, data: args.base64Data } },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
                // Vision JSON can occasionally get truncated; allow more room.
                maxOutputTokens: 4096,
              },
            }),
          });

          const retryAfter = res.headers.get("retry-after");
          const json = (await safeJson(res)) as GeminiGenerateContentResponse | null;
          if (!res.ok) {
            const msg = json?.error?.message || `Gemini API error (status ${res.status}).`;

            // Try next Gemini model on rate-limit, 5xx, or obvious model-name issue.
            if (isRetriableUpstreamStatus(res.status) || looksLikeModelIssue(res.status, msg)) {
              lastErr = new Error(`${msg} (model: ${model})`);
              continue;
            }

            const err = new Error(`${msg} (model: ${model})`);
            const typedErr = err as Error & { upstreamStatus?: number; retryAfter?: string | null };
            typedErr.upstreamStatus = res.status;
            typedErr.retryAfter = retryAfter;
            throw typedErr;
          }

          const text = json ? textFromGemini(json) : "";
          return { text: text || "No analysis text returned from Gemini.", provider: "gemini" };
        }

        if (canUseOpenRouter) continue;
        throw lastErr instanceof Error ? lastErr : new Error("Gemini vision request failed.");
      } catch (e) {
        lastErr = e;
        if (canUseOpenRouter) continue;
        throw e instanceof Error ? e : new Error("Gemini vision request failed.");
      }
    }

    if (provider === "openrouter") {
      if (!canUseOpenRouter) continue;
      try {
        const model = process.env.OPENROUTER_VISION_MODEL ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
        const imageUrl = `data:${args.mimeType};base64,${args.base64Data}`;
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${openRouterKey}`,
            ...(process.env.OPENROUTER_SITE_URL ? { "http-referer": process.env.OPENROUTER_SITE_URL } : {}),
            ...(process.env.OPENROUTER_APP_NAME ? { "x-title": process.env.OPENROUTER_APP_NAME } : {}),
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: args.prompt },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              },
            ],
            temperature: 0.2,
            max_tokens: 2048,
          }),
        });

        const retryAfter = res.headers.get("retry-after");
        const json = (await safeJson(res)) as OpenRouterChatCompletionResponse | null;
        if (!res.ok) {
          const msg = json?.error?.message || `OpenRouter API error (status ${res.status}).`;
          if (isRetriableUpstreamStatus(res.status) && canUseGemini) {
            lastErr = new Error(msg);
            continue;
          }
          const err = new Error(msg);
          const typedErr = err as Error & { upstreamStatus?: number; retryAfter?: string | null };
          typedErr.upstreamStatus = res.status;
          typedErr.retryAfter = retryAfter;
          throw typedErr;
        }

        const text = json ? textFromOpenRouter(json) : "";
        return { text: text || "No analysis text returned from OpenRouter.", provider: "openrouter" };
      } catch (e) {
        lastErr = e;
        if (canUseGemini) continue;
        throw e instanceof Error ? e : new Error("OpenRouter vision request failed.");
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Vision LLM request failed.");
}

