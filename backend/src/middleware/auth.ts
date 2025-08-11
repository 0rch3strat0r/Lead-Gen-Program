import type { Request, Response, NextFunction } from "express";

export function bearerAuth(apiToken?: string) {
  const enabled = !!apiToken;
  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) return next();
    const h = req.header("authorization") || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (token && token === apiToken) return next();
    res.status(401).json({ error: "Unauthorized" });
  };
}

export function resolveClientId(defaultClientId?: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const fromHeader = req.header("x-client-id");
    (req as any).client_id = (fromHeader && fromHeader.trim()) || defaultClientId || null;
    next();
  };
}