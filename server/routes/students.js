import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireStudentAuth } from "../middleware/studentAuth.js";
import { getMySubmissionDownloadUrl, getMySubmissionFeedbackDownloadUrl } from "../controllers/submissionsController.js";
import {
	createStudentViewToken,
	getStudentProfileAdmin,
	getStudentRosterAdmin,
	me,
	mySubmissions,
	myTransactions,
	updateMyProfile,
	viewAsStudentDashboard,
	viewAsStudentSubmissionFeedbackDownloadUrl,
	viewAsStudentSubmissionDownloadUrl,
} from "../controllers/studentsController.js";

const router = Router();

router.get("/me", requireStudentAuth, me);
router.get("/submissions", requireStudentAuth, mySubmissions);
router.get("/transactions", requireStudentAuth, myTransactions);
router.get("/submissions/:id/download-url", requireStudentAuth, getMySubmissionDownloadUrl);
router.get("/submissions/:id/feedback-download-url", requireStudentAuth, getMySubmissionFeedbackDownloadUrl);
router.patch("/me", requireStudentAuth, updateMyProfile);
router.get("/view-as/dashboard", viewAsStudentDashboard);
router.get("/view-as/submissions/:id/download-url", viewAsStudentSubmissionDownloadUrl);
router.get("/view-as/submissions/:id/feedback-download-url", viewAsStudentSubmissionFeedbackDownloadUrl);
router.post("/:profileId/view-token", requireAuth, createStudentViewToken);
router.get("/profile/:profileId", requireAuth, getStudentProfileAdmin);
router.get("/roster", requireAuth, getStudentRosterAdmin);

export default router;
