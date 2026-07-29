import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

/**
 * Zod ↔ React Hook Form bridge.
 *
 * `@hookform/resolvers` is 12 lines of logic wrapped in a dependency that
 * currently has a broken optional-peer graph (valibot ^0.39 vs ^1.0) in this
 * npm tree. Owning it removes an install-blocking conflict and a supply-chain
 * surface for code we can read in one screen.
 */
export const zodResolver =
  <TSchema extends z.ZodType>(
    schema: TSchema,
  ): Resolver<
    z.output<TSchema> extends FieldValues ? z.output<TSchema> : FieldValues
  > =>
  async (values) => {
    type TValues =
      z.output<TSchema> extends FieldValues ? z.output<TSchema> : FieldValues;
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      return { values: result.data as TValues, errors: {} };
    }

    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      // First error wins — matching RHF's own criteriaMode: "firstError".
      if (path && !errors[path]) {
        errors[path] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {} as TValues, errors: errors as never };
  };
