import { z } from "zod";

/**
 * A Zod schema of any type, read the same way on Zod 3 and Zod 4.
 *
 * `z.ZodTypeAny` is `ZodType<any>` on Zod 3 and a schema of `unknown` on Zod 4, so a
 * refinement on it gets an `unknown` input and `z.infer` of it is `unknown` there. Both
 * versions take three type parameters on `ZodType`, and `any` in each keeps the schemas
 * the library builds and accepts as loosely typed as they were on Zod 3.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the point of the type
export type AnyZodSchema = z.ZodType<any, any, any>;
