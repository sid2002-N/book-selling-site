import { ok, parseJson, route } from "@/lib/http";
import { requestContext } from "@/lib/request";
import { newsletterInput, subscribeToNewsletter } from "@/modules/marketing";

export const POST = route(async (request) => {
  const body = await parseJson(request, newsletterInput);
  await subscribeToNewsletter(body, (await requestContext()).ip);
  return ok({ subscribed: true });
});
