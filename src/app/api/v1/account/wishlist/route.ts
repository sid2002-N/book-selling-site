import { ok, parseJson, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { addToWishlist, removeFromWishlist, wishlistInput } from "@/modules/engagement";

export const POST = route(async (request) => {
  const { user } = await requireUser();
  const { productId } = await parseJson(request, wishlistInput);
  await addToWishlist(user.id, productId);
  return ok({ productId, saved: true });
});

export const DELETE = route(async (request) => {
  const { user } = await requireUser();
  const { productId } = await parseJson(request, wishlistInput);
  await removeFromWishlist(user.id, productId);
  return ok({ productId, saved: false });
});
