/* POST /api/ai/ask — the AI Mentor chat endpoint (Netlify Function).

   Same request/response contract as the local proxy server
   (server/server.mjs): the browser posts { question, boardName, classLabel,
   subjectName, topic, docId?, history } and receives { answer }. The
   provider key is read from server-side environment variables, so it never
   reaches the frontend bundle. */
import type { Config } from "@netlify/functions";
import { handleAsk, runHandler } from "./_shared/ai";

export default async (req: Request) => runHandler(handleAsk(req));

export const config: Config = {
  path: "/api/ai/ask",
  method: ["POST"],
  /* 30 requests/minute per visitor — mirrors the local proxy server. */
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
