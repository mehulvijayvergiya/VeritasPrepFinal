import { Router } from "express";
import { requireStudentAuth } from "../middleware/studentAuth.js";
import { me } from "../controllers/studentsController.js";

const router = Router();

router.get("/me", requireStudentAuth, me);

export default router;
