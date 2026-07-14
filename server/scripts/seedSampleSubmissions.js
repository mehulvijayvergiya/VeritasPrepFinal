import "dotenv/config";
import { initDb, db } from "../config/db.js";
import { Submission } from "../models/Submission.js";

const SAMPLES = [
  {
    name: "Avery Johnson",
    email: "avery.johnson@example.com",
    colleges: "Cornell, Northwestern",
    notes: "Please focus on clarity and story arc.",
    service_key: "essay_long",
    service_label: "Essay (> 500 words / Common App)",
    vc_cost: 7,
    submission_checklist: [
      { label: "I confirmed this is the correct prompt/service.", checked: true },
      { label: "I verified my deadline and added any key context in notes.", checked: true },
      { label: "I uploaded the draft PDF I want reviewed.", checked: true },
    ],
  },
  {
    name: "Maya Patel",
    email: "maya.patel@example.com",
    colleges: "Stanford, USC",
    notes: "Activity descriptions are still rough.",
    service_key: "activities",
    service_label: "Activity List Review",
    vc_cost: 3,
    submission_checklist: [
      { label: "I confirmed this is the correct prompt/service.", checked: true },
      { label: "I verified my deadline and added any key context in notes.", checked: true },
      { label: "I uploaded the draft PDF I want reviewed.", checked: true },
    ],
  },
  {
    name: "Ethan Kim",
    email: "ethan.kim@example.com",
    colleges: "Michigan, Purdue",
    notes: "Need feedback on opening and conclusion.",
    service_key: "essay_medium",
    service_label: "Supplemental Essay (301-500 words)",
    vc_cost: 5,
    submission_checklist: [
      { label: "I confirmed this is the correct prompt/service.", checked: true },
      { label: "I verified my deadline and added any key context in notes.", checked: true },
      { label: "I uploaded the draft PDF I want reviewed.", checked: true },
    ],
  },
];

function alreadySeeded(sample) {
  return db.data.submissions.some(
    (s) =>
      s.name === sample.name &&
      s.email === sample.email &&
      s.service_key === sample.service_key &&
      s.submission_title === `${sample.name} - ${sample.service_label}`
  );
}

async function run() {
  await initDb();

  const created = [];
  for (const sample of SAMPLES) {
    if (alreadySeeded(sample)) continue;

    const submission = await Submission.create({
      ...sample,
      submission_title: `${sample.name} - ${sample.service_label}`,
      profile_id: null,
      attachment_filename: null,
      attachment_original_name: null,
      attachment_storage_path: null,
      attachment_url: null,
    });

    created.push({
      id: submission.id,
      title: submission.submission_title,
      email: submission.email,
      status: submission.status,
    });
  }

  if (created.length === 0) {
    console.log("No new samples were inserted (already present).");
    return;
  }

  console.log("Inserted sample submissions:");
  for (const row of created) {
    console.log(`- #${row.id}: ${row.title} (${row.email}) [${row.status}]`);
  }
}

run().catch((err) => {
  console.error("Failed seeding sample submissions:", err.message || err);
  process.exit(1);
});
