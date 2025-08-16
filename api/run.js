export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const clientId = (req.headers["x-client-id"]) || process.env.DEFAULT_CLIENT_ID || "";
    if (!clientId) return res.status(400).json({ error: "missing client_id" });

    const { prompt } = (req.body ?? {});
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt' (string)" });
    }

    const apiToken = process.env.API_TOKEN;
    if (apiToken) {
      const h = (req.headers["authorization"]) || "";
      const token = h.startsWith("Bearer ") ? h.slice(7) : "";
      if (!token || token !== apiToken) return res.status(401).json({ error: "Unauthorized" });
    }

    const supabaseSvc = await import("../backend/src/services/supabase.js");
    const claudeSvc = await import("../backend/src/services/claude.js");

    const job = await supabaseSvc.createJob(clientId, prompt);
    await supabaseSvc.setJobRunning(job.id);
    const result = await claudeSvc.runClaude({ prompt });
    await supabaseSvc.setJobResult(job.id, result);

    return res.status(200).json({ id: job.id, result });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "internal error" });
  }
}