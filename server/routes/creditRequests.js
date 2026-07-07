import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createCreditRequest,
  listCreditRequests,
  approveCreditRequest,
  rejectCreditRequest,
} from "../controllers/creditRequestsController.js";

const router = Router();

// Public — a student submitting proof of a Venmo/Zelle payment for review.
router.post("/", createCreditRequest);

// Admin only
router.get("/", requireAuth, listCreditRequests);
router.post("/:id/approve", requireAuth, approveCreditRequest);
router.post("/:id/reject", requireAuth, rejectCreditRequest);

export default router;
