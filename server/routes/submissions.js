import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { submitLimiter } from "../middleware/rateLimit.js";
import { uploadPdf } from "../middleware/upload.js";
import {
  createSubmission,
  listSubmissions,
  getSubmission,
  updateSubmission,
  updateAnnotations,
  addComment,
  deleteComment,
  sendFeedback,
} from "../controllers/submissionsController.js";

const router = Router();

// Public — a prospective student submitting their application materials.
// The frontend only reaches this once logged in, but the endpoint itself
// doesn't require the admin JWT (students don't have one).
router.post("/", submitLimiter, uploadPdf.single("pdf"), createSubmission);

// Admin only
router.get("/", requireAuth, listSubmissions);
router.get("/:id", requireAuth, getSubmission);
router.patch("/:id", requireAuth, updateSubmission);
router.patch("/:id/annotations", requireAuth, updateAnnotations);
router.post("/:id/comments", requireAuth, addComment);
router.delete("/:id/comments/:commentId", requireAuth, deleteComment);
router.post("/:id/send-feedback", requireAuth, sendFeedback);

export default router;
