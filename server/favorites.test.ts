import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./db", () => ({
  insertBrief: vi.fn().mockResolvedValue(42),
  getBriefsByUser: vi.fn().mockResolvedValue([]),
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

import { getBriefById, toggleFavorite, setTags, getBriefsByUser } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mockGetBriefById = getBriefById as ReturnType<typeof vi.fn>;
const mockToggleFavorite = toggleFavorite as ReturnType<typeof vi.fn>;
const mockSetTags = setTags as ReturnType<typeof vi.fn>;
const mockGetBriefsByUser = getBriefsByUser as ReturnType<typeof vi.fn>;

function makeUser(id = 1): TrpcContext["user"] {
  return {
    id, openId: `user-${id}`, name: "Test", email: "test@example.com",
    loginMethod: "manus", role: "user",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
}

function makeCtx(user?: TrpcContext["user"]): TrpcContext {
  return {
    user: user ?? null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("favorites.toggleFavorite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stars a brief owned by the user", async () => {
    mockGetBriefById.mockResolvedValue({ id: 10, userId: 1, isFavorite: 0 });
    const caller = appRouter.createCaller(makeCtx(makeUser(1)));
    const result = await caller.favorites.toggleFavorite({ id: 10, value: true });
    expect(result.isFavorite).toBe(true);
    expect(mockToggleFavorite).toHaveBeenCalledWith(10, 1, true);
  });

  it("unstars a brief", async () => {
    mockGetBriefById.mockResolvedValue({ id: 10, userId: 1, isFavorite: 1 });
    const caller = appRouter.createCaller(makeCtx(makeUser(1)));
    const result = await caller.favorites.toggleFavorite({ id: 10, value: false });
    expect(result.isFavorite).toBe(false);
  });

  it("throws FORBIDDEN when user does not own the brief", async () => {
    mockGetBriefById.mockResolvedValue({ id: 10, userId: 99, isFavorite: 0 });
    const caller = appRouter.createCaller(makeCtx(makeUser(1)));
    await expect(caller.favorites.toggleFavorite({ id: 10, value: true })).rejects.toThrow(TRPCError);
  });

  it("throws UNAUTHORIZED for unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.favorites.toggleFavorite({ id: 10, value: true })).rejects.toThrow(TRPCError);
  });
});

describe("favorites.setTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets normalized tags on a brief", async () => {
    mockGetBriefById.mockResolvedValue({ id: 5, userId: 1 });
    const caller = appRouter.createCaller(makeCtx(makeUser(1)));
    const result = await caller.favorites.setTags({ id: 5, tags: ["FinTech", "Series B", "FinTech"] });
    // Deduplication and lowercasing (spaces preserved by server, normalized to lowercase)
    expect(result.tags).toEqual(["fintech", "series b"]);
    expect(mockSetTags).toHaveBeenCalledWith(5, 1, ["fintech", "series b"]);
  });

  it("throws FORBIDDEN when user does not own the brief", async () => {
    mockGetBriefById.mockResolvedValue({ id: 5, userId: 99 });
    const caller = appRouter.createCaller(makeCtx(makeUser(1)));
    await expect(caller.favorites.setTags({ id: 5, tags: ["ai"] })).rejects.toThrow(TRPCError);
  });
});

describe("favorites.allTags", () => {
  it("returns deduplicated sorted tags across all user briefs", async () => {
    mockGetBriefsByUser.mockResolvedValue([
      { tags: JSON.stringify(["fintech", "saas"]) },
      { tags: JSON.stringify(["saas", "ai"]) },
      { tags: null },
    ]);
    const caller = appRouter.createCaller(makeCtx(makeUser(1)));
    const result = await caller.favorites.allTags();
    expect(result).toEqual(["ai", "fintech", "saas"]);
  });
});
