import { ZodError } from "zod";
import { isAppError } from "./errors";
import { logger } from "./logger";

/** Result shape for Server Action forms used with `useActionState`. */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  code?: string;
  fields?: Record<string, string>;
  meta?: Record<string, unknown>;
  /** Non-secret values echoed back so fields survive a failed submit. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

/** Maps thrown errors to user-safe form state; unexpected errors are logged, never shown raw. */
export function toFormState(error: unknown): FormState {
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
    return { status: "error", message: "Please check the highlighted fields.", code: "VALIDATION_ERROR", fields };
  }
  if (isAppError(error)) {
    return { status: "error", message: error.userMessage, code: error.code, fields: error.fields, meta: error.meta };
  }
  logger.error("form_action_failed", { error });
  return { status: "error", message: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" };
}
