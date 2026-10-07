import { z } from "zod";
import { handleError } from "@/lib/http";
import { orderForViewer } from "@/modules/checkout";
import { renderInvoicePdf } from "@/modules/orders";

/** Invoice PDF for the order's owner (or a guest with the order token). Never cached publicly. */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/account/orders/[id]/invoice">) {
  try {
    const orderId = z.uuid().parse((await ctx.params).id);
    const order = await orderForViewer(orderId, new URL(request.url).searchParams.get("token"));
    const { filename, bytes } = await renderInvoicePdf(order.id);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
