/* GET /api/ai/health — reports whether the AI provider is configured
   (Netlify Function). The frontend uses this to show "AI Mentor online"
   vs "needs setup" in the UI, exactly like with the local proxy server. */
import type { Config } from "@netlify/functions";
import { aiStatus } from "./_shared/ai";

export default async () => aiStatus();

export const config: Config = {
  path: "/api/ai/health",
  method: ["GET"],
};
