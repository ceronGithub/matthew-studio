/**
 * FILE: lib/cartSession.ts
 * PURPOSE:
 * Resolves which "cart" a request belongs to, per
 * cart_checkout_specification.md Section 2/4.1:
 *   - Signed-in buyer  -> CartItem rows keyed by userId
 *   - Guest visitor    -> CartItem rows keyed by cartToken, an opaque
 *                         id stored in a non-HttpOnly cookie (the
 *                         token itself carries no cart contents or
 *                         pricing — those are only ever read back from
 *                         the database — so it's low-sensitivity,
 *                         unlike the sb-access-token/sb-refresh-token
 *                         session cookies, which stay HttpOnly).
 * Also owns the guest -> buyer cart merge that runs the moment a
 * signed-in request shows up carrying a leftover guest cart_token
 * cookie, so items added before login are never silently lost.
 *
 * DATA FLOW:
 * app/api/cart/route.ts calls resolveCartIdentity() at the top of
 * every handler, then (GET only) mergeGuestCartIntoUser() so the
 * merge happens the first time a signed-in buyer's cart is read after
 * logging in, before anything is returned.
 */
import { randomBytes } from "crypto";
import { prisma } from "@/services/prisma";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

export const CART_TOKEN_COOKIE_NAME = "cart_token";
const CART_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const isProduction = process.env.NODE_ENV === "production";

export interface CartIdentity {
  userId: string | null;
  /** Signed-in buyer's email, or null for a guest. Checkout pre-fills
   * the contact-info email field with this when present. */
  email: string | null;
  /** Null when the request has neither a session nor an existing guest cookie. */
  cartToken: string | null;
}

/**
 * getCookieValue
 * Same minimal same-origin cookie parser used by lib/csrf.ts — route
 * handlers here are typed as plain Request, so this avoids pulling in
 * next/server's cookie parsing for a single lookup.
 */
function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const found = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

/**
 * resolveCartIdentity
 * Reads the sb-access-token cookie (same session cookie set by
 * /api/auth/login) to resolve a signed-in userId, and reads whatever
 * cart_token cookie is already present. Never generates a new token —
 * that only happens in the cart API's POST handler, the first time a
 * guest actually adds something (see generateCartToken below).
 */
export async function resolveCartIdentity(request: Request): Promise<CartIdentity> {
  const accessToken = getCookieValue(request, "sb-access-token");
  const cartToken = getCookieValue(request, CART_TOKEN_COOKIE_NAME);

  if (!accessToken) {
    return { userId: null, email: null, cartToken };
  }

  const { data } = await supabaseAdminClient.auth.getUser(accessToken);
  return { userId: data.user?.id ?? null, email: data.user?.email ?? null, cartToken };
}

/**
 * generateCartToken
 * 24 bytes of randomness, hex-encoded — used only when a guest's
 * first add-to-cart request has no existing cart_token cookie yet.
 */
export function generateCartToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * attachCartTokenCookie
 * Sets the guest cart_token cookie on a response. Not HttpOnly — the
 * token is an opaque foreign key, never decoded or trusted for
 * pricing/contents, so client-side readability (e.g. for a future
 * lightweight cart-count badge that skips a network round trip) costs
 * nothing security-wise.
 */
export function attachCartTokenCookie(response: Response, cartToken: string): void {
  const cookieValue = [
    `${CART_TOKEN_COOKIE_NAME}=${encodeURIComponent(cartToken)}`,
    "Path=/",
    `Max-Age=${CART_TOKEN_MAX_AGE_SECONDS}`,
    "SameSite=Strict",
    ...(isProduction ? ["Secure"] : []),
  ].join("; ");
  response.headers.append("Set-Cookie", cookieValue);
}

/**
 * mergeGuestCartIntoUser
 * Called once per signed-in GET /api/cart request when a leftover
 * guest cart_token cookie is present. Dedupes by productId+variant
 * (summing quantities) so re-adding something already in the buyer's
 * server cart doesn't create a duplicate row, then deletes the guest
 * rows. Best-effort: a failure here is logged and swallowed rather
 * than failing the whole cart read — worst case the guest items stay
 * attached to the cookie and merge succeeds on a later request.
 */
export async function mergeGuestCartIntoUser(userId: string, cartToken: string): Promise<void> {
  try {
    const guestItems = await prisma.cartItem.findMany({ where: { cartToken, userId: null } });
    if (guestItems.length === 0) return;

    for (const guestItem of guestItems) {
      const existingBuyerItem = await prisma.cartItem.findFirst({
        where: { userId, productId: guestItem.productId, variant: guestItem.variant },
      });

      if (existingBuyerItem) {
        await prisma.cartItem.update({
          where: { id: existingBuyerItem.id },
          data: { quantity: existingBuyerItem.quantity + guestItem.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            userId,
            productId: guestItem.productId,
            variant: guestItem.variant,
            quantity: guestItem.quantity,
          },
        });
      }
    }

    await prisma.cartItem.deleteMany({ where: { cartToken, userId: null } });
  } catch (error) {
    console.error("[cartSession] Guest cart merge failed:", (error as Error).message);
  }
}
