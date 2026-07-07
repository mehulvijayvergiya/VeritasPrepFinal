import { Router } from "express";
import { getAccount } from "../controllers/accountsController.js";

const router = Router();

// Public — a student checking their own balance/referral code by email.
router.get("/:email", getAccount);

export default router;
