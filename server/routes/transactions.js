import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createTransaction, listTransactions } from "../controllers/transactionsController.js";

const router = Router();

router.get("/", requireAuth, listTransactions);
router.post("/", createTransaction);

export default router;
