import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireStudentAuth } from "../middleware/studentAuth.js";
import { getMySubmissionDownloadUrl } from "../controllers/submissionsController.js";
import {
	getStudentProfileAdmin,
	getStudentRosterAdmin,
	me,
	mySubmissions,
	myTransactions,
	updateMyProfile,
} from "../controllers/studentsController.js";

const router = Router();

router.get("/me", requireStudentAuth, me);
router.get("/submissions", requireStudentAuth, mySubmissions);
router.get("/transactions", requireStudentAuth, myTransactions);
router.get("/submissions/:id/download-url", requireStudentAuth, getMySubmissionDownloadUrl);
router.patch("/me", requireStudentAuth, updateMyProfile);
router.get("/profile/:profileId", requireAuth, getStudentProfileAdmin);
router.get("/roster", requireAuth, getStudentRosterAdmin);

export default router;
