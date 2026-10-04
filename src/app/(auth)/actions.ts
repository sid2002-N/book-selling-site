"use server";

import { redirect } from "next/navigation";
import { toFormState, type FormState } from "@/lib/form-state";
import { requestContext } from "@/lib/request";
import {
  login,
  logout,
  redeemRecoveryCode,
  register,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  safeNext,
  verifyTwoFactorChallenge,
} from "@/modules/auth";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const next = safeNext(str(fd, "next"), "/account");
  try {
    await register({ name: str(fd, "name"), email: str(fd, "email"), password: str(fd, "password") }, await requestContext());
  } catch (error) {
    return { ...toFormState(error), values: { name: str(fd, "name"), email: str(fd, "email") } };
  }
  redirect(`/verify-email?sent=1&next=${encodeURIComponent(next)}`);
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const next = safeNext(str(fd, "next"), "/account");
  let result: Awaited<ReturnType<typeof login>>;
  try {
    result = await login(
      { email: str(fd, "email"), password: str(fd, "password"), remember: fd.get("remember") === "on" },
      await requestContext(),
    );
  } catch (error) {
    const state = toFormState(error);
    if (state.code === "ACCOUNT_LOCKED") {
      const until = typeof state.meta?.lockedUntil === "string" ? state.meta.lockedUntil : "";
      redirect(`/login?state=locked&until=${encodeURIComponent(until)}`);
    }
    return { ...state, values: { email: str(fd, "email") } };
  }
  if (result.next === "two_factor") redirect(`/2fa?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    await requestPasswordReset({ email: str(fd, "email") }, await requestContext());
  } catch (error) {
    const state = toFormState(error);
    // Rate limits and validation are shown; everything else gets the same neutral reply.
    if (state.code === "RATE_LIMITED" || state.code === "VALIDATION_ERROR") return { ...state, values: { email: str(fd, "email") } };
  }
  return {
    status: "success",
    message: "If an account exists for that email, we've sent a link to reset your password. It's valid for 1 hour.",
  };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    await resetPassword({ token: str(fd, "token"), password: str(fd, "password"), confirm: str(fd, "confirm") });
  } catch (error) {
    return toFormState(error);
  }
  redirect("/reset-password?done=1");
}

export async function resendVerificationAction(_prev: FormState): Promise<FormState> {
  try {
    await resendVerification(await requestContext());
  } catch (error) {
    return toFormState(error);
  }
  return { status: "success", message: "We've sent a new verification link. Check your inbox." };
}

export async function twoFactorAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const next = safeNext(str(fd, "next"), "/account");
  try {
    await verifyTwoFactorChallenge(str(fd, "code"), fd.get("remember") === "on");
  } catch (error) {
    return toFormState(error);
  }
  redirect(next);
}

export async function recoveryCodeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const next = safeNext(str(fd, "next"), "/account");
  try {
    await redeemRecoveryCode(str(fd, "code"));
  } catch (error) {
    return toFormState(error);
  }
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/");
}
