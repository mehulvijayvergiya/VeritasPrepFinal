// One-off sanity check for the new Supabase model layer (Step 6, Section 1).
// Not part of the running app — run manually.
//
// Usage: node scripts/testSupabaseModels.js <profile_id>
//
// Get a profile_id from Supabase → Table Editor → profiles (copy the `id`
// column for the test student account you created in Step 4/5).

import "dotenv/config";
import { ProfileModel } from "../models/supabase/profileModel.js";
import { SubmissionModel } from "../models/supabase/submissionModel.js";

const profileId = process.argv[2];

if (!profileId) {
  console.error("Usage: node scripts/testSupabaseModels.js <profile_id>");
  process.exit(1);
}

async function main() {
  console.log("Fetching profile...");
  const profile = await ProfileModel.getById(profileId);
  console.log("✓ profile:", profile);

  console.log("\nUpdating profile with test data...");
  const { profile: updated, errors: updateErrors } = await ProfileModel.update(profileId, {
    phone_number: "555-123-4567",
    gpa: 3.85,
    sat_score: 1420,
    target_colleges: ["Test University", "Sample College"],
  });
  if (updateErrors) {
    console.error("✗ validation errors:", updateErrors);
    process.exit(1);
  }
  console.log("✓ updated profile:", updated);

  console.log("\nCreating a test submission...");
  const { submission, errors: submitErrors } = await SubmissionModel.createForProfile(
    profileId,
    updated.email,
    updated.full_name || "Test Student",
    {
      essay_for: "common_app",
      essay: "This is a test essay used only to verify the Supabase model layer.",
      essay_prompt: "Describe a challenge you overcame.",
      word_count: 12,
    }
  );
  if (submitErrors) {
    console.error("✗ validation errors:", submitErrors);
    process.exit(1);
  }
  console.log("✓ created submission:", submission);

  console.log("\nListing submissions for profile...");
  const list = await SubmissionModel.listForProfile(profileId);
  console.log(`✓ found ${list.length} submission(s)`);

  console.log("\nAll checks passed.");
}

main().catch((err) => {
  console.error("✗ Test failed:", err);
  process.exit(1);
});
