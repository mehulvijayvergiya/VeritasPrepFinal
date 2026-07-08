import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStudentSession, logoutStudent } from "../../lib/studentAuth.js";
import { api } from "../../lib/api.js";
import { VC_TO_USD } from "../../lib/pricing.js";

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getStudentSession();
        const [{ profile }, { transactions }] = await Promise.all([
          api.getStudentMe(session.access_token),
          api.listTransactions(),
        ]);
        if (active) {
          setProfile(profile);
          setTransactions(transactions.filter((item) => item.email === profile.email));
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load your profile.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function handleLogout() {
    await logoutStudent();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-parchment px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-gold-600">Student profile</p>
            <h1 className="font-display text-2xl text-ink-900">Your account</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/student/dashboard" className="font-body text-sm font-medium text-ink-700 ink-underline">Dashboard</Link>
            <button onClick={handleLogout} className="font-body text-sm font-medium text-ink-400 ink-underline">Sign out</button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-sm border border-gold-200 bg-gold-50 p-6">
            {loading && <p className="font-body text-sm text-ink-400">Loading your profile…</p>}
            {error && <p className="font-body text-sm text-red-700">{error}</p>}
            {profile && (
              <>
                <p className="font-mono text-[11px] uppercase tracking-widest text-gold-600">Profile summary</p>
                <h2 className="mt-2 font-display text-2xl text-ink-900">{profile.full_name || "Student"}</h2>
                <p className="mt-2 font-body text-sm text-ink-600">{profile.email}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-sm bg-white p-4">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500">Credits</p>
                    <p className="mt-2 font-display text-3xl text-ink-900">{profile.credits} VC</p>
                    <p className="mt-1 font-body text-sm text-slate-500">≈ ${(profile.credits * VC_TO_USD).toLocaleString()} USD</p>
                  </div>
                  <div className="rounded-sm bg-white p-4">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500">Referral code</p>
                    <p className="mt-2 font-body text-lg font-medium text-ink-900">{profile.referral_code || "—"}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-sm border border-hairline bg-white p-6 paper-shadow">
            <p className="font-mono text-[11px] uppercase tracking-widest text-gold-600">Transaction history</p>
            {transactions.length === 0 && <p className="mt-4 font-body text-sm text-slate-500">No activity yet.</p>}
            <div className="mt-4 space-y-3">
              {transactions.map((item) => (
                <div key={item.id} className="rounded-sm border border-hairline p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-body text-sm font-medium text-ink-900">{item.note}</p>
                    <span className={`font-mono text-[11px] uppercase tracking-wide ${item.amount >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {item.amount >= 0 ? "+" : ""}{item.amount} VC
                    </span>
                  </div>
                  <p className="mt-1 font-body text-xs text-slate-500">{item.type} • {new Date(item.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
