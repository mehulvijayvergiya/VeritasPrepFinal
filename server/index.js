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
import appointmentsRoutes from "./routes/appointments.js";
import accountsRoutes from "./routes/accounts.js";
import transactionsRoutes from "./routes/transactions.js";

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
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/transactions", transactionsRoutes);

// Centralized error handler (catches anything thrown synchronously in handlers)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end." });
});

initDb().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Veritas Prep API running on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err?.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the existing process on port ${PORT}, then restart the server.`
      );
      process.exit(1);
    }
    throw err;
  });
});
