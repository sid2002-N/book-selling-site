import { ok, parseJson, route } from "@/lib/http";
import { addToCart, cartCount, productIdInput } from "@/modules/cart";

/** Add a product (no quantity, no price — the server decides both). */
export const POST = route(async (request) => {
  const { productId } = await parseJson(request, productIdInput);
  await addToCart(productId);
  return ok({ productId, count: await cartCount() }, {}, { status: 201 });
});
