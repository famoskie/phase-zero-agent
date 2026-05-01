import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getBriefById,
  getBriefsByUser,
  getBriefsByUserFiltered,
  setTags,
  toggleFavorite,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const favoritesRouter = router({
  // Toggle star on a brief
  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.number(), value: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const brief = await getBriefById(input.id);
      if (!brief) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
      if (brief.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this brief" });
      }
      await toggleFavorite(input.id, ctx.user.id, input.value);
      return { success: true, isFavorite: input.value };
    }),

  // Set the full tags array for a brief
  setTags: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        tags: z.array(z.string().min(1).max(32)).max(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const brief = await getBriefById(input.id);
      if (!brief) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
      if (brief.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this brief" });
      }
      // Normalize: lowercase, trim, deduplicate
      const normalized = Array.from(new Set(input.tags.map((t) => t.toLowerCase().trim())));
      await setTags(input.id, ctx.user.id, normalized);
      return { success: true, tags: normalized };
    }),

  // List briefs with optional filter
  listFiltered: protectedProcedure
    .input(
      z.object({
        favoritesOnly: z.boolean().optional(),
        tag: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!input.favoritesOnly && !input.tag) {
        return getBriefsByUser(ctx.user.id);
      }
      return getBriefsByUserFiltered(ctx.user.id, {
        favoritesOnly: input.favoritesOnly,
        tag: input.tag,
      });
    }),

  // Get all unique tags used by this user (for the filter pill list)
  allTags: protectedProcedure.query(async ({ ctx }) => {
    const briefs = await getBriefsByUser(ctx.user.id);
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
