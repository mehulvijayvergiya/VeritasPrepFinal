import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStudentSession, logoutStudent } from "../../lib/studentAuth.js";
import { api } from "../../lib/api.js";

// Intentionally minimal — this step is "prove login/logout/session works
// end to end." Credits, submissions, and appointments get built out here
// in a later step once the models are migrated off LowDB.
export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getStudentSession();
        const { profile } = await api.getStudentMe(session.access_token);
        if (active) setProfile(profile);
      } catch (err) {
        if (active) setError(err.message || "Unable to load your profile.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await logoutStudent();
    navigate("/student/login");
  }

  return (
    <div className="min-h-screen bg-parchment px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-ink-900">Your dashboard</h1>
          <button
            onClick={handleLogout}
            className="font-body text-sm font-medium text-ink-400 ink-underline"
          >
            Sign out
          </button>
        </div>

        <div className="mt-6 rounded-sm bg-white p-7 paper-shadow">
          {loading && <p className="font-body text-sm text-ink-400">Loading your profile…</p>}

          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 font-body text-sm text-red-800">
              {error}
            </div>
          )}

          {profile && (
            <dl className="space-y-4 font-body text-sm">
              <div>
                <dt className="text-ink-400">Name</dt>
                <dd className="mt-1 text-ink-900">{profile.full_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Email</dt>
                <dd className="mt-1 text-ink-900">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Veritas Credits</dt>
                <dd className="mt-1 text-ink-900">{profile.credits}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Referral code</dt>
                <dd className="mt-1 text-ink-900">{profile.referral_code}</dd>
              </div>
            </dl>
          )}
        </div>

        <p className="mt-4 font-body text-xs text-ink-400">
          Submissions, appointments, and credit purchases will show up here in a later step.
        </p>
      </div>
    </div>
  );
}
