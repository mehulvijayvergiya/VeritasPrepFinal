// Minimal for now — just proves requireStudentAuth works end to end.
// Expanded into the real student dashboard endpoints in a later step.
export function me(req, res) {
  const { profile } = req.student;
  res.json({
    profile: {
      email: profile.email,
      full_name: profile.full_name,
      credits: profile.credits,
      referral_code: profile.referral_code,
      created_at: profile.created_at,
    },
  });
}
