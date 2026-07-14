import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireStudentAuth } from "../middleware/studentAuth.js";
import {
	createAppointment,
	createAppointmentSlot,
	deleteAppointmentSlot,
	listAppointments,
	listAppointmentSlotsAdmin,
	listAppointmentSlots,
	listMyAppointments,
	rescheduleMyAppointment,
	updateAppointmentStatus,
} from "../controllers/appointmentsController.js";

const router = Router();

router.get("/slots", listAppointmentSlots);
router.get("/slots/admin", requireAuth, listAppointmentSlotsAdmin);
router.post("/slots", requireAuth, createAppointmentSlot);
router.delete("/slots/:id", requireAuth, deleteAppointmentSlot);
router.get("/", requireAuth, listAppointments);
router.get("/my", requireStudentAuth, listMyAppointments);
router.post("/", requireStudentAuth, createAppointment);
router.patch("/:id/reschedule", requireStudentAuth, rescheduleMyAppointment);
router.patch("/:id/status", requireAuth, updateAppointmentStatus);

export default router;
