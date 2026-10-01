import "dotenv/config";
import { initDb } from "./config/db.js";
import { Submission } from "./models/Submission.js";
import { getSupabase } from "./config/supabaseClient.js";

async function main() {
  await initDb();
  await Submission.enrichRecoveredMetadata({
    profileId: "69c20fd7-7173-4849-b910-9893490417d5",
    profileEmail: "jamesmmarsh@gmail.com",
  });

  const sb = getSupabase();
  const resp = await sb
    .from("submissions")
    .select("id,service_key,service_label,submission_title,notes,attachment_path,attachment_original_name,attachment_filename")
    .eq("profile_id", "69c20fd7-7173-4849-b910-9893490417d5")
    .order("created_at", { ascending: false });

  console.log(resp.data);
}

main();
