import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createJob, setJobRunning, setJobResult } from "../backend/src/services/supabase";
import { runClaude } from "../backend/src/services/claude";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const clientId = (req.headers["x-client-id"] as string) || process.env.DEFAULT_CLIENT_ID || "";
    if (!clientId) return res.status(400).json({ error: "missing client_id" });

    const { prompt } = (req.body as any) ?? {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt' (string)" });
    }

    const apiToken = process.env.API_TOKEN;
    if (apiToken) {
      const h = (req.headers["authorization"] as string) || "";
      const token = h.startsWith("Bearer ") ? h.slice(7) : "";
      if (!token || token !== apiToken) return res.status(401).json({ error: "Unauthorized" });
    }

    const job = await createJob(clientId, prompt);
    await setJobRunning(job.id);
    const result = await runClaude({ prompt });
    await setJobResult(job.id, result);

    return res.status(200).json({ id: job.id, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "internal error" });
  }
}