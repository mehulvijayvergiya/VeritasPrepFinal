// One-off connectivity check — run manually, not part of the app itself.
// Confirms SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are correct and that
// the schema.sql tables exist, before anything in the app depends on them.
//
// Usage:  node scripts/verifySupabaseConnection.js

import "dotenv/config";
import { getSupabase } from "../config/supabaseClient.js";

const TABLES = ["profiles", "admins", "submissions", "credit_requests", "appointments"];

async function main() {
  const supabase = getSupabase();
  console.log("Connecting to Supabase...\n");

  let allOk = true;
  for (const table of TABLES) {
    const { error, count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      allOk = false;
      console.error(`✗ ${table}: ${error.message}`);
    } else {
      console.log(`✓ ${table} (${count ?? 0} rows)`);
    }
  }

  console.log(allOk ? "\nAll tables reachable." : "\nSome tables failed — check schema.sql was run and your keys are correct.");
  process.exit(allOk ? 0 : 1);
}

main();
