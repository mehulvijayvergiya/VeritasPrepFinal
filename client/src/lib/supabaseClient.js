import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Loud failure in dev rather than silent auth breakage.
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy client/.env.example to client/.env and fill these in."
  );
}

// The anon key is public by design (safe for the browser) — it can only do
// what your Row Level Security policies allow. Never put the service role
// key here.
export const supabase = createClient(url, anonKey);
