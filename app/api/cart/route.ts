/**
 * FILE: app/api/cart/route.ts
 * ROLE: Public — read/add/update/remove cart line items for a guest or
 * signed-in buyer (cart_checkout_specification.md Section 6).
 *
 * PURPOSE:
 * CartItem rows only ever store a productId/variant/quantity — this
 * route enriches them with the matching Product's display data
 * (name, price, category, icon) from the static catalog
 * (lib/productsData.ts) on every read, so a later catalog price
 * change is reflected immediately in an *unpurchased* cart (unlike
 * OrderItem, which snapshots price permanently at checkout time —
 * Section 4.4). Every response returns the full current cart so the
 * client never has to guess at derived totals itself.
 *
 * DATA FLOW:
 * 1. lib/cartSession.ts resolves whether the caller is a signed-in
 *    buyer (userId) or a guest (cartToken cookie).
 * 2. GET also merges any leftover guest cart into a signed-in buyer's
 *    cart the first time it's read after login (Section 4.1).
 * 3. POST/PUT/DELETE mutate CartItem rows, then return the same
 *    enriched shape as GET so context/CartContext.tsx can just swap
 *    in the response without a second round trip.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { getProductById, type Product } from "@/lib/productsData";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  attachCartTokenCookie,
  generateCartToken,
  mergeGuestCartIntoUser,
  resolveCartIdentity,
} from "@/lib/cartSession";

const CART_MUTATION_MAX_ATTEMPTS = 100;
const CART_MUTATION_WINDOW_MINUTES = 15;
const MAX_QUANTITY_PER_LINE = 20;

export interface CartItemView {
  id: string;
  productId: string;
  variant: string | null;
  quantity: number;
  name: string;
  category: string;
  categoryLabel: string;
  slug: string;
  iconName: Product["iconName"];
  unitPrice: number;
  lineTotal: number;
}

interface CartResponseData {
  items: CartItemView[];
  itemCount: number;
  subtotal: number;
}

/**
 * buildCartResponseData
 * Loads every CartItem row for the resolved identity and joins each
 * one against the static product catalog. Rows whose productId no
 * longer matches anything in the catalog are dropped rather than
 * rendered broken — this can only happen if a product is retired
 * after being added to someone's cart.
 */
async function buildCartResponseData(userId: string | null, cartToken: string | null): Promise<CartResponseData> {
  const cartItems = userId
    ? await prisma.cartItem.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
    : cartToken
      ? await prisma.cartItem.findMany({ where: { cartToken }, orderBy: { createdAt: "asc" } })
      : [];

  const items: CartItemView[] = [];
  for (const cartItem of cartItems) {
    const product = getProductById(cartItem.productId);
    if (!product) continue; // retired product — silently excluded, never shown broken

    const unitPrice = product.price.startingPrice;
    items.push({
      id: cartItem.id,
      productId: cartItem.productId,
      variant: cartItem.variant,
      quantity: cartItem.quantity,
      name: product.name,
      category: product.category,
      categoryLabel: product.categoryLabel,
      slug: product.slug,
      iconName: product.iconName,
      unitPrice,
      lineTotal: unitPrice * cartItem.quantity,
    });
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return { items, itemCount, subtotal };
}

export async function GET(request: Request) {
  try {
    const { userId, cartToken } = await resolveCartIdentity(request);

    // First read after login with a leftover guest cart — fold it in
    // before building the response (Section 4.1's merge-on-login).
    if (userId && cartToken) {
      await mergeGuestCartIntoUser(userId, cartToken);
    }

    const data = await buildCartResponseData(userId, cartToken);
    return NextResponse.json({ success: true, data, message: "Cart loaded." });
  } catch (error) {
    console.error("[cart][GET] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Couldn't load your cart. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ipAddress = getClientIp(request);
    const rateLimit = await checkRateLimit(ipAddress, "cart", CART_MUTATION_MAX_ATTEMPTS, CART_MUTATION_WINDOW_MINUTES);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Too many cart updates. Please slow down and try again shortly." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
    const variant = typeof body?.variant === "string" && body.variant.trim() ? body.variant.trim() : null;
    const requestedQuantity = Number.isFinite(body?.quantity) ? Math.trunc(body.quantity) : 1;
    const quantity = Math.min(Math.max(requestedQuantity, 1), MAX_QUANTITY_PER_LINE);

    const product = getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, data: null, message: "That product couldn't be found." },
        { status: 400 }
      );
    }

    const identity = await resolveCartIdentity(request);
    const userId = identity.userId;
    let cartToken = identity.cartToken;
    let isNewCartToken = false;

    // Guest with no existing cart cookie yet — this is their first
    // add-to-cart, so mint a token now (never on a plain GET).
    if (!userId && !cartToken) {
      cartToken = generateCartToken();
      isNewCartToken = true;
    }

    const existingItem = userId
      ? await prisma.cartItem.findFirst({ where: { userId, productId, variant } })
      : await prisma.cartItem.findFirst({ where: { cartToken, productId, variant } });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: Math.min(existingItem.quantity + quantity, MAX_QUANTITY_PER_LINE) },
      });
    } else {
      await prisma.cartItem.create({
        data: { userId, cartToken: userId ? null : cartToken, productId, variant, quantity },
      });
    }

    const data = await buildCartResponseData(userId, cartToken);
    const response = NextResponse.json({
      success: true,
      data,
      message: `"${product.name}" added to cart.`,
    });

    if (isNewCartToken && cartToken) {
      attachCartTokenCookie(response, cartToken);
    }

    return response;
  } catch (error) {
    console.error("[cart][POST] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Couldn't add that to your cart. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const cartItemId = typeof body?.cartItemId === "string" ? body.cartItemId : "";
    const requestedQuantity = Number.isFinite(body?.quantity) ? Math.trunc(body.quantity) : NaN;

    if (!cartItemId || !Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
      return NextResponse.json(
        { success: false, data: null, message: "Enter a quantity of at least 1." },
        { status: 400 }
      );
    }
    const quantity = Math.min(requestedQuantity, MAX_QUANTITY_PER_LINE);

    const { userId, cartToken } = await resolveCartIdentity(request);
    const cartItem = await prisma.cartItem.findUnique({ where: { id: cartItemId } });

    // Ownership check (Rule 6) — never let a request update a cart row
    // it doesn't own, whether that's another buyer's or another
    // guest's cart_token.
    const isOwner = cartItem && (userId ? cartItem.userId === userId : cartItem.cartToken === cartToken);
    if (!cartItem || !isOwner) {
      return NextResponse.json(
        { success: false, data: null, message: "That cart item couldn't be found." },
        { status: 404 }
      );
    }

    await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });

    const data = await buildCartResponseData(userId, cartToken);
    return NextResponse.json({ success: true, data, message: "Cart updated." });
  } catch (error) {
    console.error("[cart][PUT] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Couldn't update your cart. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get("cartItemId") ?? "";
    if (!cartItemId) {
      return NextResponse.json(
        { success: false, data: null, message: "No cart item specified." },
        { status: 400 }
      );
    }

    const { userId, cartToken } = await resolveCartIdentity(request);
    const cartItem = await prisma.cartItem.findUnique({ where: { id: cartItemId } });

    const isOwner = cartItem && (userId ? cartItem.userId === userId : cartItem.cartToken === cartToken);
    if (!cartItem || !isOwner) {
      return NextResponse.json(
        { success: false, data: null, message: "That cart item couldn't be found." },
        { status: 404 }
      );
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });

    const data = await buildCartResponseData(userId, cartToken);
    return NextResponse.json({ success: true, data, message: "Item removed from cart." });
  } catch (error) {
    console.error("[cart][DELETE] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      { success: false, data: null, message: "Couldn't remove that item. Please try again." },
      { status: 500 }
    );
  }
}
