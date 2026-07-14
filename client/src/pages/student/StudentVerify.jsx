import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { completeEmailVerificationFromUrl } from "../../lib/studentAuth.js";

export default function StudentVerify() {
  const [status, setStatus] = useState("checking"); // checking | verified | failed
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await completeEmailVerificationFromUrl();
        if (!active) return;
        if (session) {
          setStatus("verified");
          setTimeout(() => navigate("/student/dashboard"), 1500);
        } else {
          setStatus("failed");
        }
      } catch {
        if (active) setStatus("failed");
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-6">
      <div className="w-full max-w-sm rounded-sm bg-white p-7 text-center paper-shadow">
        <div className="mb-3">
          <Link to="/" className="font-body text-xs font-medium text-ink-600 ink-underline">
            Back to Home
          </Link>
        </div>
        <img src="/logo.png" alt="Veritas Prep" className="mx-auto h-12 w-12" />
        {status === "checking" && (
          <p className="mt-6 font-body text-sm text-ink-400">Verifying your email…</p>
        )}
        {status === "verified" && (
          <>
            <h1 className="mt-6 font-display text-2xl text-ink-900">Email verified</h1>
            <p className="mt-3 font-body text-sm text-ink-400">Taking you to your dashboard…</p>
          </>
        )}
        {status === "failed" && (
          <>
            <h1 className="mt-6 font-display text-2xl text-ink-900">Link invalid or expired</h1>
            <p className="mt-3 font-body text-sm text-ink-400">
              Try signing in — if your account still needs verification, you can request a new
              link from there.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block font-body text-sm font-medium text-ink-900 ink-underline"
            >
              Go to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
