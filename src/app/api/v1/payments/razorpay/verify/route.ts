import { ok, parseJson, route } from "@/lib/http";
import { razorpayVerifyInput, verifyRazorpayPayment } from "@/modules/checkout";

export const POST = route(async (request) => ok(await verifyRazorpayPayment(await parseJson(request, razorpayVerifyInput))));
