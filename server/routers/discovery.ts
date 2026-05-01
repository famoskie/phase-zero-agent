import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  deleteBrief,
  getBriefById,
  getBriefsBySession,
  getBriefByToken,
  insertBrief,
  setShareToken,
  updateBrief,
} from "../db";
import { nanoid } from "nanoid";
import { invokeLLM } from "../_core/llm";
import { publicProcedure, router } from "../_core/trpc";
import { scrapeMultiPage } from "../scraper";
import { getOrCreateSessionId, getSessionId } from "../_core/session";

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

const confidenceLevel = z.enum(["explicit", "inferred", "unknown"]);

const metricsConfidenceSchema = z.object({
  foundedYear: confidenceLevel,
  employeeCount: confidenceLevel,
  fundingStage: confidenceLevel,
  industry: confidenceLevel,
  headquarters: confidenceLevel,
  businessModel: confidenceLevel,
  techStack: confidenceLevel,
  revenueModel: confidenceLevel,
});

// ── Shared helpers ────────────────────────────────────────────────────────────
function buildBriefPrompt(url: string, pageContent: string, pagesScraped: number, pagesSummary: string): string {
  return `Analyze the following website content scraped from ${pagesScraped} page(s) (${pagesSummary}) and produce a structured discovery brief with company metrics and confidence indicators.

Website URL: ${url}
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

COMPANY METRICS (use "Unknown" as value if not determinable):
- foundedYear, employeeCount, fundingStage, industry, headquarters, businessModel, techStack, revenueModel (all strings)

CONFIDENCE:
- metricsConfidence: object with keys for each metric above, each value must be exactly "explicit", "inferred", or "unknown"`;
}

function buildResponseFormat() {
  return {
    type: "json_schema" as const,
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
          metricsConfidence: {
            type: "object",
            properties: {
              foundedYear: { type: "string", enum: ["explicit", "inferred", "unknown"] },
              employeeCount: { type: "string", enum: ["explicit", "inferred", "unknown"] },
              fundingStage: { type: "string", enum: ["explicit", "inferred", "unknown"] },
              industry: { type: "string", enum: ["explicit", "inferred", "unknown"] },
              headquarters: { type: "string", enum: ["explicit", "inferred", "unknown"] },
              businessModel: { type: "string", enum: ["explicit", "inferred", "unknown"] },
              techStack: { type: "string", enum: ["explicit", "inferred", "unknown"] },
              revenueModel: { type: "string", enum: ["explicit", "inferred", "unknown"] },
            },
            required: ["foundedYear", "employeeCount", "fundingStage", "industry", "headquarters", "businessModel", "techStack", "revenueModel"],
            additionalProperties: false,
          },
        },
        required: [
          "companyName", "valueProposition", "userPainPoints", "aiOpportunities",
          "recommendedEngagement", "foundedYear", "employeeCount", "fundingStage",
          "industry", "headquarters", "businessModel", "techStack", "revenueModel",
          "metricsConfidence",
        ],
        additionalProperties: false,
      },
    },
  };
}

const briefSchema = z.object({
  companyName: z.string(),
  valueProposition: z.string(),
  userPainPoints: z.string(),
  aiOpportunities: z.string(),
  recommendedEngagement: z.string(),
  foundedYear: z.string(),
  employeeCount: z.string(),
  fundingStage: z.string(),
  industry: z.string(),
  headquarters: z.string(),
  businessModel: z.string(),
  techStack: z.string(),
  revenueModel: z.string(),
  metricsConfidence: metricsConfidenceSchema,
});

async function runLLM(url: string, pageContent: string, pagesScraped: number, pagesSummary: string) {
  const systemPrompt = `You are a senior product strategist at Fluxon, a world-class software development consultancy trusted by OpenAI, Anthropic, Stripe, and Google.
Fluxon's services include: ${FLUXON_SERVICES.join(", ")}.
Analyze a company's website and produce a structured discovery brief with metrics and confidence indicators.
Be specific, insightful, and concise. Avoid generic statements.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildBriefPrompt(url, pageContent, pagesScraped, pagesSummary) },
    ],
    response_format: buildResponseFormat(),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty LLM response");
  const contentStr = typeof content === "string" ? content : JSON.stringify(content);
  return briefSchema.parse(JSON.parse(contentStr));
}

export const discoveryRouter = router({
  // ── Generate ──────────────────────────────────────────────────────────────
  generate: publicProcedure
    .input(z.object({ url: z.string().url("Please enter a valid URL") }))
    .mutation(async ({ input, ctx }) => {
      const sessionId = getOrCreateSessionId(ctx.req, ctx.res);

      let scrapeResult: Awaited<ReturnType<typeof scrapeMultiPage>>;
      try {
        scrapeResult = await scrapeMultiPage(input.url);
      } catch (err: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Could not fetch the URL: ${err.message}` });
      }

      const { content: pageContent, pagesScraped, pagesSummary } = scrapeResult;
      if (!pageContent || pageContent.length < 50) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The page returned too little content to analyze. Please try a different URL." });
      }

      let briefData: z.infer<typeof briefSchema>;
      try {
        briefData = await runLLM(input.url, pageContent, pagesScraped, pagesSummary);
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI analysis failed: ${err.message}` });
      }

      const briefId = await insertBrief({
        userId: ctx.user?.id ?? null,
        sessionId,
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
        metricsConfidence: JSON.stringify(briefData.metricsConfidence),
        pagesScraped,
      });

      return { id: briefId, url: input.url, ...briefData, pagesScraped, pagesSummary, createdAt: new Date() };
    }),

  // ── List (session-scoped) ─────────────────────────────────────────────────
  list: publicProcedure.query(async ({ ctx }) => {
    const sessionId = getSessionId(ctx.req);
    if (!sessionId) return [];
    return getBriefsBySession(sessionId);
  }),

  // ── Get by ID ─────────────────────────────────────────────────────────────
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const brief = await getBriefById(input.id);
      if (!brief) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
      return brief;
    }),

  // ── Delete ────────────────────────────────────────────────────────────────
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const brief = await getBriefById(input.id);
      if (!brief) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
      const sessionId = getSessionId(ctx.req);
      const isOwner = (ctx.user && brief.userId === ctx.user.id) || (sessionId && brief.sessionId === sessionId);
      if (!isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to delete this brief" });
      await deleteBrief(input.id, ctx.user?.id ?? 0);
      return { success: true };
    }),

  // ── Regenerate ────────────────────────────────────────────────────────────
  regenerate: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getBriefById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
      const sessionId = getSessionId(ctx.req);
      const isOwner = (ctx.user && existing.userId === ctx.user.id) || (sessionId && existing.sessionId === sessionId);
      if (!isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to regenerate this brief" });

      let scrapeResult: Awaited<ReturnType<typeof scrapeMultiPage>>;
      try {
        scrapeResult = await scrapeMultiPage(existing.url);
      } catch (err: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Could not fetch the URL: ${err.message}` });
      }

      const { content: pageContent, pagesScraped, pagesSummary } = scrapeResult;
      if (!pageContent || pageContent.length < 50) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The page returned too little content to analyze." });
      }

      let briefData: z.infer<typeof briefSchema>;
      try {
        briefData = await runLLM(existing.url, pageContent, pagesScraped, pagesSummary ?? "");
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI analysis failed: ${err.message}` });
      }

      await updateBrief(input.id, {
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
        metricsConfidence: JSON.stringify(briefData.metricsConfidence),
        pagesScraped,
      });

      return { id: input.id, url: existing.url, ...briefData, pagesScraped, pagesSummary, createdAt: existing.createdAt };
    }),

  // ── Share link ────────────────────────────────────────────────────────────
  createShareLink: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const brief = await getBriefById(input.id);
      if (!brief) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
      const sessionId = getSessionId(ctx.req);
      const isOwner = (ctx.user && brief.userId === ctx.user.id) || (sessionId && brief.sessionId === sessionId);
      if (!isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to share this brief" });
      const token = brief.shareToken ?? nanoid(16);
      if (!brief.shareToken) await setShareToken(input.id, token);
      return { token };
    }),

  // ── Get by share token ────────────────────────────────────────────────────
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const brief = await getBriefByToken(input.token);
      if (!brief) throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found or link has expired" });
      return brief;
    }),
});
