import { z } from "zod";

/**
 * Intent
 * ------
 * The contract between "what a human said" and "what the engine ranks on".
 *
 * This is defined as a Zod schema rather than a bare TS interface on purpose:
 * in production the intent object is produced by an LLM, and model output is
 * untrusted input. Parsing at the boundary means a hallucinated field can never
 * reach the ranker. The mock engine validates against the identical schema, so
 * the swap to a real model changes one service implementation and nothing else.
 */

export const budgetTierSchema = z.enum([
  "value",
  "moderate",
  "premium",
  "luxury",
]);
export type BudgetTier = z.infer<typeof budgetTierSchema>;

export const intentSlotSchema = z.enum([
  "groupSize",
  "budgetPerPerson",
  "vibes",
  "timing",
  "maxQueueMinutes",
  "maxTravelMinutes",
  "neighbourhood",
  "requirements",
]);
export type IntentSlot = z.infer<typeof intentSlotSchema>;

export const intentSchema = z.object({
  /** Free text the user actually typed — kept for auditability and re-ranking. */
  utterance: z.string(),
  verticalId: z.string(),
  groupSize: z.number().int().min(1).max(60).nullable(),
  /** Budget per person, minor units. Null = unconstrained. */
  budgetPerPerson: z.number().int().min(0).nullable(),
  /** Free-form descriptors: "techno", "rooftop", "low-key". Not an enum — the
   *  taxonomy must be able to grow without a deploy. */
  vibes: z.array(z.string()).max(8),
  timing: z
    .enum(["now", "tonight", "later_tonight", "weekend", "planning"])
    .nullable(),
  maxQueueMinutes: z.number().int().min(0).max(240).nullable(),
  maxTravelMinutes: z.number().int().min(0).max(180).nullable(),
  neighbourhood: z.string().nullable(),
  /** Hard constraints: "no cover", "vip table", "wheelchair access". */
  requirements: z.array(z.string()).max(8),
  /** Engine confidence 0–1. Drives whether we ask a clarifying question. */
  confidence: z.number().min(0).max(1),
});

export type Intent = z.infer<typeof intentSchema>;

export const emptyIntent = (verticalId: string, utterance = ""): Intent => ({
  utterance,
  verticalId,
  groupSize: null,
  budgetPerPerson: null,
  vibes: [],
  timing: null,
  maxQueueMinutes: null,
  maxTravelMinutes: null,
  neighbourhood: null,
  requirements: [],
  confidence: 0,
});

/**
 * The engine's reply. Not a chat message — a structured turn. It may resolve
 * straight to results, or ask exactly one clarifying question when a
 * decision-critical slot is missing.
 */
export interface IntentTurn {
  id: string;
  intent: Intent;
  /** Short, declarative read-back: "Six of you, techno, under ₹3,000." */
  understanding: string;
  clarification: {
    slot: IntentSlot;
    question: string;
    options: { label: string; patch: Partial<Intent> }[];
  } | null;
  createdAt: string;
}
