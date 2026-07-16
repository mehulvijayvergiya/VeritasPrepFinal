import { useState } from "react";
import { Link } from "react-router-dom";
import { registerStudent } from "../../lib/studentAuth.js";

export default function StudentRegister() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await registerStudent({ email, password, fullName });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-900 px-6">
        <div className="w-full max-w-sm rounded-sm bg-white p-7 text-center paper-shadow">
          <h1 className="font-display text-2xl text-ink-900">Check your email</h1>
          <p className="mt-3 font-body text-sm text-ink-400">
            We sent a verification link to <strong>{email}</strong>. Click it to activate your
            account, then come back and sign in.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block font-body text-sm font-medium text-ink-900 ink-underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-4 text-center">
          <Link to="/" className="font-body text-xs font-medium text-white ink-underline">
            Back to Home
          </Link>
        </div>
        <Link to="/" className="flex items-center justify-center gap-3">
          <img src="/logo.png" alt="Veritas Prep" className="h-12 w-12" />
        </Link>
        <h1 className="mt-6 text-center font-display text-2xl text-white">Create your account</h1>
        <p className="mt-2 text-center font-body text-sm text-ink-100/60">
          Track submissions, credits, and appointments in one place.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-sm bg-white p-7 paper-shadow">
          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">Full name</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2 w-full rounded-sm border border-hairline px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-sm border border-hairline px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">Password</span>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sm border border-hairline px-4 py-2.5 pr-12 font-body text-sm focus:border-ink-900 focus:outline-none"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-400 transition hover:text-ink-900"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
            <span className="mt-1 block font-body text-xs text-ink-400">At least 8 characters.</span>
          </label>

          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">Confirm password</span>
            <div className="relative mt-2">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-sm border border-hairline px-4 py-2.5 pr-12 font-body text-sm focus:border-ink-900 focus:outline-none"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-400 transition hover:text-ink-900"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </label>

          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 font-body text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm bg-ink-900 px-5 py-3 font-body text-sm font-medium text-white transition hover:bg-ink-600 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center font-body text-sm text-ink-400">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-ink-900 ink-underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
