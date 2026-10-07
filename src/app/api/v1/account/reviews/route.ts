import { z } from "zod";
import { ok, parseJson, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { reviewInput, saveReview } from "@/modules/engagement";

const input = reviewInput.extend({ productId: z.uuid() });

/** PUT = create or edit the signed-in reader's review of a product they own. */
export const PUT = route(async (request) => {
  const { user } = await requireUser();
  const { productId, ...review } = await parseJson(request, input);
  const saved = await saveReview(user.id, productId, review);
  return ok({ id: saved.id, status: saved.status });
});
