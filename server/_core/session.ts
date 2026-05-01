/**
 * Anonymous session helper.
 * Reads the session ID from the X-Session-Id request header.
 * The client generates and persists the session ID in localStorage,
 * then sends it with every request. This avoids cookie restrictions
 * (SameSite, third-party blocking, HttpOnly) across all browsers.
 */
import type { Request, Response } from "express";

const SESSION_HEADER = "x-session-id";

export function getOrCreateSessionId(req: Request, _res: Response): string {
  return getSessionId(req) ?? "";
}

export function getSessionId(req: Request): string | null {
  const header = req.headers[SESSION_HEADER];
  if (typeof header === "string" && header.length > 0) return header;
  return null;
}
