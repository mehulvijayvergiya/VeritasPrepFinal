import "dotenv/config";
import { initDb, db } from "../config/db.js";
import { getSupabase } from "../config/supabaseClient.js";

async function main() {
  await initDb();
  const supabase = getSupabase();

  console.log("Local credit requests:", (db.data.creditRequests || []).length);
  console.log("Local transactions:", (db.data.transactions || []).length);
  console.log("Local approved requests:", (db.data.creditRequests || []).filter((r) => r.status === "approved").length);

  const creditResp = await supabase
    .from("credit_requests")
    .select("id,email,amount_usd,vc,method,status,created_at,resolved_at")
    .order("created_at", { ascending: false });

  if (creditResp.error) {
    console.error("Supabase credit_requests error:", creditResp.error.message);
  } else {
    console.log("Supabase credit_requests:", creditResp.data.length);
    console.log(creditResp.data.slice(0, 20));
  }

  const txResp = await supabase
    .from("transactions")
    .select("*")
    .limit(5);

  if (txResp.error) {
    console.error("Supabase transactions error:", txResp.error.message);
  } else {
    console.log("Supabase transactions rows:", txResp.data.length);
    console.log(txResp.data);
  }
}

main();
