import "dotenv/config";
import express from "express";
import cors from "cors";
import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { bearerAuth, resolveClientId } from "./middleware/auth.js";
import { jobsRouter } from "./routes/jobs.js";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const app = express();

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
  })
);

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

// Health
app.get("/healthz", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Tenant + auth middleware
app.use(resolveClientId(process.env.DEFAULT_CLIENT_ID));
app.use("/api", bearerAuth(process.env.API_TOKEN), jobsRouter);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => logger.info({ port }, "server started"));