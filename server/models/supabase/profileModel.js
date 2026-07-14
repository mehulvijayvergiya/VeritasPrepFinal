import { getSupabase } from "../../config/supabaseClient.js";

const EDITABLE_FIELDS = [
  "full_name",
  "phone_number",
  "gpa",
  "sat_score",
  "act_score",
  "graduation_year",
  "high_school",
  "intended_major",
  "ap_course_count",
  "class_rank_percentile",
  "extracurricular_summary",
  "target_colleges",
];

function validate({
  gpa,
  sat_score,
  act_score,
  graduation_year,
  ap_course_count,
  class_rank_percentile,
  target_colleges,
}) {
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
  if (act_score !== undefined && act_score !== null && act_score !== "") {
    const n = Number(act_score);
    if (!Number.isInteger(n) || n < 1 || n > 36) {
      errors.act_score = "ACT score must be an integer between 1 and 36.";
    }
  }
  if (graduation_year !== undefined && graduation_year !== null && graduation_year !== "") {
    const n = Number(graduation_year);
    if (!Number.isInteger(n) || n < 2020 || n > 2100) {
      errors.graduation_year = "Graduation year must be a valid year.";
    }
  }
  if (ap_course_count !== undefined && ap_course_count !== null && ap_course_count !== "") {
    const n = Number(ap_course_count);
    if (!Number.isInteger(n) || n < 0 || n > 50) {
      errors.ap_course_count = "AP/IB course count must be an integer between 0 and 50.";
    }
  }
  if (
    class_rank_percentile !== undefined &&
    class_rank_percentile !== null &&
    class_rank_percentile !== ""
  ) {
    const n = Number(class_rank_percentile);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      errors.class_rank_percentile = "Class rank percentile must be between 0 and 100.";
    }
  }
  if (target_colleges !== undefined && target_colleges !== null && !Array.isArray(target_colleges)) {
    errors.target_colleges = "Target colleges must be a list.";
  }
  return errors;
}

export const ProfileModel = {
  async listAll() {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

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

  async getByEmail(email) {
    if (!email) return null;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async getByReferralCode(referralCode) {
    if (!referralCode) return null;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("referral_code", referralCode.toUpperCase().trim())
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async adjustCreditsById(profileId, delta) {
    if (!profileId) throw new Error("Profile id is required.");
    const amount = Number(delta);
    if (!Number.isFinite(amount) || amount === 0) {
      throw new Error("Credit delta must be a non-zero number.");
    }

    const profile = await ProfileModel.getById(profileId);
    const current = Number(profile.credits || 0);
    const next = current + amount;
    if (next < 0) {
      throw new Error("Student does not have enough credits for this approval.");
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .update({ credits: next })
      .eq("id", profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async adjustCreditsByEmail(email, delta) {
    const profile = await ProfileModel.getByEmail(email);
    if (!profile) return null;
    return ProfileModel.adjustCreditsById(profile.id, delta);
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
