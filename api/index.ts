import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "../backend/src/server";

export default function api(req: VercelRequest, res: VercelResponse) {
  return (handler as any)(req as any, res as any);
}