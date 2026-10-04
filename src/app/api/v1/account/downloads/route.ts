import { ok, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { downloadCenter } from "@/modules/delivery";

export const GET = route(async () => {
  const { user } = await requireUser();
  return ok(await downloadCenter(user.id));
});
