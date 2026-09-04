/**
 * FILE: components/cart/CartDrawer.tsx
 * ROLE: Public — mounted once by context/CartContext.tsx's provider
 * (app/(public)/layout.tsx), so it's always available regardless of
 * which public page triggered it open.
 *
 * PURPOSE:
 * Slide-in cart drawer per cart_checkout_specification.md Section
 * 4.1: line items with a quantity stepper and remove button, a
 * subtotal, and a "Proceed to Checkout" CTA. Backdrop click or Escape
 * closes it. Checkout itself (Section 4.2) isn't built yet — the CTA
 * link already points to /checkout so it starts working the moment
 * that page ships, per the project's one-feature-at-a-time build
 * order (overviewProject.txt Section 6).
 *
 * DATA FLOW:
 * Pure consumer of context/CartContext.tsx — no fetching of its own.
 * Quantity stepper and remove button call updateQuantity/removeItem
 * directly; both already show their own toast on failure, so this
 * component doesn't need local error state.
 */
"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { useCart } from "@/context/CartContext";
import "../../app/styles/cart.css";

export default function CartDrawer() {
  const { items, itemCount, subtotal, isDrawerOpen, closeDrawer, updateQuantity, removeItem } = useCart();

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div
            key="cartDrawerBackdrop"
            className="cartDrawerBackdrop"
            role="presentation"
            onClick={closeDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.aside
            key="cartDrawerPanel"
            className="cartDrawerPanel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cartDrawerTitle"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="cartDrawerHeader">
              <h2 id="cartDrawerTitle" className="cartDrawerTitle">
                Your Cart{itemCount > 0 ? ` (${itemCount})` : ""}
              </h2>
              <button type="button" className="cartDrawerClose" onClick={closeDrawer} aria-label="Close cart">
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="cartDrawerEmpty">
                <ShoppingBag size={40} strokeWidth={1.25} aria-hidden="true" />
                <p>Your cart is empty.</p>
                <Link href="/products" className="buttonSecondary" onClick={closeDrawer}>
                  Browse Marketplace
                </Link>
              </div>
            ) : (
              <>
                <ul className="cartDrawerItems">
                  {items.map((item) => {
                    const Icon = CATEGORY_ICONS[item.iconName];
                    return (
                      <li key={item.id} className="cartDrawerItem">
                        <div className="cartDrawerItemThumb">
                          {Icon && <Icon size={24} strokeWidth={1.5} aria-hidden="true" />}
                        </div>

                        <div className="cartDrawerItemBody">
                          <p className="cartDrawerItemName">{item.name}</p>
                          {item.variant && <p className="cartDrawerItemVariant">{item.variant}</p>}
                          <p className="cartDrawerItemPrice">₱{item.unitPrice.toLocaleString("en-PH")}</p>

                          <div className="cartDrawerItemFooter">
                            <div className="cartDrawerQuantityStepper">
                              <button
                                type="button"
                                aria-label={`Decrease quantity of ${item.name}`}
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={14} strokeWidth={2} aria-hidden="true" />
                              </button>
                              <span aria-live="polite">{item.quantity}</span>
                              <button
                                type="button"
                                aria-label={`Increase quantity of ${item.name}`}
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus size={14} strokeWidth={2} aria-hidden="true" />
                              </button>
                            </div>

                            <button
                              type="button"
                              className="cartDrawerRemoveButton"
                              onClick={() => removeItem(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="cartDrawerFooter">
                  <div className="cartDrawerSubtotalRow">
                    <span>Subtotal</span>
                    <span>₱{subtotal.toLocaleString("en-PH")}</span>
                  </div>
                  <Link href="/checkout" className="buttonPrimary cartDrawerCheckoutButton" onClick={closeDrawer}>
                    Proceed to Checkout
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
