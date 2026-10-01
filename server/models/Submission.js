import { db } from "../config/db.js";
import { getSupabase } from "../config/supabaseClient.js";

const VALID_STATUSES = ["pending", "in_review", "completed"];
const VALID_ANNOTATION_TYPES = ["highlight", "underline", "note"];

function normalizeChecklist(checklist) {
  if (!Array.isArray(checklist)) return [];
  return checklist
    .filter((item) => item && typeof item.label === "string")
    .map((item) => ({
      label: item.label.trim().slice(0, 200),
      checked: Boolean(item.checked),
    }))
    .filter((item) => item.label.length > 0);
}

function formatSubmissionTitle(name, serviceLabel, serviceKey) {
  const left = (name || "Student").trim();
  const right = (serviceLabel || serviceKey || "Submission").trim();
  return `${left} - ${right}`;
}

function hydrateSubmission(submission) {
  if (!submission.attachment_storage_path && submission.attachment_path) {
    submission.attachment_storage_path = submission.attachment_path;
  }
  if (!submission.submission_title) {
    submission.submission_title = formatSubmissionTitle(
      submission.name,
      submission.service_label,
      submission.service_key
    );
  }
  submission.submission_checklist = normalizeChecklist(submission.submission_checklist || []);
  return submission;
}

function mapSupabaseSubmission(row) {
  return hydrateSubmission({
    ...row,
    attachment_storage_path: row.attachment_storage_path || row.attachment_path || null,
  });
}

function getSubmissionId(submission) {
  return Number(submission?.id);
}

function recalcNextSubmissionId() {
  const maxId = db.data.submissions.reduce((max, item) => {
    const id = getSubmissionId(item);
    return Number.isFinite(id) && id > max ? id : max;
  }, 0);
  db.data.nextSubmissionId = maxId + 1;
}

async function refreshSubmissionsFromSupabase() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Unable to load submissions from Supabase.");
  }

  const mergedById = new Map();
  for (const local of db.data.submissions) {
    const id = getSubmissionId(local);
    if (Number.isFinite(id)) {
      mergedById.set(id, hydrateSubmission(local));
    }
  }
  for (const remote of data || []) {
    const mapped = mapSupabaseSubmission(remote);
    const id = getSubmissionId(mapped);
    if (Number.isFinite(id)) {
      const existing = mergedById.get(id);
      mergedById.set(id, existing ? { ...existing, ...mapped } : mapped);
    }
  }

  db.data.submissions = [...mergedById.values()].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
  recalcNextSubmissionId();
  await db.write();
  return db.data.submissions;
}

async function syncSubmissionToSupabase(submission) {
  try {
    const supabase = getSupabase();
    const formattedTitle = formatSubmissionTitle(
      submission.name,
      submission.service_label,
      submission.service_key
    );
    await supabase.from("submissions").upsert(
      {
        id: submission.id,
        profile_id: submission.profile_id || null,
        name: submission.name,
        email: submission.email,
        colleges: submission.colleges,
        essay: submission.essay || "",
        essay_for_college: submission.essay_for_college || null,
        word_count: submission.word_count ?? null,
        essay_prompt: submission.essay_prompt || null,
        activities: submission.activities || "",
        notes: submission.notes || "",
        submission_title: submission.submission_title || formattedTitle,
        submission_type: submission.submission_type || null,
        submission_checklist: submission.submission_checklist || [],
        payment_verified: Boolean(submission.payment_verified),
        payment_verified_at: submission.payment_verified_at || null,
        google_drive_folder_id: submission.google_drive_folder_id || null,
        google_drive_folder_url: submission.google_drive_folder_url || null,
        status: submission.status || "pending",
        reviewer_notes: submission.reviewer_notes || "",
        annotations: submission.annotations || [],
        comments: submission.comments || [],
        feedback_sent_at: submission.feedback_sent_at || null,
        manual_email_sent: Boolean(submission.manual_email_sent),
        manual_email_sent_at: submission.manual_email_sent_at || null,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        attachment_path: submission.attachment_storage_path || null,
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.warn("Unable to sync submission to Supabase:", err.message);
  }
}

export const Submission = {
  async create({
    name,
    email,
    colleges,
    essay,
    essay_for_college,
    word_count,
    essay_prompt,
    activities,
    notes,
    service_key,
    service_label,
    submission_title,
    vc_cost,
    submission_checklist,
    profile_id,
    attachment_filename,
    attachment_original_name,
    attachment_storage_path,
    attachment_url,
  }) {
    try {
      await refreshSubmissionsFromSupabase();
    } catch (err) {
      console.warn("Proceeding with local submission cache:", err.message);
    }

    const now = new Date().toISOString();
    const submission = {
      id: db.data.nextSubmissionId++,
      name,
      email,
      colleges,
      essay: essay || "",
      essay_for_college: essay_for_college || null,
      word_count: word_count ?? null,
      essay_prompt: essay_prompt || null,
      activities: activities || "",
      notes: notes || "",
      service_key: service_key || null,
      service_label: service_label || null,
      submission_type: service_key || null,
      submission_title:
        submission_title || formatSubmissionTitle(name, service_label || "", service_key || ""),
      submission_checklist: normalizeChecklist(submission_checklist),
      vc_cost: vc_cost ?? null,
      profile_id: profile_id || null,
      attachment_filename: attachment_filename || null,
      attachment_original_name: attachment_original_name || null,
      attachment_storage_path: attachment_storage_path || null,
      attachment_url: attachment_url || null,
      vc_charged: false,
      vc_charged_at: null,
      payment_verified: false,
      payment_verified_at: null,
      google_drive_folder_id: null,
      google_drive_folder_url: null,
      status: "pending",
      reviewer_notes: "",
      annotations: [],
      comments: [],
      feedback_sent_at: null,
      manual_email_sent: false,
      manual_email_sent_at: null,
      created_at: now,
      updated_at: now,
    };
    db.data.submissions.push(submission);
    await db.write();
    await syncSubmissionToSupabase(submission);
    return submission;
  },

  async findAll() {
    try {
      return await refreshSubmissionsFromSupabase();
    } catch {
      return db.data.submissions.map(hydrateSubmission).sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
    }
  },

  async findById(id) {
    try {
      await refreshSubmissionsFromSupabase();
    } catch {
      // Fall back to local cache.
    }

    const submissionId = Number(id);
    const submission = db.data.submissions.find((s) => Number(s.id) === submissionId);
    return submission ? hydrateSubmission(submission) : null;
  },

  async listByProfile(profileId, profileEmail) {
    try {
      await refreshSubmissionsFromSupabase();
    } catch {
      // Fall back to local cache.
    }

    const normalizedEmail = (profileEmail || "").toLowerCase().trim();
    return db.data.submissions
      .filter((s) => {
        if (profileId && s.profile_id === profileId) return true;
        if (!normalizedEmail || !s.email) return false;
        return s.email.toLowerCase() === normalizedEmail;
      })
      .map(hydrateSubmission)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async updateStatus(id, {
    status,
    reviewer_notes,
    payment_verified,
    google_drive_folder_id,
    google_drive_folder_url,
    vc_charged,
    vc_charged_at,
    manual_email_sent,
    manual_email_sent_at,
  }) {
    const submission = await Submission.findById(id);
    if (!submission) return null;
    if (status && !VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    if (status) submission.status = status;
    if (reviewer_notes !== undefined && reviewer_notes !== null) {
      submission.reviewer_notes = reviewer_notes;
    }
    if (payment_verified !== undefined) {
      submission.payment_verified = Boolean(payment_verified);
      submission.payment_verified_at = submission.payment_verified ? new Date().toISOString() : null;
    }
    if (google_drive_folder_id !== undefined) {
      submission.google_drive_folder_id = google_drive_folder_id || null;
    }
    if (google_drive_folder_url !== undefined) {
      submission.google_drive_folder_url = google_drive_folder_url || null;
    }
    if (vc_charged !== undefined) {
      submission.vc_charged = Boolean(vc_charged);
    }
    if (vc_charged_at !== undefined) {
      submission.vc_charged_at = vc_charged_at || null;
    }
    if (manual_email_sent !== undefined) {
      submission.manual_email_sent = Boolean(manual_email_sent);
    }
    if (manual_email_sent_at !== undefined) {
      submission.manual_email_sent_at = manual_email_sent_at || null;
    }
    submission.updated_at = new Date().toISOString();
    await db.write();
    await syncSubmissionToSupabase(submission);
    return submission;
  },

  async updateAnnotations(id, annotations) {
    const submission = await Submission.findById(id);
    if (!submission) return null;
    if (!Array.isArray(annotations)) {
      throw new Error("Annotations must be an array.");
    }
    for (const a of annotations) {
      if (
        typeof a.id !== "string" ||
        typeof a.start !== "number" ||
        typeof a.end !== "number" ||
        a.start < 0 ||
        a.end <= a.start ||
        !VALID_ANNOTATION_TYPES.includes(a.type)
      ) {
        throw new Error("One or more annotations are malformed.");
      }
    }
    submission.annotations = annotations.map((a) => ({
      id: a.id,
      start: a.start,
      end: a.end,
      type: a.type,
      note: (a.note || "").slice(0, 1000),
    }));
    submission.updated_at = new Date().toISOString();
    await db.write();
    await syncSubmissionToSupabase(submission);
    return submission;
  },

  async addComment(id, text) {
    const submission = await Submission.findById(id);
    if (!submission) return null;
    if (!text || !text.trim()) {
      throw new Error("Comment text is required.");
    }
    const comment = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: text.trim(),
      created_at: new Date().toISOString(),
    };
    submission.comments.push(comment);
    submission.updated_at = new Date().toISOString();
    await db.write();
    await syncSubmissionToSupabase(submission);
    return submission;
  },

  async deleteComment(id, commentId) {
    const submission = await Submission.findById(id);
    if (!submission) return null;
    submission.comments = submission.comments.filter((c) => c.id !== commentId);
    submission.updated_at = new Date().toISOString();
    await db.write();
    await syncSubmissionToSupabase(submission);
    return submission;
  },

  async markFeedbackSent(id) {
    const submission = await Submission.findById(id);
    if (!submission) return null;
    submission.feedback_sent_at = new Date().toISOString();
    submission.updated_at = new Date().toISOString();
    await db.write();
    await syncSubmissionToSupabase(submission);
    return submission;
  },
};

export { VALID_STATUSES, VALID_ANNOTATION_TYPES };
