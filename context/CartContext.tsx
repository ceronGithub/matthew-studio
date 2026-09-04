/**
 * FILE: context/CartContext.tsx
 * ROLE: Public — wraps every public page via app/(public)/layout.tsx.
 * Never wraps app/superAdmin — the cart is a shopping feature, not an
 * admin one.
 *
 * PURPOSE:
 * Owns the cart's client-side state (line items, drawer open/closed)
 * and talks to app/api/cart/route.ts for every read/write, so any
 * component anywhere in the public tree (NavBar's cart icon,
 * ProductDetail's "Add to Cart" button, the drawer itself) can read
 * or mutate the cart without prop drilling. Also owns the single
 * shared ToastStack instance for cart-related toasts (Rule 22.4) —
 * cart actions can originate from any product page, so the toast
 * can't reasonably live inside one page's own component tree.
 *
 * DATA FLOW:
 * 1. On mount, fetches GET /api/cart once to hydrate initial state
 *    (also the moment a guest's leftover cart merges into a buyer's
 *    account, per lib/cartSession.ts, if they just logged in).
 * 2. addItem/updateQuantity/removeItem each call the matching API
 *    method and replace local state with the response's full cart —
 *    the server is always the source of truth for prices/totals
 *    (cart_checkout_specification.md Section 4.2), never computed
 *    client-side from stale data.
 */
"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItemView } from "@/app/api/cart/route";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";

interface CartApiResponse {
  success: boolean;
  data: { items: CartItemView[]; itemCount: number; subtotal: number } | null;
  message: string;
}

interface CartContextValue {
  items: CartItemView[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (productId: string, variant: string | null, quantity?: number) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemView[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  const applyResponse = useCallback((payload: CartApiResponse) => {
    if (payload.data) {
      setItems(payload.data.items);
      setItemCount(payload.data.itemCount);
      setSubtotal(payload.data.subtotal);
    }
  }, []);

  // Initial hydration — runs once on mount for every public page.
  useEffect(() => {
    let isCancelled = false;

    async function loadCart() {
      try {
        const response = await fetch("/api/cart");
        const payload: CartApiResponse = await response.json();
        if (!isCancelled) applyResponse(payload);
      } catch (error) {
        console.error("[CartContext] Failed to load cart:", (error as Error).message);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadCart();
    return () => {
      isCancelled = true;
    };
  }, [applyResponse]);

  const addItem = useCallback(
    async (productId: string, variant: string | null, quantity: number = 1) => {
      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, variant, quantity }),
        });
        const payload: CartApiResponse = await response.json();

        if (!response.ok || !payload.success) {
          showToast(payload.message || "Couldn't add that to your cart. Please try again.", "error");
          return;
        }

        applyResponse(payload);
        showToast(`✓ ${payload.message}`, "success");
        setIsDrawerOpen(true);
      } catch (error) {
        console.error("[CartContext] addItem failed:", (error as Error).message);
        showToast("Couldn't add that to your cart. Please try again.", "error");
      }
    },
    [applyResponse, showToast]
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      try {
        const response = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItemId, quantity }),
        });
        const payload: CartApiResponse = await response.json();

        if (!response.ok || !payload.success) {
          showToast(payload.message || "Couldn't update your cart. Please try again.", "error");
          return;
        }

        applyResponse(payload);
      } catch (error) {
        console.error("[CartContext] updateQuantity failed:", (error as Error).message);
        showToast("Couldn't update your cart. Please try again.", "error");
      }
    },
    [applyResponse, showToast]
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      try {
        const response = await fetch(`/api/cart?cartItemId=${encodeURIComponent(cartItemId)}`, {
          method: "DELETE",
        });
        const payload: CartApiResponse = await response.json();

        if (!response.ok || !payload.success) {
          showToast(payload.message || "Couldn't remove that item. Please try again.", "error");
          return;
        }

        applyResponse(payload);
        showToast("✓ Item removed from cart.", "success");
      } catch (error) {
        console.error("[CartContext] removeItem failed:", (error as Error).message);
        showToast("Couldn't remove that item. Please try again.", "error");
      }
    },
    [applyResponse, showToast]
  );

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((open) => !open), []);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        isLoading,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        addItem,
        updateQuantity,
        removeItem,
      }}
    >
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </CartContext.Provider>
  );
}

/**
 * useCart
 * Reads cart state and actions. Throws if called outside CartProvider
 * (i.e. from app/superAdmin, which never mounts it) — surfaces a
 * misplaced usage during development instead of silently no-op-ing.
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
