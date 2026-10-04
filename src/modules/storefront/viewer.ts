import "server-only";
import { getCurrentUser } from "@/modules/auth";
import { wishlistProductIds } from "@/modules/engagement";
import { ownedProductIds } from "@/modules/entitlements";

/** Per-visitor state for product cards: signed in, wishlisted and owned product ids. */
export async function viewerState(productIds: string[]) {
  const user = await getCurrentUser();
  if (!user || productIds.length === 0) {
    return { signedIn: Boolean(user), wishlist: new Set<string>(), owned: new Set<string>(), user };
  }
  const [wishlist, owned] = await Promise.all([wishlistProductIds(user.id, productIds), ownedProductIds(user.id, productIds)]);
  return { signedIn: true, wishlist, owned, user };
}
