/**
 * FILE: lib/supabase/browserClient.ts
 * PURPOSE:
 * Supabase client for use in Client Components and hooks. Uses the
 * public anon key only — every query goes through Supabase's Row
 * Level Security policies. Never import lib/supabase/adminClient.ts
 * (service role) into any "use client" file.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey);
