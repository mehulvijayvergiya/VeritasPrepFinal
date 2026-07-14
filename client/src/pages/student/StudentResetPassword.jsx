import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getStudentSession, updateStudentPassword } from "../../lib/studentAuth.js";

export default function StudentResetPassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase parses the recovery token from the URL and establishes a
    // session automatically on load — give it a moment, then check.
    const timer = setTimeout(async () => {
      const session = await getStudentSession();
      setLinkValid(Boolean(session));
      setCheckingLink(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await updateStudentPassword(password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to update your password.");
    } finally {
      setLoading(false);
    }
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
        <h1 className="mt-6 text-center font-display text-2xl text-white">Set a new password</h1>

        <div className="mt-8 rounded-sm bg-white p-7 paper-shadow">
          {checkingLink ? (
            <p className="text-center font-body text-sm text-ink-400">Checking your link…</p>
          ) : !linkValid ? (
            <div className="text-center">
              <p className="font-body text-sm text-ink-400">
                This reset link is invalid or has expired.
              </p>
              <Link
                to="/student/forgot-password"
                className="mt-4 inline-block font-body text-sm font-medium text-ink-900 ink-underline"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="font-body text-sm font-medium text-ink-900">New password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-sm border border-hairline px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
                  autoComplete="new-password"
                />
                <span className="mt-1 block font-body text-xs text-ink-400">At least 8 characters.</span>
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
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
