import { db } from "../config/db.js";

const VALID_STATUSES = ["pending", "in_review", "completed"];
const VALID_ANNOTATION_TYPES = ["highlight", "underline", "note"];

export const Submission = {
  async create({ name, email, colleges, essay, activities, notes }) {
    const now = new Date().toISOString();
    const submission = {
      id: db.data.nextSubmissionId++,
      name,
      email,
      colleges,
      essay,
      activities,
      notes: notes || "",
      status: "pending",
      reviewer_notes: "",
      annotations: [],
      comments: [],
      feedback_sent_at: null,
      created_at: now,
      updated_at: now,
    };
    db.data.submissions.push(submission);
    await db.write();
    return submission;
  },

  findAll() {
    return [...db.data.submissions].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  },

  findById(id) {
    return db.data.submissions.find((s) => s.id === Number(id));
  },

  async updateStatus(id, { status, reviewer_notes }) {
    const submission = Submission.findById(id);
    if (!submission) return null;
    if (status && !VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    if (status) submission.status = status;
    if (reviewer_notes !== undefined && reviewer_notes !== null) {
      submission.reviewer_notes = reviewer_notes;
    }
    submission.updated_at = new Date().toISOString();
    await db.write();
    return submission;
  },

  async updateAnnotations(id, annotations) {
    const submission = Submission.findById(id);
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
    return submission;
  },

  async addComment(id, text) {
    const submission = Submission.findById(id);
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
    return submission;
  },

  async deleteComment(id, commentId) {
    const submission = Submission.findById(id);
    if (!submission) return null;
    submission.comments = submission.comments.filter((c) => c.id !== commentId);
    submission.updated_at = new Date().toISOString();
    await db.write();
    return submission;
  },

  async markFeedbackSent(id) {
    const submission = Submission.findById(id);
    if (!submission) return null;
    submission.feedback_sent_at = new Date().toISOString();
    await db.write();
    return submission;
  },
};

export { VALID_STATUSES, VALID_ANNOTATION_TYPES };
