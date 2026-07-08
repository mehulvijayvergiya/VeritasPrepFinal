import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createAppointment, listAppointments, updateAppointmentStatus } from "../controllers/appointmentsController.js";

const router = Router();

router.get("/", requireAuth, listAppointments);
router.post("/", createAppointment);
router.patch("/:id/status", requireAuth, updateAppointmentStatus);

export default router;
