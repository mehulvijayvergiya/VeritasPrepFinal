import { createClient } from "@supabase/supabase-js";

// Service-role client for backend use only. This key bypasses Row Level
// Security, so it must NEVER be sent to the frontend or committed to git.
// Not yet wired into any routes — added in Step 3 so the connection can be
// verified before any model/controller starts using it.
let supabase = null;

export function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check your .env."
    );
  }

  supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return supabase;
}
