"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toFormState, type FormState } from "@/lib/form-state";
import {
  beginTwoFactorSetup,
  changePassword,
  confirmTwoFactorSetup,
  disableTwoFactor,
  passwordSchema,
  requireUser,
  revokeAllSessions,
  revokeSessionById,
} from "@/modules/auth";

export async function startTwoFactorAction(): Promise<{ ok: true; qrDataUrl: string; secret: string } | { ok: false; message: string }> {
  try {
    const result = await beginTwoFactorSetup();
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, message: toFormState(error).message ?? "Couldn't start setup." };
  }
}

export async function confirmTwoFactorAction(
  code: string,
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; message: string }> {
  try {
    const result = await confirmTwoFactorSetup(code);
    revalidatePath("/account/security");
    return { ok: true, ...result };
  } catch (error) {
    const state = toFormState(error);
    return { ok: false, message: state.fields?._ ?? state.message ?? "That code didn't match." };
  }
}

export async function disableTwoFactorAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    await disableTwoFactor(String(fd.get("code") ?? ""));
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/account/security");
  return { status: "success", message: "Two-factor authentication has been turned off." };
}

const changePasswordSchema = z
  .object({ currentPassword: z.string().max(128), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { error: "Passwords don't match.", path: ["confirm"] });

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const session = await requireUser();
    const input = changePasswordSchema.parse({
      currentPassword: fd.get("currentPassword") ?? "",
      password: fd.get("password") ?? "",
      confirm: fd.get("confirm") ?? "",
    });
    await changePassword(session.user.id, input.currentPassword, input.password, session.sessionId);
  } catch (error) {
    return toFormState(error);
  }
  return { status: "success", message: "Password updated. Other devices have been signed out." };
}

export async function revokeSessionAction(sessionId: string): Promise<void> {
  const session = await requireUser();
  await revokeSessionById(session.user.id, sessionId);
  revalidatePath("/account/security");
}

export async function revokeOtherSessionsAction(): Promise<void> {
  const session = await requireUser();
  await revokeAllSessions(session.user.id, session.sessionId);
  revalidatePath("/account/security");
}
