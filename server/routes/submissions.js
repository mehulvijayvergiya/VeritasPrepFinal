import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireStudentAuth } from "../middleware/studentAuth.js";
import { submitLimiter } from "../middleware/rateLimit.js";
import { uploadPdf } from "../middleware/upload.js";
import {
  createSubmission,
  listSubmissions,
  getSubmission,
  getSubmissionDownloadUrl,
  updateSubmission,
  updateAnnotations,
  addComment,
  deleteComment,
  sendFeedback,
} from "../controllers/submissionsController.js";

const router = Router();

// Student-authenticated submission flow.
router.post("/", requireStudentAuth, submitLimiter, uploadPdf.single("pdf"), createSubmission);

// Admin only
router.get("/", requireAuth, listSubmissions);
router.get("/:id", requireAuth, getSubmission);
router.get("/:id/download-url", requireAuth, getSubmissionDownloadUrl);
router.patch("/:id", requireAuth, updateSubmission);
router.patch("/:id/annotations", requireAuth, updateAnnotations);
router.post("/:id/comments", requireAuth, addComment);
router.delete("/:id/comments/:commentId", requireAuth, deleteComment);
router.post("/:id/send-feedback", requireAuth, sendFeedback);

export default router;
