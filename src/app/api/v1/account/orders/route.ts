import { ok, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { listOrders } from "@/modules/orders";

export const GET = route(async (request) => {
  const { user } = await requireUser();
  const page = Math.max(1, Number(new URL(request.url).searchParams.get("page")) || 1);
  const result = await listOrders(user.id, page);
  return ok(result.items, { page: result.page, totalPages: result.totalPages, total: result.total });
});
