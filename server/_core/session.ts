/**
 * Anonymous session helper.
 * Generates a persistent session ID cookie for unauthenticated users
 * so they can own their briefs without logging in.
 */
import type { Request, Response } from "express";
import { nanoid } from "nanoid";

const SESSION_COOKIE = "pz_session";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function getOrCreateSessionId(req: Request, res: Response): string {
  const existing = (req.cookies as Record<string, string>)?.[SESSION_COOKIE];
  if (existing && existing.length > 0) return existing;

  const id = nanoid(32);
  res.cookie(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: ONE_YEAR_MS,
    path: "/",
  });
  return id;
}

export function getSessionId(req: Request): string | null {
  return (req.cookies as Record<string, string>)?.[SESSION_COOKIE] ?? null;
}
