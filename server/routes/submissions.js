import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { submitLimiter } from "../middleware/rateLimit.js";
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

// Public — a prospective student submitting their application materials
router.post("/", submitLimiter, createSubmission);

// Admin only
router.get("/", requireAuth, listSubmissions);
router.get("/:id", requireAuth, getSubmission);
router.patch("/:id", requireAuth, updateSubmission);
router.patch("/:id/annotations", requireAuth, updateAnnotations);
router.post("/:id/comments", requireAuth, addComment);
router.delete("/:id/comments/:commentId", requireAuth, deleteComment);
router.post("/:id/send-feedback", requireAuth, sendFeedback);

export default router;
