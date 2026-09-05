/* POST /api/ai/pdf — student PDF upload (Netlify Function).

   Same request/response contract as the local proxy server
   (server/server.mjs): the browser sends the raw PDF bytes
   (Content-Type: application/pdf, optional X-File-Name header) and receives
   { docId, name, pages, chars, truncated } to reference in /api/ai/ask. */
import type { Config } from "@netlify/functions";
import { runHandler } from "./_shared/ai";
import { handlePdfUpload } from "./_shared/pdf";

export default async (req: Request) => runHandler(handlePdfUpload(req));

export const config: Config = {
  path: "/api/ai/pdf",
  method: ["POST"],
  /* 12 uploads/minute per visitor — mirrors the local proxy server. */
  rateLimit: { windowLimit: 12, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
