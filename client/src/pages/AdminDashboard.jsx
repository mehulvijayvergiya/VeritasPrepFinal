import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../lib/api.js";
import { VC_TO_USD } from "../lib/pricing.js";

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABEL = { pending: "Pending", in_review: "In review", completed: "Completed" };
const STATUS_STYLE = {
  pending: "bg-slate-100 text-slate-600",
  in_review: "bg-gold-100 text-gold-600",
  completed: "bg-emerald-100 text-emerald-700",
};
const CR_STYLE = {
  pending: "bg-gold-100 text-gold-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function Badge({ label, style }) {
  return (
    <span className={`rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${style}`}>
      {label}
    </span>
  );
}

// ─── Submissions tab ─────────────────────────────────────────────────────────

function SubmissionsTab({ submissions, loading, onUpdate }) {
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [draftStatus, setDraftStatus] = useState("pending");
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(
    () => (filter === "all" ? submissions : submissions.filter((s) => s.status === filter)),
    [submissions, filter]
  );

  const selected = useMemo(
    () => submissions.find((s) => s.id === selectedId) || null,
    [submissions, selectedId]
  );

  useEffect(() => {
    if (!selectedId && filtered.length) setSelectedId(filtered[0].id);
  }, [filtered]); // eslint-disable-line

  useEffect(() => {
    if (selected) {
      setDraftStatus(selected.status);
      setDraftNotes(selected.reviewer_notes || "");
    }
  }, [selected?.id]); // eslint-disable-line

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await onUpdate(selected.id, { status: draftStatus, reviewer_notes: draftNotes });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* List panel */}
      <aside className="w-full max-w-sm shrink-0 overflow-y-auto border-r border-hairline bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-5 py-3">
          {["all", "pending", "in_review", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition ${
                filter === f ? "bg-ink-900 text-white" : "bg-parchment text-slate-500 hover:bg-hairline"
              }`}
            >
              {f === "all" ? "All" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        {loading && <p className="p-5 font-body text-sm text-slate-500">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="p-5 font-body text-sm text-slate-500">No submissions here yet.</p>
        )}
        <ul className="divide-y divide-hairline">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setSelectedId(s.id)}
                className={`block w-full px-5 py-4 text-left transition hover:bg-parchment ${
                  selectedId === s.id ? "bg-gold-100/60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-body text-sm font-medium text-ink-900">{s.name}</span>
                  <Badge label={STATUS_LABEL[s.status]} style={STATUS_STYLE[s.status]} />
                </div>
                <p className="mt-1 truncate font-body text-xs text-slate-500">{s.colleges}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-500/80">
                  {new Date(s.created_at).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Detail panel */}
      <main className="flex-1 overflow-y-auto">
        {error && (
          <div className="m-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800">
            {error}
          </div>
        )}
        {!selected && !loading && (
          <p className="p-8 font-body text-sm text-slate-500">Select a submission to review.</p>
        )}
        {selected && (
          <div className="mx-auto max-w-3xl px-8 py-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink-900">{selected.name}</h2>
                <p className="mt-1 font-body text-sm text-slate-500">{selected.email}</p>
              </div>
              <Badge label={STATUS_LABEL[selected.status]} style={STATUS_STYLE[selected.status]} />
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Target colleges</p>
                <p className="mt-1.5 font-body text-sm text-ink-900">{selected.colleges}</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Submitted</p>
                <p className="mt-1.5 font-body text-sm text-ink-900">
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Essay</p>
              <div className="mt-2 rounded-sm border border-hairline bg-white p-6 font-display text-[0.98rem] leading-8 text-ink-900 whitespace-pre-wrap">
                {selected.essay}
              </div>
            </div>

            <div className="mt-8">
              <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Activities</p>
              <div className="mt-2 rounded-sm border border-hairline bg-white p-6 font-body text-sm leading-7 text-ink-900 whitespace-pre-wrap">
                {selected.activities}
              </div>
            </div>

            {selected.notes && (
              <div className="mt-8">
                <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Student notes</p>
                <div className="mt-2 rounded-sm border border-hairline bg-white p-6 font-body text-sm leading-7 text-ink-900 whitespace-pre-wrap">
                  {selected.notes}
                </div>
              </div>
            )}

            <div className="mt-10 rounded-sm border border-hairline bg-white p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Review</p>
              <label className="mt-4 block">
                <span className="font-body text-sm font-medium text-ink-900">Status</span>
                <select
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value)}
                  className="mt-2 w-full rounded-sm border border-hairline px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="in_review">In review</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="mt-4 block">
                <span className="font-body text-sm font-medium text-ink-900">Reviewer notes</span>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Notes for internal use or to share back with the student..."
                  className="mt-2 min-h-[120px] w-full resize-y rounded-sm border border-hairline px-4 py-3 font-body text-sm leading-6 focus:border-ink-900 focus:outline-none"
                />
              </label>
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-5 rounded-sm bg-ink-900 px-6 py-2.5 font-body text-sm font-medium text-white transition hover:bg-ink-600 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save review"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Credits tab ─────────────────────────────────────────────────────────────

function CreditsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { requests } = await api.listCreditRequests();
      setRequests(requests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handle(id, action) {
    setActioning(id);
    try {
      const fn = action === "approve" ? api.approveCreditRequest : api.rejectCreditRequest;
      const { request } = await fn(id);
      setRequests((all) => all.map((r) => (r.id === request.id ? request : r)));
    } catch (err) {
      setError(err.message);
    } finally {
      setActioning(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h2 className="font-display text-xl text-ink-900">Credit purchase requests</h2>
      <p className="mt-1 font-body text-sm text-slate-500">
        Approve after confirming the Venmo / Zelle payment in your account.
      </p>

      {error && (
        <div className="mt-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && <p className="mt-6 font-body text-sm text-slate-500">Loading…</p>}

      {!loading && pending.length === 0 && (
        <p className="mt-6 font-body text-sm text-slate-500">No pending requests.</p>
      )}

      {pending.length > 0 && (
        <div className="mt-6 divide-y divide-hairline rounded-sm border border-hairline bg-white overflow-hidden">
          {pending.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="font-body text-sm font-medium text-ink-900">{r.email}</p>
                <p className="mt-0.5 font-body text-xs text-slate-500">
                  {r.vc} VC &nbsp;·&nbsp; ${r.amount_usd} via{" "}
                  <span className="font-medium capitalize">{r.method}</span>
                  {r.note ? ` — "${r.note}"` : ""}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handle(r.id, "approve")}
                  disabled={actioning === r.id}
                  className="rounded-sm bg-emerald-700 px-4 py-2 font-body text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  Approve +{r.vc} VC
                </button>
                <button
                  onClick={() => handle(r.id, "reject")}
                  disabled={actioning === r.id}
                  className="rounded-sm border border-red-300 px-4 py-2 font-body text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h3 className="mt-10 font-mono text-xs uppercase tracking-widest text-slate-500">
            Resolved
          </h3>
          <div className="mt-3 divide-y divide-hairline rounded-sm border border-hairline bg-white overflow-hidden">
            {resolved.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="font-body text-sm text-ink-900">{r.email}</p>
                  <p className="mt-0.5 font-body text-xs text-slate-500">
                    {r.vc} VC &nbsp;·&nbsp; ${r.amount_usd} via {r.method}
                  </p>
                </div>
                <Badge
                  label={r.status}
                  style={CR_STYLE[r.status]}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Root dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("submissions");
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const { submissions } = await api.listSubmissions();
      setSubmissions(submissions);
    } catch (err) {
      if (err.status === 401) { clearToken(); navigate("/login"); }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function handleUpdate(id, payload) {
    const { submission } = await api.updateSubmission(id, payload);
    setSubmissions((all) => all.map((s) => (s.id === submission.id ? submission : s)));
  }

  const pendingCreditCount = 0; // badge — could fetch live later

  return (
    <div className="flex h-screen flex-col bg-parchment">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-hairline bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Veritas Prep" className="h-8 w-8" />
            <span className="font-display text-lg text-ink-900">Reviewer Dashboard</span>
          </div>
          <nav className="ml-4 flex gap-1">
            {[
              { key: "submissions", label: `Submissions (${submissions.length})` },
              { key: "credits", label: "Credits" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-sm px-4 py-2 font-body text-sm transition ${
                  tab === t.key
                    ? "bg-ink-900 text-white"
                    : "text-ink-600 hover:bg-parchment"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <button
          onClick={() => { clearToken(); navigate("/login"); }}
          className="ink-underline font-body text-sm text-ink-600"
        >
          Sign out
        </button>
      </header>

      {tab === "submissions" && (
        <SubmissionsTab
          submissions={submissions}
          loading={loading}
          onUpdate={handleUpdate}
        />
      )}
      {tab === "credits" && <CreditsTab />}
    </div>
  );
}
