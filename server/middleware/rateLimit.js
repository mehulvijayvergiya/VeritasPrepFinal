import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many login attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: { error: "Too many submissions from this connection. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
