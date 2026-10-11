import { z } from "zod";
import { ok, parseJson, route } from "@/lib/http";
import { requireVerifiedUser } from "@/modules/auth";
import { requestRefund } from "@/modules/payments";

const input = z.object({ reason: z.string().trim().min(10, { error: "Tell us a little more (at least 10 characters)." }).max(1000) });

export const POST = route(async (request, ctx: RouteContext<"/api/v1/account/orders/[id]/refund-requests">) => {
  const { user } = await requireVerifiedUser();
  const orderId = z.uuid().parse((await ctx.params).id);
  const { reason } = await parseJson(request, input);
  const refund = await requestRefund({ userId: user.id, orderId, reason });
  return ok({ id: refund.id, refundNumber: refund.refundNumber, status: refund.status }, {}, { status: 201 });
});
