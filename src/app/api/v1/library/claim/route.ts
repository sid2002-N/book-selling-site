import { z } from "zod";
import { ok, parseJson, route } from "@/lib/http";
import { requireVerifiedUser } from "@/modules/auth";
import { claimFreeProduct } from "@/modules/entitlements";

export const POST = route(async (request) => {
  const { user } = await requireVerifiedUser();
  const { productId } = await parseJson(request, z.object({ productId: z.uuid() }));
  const result = await claimFreeProduct(user.id, productId);
  return ok(result, {}, { status: result.created ? 201 : 200 });
});
