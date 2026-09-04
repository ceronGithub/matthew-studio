/**
 * FILE: lib/cartPricing.ts
 * PURPOSE:
 * Shared "join CartItem rows against the live product catalog" logic,
 * used by both app/api/cart/route.ts (drawer contents) and
 * app/api/checkout/validate/route.ts (checkout order summary) so the
 * two never drift into computing a subtotal two different ways.
 * Retired products (no longer in lib/productsData.ts) are dropped
 * rather than rendered broken.
 *
 * SHIPPING:
 * A cart "requires shipping" the moment it contains any t-shirt line
 * item — the only physical product category in the catalog (Templates,
 * AI Videos, File Tools, Tutorials, and Game Characters are all
 * digital delivery). SHIPPING_FEE_PHP is a flat placeholder rate
 * (cart_checkout_specification.md Section 4.2 doesn't specify a real
 * carrier-rate integration yet) — swap for a real shipping-rate
 * lookup once that's built.
 */
import { prisma } from "@/services/prisma";
import { getProductById, type Product } from "@/lib/productsData";

export const SHIPPING_FEE_PHP = 150;

export interface CartLineItem {
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
  isPhysical: boolean;
}

interface CartLineItemsResult {
  items: CartLineItem[];
  /** Names of cart rows dropped because their product no longer exists
   * in the catalog — surfaced to the checkout page as a warning. */
  removedItemNames: string[];
  requiresShipping: boolean;
  subtotal: number;
}

/**
 * loadCartLineItems
 * Fetches every CartItem row for the resolved identity (buyer userId
 * takes priority; falls back to the guest cartToken) and enriches
 * each one with its matching product's current name/price/category.
 */
export async function loadCartLineItems(userId: string | null, cartToken: string | null): Promise<CartLineItemsResult> {
  const cartItems = userId
    ? await prisma.cartItem.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
    : cartToken
      ? await prisma.cartItem.findMany({ where: { cartToken }, orderBy: { createdAt: "asc" } })
      : [];

  const items: CartLineItem[] = [];
  const removedItemNames: string[] = [];

  for (const cartItem of cartItems) {
    const product = getProductById(cartItem.productId);
    if (!product) {
      // Retired product — can't recover a name for the warning message
      // since the catalog entry is gone; keep it generic.
      removedItemNames.push("An item");
      continue;
    }

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
      isPhysical: product.category === "tshirts",
    });
  }

  const requiresShipping = items.some((item) => item.isPhysical);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return { items, removedItemNames, requiresShipping, subtotal };
}
