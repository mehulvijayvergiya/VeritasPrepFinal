import { getSupabase } from "../../config/supabaseClient.js";

const EDITABLE_FIELDS = ["full_name", "phone_number", "gpa", "sat_score", "target_colleges"];

function validate({ gpa, sat_score, target_colleges }) {
  const errors = {};
  if (gpa !== undefined && gpa !== null) {
    const n = Number(gpa);
    if (Number.isNaN(n) || n < 0 || n > 5.0) errors.gpa = "GPA must be between 0 and 5.0.";
  }
  if (sat_score !== undefined && sat_score !== null) {
    const n = Number(sat_score);
    if (!Number.isInteger(n) || n < 400 || n > 1600) {
      errors.sat_score = "SAT score must be an integer between 400 and 1600.";
    }
  }
  if (target_colleges !== undefined && target_colleges !== null && !Array.isArray(target_colleges)) {
    errors.target_colleges = "Target colleges must be a list.";
  }
  return errors;
}

export const ProfileModel = {
  async getById(profileId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();
    if (error) throw error;
    return data;
  },

  // Returns { errors } if validation fails, otherwise { profile }.
  async update(profileId, fields) {
    const errors = validate(fields);
    if (Object.keys(errors).length > 0) return { errors };

    const patch = {};
    for (const key of EDITABLE_FIELDS) {
      if (fields[key] !== undefined) patch[key] = fields[key];
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", profileId)
      .select()
      .single();
    if (error) throw error;
    return { profile: data };
  },
};
