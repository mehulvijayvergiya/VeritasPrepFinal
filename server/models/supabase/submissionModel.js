import { getSupabase } from "../../config/supabaseClient.js";

const VALID_ESSAY_FOR = ["specific_college", "common_app", "other"];
const VALID_STATUSES = ["pending", "in_review", "completed"];

function validate({ essay_for, essay_for_college, word_count, essay_prompt, essay }) {
  const errors = {};
  if (!VALID_ESSAY_FOR.includes(essay_for)) {
    errors.essay_for = "Choose which college this essay is for.";
  }
  if (essay_for === "specific_college" && (!essay_for_college || !essay_for_college.trim())) {
    errors.essay_for_college = "Enter the college name.";
  }
  if (!essay || !essay.trim()) {
    errors.essay = "Essay text is required.";
  }
  if (word_count !== undefined && word_count !== null) {
    const n = Number(word_count);
    if (!Number.isInteger(n) || n < 0) errors.word_count = "Word count must be a positive number.";
  }
  if (!essay_prompt || !essay_prompt.trim()) {
    errors.essay_prompt = "Essay prompt is required.";
  }
  return errors;
}

export const SubmissionModel = {
  // Returns { errors } if validation fails, otherwise { submission }.
  async createForProfile(profileId, profileEmail, profileName, fields) {
    const errors = validate(fields);
    if (Object.keys(errors).length > 0) return { errors };

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        profile_id: profileId,
        name: profileName,
        email: profileEmail,
        colleges: fields.essay_for_college || fields.essay_for,
        essay: fields.essay.trim(),
        activities: fields.activities || "",
        notes: fields.notes || "",
        essay_for: fields.essay_for,
        essay_for_college: fields.essay_for_college || null,
        word_count: fields.word_count ?? null,
        essay_prompt: fields.essay_prompt.trim(),
        attachment_path: fields.attachment_path || null,
      })
      .select()
      .single();
    if (error) throw error;
    return { submission: data };
  },

  async listForProfile(profileId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("submissions")
      .select(
        "id, status, essay_for, essay_for_college, word_count, feedback_sent_at, created_at, updated_at"
      )
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async findById(id) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("submissions").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },
};

export { VALID_ESSAY_FOR, VALID_STATUSES };
