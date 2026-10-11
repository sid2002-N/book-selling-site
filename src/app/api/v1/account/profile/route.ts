import { ok, parseJson, route } from "@/lib/http";
import { profileInput, updateProfile } from "@/modules/account";
import { requireUser } from "@/modules/auth";

export const PATCH = route(async (request) => {
  const { user } = await requireUser();
  await updateProfile(user.id, await parseJson(request, profileInput));
  return ok({ saved: true });
});
