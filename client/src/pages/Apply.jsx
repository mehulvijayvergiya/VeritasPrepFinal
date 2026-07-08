import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav.jsx";
import Footer from "../components/Footer.jsx";
import { api } from "../lib/api.js";
import { SERVICES } from "../lib/pricing.js";
import { getStudentSession } from "../lib/studentAuth.js";

const inputClass =
  "mt-2 w-full rounded-sm border border-hairline bg-white px-4 py-3 font-body text-[0.95rem] text-ink-900 placeholder:text-slate-500/60 focus:border-ink-900 focus:outline-none";

function makeId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function Apply() {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [colleges, setColleges] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await getStudentSession();
      if (!session) return;
      try {
        const { profile } = await api.getStudentMe(session.access_token);
        if (active) setProfile(profile);
      } finally {
        if (active) setLoadingProfile(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const total = cart.reduce((sum, item) => sum + item.vc, 0);
  const balance = profile ? profile.credits : 0;
  const remaining = balance - total;
  const overBudget = remaining < 0;

  function addItem(service) {
    setCart((c) => [...c, { localId: makeId(), key: service.key, label: service.label, vc: service.vc, file: null }]);
  }

  function removeItem(localId) {
    setCart((c) => c.filter((i) => i.localId !== localId));
  }

  function setItemFile(localId, file) {
    setCart((c) => c.map((i) => (i.localId === localId ? { ...i, file } : i)));
  }

  function canAfford(service) {
    return total + service.vc <= balance;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setErrors({});

    const fieldErrors = {};
    if (!colleges.trim()) fieldErrors.colleges = "Please list at least one target college.";
    if (cart.length === 0) fieldErrors.cart = "Select at least one service to submit.";
    if (overBudget) fieldErrors.cart = "You don't have enough credits for what's selected.";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      for (const item of cart) {
        const formData = new FormData();
        formData.append("name", profile.full_name || "");
        formData.append("email", profile.email);
        formData.append("colleges", colleges.trim());
        formData.append("notes", notes.trim());
        formData.append("service_key", item.key);
        formData.append("service_label", item.label);
        if (item.file) formData.append("pdf", item.file);
        await api.submitApplication(formData);
      }
      navigate("/apply/confirmation", { state: { name: profile.full_name } });
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
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
          Pick what you'd like reviewed, attach a PDF for each, and submit. We'll
          follow up by email within 3–5 days.
        </p>

        {loadingProfile ? (
          <p className="mt-8 font-body text-sm text-ink-400">Loading your account…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-8">
            {profile && (
              <div className="rounded-sm border border-hairline bg-white px-5 py-3.5 font-body text-sm text-ink-600">
                Submitting as <strong className="text-ink-900">{profile.full_name}</strong>{" "}
                ({profile.email}) — balance:{" "}
                <strong className={overBudget ? "text-red-700" : "text-ink-900"}>
                  {balance} VC
                </strong>
              </div>
            )}

            <label className="block">
              <span className="font-body text-sm font-medium text-ink-900">Target college(s)</span>
              <input
                className={inputClass}
                value={colleges}
                onChange={(e) => setColleges(e.target.value)}
                placeholder="Cornell, University of Michigan, ..."
              />
              {errors.colleges && <p className="mt-1.5 font-body text-sm text-red-700">{errors.colleges}</p>}
            </label>

            {/* Select services */}
            <div>
              <span className="font-body text-sm font-medium text-ink-900">Select services</span>
              <div className="mt-3 divide-y divide-hairline overflow-hidden rounded-sm border border-hairline">
                {SERVICES.map((s) => {
                  const affordable = canAfford(s);
                  return (
                    <div key={s.key} className="flex items-center justify-between gap-4 bg-white px-4 py-3.5">
                      <div>
                        <p className="font-body text-sm font-medium text-ink-900">{s.label}</p>
                        <p className="mt-0.5 font-body text-xs text-slate-500">{s.desc}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="rounded-full bg-gold-100 px-2.5 py-0.5 font-mono text-xs text-gold-600">
                          {s.vc} VC
                        </span>
                        <button
                          type="button"
                          disabled={!affordable}
                          onClick={() => addItem(s)}
                          title={!affordable ? "Not enough credits remaining" : undefined}
                          className="rounded-sm border border-ink-900 px-3 py-1.5 font-body text-xs font-medium text-ink-900 transition hover:bg-ink-900 hover:text-white disabled:cursor-not-allowed disabled:border-hairline disabled:text-slate-400 disabled:hover:bg-transparent"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div>
                <span className="font-body text-sm font-medium text-ink-900">
                  Your submissions ({cart.length})
                </span>
                <div className="mt-3 space-y-3">
                  {cart.map((item) => (
                    <div key={item.localId} className="rounded-sm border border-hairline bg-white p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-body text-sm font-medium text-ink-900">{item.label}</span>
                          <span className="rounded-full bg-gold-100 px-2 py-0.5 font-mono text-xs text-gold-600">
                            {item.vc} VC
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.localId)}
                          className="font-body text-xs font-medium text-red-700 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      {item.key !== "meeting" && (
                        <label className="mt-3 block">
                          <span className="font-body text-xs text-slate-500">
                            Attach PDF <span className="text-slate-400">(optional)</span>
                          </span>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => setItemFile(item.localId, e.target.files[0] || null)}
                            className="mt-1.5 block w-full font-body text-xs text-ink-600 file:mr-3 file:rounded-sm file:border file:border-hairline file:bg-parchment file:px-3 file:py-1.5 file:font-body file:text-xs file:text-ink-900"
                          />
                          {item.file && (
                            <span className="mt-1 block font-body text-xs text-emerald-700">
                              {item.file.name} attached
                            </span>
                          )}
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errors.cart && <p className="font-body text-sm text-red-700">{errors.cart}</p>}

            {/* Total */}
            <div
              className={`flex items-center justify-between rounded-sm border px-5 py-4 ${
                overBudget ? "border-red-300 bg-red-50" : "border-hairline bg-parchment"
              }`}
            >
              <span className="font-body text-sm font-medium text-ink-900">
                Estimated credits required
              </span>
              <span className={`font-display text-xl ${overBudget ? "text-red-700" : "text-ink-900"}`}>
                {total} VC
                {profile && (
                  <span className="ml-2 font-body text-sm font-normal text-slate-500">
                    ({overBudget ? "over by " : ""}{Math.abs(remaining)} VC {overBudget ? "" : "remaining"})
                  </span>
                )}
              </span>
            </div>

            <label className="block">
              <span className="font-body text-sm font-medium text-ink-900">
                Notes <span className="font-normal text-slate-500">(optional)</span>
              </span>
              <textarea
                className={`${inputClass} min-h-[90px] resize-y leading-7`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything specific you'd like feedback on, deadlines, or context we should know."
              />
            </label>

            {submitError && (
              <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || overBudget || cart.length === 0}
              className="w-full rounded-sm bg-ink-900 px-7 py-3.5 font-body text-sm font-medium text-parchment transition hover:bg-ink-600 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Your Application"}
            </button>
          </form>
        )}
      </section>
      <Footer />
    </div>
  );
}
