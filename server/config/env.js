// Validates required environment variables at startup and enforces stricter
// rules once NODE_ENV=production, so the app can never boot into production
// with a weak secret or a default admin password.

const isProd = process.env.NODE_ENV === "production";

const DEFAULT_ADMIN_PASSWORD = "changeme123";

export function validateEnv() {
  const errors = [];

  if (!process.env.JWT_SECRET) {
    errors.push("JWT_SECRET is missing.");
  } else if (isProd && process.env.JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters in production.");
  }

  if (isProd) {
    if (!process.env.ADMIN_EMAIL) {
      errors.push("ADMIN_EMAIL must be set explicitly in production.");
    }
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
      errors.push("ADMIN_PASSWORD must be set to a strong, non-default value in production.");
    }
    if (!process.env.CLIENT_ORIGIN) {
      errors.push("CLIENT_ORIGIN must be set explicitly in production (no localhost fallback).");
    }
  }

  if (errors.length > 0) {
    console.error("\nRefusing to start — invalid environment configuration:");
    for (const e of errors) console.error(`  - ${e}`);
    console.error("\nFix the above in your .env (or hosting provider's env settings) and restart.\n");
    process.exit(1);
  }
}
