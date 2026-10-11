import { ok, route } from "@/lib/http";
import { logout } from "@/modules/auth";

export const POST = route(async () => {
  await logout();
  return ok({ signedOut: true });
});
