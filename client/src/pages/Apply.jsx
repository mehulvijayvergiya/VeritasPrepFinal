import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav.jsx";
import Footer from "../components/Footer.jsx";
import { api } from "../lib/api.js";

const initialForm = {
  name: "",
  email: "",
  colleges: "",
  essay: "",
  activities: "",
  notes: "",
};

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="font-body text-sm font-medium text-ink-900">{label}</span>
        {hint && <span className="font-mono text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 font-body text-sm text-red-700">{error}</p>}
    </label>
  );
}

const inputClass =
  "mt-2 w-full rounded-sm border border-hairline bg-white px-4 py-3 font-body text-[0.95rem] text-ink-900 placeholder:text-slate-500/60 focus:border-ink-900 focus:outline-none";

export default function Apply() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setErrors({});

    try {
      await api.submitApplication(form);
      navigate("/apply/confirmation", { state: { name: form.name } });
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      else setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Nav />
      <section className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Submission</p>
        <h1 className="mt-3 font-display text-4xl text-ink-900">Submit Your Application</h1>
        <p className="mt-4 font-body text-[1.05rem] leading-7 text-ink-600">
          Share what you have — a finished draft or a rough one. We'll read it
          closely and follow up by email within 3–5 days.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-7">
          <div className="grid gap-7 sm:grid-cols-2">
            <Field label="Full name" error={errors.name}>
              <input
                className={inputClass}
                value={form.name}
                onChange={set("name")}
                placeholder="Jordan Smith"
                autoComplete="name"
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="jordan@example.com"
                autoComplete="email"
              />
            </Field>
          </div>

          <Field label="Target college(s)" error={errors.colleges}>
            <input
              className={inputClass}
              value={form.colleges}
              onChange={set("colleges")}
              placeholder="Cornell, University of Michigan, ..."
            />
          </Field>

          <Field label="Essay" hint="paste your full draft" error={errors.essay}>
            <textarea
              className={`${inputClass} min-h-[220px] resize-y leading-7`}
              value={form.essay}
              onChange={set("essay")}
              placeholder="Paste your personal statement or supplemental essay here..."
            />
          </Field>

          <Field label="Activities list" hint="one per line is fine" error={errors.activities}>
            <textarea
              className={`${inputClass} min-h-[140px] resize-y leading-7`}
              value={form.activities}
              onChange={set("activities")}
              placeholder={"Debate Team — Captain, 4 years\nRobotics Club — Lead Programmer\n..."}
            />
          </Field>

          <Field label="Notes" hint="optional">
            <textarea
              className={`${inputClass} min-h-[90px] resize-y leading-7`}
              value={form.notes}
              onChange={set("notes")}
              placeholder="Anything specific you'd like feedback on, deadlines, or context we should know."
            />
          </Field>

          {submitError && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-ink-900 px-7 py-3.5 font-body text-sm font-medium text-parchment transition hover:bg-ink-600 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Your Application"}
          </button>
        </form>
      </section>
      <Footer />
    </div>
  );
}
