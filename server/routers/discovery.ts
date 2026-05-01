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
  // Company metrics — use "Unknown" if not inferable from content
  foundedYear: z.string(),
  employeeCount: z.string(),
  fundingStage: z.string(),
  industry: z.string(),
  headquarters: z.string(),
  businessModel: z.string(),
  techStack: z.string(),
  revenueModel: z.string(),
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

      // Generate the brief + metrics via LLM
      const systemPrompt = `You are a senior product strategist at Fluxon, a world-class software development consultancy trusted by OpenAI, Anthropic, Stripe, and Google.
Fluxon's services include: ${FLUXON_SERVICES.join(", ")}.

Your job is to analyze a company's website content and produce:
1. A structured discovery brief that a Fluxon PM would use on day one of a new client engagement.
2. Key company metrics extracted or inferred from the content.

Be specific, insightful, and concise. Avoid generic statements. Ground every observation in the actual content provided.
For metrics, extract what is explicitly stated. If a metric cannot be determined from the content, use "Unknown".`;

      const userPrompt = `Analyze the following website content and produce a structured discovery brief with company metrics.

Website URL: ${input.url}
Website Content:
---
${pageContent}
---

Return a JSON object with exactly these fields:

DISCOVERY BRIEF:
- companyName: The company's name (string)
- valueProposition: 2-3 sentences describing the company's core product and value proposition, grounded in the content (string)
- userPainPoints: 3-4 specific user pain points or unmet needs that this company's product addresses or that their users likely experience, written as clear statements (string)
- aiOpportunities: 3-4 concrete areas where AI/ML could meaningfully improve this company's product or operations, with brief rationale for each (string)
- recommendedEngagement: Which of Fluxon's service lines best fits this company right now and why. Choose from: ${FLUXON_SERVICES.join(", ")}. Explain the recommendation in 2-3 sentences (string)

COMPANY METRICS (extract from content; use "Unknown" if not determinable):
- foundedYear: Year the company was founded, e.g. "2018" (string)
- employeeCount: Approximate number of employees or a range, e.g. "50-200", "1,000+", "~500" (string)
- fundingStage: Funding stage or total raised, e.g. "Series B", "$45M raised", "Bootstrapped", "Public" (string)
- industry: Primary industry or sector, e.g. "Developer Tools", "FinTech", "Healthcare AI" (string)
- headquarters: City and country of HQ, e.g. "San Francisco, USA" (string)
- businessModel: Primary business model, e.g. "B2B SaaS", "B2C Marketplace", "Enterprise", "API" (string)
- techStack: Key technologies mentioned or inferred, e.g. "React, Python, AWS" — use "Unknown" if none mentioned (string)
- revenueModel: How they make money, e.g. "Subscription", "Usage-based", "Freemium + Enterprise", "Transaction fees" (string)`;

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
                  foundedYear: { type: "string" },
                  employeeCount: { type: "string" },
                  fundingStage: { type: "string" },
                  industry: { type: "string" },
                  headquarters: { type: "string" },
                  businessModel: { type: "string" },
                  techStack: { type: "string" },
                  revenueModel: { type: "string" },
                },
                required: [
                  "companyName",
                  "valueProposition",
                  "userPainPoints",
                  "aiOpportunities",
                  "recommendedEngagement",
                  "foundedYear",
                  "employeeCount",
                  "fundingStage",
                  "industry",
                  "headquarters",
                  "businessModel",
                  "techStack",
                  "revenueModel",
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
        foundedYear: briefData.foundedYear,
        employeeCount: briefData.employeeCount,
        fundingStage: briefData.fundingStage,
        industry: briefData.industry,
        headquarters: briefData.headquarters,
        businessModel: briefData.businessModel,
        techStack: briefData.techStack,
        revenueModel: briefData.revenueModel,
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
