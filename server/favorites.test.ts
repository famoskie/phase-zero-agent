import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

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

vi.mock("./scraper", () => ({ scrapeUrl: vi.fn(), scrapeMultiPage: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/session", () => ({
  getOrCreateSessionId: vi.fn().mockReturnValue("sess-abc"),
  getSessionId: vi.fn().mockReturnValue("sess-abc"),
}));

import { getBriefById, toggleFavorite, setTags, getBriefsBySession } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mockGetBriefById = getBriefById as ReturnType<typeof vi.fn>;
const mockToggleFavorite = toggleFavorite as ReturnType<typeof vi.fn>;
const mockSetTags = setTags as ReturnType<typeof vi.fn>;
const mockGetBriefsBySession = getBriefsBySession as ReturnType<typeof vi.fn>;

function makeCtx(user?: TrpcContext["user"]): TrpcContext {
  return {
    user: user ?? null,
    req: { protocol: "https", headers: {}, cookies: { pz_session: "sess-abc" } } as any,
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
  };
}

describe("favorites.toggleFavorite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stars a brief owned by the session", async () => {
    mockGetBriefById.mockResolvedValue({ id: 10, userId: null, sessionId: "sess-abc", isFavorite: 0 });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.favorites.toggleFavorite({ id: 10, value: true });
    expect(result.isFavorite).toBe(true);
    expect(mockToggleFavorite).toHaveBeenCalledWith(10, 0, true);
  });

  it("throws FORBIDDEN when session does not own the brief", async () => {
    mockGetBriefById.mockResolvedValue({ id: 10, userId: null, sessionId: "other-session", isFavorite: 0 });
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.favorites.toggleFavorite({ id: 10, value: true })).rejects.toThrow(TRPCError);
  });
});

describe("favorites.setTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets normalized tags on a brief", async () => {
    mockGetBriefById.mockResolvedValue({ id: 5, userId: null, sessionId: "sess-abc" });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.favorites.setTags({ id: 5, tags: ["FinTech", "Series B", "FinTech"] });
    expect(result.tags).toEqual(["fintech", "series b"]);
    expect(mockSetTags).toHaveBeenCalledWith(5, 0, ["fintech", "series b"]);
  });

  it("throws FORBIDDEN when session does not own the brief", async () => {
    mockGetBriefById.mockResolvedValue({ id: 5, userId: null, sessionId: "other-session" });
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.favorites.setTags({ id: 5, tags: ["ai"] })).rejects.toThrow(TRPCError);
  });
});

describe("favorites.allTags", () => {
  it("returns deduplicated sorted tags across all session briefs", async () => {
    mockGetBriefsBySession.mockResolvedValue([
      { tags: JSON.stringify(["fintech", "saas"]) },
      { tags: JSON.stringify(["saas", "ai"]) },
      { tags: null },
    ]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.favorites.allTags();
    expect(result).toEqual(["ai", "fintech", "saas"]);
  });
});
