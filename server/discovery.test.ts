import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mock dependencies before importing the router ──────────────────────────
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
  getBriefById: vi.fn(),
  deleteBrief: vi.fn(),
  updateBrief: vi.fn().mockResolvedValue(undefined),
  getBriefByToken: vi.fn(),
  setShareToken: vi.fn().mockResolvedValue(undefined),
}));

import { scrapeUrl, scrapeMultiPage } from "./scraper";
import { invokeLLM } from "./_core/llm";
import { getBriefsByUser, insertBrief, getBriefById, getBriefByToken, updateBrief } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mockScrape = scrapeUrl as ReturnType<typeof vi.fn>;
const mockScrapeMulti = scrapeMultiPage as ReturnType<typeof vi.fn>;
const mockLLM = invokeLLM as ReturnType<typeof vi.fn>;
const mockInsert = insertBrief as ReturnType<typeof vi.fn>;
const mockGetBriefs = getBriefsByUser as ReturnType<typeof vi.fn>;
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("discovery.generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a structured brief for a valid URL", async () => {
    mockScrapeMulti.mockResolvedValue(MOCK_SCRAPE_RESULT);
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(MOCK_BRIEF_CONTENT) } }],
    });
    mockInsert.mockResolvedValue(42);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.discovery.generate({ url: "https://acme.com" });

    expect(result.companyName).toBe("Acme Corp");
    expect(result.valueProposition).toContain("widgets");
    expect(result.id).toBe(42);
    // Metrics
    expect(result.foundedYear).toBe("2015");
    expect(result.employeeCount).toBe("50-200");
    expect(result.fundingStage).toBe("Series B");
    expect(result.industry).toBe("Enterprise SaaS");
    expect(result.headquarters).toBe("San Francisco, USA");
    expect(result.businessModel).toBe("B2B SaaS");
    expect(result.techStack).toBe("React, Python, AWS");
    expect(result.revenueModel).toBe("Subscription");
    expect(result.pagesScraped).toBe(2);
    expect(result.metricsConfidence).toBeDefined();
    expect((result.metricsConfidence as any).foundedYear).toBe("explicit");
    expect(mockScrapeMulti).toHaveBeenCalledWith("https://acme.com");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://acme.com", companyName: "Acme Corp" })
    );
  });

  it("associates brief with logged-in user", async () => {
    mockScrapeMulti.mockResolvedValue({ content: "Some content that is long enough to pass the check.", pagesScraped: 1, pagesSummary: "homepage" });
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
    mockScrapeMulti.mockResolvedValue({ content: "tiny", pagesScraped: 1, pagesSummary: "homepage" });

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.discovery.generate({ url: "https://acme.com" })).rejects.toThrow(
      TRPCError
    );
  });

  it("throws BAD_REQUEST when scraper fails", async () => {
    mockScrapeMulti.mockRejectedValue(new Error("Connection refused"));

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

describe("discovery.regenerate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates an existing brief and returns fresh data", async () => {
    const user: TrpcContext["user"] = {
      id: 3, openId: "user-3", name: "Bob", email: "bob@example.com",
      loginMethod: "manus", role: "user", createdAt: new Date(),
      updatedAt: new Date(), lastSignedIn: new Date(),
    };
    mockGetBriefById.mockResolvedValue({ id: 5, userId: 3, url: "https://acme.com", companyName: "Acme" });
    mockScrapeMulti.mockResolvedValue(MOCK_SCRAPE_RESULT);
    mockLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(MOCK_BRIEF_CONTENT) } }] });

    const caller = appRouter.createCaller(makeCtx(user));
    const result = await caller.discovery.regenerate({ id: 5 });

    expect(result.companyName).toBe("Acme Corp");
    expect(mockUpdateBrief).toHaveBeenCalledWith(5, expect.objectContaining({ companyName: "Acme Corp" }));
  });

  it("throws FORBIDDEN when user does not own the brief", async () => {
    const user: TrpcContext["user"] = {
      id: 99, openId: "user-99", name: "Eve", email: "eve@example.com",
      loginMethod: "manus", role: "user", createdAt: new Date(),
      updatedAt: new Date(), lastSignedIn: new Date(),
    };
    mockGetBriefById.mockResolvedValue({ id: 5, userId: 3, url: "https://acme.com" });

    const caller = appRouter.createCaller(makeCtx(user));
    await expect(caller.discovery.regenerate({ id: 5 })).rejects.toThrow(TRPCError);
  });
});

describe("discovery.getByToken", () => {
  it("returns brief for valid token", async () => {
    const mockBrief = { id: 7, shareToken: "abc123", companyName: "Acme" };
    mockGetBriefByToken.mockResolvedValue(mockBrief);

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
