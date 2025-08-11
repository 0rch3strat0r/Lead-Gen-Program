import { Router } from "express";
import {
  createJob, setJobRunning, setJobResult, setJobError,
  listJobs, getJob
} from "../services/supabase.js";
import { runClaude } from "../services/claude.js";

export const jobsRouter = Router();

// POST /api/run → create job → run LLM → store result
jobsRouter.post("/run", async (req, res) => {
  try {
    const client_id = (req as any).client_id;
    if (!client_id) return res.status(400).json({ error: "missing client_id (header X-Client-Id or DEFAULT_CLIENT_ID)" });

    const { prompt } = req.body ?? {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt' (string)" });
    }

    const job = await createJob(client_id, prompt);
    await setJobRunning(job.id);

    const result = await runClaude({ prompt });
    await setJobResult(job.id, result);

    return res.status(200).json({ id: job.id, result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "internal error" });
  }
});

// GET /api/jobs → list per client
jobsRouter.get("/jobs", async (req, res) => {
  try {
    const client_id = (req as any).client_id;
    if (!client_id) return res.status(400).json({ error: "missing client_id" });
    const jobs = await listJobs(client_id);
    res.json({ jobs });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "internal error" });
  }
});

// GET /api/jobs/:id → detail (per client)
jobsRouter.get("/jobs/:id", async (req, res) => {
  try {
    const client_id = (req as any).client_id;
    if (!client_id) return res.status(400).json({ error: "missing client_id" });
    const job = await getJob(client_id, req.params.id);
    res.json({ job });
  } catch (err: any) {
    res.status(404).json({ error: "not found" });
  }
});