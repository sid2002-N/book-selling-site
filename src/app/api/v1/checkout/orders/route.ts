import { ok, parseJson, route } from "@/lib/http";
import { checkoutInput, placeOrder } from "@/modules/checkout";

/** POST /checkout/orders — Idempotency-Key header (or body field) makes retries safe. */
export const POST = route(async (request) => {
  const headerKey = request.headers.get("idempotency-key");
  const body = await parseJson(request, checkoutInput.partial({ idempotencyKey: true }));
  const input = checkoutInput.parse({ ...body, idempotencyKey: headerKey ?? body.idempotencyKey });
  return ok(await placeOrder(input), {}, { status: 201 });
});
