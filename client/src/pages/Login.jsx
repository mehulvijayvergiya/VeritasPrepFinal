import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginStudent } from "../lib/studentAuth.js";
import { api, setToken } from "../lib/api.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Try student auth first (the common case), then fall back to admin.
    // Both use the same email/password fields — this is a single sign-in
    // form, not a toggle between two flows.
    try {
      await loginStudent({ email, password });
      navigate("/");
      return;
    } catch (studentErr) {
      // fall through to admin attempt
    }

    try {
      const { token } = await api.adminLogin(email, password);
      setToken(token);
      navigate("/admin");
      return;
    } catch (adminErr) {
      setError("Invalid email or password.");
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
        <h1 className="mt-6 text-center font-display text-2xl text-white">Sign in</h1>
        <p className="mt-2 text-center font-body text-sm text-ink-100/60">
          Veritas Prep
        </p>

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
          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">Password</span>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sm border border-hairline px-4 py-2.5 pr-12 font-body text-sm focus:border-ink-900 focus:outline-none"
                autoComplete="current-password"
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
          </label>

          <div className="text-right">
            <Link
              to="/student/forgot-password"
              className="font-body text-xs font-medium text-ink-400 ink-underline"
            >
              Forgot password?
            </Link>
          </div>

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
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center font-body text-sm text-ink-400">
            Don't have an account?{" "}
            <Link to="/student/register" className="font-medium text-ink-900 ink-underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
