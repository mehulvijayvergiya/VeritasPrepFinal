import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { initDb } from "./config/db.js";
import { validateEnv } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import studentsRoutes from "./routes/students.js";
import submissionsRoutes from "./routes/submissions.js";
import creditRequestsRoutes from "./routes/creditRequests.js";

validateEnv();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/submissions", submissionsRoutes);
app.use("/api/credit-requests", creditRequestsRoutes);

// Centralized error handler (catches anything thrown synchronously in handlers)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end." });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Veritas Prep API running on http://localhost:${PORT}`);
  });
});
