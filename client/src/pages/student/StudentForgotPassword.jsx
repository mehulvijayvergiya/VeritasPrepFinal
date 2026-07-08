import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../lib/studentAuth.js";

export default function StudentForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "Unable to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-3">
          <img src="/logo.png" alt="Veritas Prep" className="h-12 w-12" />
        </Link>
        <h1 className="mt-6 text-center font-display text-2xl text-white">Reset your password</h1>
        <p className="mt-2 text-center font-body text-sm text-ink-100/60">
          We'll email you a link to set a new one.
        </p>

        {sent ? (
          <div className="mt-8 rounded-sm bg-white p-7 text-center paper-shadow">
            <p className="font-body text-sm text-ink-400">
              If an account exists for <strong className="text-ink-900">{email}</strong>, a reset
              link is on its way.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block font-body text-sm font-medium text-ink-900 ink-underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-sm bg-white p-7 paper-shadow">
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
              {loading ? "Sending…" : "Send reset link"}
            </button>

            <p className="text-center font-body text-sm text-ink-400">
              <Link to="/login" className="font-medium text-ink-900 ink-underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
