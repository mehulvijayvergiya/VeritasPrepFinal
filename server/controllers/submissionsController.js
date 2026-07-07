import { Submission } from "../models/Submission.js";
import { sendConfirmationEmail, sendFeedbackEmail } from "../services/email.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createSubmission(req, res) {
  const { name, email, colleges, essay, activities, notes } = req.body;

  const errors = {};
  if (!name || !name.trim()) errors.name = "Full name is required.";
  if (!email || !EMAIL_RE.test(email)) errors.email = "A valid email is required.";
  if (!colleges || !colleges.trim()) errors.colleges = "Please list at least one target college.";
  if (!essay || !essay.trim()) errors.essay = "Essay text is required.";
  else if (essay.trim().length < 50) errors.essay = "Essay looks too short — please paste the full draft.";
  if (!activities || !activities.trim()) errors.activities = "Activities list is required.";

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ error: "Please fix the highlighted fields.", fields: errors });
  }

  const submission = await Submission.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    colleges: colleges.trim(),
    essay: essay.trim(),
    activities: activities.trim(),
    notes: (notes || "").trim(),
  });

  // Don't let an email hiccup fail the submission itself.
  try {
    await sendConfirmationEmail({ to: submission.email, name: submission.name });
  } catch (err) {
    console.error("Failed to send confirmation email:", err.message);
  }

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
  const { status, reviewer_notes } = req.body;
  try {
    const submission = await Submission.updateStatus(req.params.id, { status, reviewer_notes });
    if (!submission) return res.status(404).json({ error: "Submission not found." });
    res.json({ submission });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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
  const submission = Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ error: "Submission not found." });

  if (submission.comments.length === 0 && submission.annotations.length === 0) {
    return res.status(400).json({
      error: "Add at least one comment or annotation before sending feedback.",
    });
  }

  try {
    await sendFeedbackEmail({
      to: submission.email,
      name: submission.name,
      essay: submission.essay,
      annotations: submission.annotations,
      comments: submission.comments,
    });
  } catch (err) {
    return res.status(502).json({ error: `Could not send email: ${err.message}` });
  }

  const updated = await Submission.markFeedbackSent(submission.id);
  res.json({ submission: updated });
}
