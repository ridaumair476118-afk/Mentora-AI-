/* ═══════════════════════════════════════════════════════════════════════════
   MENTORA AI — PDF UPLOAD HANDLER (used by netlify/functions/ai-pdf.ts)

   POST /api/ai/pdf — accepts a raw PDF body, extracts its text and stores it
   in the Netlify Blobs store (see ./ai.ts) so /api/ai/ask can ground answers
   in it. The browser sends the file bytes directly
   (Content-Type: application/pdf); the file never touches disk — parsed in
   memory and capped, exactly like the local proxy server does.
═══════════════════════════════════════════════════════════════════════════ */
import { extractText, getDocumentProxy } from "unpdf";
import { API_KEY, HttpError, cleanLabel, sendJSON, storeDoc } from "./ai";

/* Netlify's buffered request payload for synchronous functions is 6 MB, and
   binary uploads are base64-encoded (~30% overhead), so ~4.5 MB is the real
   ceiling — stay under it so the friendly size error below is what students
   see, not a platform error. */
const MAX_PDF_BYTES     = 4 * 1024 * 1024; // 4 MB
const MAX_PDF_DOC_CHARS = 60_000;          // text cap sent to the AI (~15-20k tokens)

export async function handlePdfUpload(req: Request): Promise<Response> {
  if (!API_KEY) {
    throw new HttpError(503, "Mentora AI is not configured yet — add AI_API_KEY to the environment variables in Netlify (Site configuration > Environment variables) and redeploy.");
  }

  let rawName = req.headers.get("x-file-name") || "";
  try { rawName = decodeURIComponent(rawName); } catch { /* keep as-is if malformed */ }
  const name = cleanLabel(rawName, 120) || "document.pdf";

  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength === 0) {
    throw new HttpError(400, "The uploaded file is empty.");
  }
  if (buf.byteLength > MAX_PDF_BYTES) {
    throw new HttpError(413, `File is too large — please keep it under ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB.`);
  }
  const magic = new TextDecoder("latin1").decode(buf.subarray(0, 5));
  if (magic !== "%PDF-") {
    throw new HttpError(400, "That file doesn't look like a PDF — please choose a .pdf file.");
  }

  let pages: number;
  let text: string;
  try {
    const pdf = await getDocumentProxy(buf);
    const extracted = await extractText(pdf, { mergePages: true });
    pages = pdf.numPages;
    text = (Array.isArray(extracted.text) ? extracted.text.join("\n\n") : String(extracted.text))
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
  } catch {
    throw new HttpError(422, "Couldn't read that PDF — it may be corrupted, scanned (image-only), or password-protected.");
  }

  const truncated = text.length > MAX_PDF_DOC_CHARS;
  if (truncated) text = `${text.slice(0, MAX_PDF_DOC_CHARS)}\n\n[... document continues, truncated for length ...]`;

  if (text.replace(/\s+/g, "").length < 40) {
    throw new HttpError(422, "No readable text found in that PDF — scanned/image-only PDFs aren't supported yet. Try a text-based PDF.");
  }

  const docId = await storeDoc(name, pages, text);
  return sendJSON(200, { docId, name, pages, chars: text.length, truncated });
}
