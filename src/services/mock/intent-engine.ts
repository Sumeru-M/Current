import { emptyIntent, intentSchema, type Intent, type IntentTurn } from "@/types/intent";
import type { IntentService } from "@/services/contracts";
import { latency, nowIso, uid } from "@/mocks/runtime";
import {
  buildClarification,
  buildUnderstanding,
  parseIntent,
} from "./intent-parser";

/**
 * Mock intent engine.
 *
 * A thin async wrapper over the pure parser in `intent-parser.ts`. In
 * production this becomes one call to an LLM with a JSON-schema-constrained
 * response, plus the same `intentSchema.parse` on the way out — the parser is
 * what the model replaces, and everything in this file (latency, id, timestamp,
 * schema validation at the boundary) stays.
 *
 * The parse is validated against `intentSchema` even though our own parser
 * produced it: that is the boundary the real model output will cross, and the
 * check must exist before it does.
 */
export class MockIntentService implements IntentService {
  async interpret({
    utterance,
    verticalId,
    previous,
  }: {
    utterance: string;
    verticalId: string;
    previous?: Intent | null;
  }): Promise<IntentTurn> {
    await latency();

    const text = utterance.trim();
    const base = previous ?? emptyIntent(verticalId, text);

    // Parse at the boundary, exactly as we will with real model output.
    const intent = intentSchema.parse(parseIntent(text, verticalId, base));

    return {
      id: uid("turn"),
      intent,
      understanding: buildUnderstanding(intent),
      clarification: buildClarification(intent),
      createdAt: nowIso(),
    };
  }
}
