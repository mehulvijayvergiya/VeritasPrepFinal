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

function toSafeSegment(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function hydrateSubmission(submission) {
  if (!submission.attachment_storage_path && submission.attachment_path) {
    submission.attachment_storage_path = submission.attachment_path;
  }
  if (!submission.feedback_attachment_storage_path && submission.feedback_attachment_path) {
    submission.feedback_attachment_storage_path = submission.feedback_attachment_path;
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
    feedback_attachment_storage_path:
      row.feedback_attachment_storage_path || row.feedback_attachment_path || null,
  });
}

function extractMissingColumn(error) {
  const message = String(error?.message || "");
  const explicit = message.match(/column\s+submissions\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (explicit) return explicit[1];
  const quoted = message.match(/Could not find '([^']+)' column/i);
  return quoted ? quoted[1] : null;
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

async function syncSubmissionToSupabase(submission, { strict = false } = {}) {
  try {
    const supabase = getSupabase();
    const formattedTitle = formatSubmissionTitle(
      submission.name,
      submission.service_label,
      submission.service_key
    );
    const payload = {
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
      service_key: submission.service_key || null,
      service_label: submission.service_label || null,
      vc_cost: submission.vc_cost ?? null,
      submission_title: submission.submission_title || formattedTitle,
      submission_type: submission.submission_type || null,
      submission_checklist: submission.submission_checklist || [],
      payment_verified: Boolean(submission.payment_verified),
      payment_verified_at: submission.payment_verified_at || null,
      vc_charged: Boolean(submission.vc_charged),
      vc_charged_at: submission.vc_charged_at || null,
      google_drive_folder_id: submission.google_drive_folder_id || null,
      google_drive_folder_url: submission.google_drive_folder_url || null,
      feedback_attachment_filename: submission.feedback_attachment_filename || null,
      feedback_attachment_original_name: submission.feedback_attachment_original_name || null,
      feedback_attachment_storage_path: submission.feedback_attachment_storage_path || null,
      feedback_attachment_url: submission.feedback_attachment_url || null,
      status: submission.status || "pending",
      reviewer_notes: submission.reviewer_notes || "",
      annotations: submission.annotations || [],
      comments: submission.comments || [],
      feedback_sent_at: submission.feedback_sent_at || null,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      attachment_path: submission.attachment_storage_path || null,
    };

    const mutablePayload = { ...payload };
    while (true) {
      const { error } = await supabase
        .from("submissions")
        .upsert(mutablePayload, { onConflict: "id" });

      if (!error) {
        return;
      }

      const missingColumn = extractMissingColumn(error);
      if (!missingColumn || !(missingColumn in mutablePayload)) {
        throw error;
      }

      delete mutablePayload[missingColumn];
      if (Object.keys(mutablePayload).length === 0) {
        throw error;
      }
    }
  } catch (err) {
    if (strict) {
      throw err;
    }
    console.warn("Unable to sync submission to Supabase:", err.message);
  }
}

async function listStorageFilesRecursive(prefix, out) {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from("student-submissions").list(prefix, {
    limit: 100,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    return;
  }

  const items = Array.isArray(data) ? data : [];
  for (const item of items) {
    const fullPath = `${prefix}/${item.name}`;
    if (item.metadata) {
      out.push({
        path: fullPath,
        name: item.name,
        created_at: item.created_at,
      });
    } else {
      await listStorageFilesRecursive(fullPath, out);
    }
  }
}

function inferServiceKeyFromPath(storagePath) {
  const lower = (storagePath || "").toLowerCase();
  if (lower.includes("/activities/")) return "activities";
  if (lower.includes("/essay-short/")) return "essay_short";
  if (lower.includes("/essay-medium/")) return "essay_medium";
  if (lower.includes("/essay-long/")) return "essay_long";
  if (lower.includes("/meeting")) return "meeting";
  return null;
}

function inferServiceLabel(serviceKey) {
  if (serviceKey === "activities") return "Activity List Review";
  if (serviceKey === "essay_short") return "Supplemental Essay (<= 300 words)";
  if (serviceKey === "essay_medium") return "Supplemental Essay (301-500 words)";
  if (serviceKey === "essay_long") return "Essay (> 500 words / Common App)";
  if (serviceKey === "meeting") return "15-min 1:1 Meeting";
  return "Submission";
}

function inferFileNameFromPath(storagePath) {
  if (!storagePath || typeof storagePath !== "string") return null;
  const parts = storagePath.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
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
    created_at,
    updated_at,
  }, options = {}) {
    if (!options.skipPreRefresh) {
      try {
        await refreshSubmissionsFromSupabase();
      } catch (err) {
        console.warn("Proceeding with local submission cache:", err.message);
      }
    }

    const now = new Date().toISOString();
    const createdAt = created_at || now;
    const updatedAt = updated_at || createdAt;
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
      feedback_attachment_filename: null,
      feedback_attachment_original_name: null,
      feedback_attachment_storage_path: null,
      feedback_attachment_url: null,
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
      created_at: createdAt,
      updated_at: updatedAt,
    };
    db.data.submissions.push(submission);
    await db.write();
    await syncSubmissionToSupabase(submission, { strict: Boolean(options.strictSync) });
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

    await Submission.enrichRecoveredMetadata({
      profileId,
      profileEmail,
    });

    try {
      await refreshSubmissionsFromSupabase();
    } catch {
      // Fall back to local cache.
    }

    const normalizedEmail = (profileEmail || "").toLowerCase().trim();
    let matched = db.data.submissions
      .filter((s) => {
        if (profileId && s.profile_id === profileId) return true;
        if (!normalizedEmail || !s.email) return false;
        return s.email.toLowerCase() === normalizedEmail;
      })
      .map(hydrateSubmission)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (matched.length === 0) {
      const recovered = await Submission.recoverFromStorageForProfile({
        profileId,
        email: profileEmail,
      });
      if (recovered > 0) {
        await Submission.enrichRecoveredMetadata({ profileId, profileEmail });
        try {
          await refreshSubmissionsFromSupabase();
        } catch {
          // Fall back to local cache.
        }
        matched = db.data.submissions
          .filter((s) => {
            if (profileId && s.profile_id === profileId) return true;
            if (!normalizedEmail || !s.email) return false;
            return s.email.toLowerCase() === normalizedEmail;
          })
          .map(hydrateSubmission)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
    }

    return matched;
  },

  async enrichRecoveredMetadata({ profileId, profileEmail } = {}) {
    try {
      await refreshSubmissionsFromSupabase();
    } catch {
      // Continue with current cache.
    }

    const normalizedEmail = (profileEmail || "").toLowerCase().trim();
    const candidates = db.data.submissions.filter((submission) => {
      if (profileId && submission.profile_id === profileId) return true;
      if (normalizedEmail && submission.email && submission.email.toLowerCase() === normalizedEmail) return true;
      return false;
    });

    let changed = false;
    for (const submission of candidates) {
      const inferredServiceKey = submission.service_key || inferServiceKeyFromPath(submission.attachment_storage_path || submission.attachment_path);
      const inferredServiceLabel = submission.service_label || inferServiceLabel(inferredServiceKey);
      const inferredFileName =
        submission.attachment_original_name ||
        submission.attachment_filename ||
        inferFileNameFromPath(submission.attachment_storage_path || submission.attachment_path);
      const inferredTitle = submission.submission_title || formatSubmissionTitle(submission.name, inferredServiceLabel, inferredServiceKey);

      let rowChanged = false;
      if (!submission.service_key && inferredServiceKey) {
        submission.service_key = inferredServiceKey;
        submission.submission_type = submission.submission_type || inferredServiceKey;
        rowChanged = true;
      }
      if (!submission.service_label && inferredServiceLabel) {
        submission.service_label = inferredServiceLabel;
        rowChanged = true;
      }
      if (!submission.submission_title && inferredTitle) {
        submission.submission_title = inferredTitle;
        rowChanged = true;
      }
      if (!submission.attachment_original_name && inferredFileName) {
        submission.attachment_original_name = inferredFileName;
        rowChanged = true;
      }
      if (!submission.attachment_filename && inferredFileName) {
        submission.attachment_filename = inferredFileName;
        rowChanged = true;
      }
      if ((submission.notes || "").trim() === "Recovered from uploaded PDF in storage.") {
        submission.notes = "";
        rowChanged = true;
      }

      if (rowChanged) {
        submission.updated_at = new Date().toISOString();
        await syncSubmissionToSupabase(submission);
        changed = true;
      }
    }

    if (changed) {
      await db.write();
    }

    return changed;
  },

  async recoverFromStorageForProfile({ profileId, email, name }) {
    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!profileId && !normalizedEmail && !name) return 0;

    try {
      await refreshSubmissionsFromSupabase();
    } catch {
      // Continue with local cache snapshot.
    }

    const existingPaths = new Set(
      db.data.submissions
        .map((s) => s.attachment_storage_path || s.attachment_path)
        .filter(Boolean)
    );

    const prefixes = [];
    const seenPrefixes = new Set();
    function pushPrefix(prefix) {
      if (!prefix || seenPrefixes.has(prefix)) return;
      seenPrefixes.add(prefix);
      prefixes.push(prefix);
    }

    if (profileId) pushPrefix(`students/${profileId}`);
    if (normalizedEmail) {
      pushPrefix(`students/${normalizedEmail}`);
      pushPrefix(`students/${toSafeSegment(normalizedEmail)}`);
      pushPrefix(`students/${normalizedEmail.replace(/@/g, " ").replace(/\./g, " ")}`);
    }
    if (name) {
      pushPrefix(`students/${name}`);
      pushPrefix(`students/${toSafeSegment(name)}`);
    }

    const files = [];
    for (const prefix of prefixes) {
      await listStorageFilesRecursive(prefix, files);
    }

    let recoveredCount = 0;
    for (const file of files) {
      const lowerPath = (file.path || "").toLowerCase();
      if (!lowerPath.endsWith(".pdf")) continue;
      if (existingPaths.has(file.path)) continue;

      const serviceKey = inferServiceKeyFromPath(file.path);
      const serviceLabel = inferServiceLabel(serviceKey);
      const inferredName = name || "Student";
      const inferredEmail = normalizedEmail || "unknown@example.com";
      const inferredFileName = file.name || inferFileNameFromPath(file.path) || "submission.pdf";

      await Submission.create(
        {
          name: inferredName,
          email: inferredEmail,
          colleges: "Recovered from storage",
          essay: "",
          activities: "",
          notes: "Recovered from uploaded PDF in storage.",
          service_key: serviceKey,
          service_label: serviceLabel,
          submission_title: formatSubmissionTitle(inferredName, serviceLabel, serviceKey),
          submission_checklist: [],
          profile_id: profileId || null,
          attachment_filename: inferredFileName,
          attachment_original_name: inferredFileName,
          attachment_storage_path: file.path,
          attachment_url: null,
          created_at: file.created_at || new Date().toISOString(),
          updated_at: file.created_at || new Date().toISOString(),
        },
        { skipPreRefresh: true, strictSync: true }
      );
      existingPaths.add(file.path);
      recoveredCount += 1;
    }

    return recoveredCount;
  },

  async updateStatus(id, {
    status,
    reviewer_notes,
    payment_verified,
    vc_cost,
    google_drive_folder_id,
    google_drive_folder_url,
    vc_charged,
    vc_charged_at,
    manual_email_sent,
    manual_email_sent_at,
    feedback_attachment_filename,
    feedback_attachment_original_name,
    feedback_attachment_storage_path,
    feedback_attachment_url,
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
    if (vc_cost !== undefined && vc_cost !== null && vc_cost !== "") {
      const parsedCost = Number(vc_cost);
      if (Number.isFinite(parsedCost) && parsedCost >= 0) {
        submission.vc_cost = parsedCost;
      }
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
    if (feedback_attachment_filename !== undefined) {
      submission.feedback_attachment_filename = feedback_attachment_filename || null;
    }
    if (feedback_attachment_original_name !== undefined) {
      submission.feedback_attachment_original_name = feedback_attachment_original_name || null;
    }
    if (feedback_attachment_storage_path !== undefined) {
      submission.feedback_attachment_storage_path = feedback_attachment_storage_path || null;
    }
    if (feedback_attachment_url !== undefined) {
      submission.feedback_attachment_url = feedback_attachment_url || null;
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
