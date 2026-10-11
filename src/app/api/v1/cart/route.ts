import { ok, route } from "@/lib/http";
import { cartView } from "@/modules/cart";

export const GET = route(async () => ok(await cartView(), {}, { headers: { "Cache-Control": "private, no-store" } }));
