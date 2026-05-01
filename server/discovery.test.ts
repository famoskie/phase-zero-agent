import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mock dependencies before importing the router ──────────────────────────
vi.mock("./scraper", () => ({
  scrapeUrl: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./db", () => ({
  insertBrief: vi.fn().mockResolvedValue(42),
  getBriefsByUser: vi.fn().mockResolvedValue([]),
  getBriefById: vi.fn(),
  deleteBrief: vi.fn(),
}));

import { scrapeUrl } from "./scraper";
import { invokeLLM } from "./_core/llm";
import { getBriefsByUser, insertBrief } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mockScrape = scrapeUrl as ReturnType<typeof vi.fn>;
const mockLLM = invokeLLM as ReturnType<typeof vi.fn>;
const mockInsert = insertBrief as ReturnType<typeof vi.fn>;
const mockGetBriefs = getBriefsByUser as ReturnType<typeof vi.fn>;

const MOCK_BRIEF_CONTENT = {
  companyName: "Acme Corp",
  valueProposition: "Acme builds widgets for enterprise teams.",
  userPainPoints: "Teams struggle with manual widget configuration.",
  aiOpportunities: "AI can automate widget setup and suggest configurations.",
  recommendedEngagement: "AI Expertise — Acme needs AI-powered automation.",
};

function makeCtx(user?: TrpcContext["user"]): TrpcContext {
  return {
    user: user ?? null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("discovery.generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a structured brief for a valid URL", async () => {
    mockScrape.mockResolvedValue("Acme Corp builds enterprise widgets. We help teams ship faster.");
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(MOCK_BRIEF_CONTENT) } }],
    });
    mockInsert.mockResolvedValue(42);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.discovery.generate({ url: "https://acme.com" });

    expect(result.companyName).toBe("Acme Corp");
    expect(result.valueProposition).toContain("widgets");
    expect(result.id).toBe(42);
    expect(mockScrape).toHaveBeenCalledWith("https://acme.com");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://acme.com", companyName: "Acme Corp" })
    );
  });

  it("associates brief with logged-in user", async () => {
    mockScrape.mockResolvedValue("Some content that is long enough to pass the check.");
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(MOCK_BRIEF_CONTENT) } }],
    });

    const user: TrpcContext["user"] = {
      id: 7,
      openId: "user-7",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const caller = appRouter.createCaller(makeCtx(user));
    await caller.discovery.generate({ url: "https://acme.com" });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7 })
    );
  });

  it("throws BAD_REQUEST when scraper returns too little content", async () => {
    mockScrape.mockResolvedValue("tiny");

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.discovery.generate({ url: "https://acme.com" })).rejects.toThrow(
      TRPCError
    );
  });

  it("throws BAD_REQUEST when scraper fails", async () => {
    mockScrape.mockRejectedValue(new Error("Connection refused"));

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.discovery.generate({ url: "https://acme.com" })).rejects.toThrow(
      TRPCError
    );
  });

  it("rejects invalid URLs", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.discovery.generate({ url: "not-a-url" })).rejects.toThrow();
  });
});

describe("discovery.list", () => {
  it("returns briefs for authenticated user", async () => {
    const mockBriefs = [
      { id: 1, userId: 5, url: "https://example.com", companyName: "Example", createdAt: new Date() },
    ];
    mockGetBriefs.mockResolvedValue(mockBriefs);

    const user: TrpcContext["user"] = {
      id: 5,
      openId: "user-5",
      name: "Alice",
      email: "alice@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const caller = appRouter.createCaller(makeCtx(user));
    const result = await caller.discovery.list();

    expect(result).toEqual(mockBriefs);
    expect(mockGetBriefs).toHaveBeenCalledWith(5);
  });

  it("throws UNAUTHORIZED for unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.discovery.list()).rejects.toThrow(TRPCError);
  });
});
