import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listJobs, getJob } from "../backend/src/services/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = req.url || "/api/jobs";

    const clientId = (req.headers["x-client-id"] as string) || process.env.DEFAULT_CLIENT_ID || "";
    if (!clientId) return res.status(400).json({ error: "missing client_id" });

    const apiToken = process.env.API_TOKEN;
    if (apiToken) {
      const h = (req.headers["authorization"] as string) || "";
      const token = h.startsWith("Bearer ") ? h.slice(7) : "";
      if (!token || token !== apiToken) return res.status(401).json({ error: "Unauthorized" });
    }

    // /api/jobs/:id
    const match = path.match(/\/api\/jobs\/?([^?\/]+)?/);
    const id = match && match[1];

    if (req.method === "GET" && id) {
      const job = await getJob(clientId, id);
      return res.status(200).json({ job });
    }

    if (req.method === "GET") {
      const jobs = await listJobs(clientId);
      return res.status(200).json({ jobs });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "internal error" });
  }
}