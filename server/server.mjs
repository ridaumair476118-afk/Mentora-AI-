#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   MENTORA AI — SECURE AI PROXY SERVER (no dependencies, pure Node 18+)

   Why this exists: the AI provider key must NEVER live in frontend code.
   The React app calls this little server; the server holds the key in .env
   and forwards the request to any OpenAI-compatible chat API.

   Configure via mentora/.env (copy .env.example):
     AI_API_KEY     — your provider key (required)
     AI_BASE_URL    — OpenAI-compatible base URL (default: https://api.openai.com/v1)
     AI_MODEL       — model name (default: gpt-4o-mini)
     AI_SERVER_PORT — this server's port (default: 8788)

   Works with OpenAI, Groq, OpenRouter, DeepSeek, Mistral, Ollama, LM Studio…

   Run it with:  npm run server   (or: node server/server.mjs)
   The Vite dev server forwards /api/* here automatically (see vite.config.ts).
═══════════════════════════════════════════════════════════════════════════ */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* ── Tiny .env loader (KEY=VALUE lines; shell env vars take precedence) ──── */
function loadDotEnv() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  } catch {
    /* no .env — settings may still come from the shell */
  }
}
loadDotEnv();

const PORT               = Number(process.env.AI_SERVER_PORT || 8788);
const AI_BASE_URL        = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const AI_MODEL           = process.env.AI_MODEL || "gpt-4o-mini";
const API_KEY            = process.env.AI_API_KEY || "";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_BODY_BYTES     = 100_000;
const RATE_LIMIT         = 30;      // requests…
const RATE_WINDOW_MS     = 60_000;  // …per minute, per IP

/* PDF uploads (student documents for AI Q&A) */
const MAX_PDF_BYTES      = 15 * 1024 * 1024; // 15 MB
const MAX_PDF_DOC_CHARS  = 60_000;  // text cap sent to the AI (~15-20k tokens)
const MAX_PDF_DOCS       = 60;      // in-memory docs before the oldest is evicted
const PDF_RATE_LIMIT     = 12;      // uploads per minute, per IP

/* ── Helpers ─────────────────────────────────────────────────────────────── */
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, "Request is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", err => reject(new HttpError(400, `Could not read the request: ${err.message}`)));
  });
}

/* Binary variant for file uploads — returns the raw Buffer. */
function readBodyRaw(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new HttpError(413, `File is too large — please keep it under ${Math.round(maxBytes / (1024 * 1024))} MB.`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", err => reject(new HttpError(400, `Could not read the upload: ${err.message}`)));
  });
}

/* CORS: allow local/LAN origins only (the Vite proxy is same-origin anyway). */
function isAllowedOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i.test(origin)
    || /^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin);
}

function applyCORS(req, res) {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
}

function clientIP(req) {
  return req.socket.remoteAddress || "unknown";
}

/* Simple fixed-window rate limiter (in-memory; plenty for a local server). */
const buckets = new Map();
function isRateLimited(ip, limit = RATE_LIMIT) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.start > RATE_WINDOW_MS) {
    buckets.set(ip, { start: now, count: 1 });
    return false;
  }
  b.count += 1;
  return b.count > limit;
}

/* ── Uploaded PDF documents (in-memory; keyed by id) ────────────────────── */
const DOC_STORE = new Map(); // docId -> { name, pages, chars, text }

function storeDoc(name, pages, text) {
  if (DOC_STORE.size >= MAX_PDF_DOCS) {
    // Evict the oldest entry (Map preserves insertion order).
    DOC_STORE.delete(DOC_STORE.keys().next().value);
  }
  const docId = crypto.randomUUID();
  DOC_STORE.set(docId, { name, pages, chars: text.length, text });
  return docId;
}

function getDoc(docId) {
  if (typeof docId !== "string") return undefined;
  return DOC_STORE.get(docId.slice(0, 64));
}

/* Sanitize free-text/context fields coming from the browser. */
function cleanLabel(v, max = 120) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function cleanHistory(v) {
  if (!Array.isArray(v)) return [];
  return v
    .filter(m => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

/* ── Prompt building ──────────────────────────────────────────────────────── */
function buildSystemPrompt(ctx, doc) {
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
async function callAI(messages) {
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
      console.error(`[mentora-server] upstream ${res.status}: ${detail.slice(0, 300)}`);
      if (res.status === 401 || res.status === 403) {
        throw new HttpError(502, "The AI provider rejected the API key — check AI_API_KEY in mentora/.env.");
      }
      if (res.status === 404) {
        throw new HttpError(502, "Model or endpoint not found — check AI_MODEL and AI_BASE_URL in mentora/.env.");
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
    if (err?.name === "AbortError") {
      throw new HttpError(504, "The AI is taking too long to respond. Please try again.");
    }
    throw new HttpError(502, "Could not reach the AI provider. Check your internet connection and AI_BASE_URL in mentora/.env.");
  } finally {
    clearTimeout(timer);
  }
}

/* ── Route handlers ───────────────────────────────────────────────────────── */

/* POST /api/ai/pdf — accepts a raw PDF body, extracts its text and stores it.
   The browser sends the file bytes directly (Content-Type: application/pdf);
   the file never touches disk — parsed in memory and capped. */
async function handlePdfUpload(req, res) {
  if (!API_KEY) {
    throw new HttpError(503, "Mentora AI is not configured yet — add AI_API_KEY to mentora/.env (see .env.example) and restart the server (npm run server).");
  }

  let rawName = String(req.headers["x-file-name"] || "");
  try { rawName = decodeURIComponent(rawName); } catch { /* keep as-is if malformed */ }
  const name = cleanLabel(rawName, 120) || "document.pdf";

  const buf = await readBodyRaw(req, MAX_PDF_BYTES);
  if (buf.length === 0) {
    throw new HttpError(400, "The uploaded file is empty.");
  }
  const magic = buf.subarray(0, 5).toString("latin1");
  if (magic !== "%PDF-") {
    throw new HttpError(400, "That file doesn't look like a PDF — please choose a .pdf file.");
  }

  let pages;
  let text;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const extracted = await extractText(pdf, { mergePages: true });
    pages = pdf.numPages;
    text = (Array.isArray(extracted.text) ? extracted.text.join("\n\n") : String(extracted.text)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").replace(/[ \t]+/g, " ").trim();
  } catch {
    throw new HttpError(422, "Couldn't read that PDF — it may be corrupted, scanned (image-only), or password-protected.");
  }

  const truncated = text.length > MAX_PDF_DOC_CHARS;
  if (truncated) text = `${text.slice(0, MAX_PDF_DOC_CHARS)}\n\n[... document continues, truncated for length ...]`;

  if (text.replace(/\s+/g, "").length < 40) {
    throw new HttpError(422, "No readable text found in that PDF — scanned/image-only PDFs aren't supported yet. Try a text-based PDF.");
  }

  const docId = storeDoc(name, pages, text);
  sendJSON(res, 200, { docId, name, pages, chars: text.length, truncated });
}

async function handleAsk(req, res) {
  if (!API_KEY) {
    throw new HttpError(503, "Mentora AI is not configured yet — add AI_API_KEY to mentora/.env (see .env.example) and restart the server (npm run server).");
  }

  const raw = await readBody(req);
  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    throw new HttpError(400, "Invalid request body.");
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 2000) : "";
  if (!question) {
    throw new HttpError(400, "Please include a question (up to 2000 characters).");
  }

  const ctx = {
    boardName:   cleanLabel(body.boardName),
    classLabel:  cleanLabel(body.classLabel),
    subjectName: cleanLabel(body.subjectName),
    topic:       cleanLabel(body.topic),
  };
  const history = cleanHistory(body.history);

  /* Optional: an uploaded PDF the answers should be grounded in. */
  const doc = body.docId ? getDoc(body.docId) : undefined;
  if (body.docId && !doc) {
    throw new HttpError(404, "That uploaded PDF has expired or was not found — please upload it again.");
  }

  const messages = [
    { role: "system", content: buildSystemPrompt(ctx, doc) },
    ...history,
    { role: "user", content: question },
  ];

  const answer = await callAI(messages);
  sendJSON(res, 200, { answer });
}

/* ── HTTP server ──────────────────────────────────────────────────────────── */
const server = http.createServer(async (req, res) => {
  applyCORS(req, res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = (req.url || "/").split("?")[0];

  try {
    if (url === "/api/ai/health" && req.method === "GET") {
      sendJSON(res, 200, API_KEY
        ? { configured: true, model: AI_MODEL, baseUrl: AI_BASE_URL }
        : { configured: false, error: "AI_API_KEY is not set in mentora/.env" });
      return;
    }

    if (url === "/api/ai/pdf" && req.method === "POST") {
      if (isRateLimited(clientIP(req), PDF_RATE_LIMIT)) {
        sendJSON(res, 429, { error: "Too many uploads — please wait a moment and try again." });
        return;
      }
      await handlePdfUpload(req, res);
      return;
    }

    if (url === "/api/ai/ask" && req.method === "POST") {
      if (isRateLimited(clientIP(req))) {
        sendJSON(res, 429, { error: "Too many requests — please wait a moment and try again." });
        return;
      }
      await handleAsk(req, res);
      return;
    }

    if (url === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(
        "Mentora AI proxy server is running.\n\n" +
        `AI configured : ${API_KEY ? `yes (${AI_MODEL} @ ${AI_BASE_URL})` : "NO — add AI_API_KEY to mentora/.env"}\n` +
        "Endpoints     : GET /api/ai/health · POST /api/ai/ask · POST /api/ai/pdf\n"
      );
      return;
    }

    sendJSON(res, 404, { error: "Not found." });
  } catch (err) {
    if (err instanceof HttpError) {
      sendJSON(res, err.status, { error: err.message });
    } else {
      console.error("[mentora-server] unexpected error:", err);
      sendJSON(res, 500, { error: "Unexpected server error. Please try again." });
    }
  }
});

server.listen(PORT, () => {
  console.log(`Mentora AI proxy listening on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.log("  ! AI_API_KEY is not set — copy .env.example to .env, add your key, then restart.");
  } else {
    console.log(`  + AI configured: ${AI_MODEL} @ ${AI_BASE_URL}`);
  }
});
