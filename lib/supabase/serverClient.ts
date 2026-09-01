/**
 * FILE: lib/supabase/serverClient.ts
 * PURPOSE:
 * Server-only Supabase clients for use inside API route handlers.
 * NEVER import this file in a "use client" component.
 *
 *   supabaseServerClient — anon key. Used for the actual sign-in /
 *   sign-up calls (Supabase Auth enforces its own rules here, no RLS
 *   bypass needed for these two operations).
 *
 *   supabaseAdminClient — service role key. Bypasses RLS. Used only
 *   for operations the anon key cannot do from the server, such as
 *   checking whether an email is already registered (Supabase Auth
 *   admin API) and validating a session token inside middleware.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServerClient = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
