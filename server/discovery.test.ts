import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./scraper", () => ({
  scrapeUrl: vi.fn(),
  scrapeMultiPage: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./db", () => ({
  insertBrief: vi.fn().mockResolvedValue(42),
  getBriefsByUser: vi.fn().mockResolvedValue([]),
  getBriefsBySession: vi.fn().mockResolvedValue([]),
  getBriefsBySessionFiltered: vi.fn().mockResolvedValue([]),
  getBriefsByUserFiltered: vi.fn().mockResolvedValue([]),
  getBriefById: vi.fn(),
  deleteBrief: vi.fn(),
  updateBrief: vi.fn().mockResolvedValue(undefined),
  getBriefByToken: vi.fn(),
  setShareToken: vi.fn().mockResolvedValue(undefined),
  toggleFavorite: vi.fn().mockResolvedValue(undefined),
  setTags: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/session", () => ({
  getOrCreateSessionId: vi.fn().mockReturnValue("test-session-123"),
  getSessionId: vi.fn().mockReturnValue("test-session-123"),
}));

import { scrapeMultiPage } from "./scraper";
import { invokeLLM } from "./_core/llm";
import { getBriefsBySession, insertBrief, getBriefById, getBriefByToken, updateBrief } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mockScrapeMulti = scrapeMultiPage as ReturnType<typeof vi.fn>;
const mockLLM = invokeLLM as ReturnType<typeof vi.fn>;
const mockInsert = insertBrief as ReturnType<typeof vi.fn>;
const mockGetBriefsBySession = getBriefsBySession as ReturnType<typeof vi.fn>;
const mockGetBriefById = getBriefById as ReturnType<typeof vi.fn>;
const mockGetBriefByToken = getBriefByToken as ReturnType<typeof vi.fn>;
const mockUpdateBrief = updateBrief as ReturnType<typeof vi.fn>;

const MOCK_SCRAPE_RESULT = {
  content: "Acme Corp builds enterprise widgets. We help teams ship faster. Founded in 2015.",
  pagesScraped: 2,
  pagesSummary: "homepage, /about",
};

const MOCK_BRIEF_CONTENT = {
  companyName: "Acme Corp",
  valueProposition: "Acme builds widgets for enterprise teams.",
  userPainPoints: "Teams struggle with manual widget configuration.",
  aiOpportunities: "AI can automate widget setup and suggest configurations.",
  recommendedEngagement: "AI Expertise — Acme needs AI-powered automation.",
  foundedYear: "2015",
  employeeCount: "50-200",
  fundingStage: "Series B",
  industry: "Enterprise SaaS",
  headquarters: "San Francisco, USA",
  businessModel: "B2B SaaS",
  techStack: "React, Python, AWS",
  revenueModel: "Subscription",
  metricsConfidence: {
    foundedYear: "explicit",
    employeeCount: "inferred",
    fundingStage: "inferred",
    industry: "explicit",
    headquarters: "unknown",
    businessModel: "explicit",
    techStack: "inferred",
    revenueModel: "explicit",
  },
};

function makeCtx(user?: TrpcContext["user"]): TrpcContext {
  return {
    user: user ?? null,
    req: { protocol: "https", headers: {}, cookies: { pz_session: "test-session-123" } } as any,
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
  };
}

describe("discovery.generate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a structured brief with metrics for a valid URL", async () => {
    mockScrapeMulti.mockResolvedValue(MOCK_SCRAPE_RESULT);
    mockLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(MOCK_BRIEF_CONTENT) } }] });
    mockInsert.mockResolvedValue(42);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.discovery.generate({ url: "https://acme.com" });

    expect(result.companyName).toBe("Acme Corp");
    expect(result.id).toBe(42);
    expect(result.pagesScraped).toBe(2);
    expect((result.metricsConfidence as any).foundedYear).toBe("explicit");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://acme.com", sessionId: "test-session-123" })
    );
  });

  it("throws BAD_REQUEST when scraper returns too little content", async () => {
    mockScrapeMulti.mockResolvedValue({ content: "tiny", pagesScraped: 1, pagesSummary: "homepage" });
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.discovery.generate({ url: "https://acme.com" })).rejects.toThrow(TRPCError);
  });

  it("throws BAD_REQUEST when scraper fails", async () => {
    mockScrapeMulti.mockRejectedValue(new Error("Connection refused"));
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.discovery.generate({ url: "https://acme.com" })).rejects.toThrow(TRPCError);
  });

  it("rejects invalid URLs", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.discovery.generate({ url: "not-a-url" })).rejects.toThrow();
  });
});

describe("discovery.list", () => {
  it("returns briefs for the current session", async () => {
    const mockBriefs = [{ id: 1, sessionId: "test-session-123", url: "https://example.com", companyName: "Example" }];
    mockGetBriefsBySession.mockResolvedValue(mockBriefs);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.discovery.list();
    expect(result).toEqual(mockBriefs);
  });
});

describe("discovery.regenerate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates an existing brief owned by the session", async () => {
    mockGetBriefById.mockResolvedValue({ id: 5, userId: null, sessionId: "test-session-123", url: "https://acme.com" });
    mockScrapeMulti.mockResolvedValue(MOCK_SCRAPE_RESULT);
    mockLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(MOCK_BRIEF_CONTENT) } }] });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.discovery.regenerate({ id: 5 });

    expect(result.companyName).toBe("Acme Corp");
    expect(mockUpdateBrief).toHaveBeenCalledWith(5, expect.objectContaining({ companyName: "Acme Corp" }));
  });

  it("throws FORBIDDEN when session does not own the brief", async () => {
    mockGetBriefById.mockResolvedValue({ id: 5, userId: null, sessionId: "other-session-999", url: "https://acme.com" });

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.discovery.regenerate({ id: 5 })).rejects.toThrow(TRPCError);
  });
});

describe("discovery.getByToken", () => {
  it("returns brief for valid token", async () => {
    mockGetBriefByToken.mockResolvedValue({ id: 7, shareToken: "abc123", companyName: "Acme" });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.discovery.getByToken({ token: "abc123" });
    expect(result.companyName).toBe("Acme");
  });

  it("throws NOT_FOUND for invalid token", async () => {
    mockGetBriefByToken.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.discovery.getByToken({ token: "bad" })).rejects.toThrow(TRPCError);
  });
});
