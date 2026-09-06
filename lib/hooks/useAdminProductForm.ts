/**
 * FILE: lib/hooks/useAdminProductForm.ts
 * PURPOSE:
 * Client-side data for the admin product create/edit form (Task 23,
 * admin_account_specification.md Section 3.2.2). In edit mode
 * (productId provided), loads the existing product via Task 20's
 * GET /api/admin/products/[productId] and pre-fills the form; in
 * create mode (productId null), starts from blank defaults. Submits
 * via Task 21's POST (create) or PUT (update) routes — the caller
 * doesn't need to know which verb applies, save() picks it based on
 * whether productId was provided.
 */
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getCsrfHeader } from "@/lib/csrf";

export interface ProductFormValues {
  name: string;
  category: string;
  description: string;
  price: string; // kept as string while editing; parsed to Float on submit
  status: string;
  tags: string;
  featured: boolean;
}

export interface FieldErrors {
  name?: string;
  category?: string;
  description?: string;
  price?: string;
  status?: string;
}

const BLANK_VALUES: ProductFormValues = {
  name: "",
  category: "",
  description: "",
  price: "",
  status: "draft",
  tags: "",
  featured: false,
};

// Mirrors the server-side minimums in lib/adminProductValidation.ts's
// validateProductInput() so the admin sees the same rule before
// submitting, not only after a 400 comes back.
function validate(values: ProductFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length < 2 || values.name.trim().length > 100) {
    errors.name = "Product name must be between 2 and 100 characters.";
  }
  if (!values.category) {
    errors.category = "Choose a category.";
  }
  if (values.description.trim().length < 1 || values.description.trim().length > 1000) {
    errors.description = "Description is required and must be under 1000 characters.";
  }
  const price = Number(values.price);
  if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Price must be greater than 0.";
  }
  return errors;
}

export function useAdminProductForm(productId: string | null) {
  const router = useRouter();
  const isEditMode = productId !== null;

  const [values, setValues] = useState<ProductFormValues>(BLANK_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditMode) return;

    let cancelled = false;
    async function loadProduct() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/admin/products/${productId}`);
        const result = await response.json();
        if (cancelled) return;

        if (!result.success) {
          setLoadError(result.message);
          setIsLoading(false);
          return;
        }

        const product = result.data;
        setValues({
          name: product.name ?? "",
          category: product.category ?? "",
          description: product.description ?? "",
          price: String(product.startingPrice ?? ""),
          status: product.status ?? "draft",
          tags: "",
          featured: product.badge === "new",
        });
        setIsLoading(false);
      } catch {
        if (!cancelled) {
          setLoadError("We couldn't reach the server. Check your connection and try again.");
          setIsLoading(false);
        }
      }
    }

    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, productId]);

  function setField<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        category: values.category,
        description: values.description.trim(),
        price: Number(values.price),
        status: values.status,
        tags: values.tags.trim(),
        featured: values.featured,
      };

      const response = await fetch(
        isEditMode ? `/api/admin/products/${productId}` : "/api/admin/products",
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();

      if (!result.success) {
        setSubmitError(result.message || "We couldn't save the product. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Redirect to the product list on save — per the spec's default
      // ("redirect to product list ... per admin preference").
      router.push("/admin/products");
    } catch {
      setSubmitError("We couldn't reach the server. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return {
    values,
    setField,
    fieldErrors,
    isLoading,
    loadError,
    isSubmitting,
    submitError,
    handleSubmit,
    isEditMode,
  };
}
