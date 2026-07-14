import { Submission } from "../models/Submission.js";
import { Account } from "../models/Account.js";
import { ProfileModel } from "../models/supabase/profileModel.js";
import { Transaction } from "../models/Transaction.js";
import { PRICES } from "../config/pricing.js";
import { getSupabase } from "../config/supabaseClient.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Client-facing service keys -> authoritative server price keys. Never
// trust a client-supplied cost for something that spends real credits.
const SERVICE_KEY_MAP = {
  activities: "activities",
  essay_short: "essay_short",
  essay_medium: "essay_medium",
  essay_long: "essay_long",
  meeting: "meeting_15min",
};

const SERVICE_LABEL_MAP = {
  activities: "Activity List Review",
  essay_short: "Supplemental Essay (<= 300 words)",
  essay_medium: "Supplemental Essay (301-500 words)",
  essay_long: "Essay (> 500 words / Common App)",
  meeting: "15-min 1:1 Meeting",
};

function toSafeSegment(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseChecklist(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeChecklist(rawChecklist) {
  return parseChecklist(rawChecklist)
    .filter((item) => item && typeof item.label === "string")
    .map((item) => ({ label: item.label.trim().slice(0, 200), checked: Boolean(item.checked) }))
    .filter((item) => item.label.length > 0);
}

function buildSubmissionTitle(name, serviceLabel) {
  return `${name} - ${serviceLabel}`;
}

function submissionBelongsToStudent(submission, studentProfile) {
  if (!submission || !studentProfile) return false;
  if (submission.profile_id && studentProfile.id) {
    return submission.profile_id === studentProfile.id;
  }
  return (
    Boolean(submission.email) &&
    Boolean(studentProfile.email) &&
    submission.email.toLowerCase() === studentProfile.email.toLowerCase()
  );
}

async function ensureSubmissionBucket() {
  const supabase = getSupabase();
  const bucketName = "student-submissions";
  const { data: existing, error } = await supabase.storage.getBucket(bucketName);
  if (!error) return existing;
  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: "20MB",
    allowedMimeTypes: ["application/pdf"],
  });
  if (createError) throw createError;
  return true;
}

async function uploadPdfToStorage(file, profileId, email, serviceKey, submissionTitle) {
  if (!file) return null;
  await ensureSubmissionBucket();

  const ext = file.originalname?.split(".").pop() || "pdf";
  const now = new Date();
  const studentFolder = toSafeSegment(profileId || email || "student");
  const serviceFolder = toSafeSegment(serviceKey || "service");
  const title = toSafeSegment(submissionTitle || "submission");
  const safeName = `${title}-${Date.now()}.${ext}`;
  const storagePath = `students/${studentFolder}/${serviceFolder}/${now.getUTCFullYear()}/${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}/${safeName}`;
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from("student-submissions").upload(storagePath, file.buffer, {
    contentType: file.mimetype || "application/pdf",
    upsert: false,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return { storagePath: data.path, publicUrl: null };
}

async function adjustStudentCredits({ profileId, email, delta }) {
  const amount = Number(delta);
  if (!Number.isFinite(amount) || amount === 0) return;

  let adjusted = false;
  if (profileId) {
    await ProfileModel.adjustCreditsById(profileId, amount);
    adjusted = true;
  } else if (email) {
    const updatedProfile = await ProfileModel.adjustCreditsByEmail(email, amount);
    adjusted = Boolean(updatedProfile);
  }

  if (!adjusted && email) {
    if (amount < 0) {
      const updated = await Account.deductCredits(email, Math.abs(amount));
      if (!updated) {
        throw new Error("Student does not have enough credits for this approval.");
      }
    } else {
      await Account.addCredits(email, amount);
    }
  }
}

export async function createSubmission(req, res) {
  const {
    name,
    email,
    colleges,
    notes,
    service_key,
    profile_id,
    submission_checklist,
    essay_for_college,
    word_count,
    essay_prompt,
  } = req.body;

  const errors = {};
  const studentProfile = req.student?.profile;
  const resolvedName = (name || studentProfile?.full_name || "").trim();
  const resolvedEmail = (email || studentProfile?.email || "").trim().toLowerCase();
  const profileColleges = Array.isArray(studentProfile?.target_colleges)
    ? studentProfile.target_colleges.filter(Boolean).join(", ")
    : "";
  const resolvedColleges = (colleges || profileColleges || "Not provided").trim();

  if (!resolvedName) errors.name = "Full name is required.";
  if (!resolvedEmail || !EMAIL_RE.test(resolvedEmail)) errors.email = "A valid email is required.";

  const priceKey = SERVICE_KEY_MAP[service_key];
  if (!priceKey) errors.service_key = "Choose a valid service.";

  const isEssayService =
    service_key === "essay_short" || service_key === "essay_medium" || service_key === "essay_long";
  const resolvedEssayForCollege = (essay_for_college || "").trim();
  const resolvedEssayPrompt = (essay_prompt || "").trim();
  const resolvedWordCount = word_count !== undefined && word_count !== null && word_count !== ""
    ? Number(word_count)
    : null;

  if (isEssayService) {
    if (!resolvedEssayForCollege) {
      errors.essay_for_college = "College is required for essay submissions.";
    }
    if (!resolvedEssayPrompt) {
      errors.essay_prompt = "Essay prompt is required for essay submissions.";
    }
    if (!Number.isInteger(resolvedWordCount) || resolvedWordCount <= 0) {
      errors.word_count = "Word count must be a positive integer.";
    }
  }

  const checklist = normalizeChecklist(submission_checklist);
  if (checklist.length === 0) {
    errors.submission_checklist = "Please complete the submission checklist before submitting.";
  } else if (checklist.some((item) => !item.checked)) {
    errors.submission_checklist = "All checklist items must be confirmed before submission.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ error: "Please fix the highlighted fields.", fields: errors });
  }

  const vcCost = PRICES[priceKey];
  const serviceLabel = SERVICE_LABEL_MAP[service_key] || req.body.service_label || service_key;
  const submissionTitle = buildSubmissionTitle(resolvedName, serviceLabel);

  let uploadMeta = null;
  try {
    uploadMeta = await uploadPdfToStorage(
      req.file,
      studentProfile?.id || profile_id,
      resolvedEmail,
      service_key,
      submissionTitle
    );
  } catch (err) {
    return res.status(400).json({ error: err.message || "The PDF upload failed." });
  }

  const submission = await Submission.create({
    name: resolvedName,
    email: resolvedEmail,
    colleges: resolvedColleges,
    notes: (notes || "").trim(),
    essay_for_college: isEssayService ? resolvedEssayForCollege : null,
    word_count: isEssayService ? resolvedWordCount : null,
    essay_prompt: isEssayService ? resolvedEssayPrompt : null,
    service_key,
    service_label: serviceLabel,
    submission_title: submissionTitle,
    submission_checklist: checklist,
    vc_cost: vcCost,
    profile_id: studentProfile?.id || profile_id || null,
    attachment_filename: req.file ? req.file.originalname : null,
    attachment_original_name: req.file ? req.file.originalname : null,
    attachment_storage_path: uploadMeta?.storagePath || null,
    attachment_url: uploadMeta?.publicUrl || null,
  });

  res.status(201).json({ submission });
}

export function listSubmissions(req, res) {
  res.json({ submissions: Submission.findAll() });
}

export function getSubmission(req, res) {
  const submission = Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ error: "Submission not found." });
  res.json({ submission });
}

export async function updateSubmission(req, res) {
  const { status, reviewer_notes, payment_verified, manual_email_sent } = req.body;
  try {
    const existing = Submission.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Submission not found." });

    const nextStatus = status || existing.status;
    const isApprovalStatus = nextStatus === "in_review" || nextStatus === "completed";
    const shouldCharge = isApprovalStatus && !existing.vc_charged && Number(existing.vc_cost || 0) > 0;
    const shouldRefund = nextStatus === "pending" && Boolean(existing.vc_charged) && Number(existing.vc_cost || 0) > 0;

    if (shouldCharge) {
      try {
        await adjustStudentCredits({
          profileId: existing.profile_id,
          email: existing.email,
          delta: -Math.abs(Number(existing.vc_cost || 0)),
        });
      } catch (creditErr) {
        return res.status(422).json({ error: creditErr.message || "Unable to deduct credits." });
      }
      await Transaction.create({
        email: existing.email,
        type: "credit_spend",
        amount: -Math.abs(Number(existing.vc_cost || 0)),
        note: `Credits spent for ${existing.service_label || existing.service_key || "submission"}`,
        status: "completed",
      });
    }

    if (shouldRefund) {
      await adjustStudentCredits({
        profileId: existing.profile_id,
        email: existing.email,
        delta: Math.abs(Number(existing.vc_cost || 0)),
      });
      await Transaction.create({
        email: existing.email,
        type: "credit_refund",
        amount: Math.abs(Number(existing.vc_cost || 0)),
        note: `Credits refunded for ${existing.service_label || existing.service_key || "submission"}`,
        status: "completed",
      });
    }

    const submission = await Submission.updateStatus(req.params.id, {
      status,
      reviewer_notes,
      payment_verified,
      vc_charged:
        shouldCharge ? true : shouldRefund ? false : existing.vc_charged,
      vc_charged_at:
        shouldCharge ? new Date().toISOString() : shouldRefund ? null : existing.vc_charged_at,
    });

    res.json({ submission });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getSubmissionDownloadUrl(req, res) {
  const submission = Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ error: "Submission not found." });
  if (!submission.attachment_storage_path) {
    return res.status(404).json({ error: "No uploaded PDF found for this submission." });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from("student-submissions")
    .createSignedUrl(submission.attachment_storage_path, 60 * 15, {
      download: submission.attachment_original_name || submission.attachment_filename || "submission.pdf",
    });

  if (error || !data?.signedUrl) {
    return res.status(502).json({ error: error?.message || "Unable to generate download link." });
  }

  res.json({ url: data.signedUrl, expires_in: 60 * 15 });
}

export async function getMySubmissionDownloadUrl(req, res) {
  const submission = Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ error: "Submission not found." });
  if (!submissionBelongsToStudent(submission, req.student?.profile)) {
    return res.status(403).json({ error: "You do not have access to this submission." });
  }
  if (!submission.attachment_storage_path) {
    return res.status(404).json({ error: "No uploaded PDF found for this submission." });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from("student-submissions")
    .createSignedUrl(submission.attachment_storage_path, 60 * 15, {
      download: submission.attachment_original_name || submission.attachment_filename || "submission.pdf",
    });

  if (error || !data?.signedUrl) {
    return res.status(502).json({ error: error?.message || "Unable to generate download link." });
  }

  res.json({ url: data.signedUrl, expires_in: 60 * 15 });
}

export async function updateAnnotations(req, res) {
  const { annotations } = req.body;
  try {
    const submission = await Submission.updateAnnotations(req.params.id, annotations || []);
    if (!submission) return res.status(404).json({ error: "Submission not found." });
    res.json({ submission });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function addComment(req, res) {
  try {
    const submission = await Submission.addComment(req.params.id, req.body.text);
    if (!submission) return res.status(404).json({ error: "Submission not found." });
    res.status(201).json({ submission });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteComment(req, res) {
  const submission = await Submission.deleteComment(req.params.id, req.params.commentId);
  if (!submission) return res.status(404).json({ error: "Submission not found." });
  res.json({ submission });
}

export async function sendFeedback(req, res) {
  return res.status(410).json({ error: "Automatic feedback emails are disabled. Track manual emails in the admin dashboard instead." });
}
