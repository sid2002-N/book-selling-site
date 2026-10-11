import { ok, route } from "@/lib/http";
import { requestContext } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { popularSearches, suggest } from "@/modules/search";

export const GET = route(async (request) => {
  await enforceRateLimit("search", (await requestContext()).ip ?? "anon");
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const [suggestions, popular] = await Promise.all([suggest(q), q ? Promise.resolve([]) : popularSearches()]);
  return ok({ suggestions, popular }, {}, { headers: { "Cache-Control": "private, max-age=30" } });
});
