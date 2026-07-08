import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setToken } from "../lib/api.js";
import { loginStudent } from "../lib/studentAuth.js";

export default function SharedLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const adminAttempt = await api.adminLogin(email, password).catch(() => null);
      if (adminAttempt?.token) {
        setToken(adminAttempt.token);
        navigate("/admin");
        return;
      }

      await loginStudent({ email, password });
      navigate("/student/dashboard");
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-900">
      <div className="mx-auto flex max-w-6xl justify-end px-6 py-4">
        <Link to="/" className="font-body text-sm font-medium text-white ink-underline">Back to home</Link>
      </div>
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 pb-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-3">
          <img src="/logo.png" alt="Veritas Prep" className="h-12 w-12" />
        </Link>
        <h1 className="mt-6 text-center font-display text-2xl text-white">Sign in</h1>
        <p className="mt-2 text-center font-body text-sm text-ink-100/60">
          One portal for students and reviewers.
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
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-sm border border-hairline px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
              autoComplete="current-password"
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
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center font-body text-sm text-ink-400">
            New student? <Link to="/student/register" className="font-medium text-ink-900 ink-underline">Create an account</Link>
          </p>
        </form>
      </div>
      </div>
    </div>
  );
}
