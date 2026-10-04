import { ok, parseJson, route } from "@/lib/http";
import { confirmStripePayment, stripeConfirmInput } from "@/modules/checkout";

export const POST = route(async (request) => ok(await confirmStripePayment(await parseJson(request, stripeConfirmInput))));
