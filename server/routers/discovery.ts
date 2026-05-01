import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { deleteBrief, getBriefById, getBriefsByUser, insertBrief } from "../db";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { scrapeUrl } from "../scraper";

const FLUXON_SERVICES = [
  "AI Expertise",
  "Full Product Build",
  "UX & UI Design",
  "Interim CPO/CTO",
  "Product Strategy",
  "Staff Augmentation",
  "MVP Development",
  "Go to Market",
];

const briefSchema = z.object({
  companyName: z.string(),
  valueProposition: z.string(),
  userPainPoints: z.string(),
  aiOpportunities: z.string(),
  recommendedEngagement: z.string(),
});

export const discoveryRouter = router({
  generate: publicProcedure
    .input(z.object({ url: z.string().url("Please enter a valid URL") }))
    .mutation(async ({ input, ctx }) => {
      // Scrape the URL
      let pageContent: string;
      try {
        pageContent = await scrapeUrl(input.url);
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not fetch the URL: ${err.message}`,
        });
      }

      if (!pageContent || pageContent.length < 50) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The page returned too little content to analyze. Please try a different URL.",
        });
      }

      // Generate the brief via LLM
      const systemPrompt = `You are a senior product strategist at Fluxon, a world-class software development consultancy trusted by OpenAI, Anthropic, Stripe, and Google. 
Fluxon's services include: ${FLUXON_SERVICES.join(", ")}.

Your job is to analyze a company's website content and produce a structured discovery brief that a Fluxon PM would use on day one of a new client engagement.

Be specific, insightful, and concise. Avoid generic statements. Ground every observation in the actual content provided.`;

      const userPrompt = `Analyze the following website content and produce a structured discovery brief.

Website URL: ${input.url}
Website Content:
---
${pageContent}
---

Return a JSON object with exactly these fields:
- companyName: The company's name (string)
- valueProposition: 2-3 sentences describing the company's core product and value proposition, grounded in the content (string)
- userPainPoints: 3-4 specific user pain points or unmet needs that this company's product addresses or that their users likely experience, written as clear statements (string)
- aiOpportunities: 3-4 concrete areas where AI/ML could meaningfully improve this company's product or operations, with brief rationale for each (string)
- recommendedEngagement: Which of Fluxon's service lines best fits this company right now and why. Choose from: ${FLUXON_SERVICES.join(", ")}. Explain the recommendation in 2-3 sentences (string)`;

      let briefData: z.infer<typeof briefSchema>;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "discovery_brief",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  companyName: { type: "string" },
                  valueProposition: { type: "string" },
                  userPainPoints: { type: "string" },
                  aiOpportunities: { type: "string" },
                  recommendedEngagement: { type: "string" },
                },
                required: [
                  "companyName",
                  "valueProposition",
                  "userPainPoints",
                  "aiOpportunities",
                  "recommendedEngagement",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("Empty LLM response");
        const contentStr = typeof content === "string" ? content : JSON.stringify(content);
        briefData = briefSchema.parse(JSON.parse(contentStr));
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI analysis failed: ${err.message}`,
        });
      }

      // Save to DB (associate with user if logged in)
      const briefId = await insertBrief({
        userId: ctx.user?.id ?? null,
        url: input.url,
        companyName: briefData.companyName,
        valueProposition: briefData.valueProposition,
        userPainPoints: briefData.userPainPoints,
        aiOpportunities: briefData.aiOpportunities,
        recommendedEngagement: briefData.recommendedEngagement,
        rawContent: pageContent.slice(0, 2000),
      });

      return {
        id: briefId,
        url: input.url,
        ...briefData,
        createdAt: new Date(),
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return getBriefsByUser(ctx.user.id);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const brief = await getBriefById(input.id);
      if (!brief) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
      return brief;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Ownership check — only the owner can delete their brief
      const brief = await getBriefById(input.id);
      if (!brief) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
      if (brief.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to delete this brief" });
      }
      await deleteBrief(input.id, ctx.user.id);
      return { success: true };
    }),
});
