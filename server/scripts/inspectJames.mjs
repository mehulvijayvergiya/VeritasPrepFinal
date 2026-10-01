import "dotenv/config";
import { getSupabase } from "../config/supabaseClient.js";

const sb = getSupabase();

async function main() {
  const profilesResp = await sb.from("profiles").select("id,email,full_name").ilike("full_name", "%james%");
  console.log("profiles:", profilesResp.data);

  const submissionsResp = await sb
    .from("submissions")
    .select("id,name,email,profile_id,service_key,service_label,submission_title,notes,essay_prompt,word_count,attachment_path,created_at")
    .or("name.ilike.%James%,email.ilike.%james%")
    .order("created_at", { ascending: false })
    .limit(100);
  console.log("matching submissions:", submissionsResp.data?.length || 0);
  console.log(submissionsResp.data);

  const jamesFolder = await sb.storage.from("student-submissions").list("students/James Marsh", {
    limit: 200,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });
  console.log("James folder level1:", jamesFolder.data?.map((x) => x.name));
}

main();
