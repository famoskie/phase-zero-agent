import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getBriefById,
  getBriefsBySession,
  getBriefsBySessionFiltered,
  setTags,
  toggleFavorite,
} from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { getSessionId } from "../_core/session";

function getOwnerSessionId(ctx: { req: any; user: any }): string | null {
  return getSessionId(ctx.req);
}

async function assertOwnership(briefId: number, ctx: { req: any; user: any }) {
  const brief = await getBriefById(briefId);
  if (!brief) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
  const sessionId = getOwnerSessionId(ctx);
  const isOwner =
    (ctx.user && brief.userId === ctx.user.id) ||
    (sessionId && brief.sessionId === sessionId);
  if (!isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this brief" });
  return brief;
}

export const favoritesRouter = router({
  toggleFavorite: publicProcedure
    .input(z.object({ id: z.number(), value: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const brief = await assertOwnership(input.id, ctx);
      await toggleFavorite(input.id, ctx.user?.id ?? 0, input.value);
      return { success: true, isFavorite: input.value };
    }),

  setTags: publicProcedure
    .input(z.object({ id: z.number(), tags: z.array(z.string().min(1).max(32)).max(10) }))
    .mutation(async ({ input, ctx }) => {
      await assertOwnership(input.id, ctx);
      const normalized = Array.from(new Set(input.tags.map((t) => t.toLowerCase().trim())));
      await setTags(input.id, ctx.user?.id ?? 0, normalized);
      return { success: true, tags: normalized };
    }),

  listFiltered: publicProcedure
    .input(z.object({ favoritesOnly: z.boolean().optional(), tag: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const sessionId = getOwnerSessionId(ctx);
      if (!sessionId) return [];
      if (!input.favoritesOnly && !input.tag) {
        return getBriefsBySession(sessionId);
      }
      return getBriefsBySessionFiltered(sessionId, {
        favoritesOnly: input.favoritesOnly,
        tag: input.tag,
      });
    }),

  allTags: publicProcedure.query(async ({ ctx }) => {
    const sessionId = getOwnerSessionId(ctx);
    if (!sessionId) return [];
    const briefs = await getBriefsBySession(sessionId);
    const tagSet = new Set<string>();
    for (const b of briefs) {
      if (b.tags) {
        try {
          const t: string[] = JSON.parse(b.tags);
          t.forEach((tag) => tagSet.add(tag));
        } catch { /* ignore */ }
      }
    }
    return Array.from(tagSet).sort();
  }),
});
