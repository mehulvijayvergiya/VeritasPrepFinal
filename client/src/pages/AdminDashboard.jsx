import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../lib/api.js";
import { formatMeetingDateTime } from "../lib/meetingTime.js";
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

function SubmissionsTab({ submissions, loading, onUpdate, onOpenStudentProfile }) {
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [draftStatus, setDraftStatus] = useState("pending");
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

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

  async function handleDownloadPdf() {
    if (!selected?.id) return;
    setDownloading(true);
    setError("");
    try {
      const { url } = await api.getSubmissionDownloadUrl(selected.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message || "Unable to generate download link.");
    } finally {
      setDownloading(false);
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
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (s.profile_id) onOpenStudentProfile?.(s.profile_id);
                    }}
                    className={`font-body text-sm font-medium ${s.profile_id ? "text-ink-900 ink-underline" : "text-ink-900"}`}
                  >
                    {s.name}
                  </span>
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
                <button
                  onClick={() => selected.profile_id && onOpenStudentProfile?.(selected.profile_id)}
                  className="font-display text-2xl text-ink-900 ink-underline disabled:no-underline disabled:opacity-70"
                  disabled={!selected.profile_id}
                >
                  {selected.name}
                </button>
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
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Submission title</p>
                <p className="mt-1.5 font-body text-sm text-ink-900">
                  {selected.submission_title || `${selected.name} - ${selected.service_label || selected.service_key || "Submission"}`}
                </p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Payment verified</p>
                <p className="mt-1.5 font-body text-sm text-ink-900">
                  {selected.payment_verified ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Checklist</p>
              <div className="mt-2 rounded-sm border border-hairline bg-white p-6">
                {(selected.submission_checklist || []).length === 0 && (
                  <p className="font-body text-sm text-slate-500">No checklist was submitted.</p>
                )}
                {(selected.submission_checklist || []).length > 0 && (
                  <ul className="space-y-2">
                    {selected.submission_checklist.map((item, idx) => (
                      <li key={`${item.label}-${idx}`} className="font-body text-sm text-ink-900">
                        {item.checked ? "[x]" : "[ ]"} {item.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {selected.attachment_storage_path && (
              <div className="mt-8">
                <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Attachment</p>
                <div className="mt-2 rounded-sm border border-hairline bg-white p-6">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="rounded-sm bg-ink-900 px-4 py-2 font-body text-xs text-white disabled:opacity-60"
                  >
                    {downloading ? "Preparing download..." : "Download student PDF"}
                  </button>
                  <p className="mt-2 font-body text-xs text-slate-500 break-all">
                    {selected.attachment_original_name || selected.attachment_filename || "Uploaded file"}
                  </p>
                </div>
              </div>
            )}

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
              <p className="mt-2 font-body text-xs text-slate-500">
                Credits are deducted only when status is moved to In review/Completed, and refunded if moved back to Pending.
              </p>
              <label className="mt-4 block">
                <span className="font-body text-sm font-medium text-ink-900">Reviewer notes</span>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Notes for internal use or to share back with the student..."
                  className="mt-2 min-h-[120px] w-full resize-y rounded-sm border border-hairline px-4 py-3 font-body text-sm leading-6 focus:border-ink-900 focus:outline-none"
                />
              </label>
              <label className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(selected.payment_verified)}
                  onChange={(e) => onUpdate(selected.id, { payment_verified: e.target.checked })}
                />
                <span className="font-body text-sm text-ink-900">
                  Payment and account validation complete
                </span>
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

function AppointmentsTab({ onOpenStudentProfile }) {
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [actioning, setActioning] = useState(null);
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [slotActioning, setSlotActioning] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ appointments }, { slots }] = await Promise.all([
        api.listAppointments(),
        api.listMeetingSlotsAdmin(),
      ]);
      setAppointments(appointments || []);
      setSlots(slots || []);
    } catch (err) {
      setError(err.message || "Unable to load appointments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(appointmentId, status) {
    setActioning(appointmentId);
    try {
      const { appointment } = await api.updateAppointmentStatus(appointmentId, status);
      setAppointments((all) =>
        all.map((item) => (item.id === appointment.id ? appointment : item))
      );
      const { slots } = await api.listMeetingSlotsAdmin();
      setSlots(slots || []);
    } catch (err) {
      setError(err.message || "Unable to update appointment.");
    } finally {
      setActioning(null);
    }
  }

  async function createSlot(e) {
    e.preventDefault();
    setError("");
    if (!slotDate || !slotTime) {
      setError("Pick both a date and time for the slot.");
      return;
    }

    setSlotActioning(true);
    try {
      await api.createMeetingSlot({ date: slotDate, time: slotTime });
      setSlotDate("");
      setSlotTime("");
      const { slots } = await api.listMeetingSlotsAdmin();
      setSlots(slots || []);
    } catch (err) {
      setError(err.message || "Unable to create slot.");
    } finally {
      setSlotActioning(false);
    }
  }

  async function removeSlot(slotId) {
    setSlotActioning(true);
    try {
      await api.deleteMeetingSlot(slotId);
      setSlots((all) => all.filter((item) => item.id !== slotId));
    } catch (err) {
      setError(err.message || "Unable to remove slot.");
    } finally {
      setSlotActioning(false);
    }
  }

  const filtered =
    filter === "all" ? appointments : appointments.filter((item) => item.status === filter);

  const sortedSlots = [...slots].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h2 className="font-display text-xl text-ink-900">Meeting scheduler</h2>
      <p className="mt-1 font-body text-sm text-slate-500">
        Build your available schedule, then approve or reject student picks from here.
      </p>

      <form onSubmit={createSlot} className="mt-5 grid gap-3 rounded-sm border border-hairline bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="date"
          value={slotDate}
          onChange={(e) => setSlotDate(e.target.value)}
          className="rounded-sm border border-hairline px-3 py-2 font-body text-sm"
          required
        />
        <input
          type="time"
          value={slotTime}
          onChange={(e) => setSlotTime(e.target.value)}
          className="rounded-sm border border-hairline px-3 py-2 font-body text-sm"
          required
        />
        <button
          type="submit"
          disabled={slotActioning}
          className="rounded-sm bg-ink-900 px-4 py-2 font-body text-xs text-white disabled:opacity-60"
        >
          {slotActioning ? "Saving…" : "Add slot"}
        </button>
      </form>

      <div className="mt-4 divide-y divide-hairline rounded-sm border border-hairline bg-white overflow-hidden">
        {sortedSlots.length === 0 && (
          <div className="px-6 py-4 font-body text-sm text-slate-500">No slots yet. Add your first available time.</div>
        )}
        {sortedSlots.map((slot) => (
          <div key={slot.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="font-body text-sm text-ink-900">
                {formatMeetingDateTime(slot.date, slot.time)}
              </p>
              {slot.bookedAppointment ? (
                <p className="mt-0.5 font-body text-xs text-slate-500">
                  Booked by {slot.bookedAppointment.studentName} ({slot.bookedAppointment.studentEmail})
                </p>
              ) : (
                <p className="mt-0.5 font-body text-xs text-emerald-700">Available</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {slot.bookedAppointment ? (
                <Badge
                  label={slot.bookedAppointment.status}
                  style={
                    slot.bookedAppointment.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-700"
                      : slot.bookedAppointment.status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : slot.bookedAppointment.status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-gold-100 text-gold-700"
                  }
                />
              ) : null}
              <button
                onClick={() => removeSlot(slot.id)}
                disabled={slotActioning || Boolean(slot.bookedAppointment)}
                className="rounded-sm border border-red-300 px-3 py-1.5 font-body text-xs text-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["all", "pending", "confirmed", "completed", "cancelled"].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition ${
              filter === item
                ? "bg-ink-900 text-white"
                : "bg-parchment text-slate-500 hover:bg-hairline"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && <p className="mt-6 font-body text-sm text-slate-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p className="mt-6 font-body text-sm text-slate-500">No appointments in this filter.</p>
      )}

      {filtered.length > 0 && (
        <div className="mt-6 divide-y divide-hairline rounded-sm border border-hairline bg-white overflow-hidden">
          {filtered.map((appointment) => (
            <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="font-body text-sm font-medium text-ink-900">{appointment.studentName}</p>
                {appointment.profileId ? (
                  <button
                    onClick={() => onOpenStudentProfile?.(appointment.profileId)}
                    className="mt-0.5 font-body text-xs text-ink-700 ink-underline"
                  >
                    View student profile
                  </button>
                ) : null}
                <p className="mt-0.5 font-body text-xs text-slate-500">{appointment.studentEmail}</p>
                <p className="mt-0.5 font-body text-xs text-slate-500">
                  {formatMeetingDateTime(
                    appointment.slot?.date || appointment.date,
                    appointment.slot?.time || appointment.time
                  )}
                </p>
                {appointment.note && (
                  <p className="mt-1 font-body text-xs text-slate-500">{appointment.note}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  label={appointment.status}
                  style={
                    appointment.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-700"
                      : appointment.status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : appointment.status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-gold-100 text-gold-700"
                  }
                />
                <button
                  onClick={() => setStatus(appointment.id, "confirmed")}
                  disabled={actioning === appointment.id || appointment.status === "confirmed"}
                  className="rounded-sm bg-emerald-700 px-3 py-1.5 font-body text-xs text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => setStatus(appointment.id, "completed")}
                  disabled={actioning === appointment.id || appointment.status === "completed"}
                  className="rounded-sm bg-blue-700 px-3 py-1.5 font-body text-xs text-white disabled:opacity-50"
                >
                  Mark done
                </button>
                <button
                  onClick={() => setStatus(appointment.id, "cancelled")}
                  disabled={actioning === appointment.id || appointment.status === "cancelled"}
                  className="rounded-sm border border-red-300 px-3 py-1.5 font-body text-xs text-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => setStatus(appointment.id, "pending")}
                  disabled={actioning === appointment.id || appointment.status === "pending"}
                  className="rounded-sm border border-ink-300 px-3 py-1.5 font-body text-xs text-ink-700 disabled:opacity-50"
                >
                  Remove approval
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentsTab({ onOpenStudentProfile, onLoadedCount }) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { roster } = await api.getStudentRoster();
      const all = roster || [];
      setRoster(all);
      onLoadedCount?.(all.length);
      if (all.length > 0) {
        setSelectedId((prev) => prev || all[0].profile.id);
      }
    } catch (err) {
      setError(err.message || "Unable to load student roster.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((item) => {
      const p = item.profile || {};
      const hay = [
        p.full_name,
        p.email,
        p.high_school,
        p.intended_major,
        ...(Array.isArray(p.target_colleges) ? p.target_colleges : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [roster, query]);

  const selected = useMemo(() => {
    return filtered.find((item) => item.profile.id === selectedId) || filtered[0] || null;
  }, [filtered, selectedId]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-full max-w-sm shrink-0 overflow-y-auto border-r border-hairline bg-white">
        <div className="border-b border-hairline p-4">
          <h2 className="font-display text-lg text-ink-900">Student roster</h2>
          <p className="mt-1 font-body text-xs text-slate-500">All students, with submissions and appointments history.</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, school, major..."
            className="mt-3 w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
          />
        </div>

        {loading && <p className="p-5 font-body text-sm text-slate-500">Loading roster...</p>}
        {error && (
          <div className="m-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800">
            {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="p-5 font-body text-sm text-slate-500">No students found.</p>
        )}

        <ul className="divide-y divide-hairline">
          {filtered.map((item) => (
            <li key={item.profile.id}>
              <button
                onClick={() => setSelectedId(item.profile.id)}
                className={`block w-full px-4 py-3 text-left transition hover:bg-parchment ${
                  selected?.profile?.id === item.profile.id ? "bg-gold-100/60" : ""
                }`}
              >
                <p className="font-body text-sm font-medium text-ink-900">{item.profile.full_name || "Unnamed student"}</p>
                <p className="mt-0.5 font-body text-xs text-slate-500">{item.profile.email || "No email"}</p>
                <p className="mt-1 font-body text-[11px] text-slate-500">
                  Subs {item.metrics?.submissions?.total || 0} · Meetings {item.metrics?.appointments?.total || 0}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {!selected && !loading && (
          <p className="font-body text-sm text-slate-500">Select a student to view full admin profile and history.</p>
        )}

        {selected && (
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <button
                  onClick={() => onOpenStudentProfile?.(selected.profile.id)}
                  className="font-display text-2xl text-ink-900 ink-underline"
                >
                  {selected.profile.full_name || "Unnamed student"}
                </button>
                <p className="mt-1 font-body text-sm text-slate-500">{selected.profile.email || "No email"}</p>
              </div>
              <div className="rounded-sm border border-hairline bg-white px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Credits</p>
                <p className="font-display text-xl text-ink-900">{selected.profile.credits ?? 0}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-6">
              <div className="rounded-sm border border-hairline bg-white px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Submissions</p>
                <p className="font-display text-xl text-ink-900">{selected.metrics?.submissions?.total || 0}</p>
              </div>
              <div className="rounded-sm border border-hairline bg-white px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Pending subs</p>
                <p className="font-display text-xl text-ink-900">{selected.metrics?.submissions?.pending || 0}</p>
              </div>
              <div className="rounded-sm border border-hairline bg-white px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">In review</p>
                <p className="font-display text-xl text-ink-900">{selected.metrics?.submissions?.in_review || 0}</p>
              </div>
              <div className="rounded-sm border border-hairline bg-white px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Meetings</p>
                <p className="font-display text-xl text-ink-900">{selected.metrics?.appointments?.total || 0}</p>
              </div>
              <div className="rounded-sm border border-hairline bg-white px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Scheduled</p>
                <p className="font-display text-xl text-ink-900">{selected.metrics?.appointments?.confirmed || 0}</p>
              </div>
              <div className="rounded-sm border border-hairline bg-white px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Completed</p>
                <p className="font-display text-xl text-ink-900">{selected.metrics?.appointments?.completed || 0}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-sm border border-hairline bg-white p-5">
                <h3 className="font-display text-lg text-ink-900">Student info</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p className="font-body text-sm text-ink-900"><span className="text-slate-500">Phone:</span> {selected.profile.phone_number || "—"}</p>
                  <p className="font-body text-sm text-ink-900"><span className="text-slate-500">High school:</span> {selected.profile.high_school || "—"}</p>
                  <p className="font-body text-sm text-ink-900"><span className="text-slate-500">GPA:</span> {selected.profile.gpa ?? "—"}</p>
                  <p className="font-body text-sm text-ink-900"><span className="text-slate-500">SAT:</span> {selected.profile.sat_score ?? "—"}</p>
                  <p className="font-body text-sm text-ink-900"><span className="text-slate-500">ACT:</span> {selected.profile.act_score ?? "—"}</p>
                  <p className="font-body text-sm text-ink-900"><span className="text-slate-500">Grad year:</span> {selected.profile.graduation_year ?? "—"}</p>
                  <p className="font-body text-sm text-ink-900"><span className="text-slate-500">Major:</span> {selected.profile.intended_major || "—"}</p>
                  <p className="font-body text-sm text-ink-900"><span className="text-slate-500">AP/IB:</span> {selected.profile.ap_course_count ?? "—"}</p>
                  <p className="font-body text-sm text-ink-900"><span className="text-slate-500">Class rank %:</span> {selected.profile.class_rank_percentile ?? "—"}</p>
                  <p className="font-body text-sm text-ink-900"><span className="text-slate-500">Joined:</span> {selected.profile.created_at ? new Date(selected.profile.created_at).toLocaleDateString() : "—"}</p>
                </div>
                <p className="mt-3 font-body text-sm text-ink-900">
                  <span className="text-slate-500">Target colleges:</span>{" "}
                  {(selected.profile.target_colleges || []).length
                    ? selected.profile.target_colleges.join(", ")
                    : "—"}
                </p>
                <p className="mt-2 font-body text-sm text-ink-900">
                  <span className="text-slate-500">Extracurriculars:</span>{" "}
                  {selected.profile.extracurricular_summary || "—"}
                </p>
              </div>

              <div className="rounded-sm border border-hairline bg-white p-5">
                <h3 className="font-display text-lg text-ink-900">Appointment history</h3>
                {selected.appointment_history?.length === 0 && (
                  <p className="mt-3 font-body text-sm text-slate-500">No meetings yet.</p>
                )}
                {selected.appointment_history?.length > 0 && (
                  <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
                    {selected.appointment_history.map((appt) => (
                      <div key={appt.id} className="rounded-sm border border-hairline bg-parchment p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-body text-sm text-ink-900">
                            {formatMeetingDateTime(appt.slot?.date || appt.date, appt.slot?.time || appt.time)}
                          </p>
                          <Badge
                            label={appt.status}
                            style={
                              appt.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-700"
                                : appt.status === "completed"
                                ? "bg-blue-100 text-blue-700"
                                : appt.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-gold-100 text-gold-700"
                            }
                          />
                        </div>
                        {appt.note && <p className="mt-1 font-body text-xs text-slate-500">{appt.note}</p>}
                        <p className="mt-1 font-body text-[11px] text-slate-500">
                          Created: {appt.createdAt ? new Date(appt.createdAt).toLocaleString() : "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-sm border border-hairline bg-white p-5">
              <h3 className="font-display text-lg text-ink-900">Submission history</h3>
              {selected.recent_submissions?.length === 0 && (
                <p className="mt-3 font-body text-sm text-slate-500">No submissions yet.</p>
              )}
              {selected.recent_submissions?.length > 0 && (
                <div className="mt-3 space-y-3">
                  {selected.recent_submissions.map((sub) => (
                    <div key={sub.id} className="rounded-sm border border-hairline bg-parchment p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-body text-sm text-ink-900">
                          {sub.submission_title || sub.service_label || sub.service_key || "Submission"}
                        </p>
                        <Badge label={STATUS_LABEL[sub.status] || sub.status} style={STATUS_STYLE[sub.status] || "bg-slate-100 text-slate-600"} />
                      </div>
                      <p className="mt-1 font-body text-xs text-slate-500">Submitted: {sub.created_at ? new Date(sub.created_at).toLocaleString() : "—"}</p>
                      {sub.essay_for_college && (
                        <p className="mt-1 font-body text-xs text-slate-500">College: {sub.essay_for_college}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Root dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("submissions");
  const [studentCount, setStudentCount] = useState(0);
  const [profilePanel, setProfilePanel] = useState({ open: false, loading: false, error: "", profile: null });
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

  async function openStudentProfile(profileId) {
    if (!profileId) return;
    setProfilePanel({ open: true, loading: true, error: "", profile: null });
    try {
      const { profile } = await api.getStudentProfile(profileId);
      setProfilePanel({ open: true, loading: false, error: "", profile });
    } catch (err) {
      setProfilePanel({ open: true, loading: false, error: err.message || "Unable to load student profile.", profile: null });
    }
  }

  const meetingCount = submissions.filter((s) => s.service_key === "meeting").length;
  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    inReview: submissions.filter((s) => s.status === "in_review").length,
    completed: submissions.filter((s) => s.status === "completed").length,
    paid: submissions.filter((s) => s.payment_verified).length,
  };

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
              { key: "students", label: `Students (${studentCount || 0})` },
              { key: "credits", label: "Credits" },
              { key: "appointments", label: "Appointments" },
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="ink-underline font-body text-sm text-ink-600"
          >
            Home
          </button>
          <button
            onClick={() => { clearToken(); navigate("/login"); }}
            className="ink-underline font-body text-sm text-ink-600"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 border-b border-hairline bg-white px-6 py-3 sm:grid-cols-6">
        <div className="rounded-sm border border-hairline bg-parchment px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Total</p>
          <p className="font-display text-xl text-ink-900">{stats.total}</p>
        </div>
        <div className="rounded-sm border border-hairline bg-parchment px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Pending</p>
          <p className="font-display text-xl text-ink-900">{stats.pending}</p>
        </div>
        <div className="rounded-sm border border-hairline bg-parchment px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">In review</p>
          <p className="font-display text-xl text-ink-900">{stats.inReview}</p>
        </div>
        <div className="rounded-sm border border-hairline bg-parchment px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Completed</p>
          <p className="font-display text-xl text-ink-900">{stats.completed}</p>
        </div>
        <div className="rounded-sm border border-hairline bg-parchment px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Payment verified</p>
          <p className="font-display text-xl text-ink-900">{stats.paid}</p>
        </div>
        <div className="rounded-sm border border-hairline bg-parchment px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Meeting requests</p>
          <p className="font-display text-xl text-ink-900">{meetingCount}</p>
        </div>
      </div>

      {tab === "submissions" && (
        <SubmissionsTab
          submissions={submissions}
          loading={loading}
          onUpdate={handleUpdate}
          onOpenStudentProfile={openStudentProfile}
        />
      )}
      {tab === "students" && (
        <StudentsTab
          onOpenStudentProfile={openStudentProfile}
          onLoadedCount={setStudentCount}
        />
      )}
      {tab === "credits" && <CreditsTab />}
      {tab === "appointments" && <AppointmentsTab onOpenStudentProfile={openStudentProfile} />}

      {profilePanel.open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={() => setProfilePanel((prev) => ({ ...prev, open: false }))}>
          <div className="w-full max-w-xl rounded-sm bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-ink-900">Student profile</h3>
              <button
                onClick={() => setProfilePanel((prev) => ({ ...prev, open: false }))}
                className="font-body text-xs text-slate-500"
              >
                Close
              </button>
            </div>

            {profilePanel.loading && <p className="mt-4 font-body text-sm text-slate-500">Loading profile...</p>}
            {profilePanel.error && (
              <div className="mt-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800">
                {profilePanel.error}
              </div>
            )}

            {profilePanel.profile && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <p className="font-body text-sm text-ink-900"><span className="text-slate-500">Name:</span> {profilePanel.profile.full_name || "—"}</p>
                <p className="font-body text-sm text-ink-900"><span className="text-slate-500">Email:</span> {profilePanel.profile.email || "—"}</p>
                <p className="font-body text-sm text-ink-900"><span className="text-slate-500">GPA:</span> {profilePanel.profile.gpa ?? "—"}</p>
                <p className="font-body text-sm text-ink-900"><span className="text-slate-500">SAT:</span> {profilePanel.profile.sat_score ?? "—"}</p>
                <p className="font-body text-sm text-ink-900"><span className="text-slate-500">ACT:</span> {profilePanel.profile.act_score ?? "—"}</p>
                <p className="font-body text-sm text-ink-900"><span className="text-slate-500">Grad year:</span> {profilePanel.profile.graduation_year ?? "—"}</p>
                <p className="font-body text-sm text-ink-900"><span className="text-slate-500">High school:</span> {profilePanel.profile.high_school || "—"}</p>
                <p className="font-body text-sm text-ink-900"><span className="text-slate-500">Intended major:</span> {profilePanel.profile.intended_major || "—"}</p>
                <p className="font-body text-sm text-ink-900"><span className="text-slate-500">AP/IB count:</span> {profilePanel.profile.ap_course_count ?? "—"}</p>
                <p className="font-body text-sm text-ink-900"><span className="text-slate-500">Class rank %:</span> {profilePanel.profile.class_rank_percentile ?? "—"}</p>
                <p className="font-body text-sm text-ink-900 sm:col-span-2"><span className="text-slate-500">Target colleges:</span> {(profilePanel.profile.target_colleges || []).length ? profilePanel.profile.target_colleges.join(", ") : "—"}</p>
                <p className="font-body text-sm text-ink-900 sm:col-span-2"><span className="text-slate-500">Extracurriculars:</span> {profilePanel.profile.extracurricular_summary || "—"}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
