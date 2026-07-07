import { getSupabase } from "../config/supabaseClient.js";

// Verifies the Supabase-issued access token a logged-in student sends, and
// attaches their auth user + profiles row to req. Separate from
// requireAuth (admin.js) — students and admins are different identities
// with different tokens.
export async function requireStudentAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header." });
  }

  const supabase = getSupabase();

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(404).json({ error: "No profile found for this account." });
  }

  req.student = { user: userData.user, profile };
  next();
}
