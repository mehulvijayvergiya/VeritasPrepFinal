import "dotenv/config";
import { getSupabase } from "../config/supabaseClient.js";

async function main() {
  const supabase = getSupabase();

  const profileResp = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .eq("email", "jamesmmarsh@gmail.com")
    .maybeSingle();

  if (profileResp.error || !profileResp.data) {
    console.error("Profile lookup failed:", profileResp.error?.message || "Not found");
    process.exit(1);
  }

  const profile = profileResp.data;
  console.log("Profile:", profile);

  const submissionsResp = await supabase
    .from("submissions")
    .select("id,profile_id,email,service_key,service_label,submission_title,notes,essay_prompt,word_count,essay_for_college,attachment_path,created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  if (submissionsResp.error) {
    console.error("Submissions query failed:", submissionsResp.error.message);
    process.exit(1);
  }

  console.log("Submission count:", submissionsResp.data.length);
  for (const row of submissionsResp.data) {
    console.log(row);
  }
}

main();
