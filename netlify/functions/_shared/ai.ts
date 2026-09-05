/// <reference types="node" />
/* ═══════════════════════════════════════════════════════════════════════════
   MENTORA AI — SHARED BACKEND LOGIC FOR NETLIFY FUNCTIONS

   Netlify port of server/server.mjs (the local dev AI proxy). The React app
   calls the same three endpoints — POST /api/ai/ask, POST /api/ai/pdf and
   GET /api/ai/health — and the AI provider key stays server-side only: it
   lives in the site's environment variables, never in the repo or the
   browser bundle.

   Configure in Netlify (Site configuration > Environment variables):
     AI_API_KEY  — your provider key (required)
     AI_BASE_URL — OpenAI-compatible base URL (default: https://api.openai.com/v1)
     AI_MODEL    — model name (default: gpt-4o-mini)

   Works with OpenAI, Groq, OpenRouter, DeepSeek, Mistral, Ollama, LM Studio…

   Entry points: netlify/functions/ai-ask.ts · ai-pdf.ts · ai-health.ts
   (Files under _shared/ are bundled into each function; the underscore
   prefix keeps them from being deployed as functions themselves.)
═══════════════════════════════════════════════════════════════════════════ */
import { getStore } from "@netlify/blobs";

/* ── Configuration (read per cold start from the server environment) ────── */
const AI_BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const AI_MODEL    = process.env.AI_MODEL || "gpt-4o-mini";
const API_KEY     = process.env.AI_API_KEY || "";
export { API_KEY };

/* Netlify synchronous functions are capped at 60 s per request — abort the
   upstream call a little earlier so the friendly timeout message below can
   still be delivered to the student. */
const REQUEST_TIMEOUT_MS = 55_000;
const MAX_BODY_BYTES     = 100_000;

/* Uploaded PDF documents live in a named Blobs store so /api/ai/pdf and
   /api/ai/ask (separate function invocations) can share them. */
const DOC_STORE    = getStore("mentora-docs");
const MAX_PDF_DOCS = 60; // stored docs before the oldest is evicted

/* ── Helpers ─────────────────────────────────────────────────────────────── */
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function sendJSON(status: number, obj: unknown): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/* Maps thrown HttpErrors (and anything unexpected) to the same JSON error
   shape the local proxy server returns. */
export async function runHandler(handler: Promise<Response>): Promise<Response> {
  try {
    return await handler;
  } catch (err) {
    if (err instanceof HttpError) {
      return sendJSON(err.status, { error: err.message });
    }
    console.error("[mentora-functions] unexpected error:", err);
    return sendJSON(500, { error: "Unexpected server error. Please try again." });
  }
}

/* GET /api/ai/health — tells the frontend whether the AI is configured. */
export function aiStatus(): Response {
  return sendJSON(200, API_KEY
    ? { configured: true, model: AI_MODEL, baseUrl: AI_BASE_URL }
    : { configured: false, error: "AI_API_KEY is not set in the Netlify environment" });
}

/* Sanitize free-text/context fields coming from the browser. */
export function cleanLabel(v: unknown, max = 120): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

export interface ChatTurn { role: "user" | "assistant"; content: string }

export function cleanHistory(v: unknown): ChatTurn[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((m): m is ChatTurn => {
      if (!m || typeof m !== "object") return false;
      const role = (m as { role?: unknown }).role;
      const content = (m as { content?: unknown }).content;
      return typeof content === "string" && (role === "user" || role === "assistant");
    })
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

/* ── Prompt building ─────────────────────────────────────────────────────── */
export interface StudentContext {
  boardName:   string;
  classLabel:  string;
  subjectName: string;
  topic:       string;
}

export interface StoredDoc {
  name:  string;
  pages: number;
  chars: number;
  text:  string;
}

export function buildSystemPrompt(ctx: StudentContext, doc?: StoredDoc): string {
  const lines = [
    ctx.boardName   && `- Board: ${ctx.boardName}`,
    ctx.classLabel  && `- Class: ${ctx.classLabel}`,
    ctx.subjectName && `- Subject: ${ctx.subjectName}`,
    ctx.topic       && `- Topic: ${ctx.topic}`,
  ].filter(Boolean);
  const contextBlock = lines.length ? `\nSTUDENT CONTEXT (tailor every answer to this)\n${lines.join("\n")}\n` : "";

  const docBlock = doc
    ? `\nUPLOADED PDF DOCUMENT — "${doc.name}" (${doc.pages} page${doc.pages === 1 ? "" : "s"})
The student attached this document and expects answers grounded in it.
- When the question relates to the PDF, answer from the document content below
  and say it comes from their PDF. Quote or reference the relevant part.
- If the answer is not in the PDF, say so clearly, then help with your own knowledge.
- The text was extracted automatically, so occasional garbled characters are
  possible — use judgement and the surrounding context.
DOCUMENT CONTENT (may be truncated):
"""
${doc.text}
"""
`
    : "";

  return `You are Mentora AI, a warm, encouraging tutor for Pakistani board exam students.
${contextBlock}${docBlock}
HOW TO ANSWER
- Explain clearly and step by step, in simple, student-friendly language.
- Define technical terms the first time you use them.
- Use short paragraphs, numbered steps, or bullets — never a wall of text.
- Be supportive and celebrate effort; never scold.
- Prefer guiding students to discover answers over doing their homework for them,
  but when they are stuck, explain the full solution patiently.
- Match the student's language: reply in English by default; if they write in
  Urdu, reply in Urdu (technical terms may stay in English).
- Stay focused on the question, keep answers under ~350 words unless the student
  asks for more, and end with a small check-in or follow-up question when it helps.
- Only discuss educational topics appropriate for school students.`;
}

/* ── Upstream call (OpenAI-compatible chat completions) ─────────────────── */
export async function callAI(messages: Array<{ role: string; content: string }>): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: AI_MODEL, messages, temperature: 0.4, max_tokens: 900 }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[mentora-functions] upstream ${res.status}: ${detail.slice(0, 300)}`);
      if (res.status === 401 || res.status === 403) {
        throw new HttpError(502, "The AI provider rejected the API key — check the AI_API_KEY environment variable.");
      }
      if (res.status === 404) {
        throw new HttpError(502, "Model or endpoint not found — check the AI_MODEL and AI_BASE_URL environment variables.");
      }
      if (res.status === 429) {
        throw new HttpError(429, "The AI provider is rate-limiting requests. Wait a moment and try again.");
      }
      throw new HttpError(502, "The AI provider returned an error. Please try again in a moment.");
    }

    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new HttpError(502, "The AI returned an empty answer. Please try again.");
    return answer;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new HttpError(504, "The AI is taking too long to respond. Please try again.");
    }
    throw new HttpError(502, "Could not reach the AI provider. Check your internet connection and the AI_BASE_URL environment variable.");
  } finally {
    clearTimeout(timer);
  }
}

/* ── Uploaded PDF documents (Netlify Blobs; keyed by docId) ─────────────── */
/* docId = "<zero-padded timestamp>:<uuid>" — sorting keys lexicographically
   lists documents oldest-first, which drives the MAX_PDF_DOCS eviction below
   (mirrors the insertion-order eviction in server/server.mjs). */
async function listDocKeys(): Promise<string[]> {
  const { blobs } = await DOC_STORE.list();
  return blobs.map(b => b.key).sort();
}

export async function storeDoc(name: string, pages: number, text: string): Promise<string> {
  /* Evict the oldest entries once the store is at capacity. A failed listing
     must not block the upload — the cap is best-effort. */
  const keys = await listDocKeys().catch(() => [] as string[]);
  if (keys.length >= MAX_PDF_DOCS) {
    for (const key of keys.slice(0, keys.length - MAX_PDF_DOCS + 1)) {
      await DOC_STORE.delete(key).catch(() => undefined);
    }
  }
  const docId = `${String(Date.now()).padStart(15, "0")}:${crypto.randomUUID()}`;
  const doc: StoredDoc = { name, pages, chars: text.length, text };
  await DOC_STORE.set(docId, JSON.stringify(doc));
  return docId;
}

export async function getDoc(docId: unknown): Promise<StoredDoc | undefined> {
  if (typeof docId !== "string" || !docId) return undefined;
  /* Missing keys resolve to null at runtime even though the "text" overload
     is typed as string — the truthiness check below handles both. */
  const raw = await DOC_STORE.get(docId.slice(0, 64), { type: "text" });
  if (!raw) return undefined;
  try {
    const doc = JSON.parse(raw) as Partial<StoredDoc>;
    if (typeof doc?.text === "string" && typeof doc?.name === "string" && typeof doc?.pages === "number") {
      return doc as StoredDoc;
    }
  } catch {
    /* corrupted entry — treat as missing */
  }
  return undefined;
}

/* ── POST /api/ai/ask ────────────────────────────────────────────────────── */
export async function handleAsk(req: Request): Promise<Response> {
  if (!API_KEY) {
    throw new HttpError(503, "Mentora AI is not configured yet — add AI_API_KEY to the environment variables in Netlify (Site configuration > Environment variables) and redeploy.");
  }

  const rawBytes = new Uint8Array(await req.arrayBuffer().catch(() => new ArrayBuffer(0)));
  if (rawBytes.byteLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "Request is too large.");
  }
  const raw = new TextDecoder().decode(rawBytes);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    throw new HttpError(400, "Invalid request body.");
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 2000) : "";
  if (!question) {
    throw new HttpError(400, "Please include a question (up to 2000 characters).");
  }

  const ctx: StudentContext = {
    boardName:   cleanLabel(body.boardName),
    classLabel:  cleanLabel(body.classLabel),
    subjectName: cleanLabel(body.subjectName),
    topic:       cleanLabel(body.topic),
  };
  const history = cleanHistory(body.history);

  /* Optional: an uploaded PDF the answers should be grounded in. */
  const doc = body.docId ? await getDoc(body.docId) : undefined;
  if (body.docId && !doc) {
    throw new HttpError(404, "That uploaded PDF has expired or was not found — please upload it again.");
  }

  const messages = [
    { role: "system", content: buildSystemPrompt(ctx, doc) },
    ...history,
    { role: "user", content: question },
  ];

  const answer = await callAI(messages);
  return sendJSON(200, { answer });
}
