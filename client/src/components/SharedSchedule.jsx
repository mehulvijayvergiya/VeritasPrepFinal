import { useEffect, useMemo, useState } from "react";
import { SERVICES as SERVICE_OPTIONS } from "../lib/pricing.js";
import { api } from "../lib/api.js";

const STATUS_OPTIONS = ["pending", "confirmed", "completed"];

function formatServiceLabel(key) {
  return SERVICE_OPTIONS.find((service) => service.key === key)?.label || key;
}

export default function SharedSchedule({ mode = "student", profile = null }) {
  const [appointments, setAppointments] = useState([]);
  const [service, setService] = useState(SERVICE_OPTIONS[0]?.key || "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("14:00");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { appointments: serverAppointments } = await api.listAppointments();
        if (active) setAppointments(serverAppointments || []);
      } catch {
        if (active) setAppointments([]);
      }
    })();
    return () => { active = false; };
  }, []);

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)),
    [appointments]
  );

  async function handleBook(e) {
    e.preventDefault();
    const booking = {
      service,
      date,
      time,
      note: note.trim(),
      studentName: profile?.full_name || "Student",
      studentEmail: profile?.email || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      const { appointment } = await api.createAppointment(booking);
      setAppointments((current) => [appointment, ...current]);
      setMessage("Your booking request is now on the shared schedule.");
      setNote("");
    } catch (err) {
      setMessage(err.message || "Unable to save your booking.");
    }
  }

  async function updateStatus(id, nextStatus) {
    try {
      const { appointment } = await api.updateAppointmentStatus(id, nextStatus);
      setAppointments((current) => current.map((item) => (item.id === appointment.id ? appointment : item)));
    } catch {
      // keep UI responsive even if the update fails
    }
  }

  return (
    <div className="mt-6 rounded-sm border border-hairline bg-white p-6 paper-shadow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Shared schedule</p>
          <h2 className="mt-1 font-display text-xl text-ink-900">Sessions and service bookings</h2>
        </div>
        <p className="font-body text-xs text-slate-500">
          Shared between students and reviewers.
        </p>
      </div>

      {message && <p className="mt-4 rounded-sm bg-emerald-50 px-3 py-2 font-body text-sm text-emerald-700">{message}</p>}

      {mode === "student" && (
        <form onSubmit={handleBook} className="mt-6 grid gap-4 rounded-sm bg-parchment p-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="font-body text-sm font-medium text-ink-900">Choose a service</span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="mt-2 w-full rounded-sm border border-hairline bg-white px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
            >
              {SERVICE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-sm border border-hairline bg-white px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">Time</span>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-2 w-full rounded-sm border border-hairline bg-white px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="font-body text-sm font-medium text-ink-900">Notes</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tell us what you want help with"
              className="mt-2 min-h-[90px] w-full rounded-sm border border-hairline bg-white px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="sm:col-span-2 rounded-sm bg-ink-900 px-5 py-3 font-body text-sm font-medium text-white transition hover:bg-ink-600"
          >
            Book this service
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {sortedAppointments.length === 0 && (
          <p className="font-body text-sm text-slate-500">No bookings yet.</p>
        )}

        {sortedAppointments.map((appointment) => (
          <div key={appointment.id} className="rounded-sm border border-hairline bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-body text-sm font-medium text-ink-900">
                  {appointment.studentName || "Student"} • {formatServiceLabel(appointment.service)}
                </p>
                <p className="mt-1 font-body text-sm text-slate-600">
                  {appointment.date} at {appointment.time}
                </p>
                {appointment.note && (
                  <p className="mt-2 font-body text-sm text-slate-500">{appointment.note}</p>
                )}
              </div>
              {mode === "admin" ? (
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateStatus(appointment.id, status)}
                      className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition ${
                        appointment.status === status
                          ? "bg-ink-900 text-white"
                          : "bg-parchment text-slate-600 hover:bg-hairline"
                      }`}
                    >
                      {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="rounded-full bg-gold-100 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-gold-700">
                  {appointment.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
