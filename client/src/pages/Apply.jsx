import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Nav from "../components/Nav.jsx";
import Footer from "../components/Footer.jsx";
import { api } from "../lib/api.js";
import { formatMeetingDateTime } from "../lib/meetingTime.js";
import { SERVICES } from "../lib/pricing.js";
import { getStudentSession } from "../lib/studentAuth.js";

const inputClass =
  "mt-2 w-full rounded-sm border border-hairline bg-white px-4 py-3 font-body text-[0.95rem] text-ink-900 placeholder:text-slate-500/60 focus:border-ink-900 focus:outline-none";

function makeId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeChecklist(serviceKey) {
  const base = [
    { key: "prompt_verified", label: "I confirmed this is the correct prompt/service.", checked: false },
    { key: "deadline_verified", label: "I verified my deadline and added any key context in notes.", checked: false },
  ];

  if (serviceKey === "meeting") {
    return [
      ...base,
      { key: "availability_shared", label: "I included meeting goals and availability details.", checked: false },
    ];
  }

  return [
    ...base,
    { key: "draft_ready", label: "I uploaded the draft PDF I want reviewed.", checked: false },
  ];
}

function isEssayService(serviceKey) {
  return serviceKey === "essay_short" || serviceKey === "essay_medium" || serviceKey === "essay_long";
}

function getEssayRange(serviceKey) {
  if (serviceKey === "essay_short") {
    return { min: 1, max: 300, label: "1-300 words" };
  }
  if (serviceKey === "essay_medium") {
    return { min: 301, max: 500, label: "301-500 words" };
  }
  if (serviceKey === "essay_long") {
    return { min: 501, max: 650, label: "501-650 words" };
  }
  return null;
}

function getSuggestedEssayService(wordCount) {
  const count = Number(wordCount);
  if (!Number.isInteger(count) || count <= 0) return null;
  if (count <= 300) {
    return { key: "essay_short", label: "Supplemental Essay (<= 300 words)", range: "1-300" };
  }
  if (count <= 500) {
    return { key: "essay_medium", label: "Supplemental Essay (301-500 words)", range: "301-500" };
  }
  if (count <= 650) {
    return { key: "essay_long", label: "Essay (> 500 words / Common App)", range: "501-650" };
  }
  return null;
}

function getEssayWordCountWarning(item) {
  if (!isEssayService(item?.key)) return "";
  if (!item?.essayWordCount) return "";
  const range = getEssayRange(item.key);
  const count = Number(item.essayWordCount);
  if (!range || !Number.isInteger(count) || count <= 0) return "";
  if (count < range.min || count > range.max) {
    if (count > 650) {
      return `${item.label} requires ${range.label}. Essays above 650 words are not supported here. Please shorten this draft to 650 or less.`;
    }
    const suggested = getSuggestedEssayService(count);
    if (suggested && suggested.key !== item.key) {
      return `${item.label} requires ${range.label}. This should be ${suggested.label} (${suggested.range}).`;
    }
    return `${item.label} requires ${range.label}.`;
  }
  return "";
}

export default function Apply() {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [meetingSlots, setMeetingSlots] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await getStudentSession();
      if (!session) {
        if (active) setLoadingProfile(false);
        return;
      }
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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { slots } = await api.listMeetingSlots();
        if (active) setMeetingSlots((slots || []).filter((slot) => !slot.isBooked));
      } catch {
        if (active) setMeetingSlots([]);
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
  const hasMeetingSlots = meetingSlots.length > 0;

  function addItem(service) {
    setCart((c) => [
      ...c,
      {
        localId: makeId(),
        key: service.key,
        label: service.label,
        vc: service.vc,
        file: null,
        slotId: "",
        essayForCollege: "",
        essayWordCount: "",
        essayPrompt: "",
        checklist: makeChecklist(service.key),
      },
    ]);
  }

  function removeItem(localId) {
    setCart((c) => c.filter((i) => i.localId !== localId));
  }

  function setItemFile(localId, file) {
    setCart((c) => c.map((i) => (i.localId === localId ? { ...i, file } : i)));
  }

  function setChecklistItem(localId, checklistKey, checked) {
    setCart((items) =>
      items.map((item) => {
        if (item.localId !== localId) return item;
        return {
          ...item,
          checklist: item.checklist.map((entry) =>
            entry.key === checklistKey ? { ...entry, checked } : entry
          ),
        };
      })
    );
  }

  function setMeetingSlot(localId, slotId) {
    setCart((items) =>
      items.map((item) => (item.localId === localId ? { ...item, slotId } : item))
    );
  }

  function setEssayField(localId, key, value) {
    setCart((items) =>
      items.map((item) => (item.localId === localId ? { ...item, [key]: value } : item))
    );
  }

  function canAfford(service) {
    return total + service.vc <= balance;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setErrors({});

    const fieldErrors = {};
    if (!profile || !profile.email) {
      fieldErrors.cart = "Please sign in again so we can load your student profile before submitting.";
    }
    if (cart.length === 0) fieldErrors.cart = "Select at least one service to submit.";
    if (overBudget) fieldErrors.cart = "You don't have enough credits for what's selected.";
    if (cart.some((item) => item.checklist?.some((entry) => !entry.checked))) {
      fieldErrors.cart = "Complete all checklist items for each submission before submitting.";
    }
    if (cart.some((item) => item.key === "meeting" && !item.slotId)) {
      fieldErrors.cart = "Pick a meeting date/time for each meeting session in your cart.";
    }
    if (
      cart.some(
        (item) =>
          isEssayService(item.key) &&
          (!item.essayForCollege.trim() || !item.essayPrompt.trim() || !item.essayWordCount)
      )
    ) {
      fieldErrors.cart =
        "Each essay submission must include the college, exact word count, and prompt.";
    }
    if (
      cart.some(
        (item) =>
          isEssayService(item.key) &&
          (!Number.isInteger(Number(item.essayWordCount)) || Number(item.essayWordCount) <= 0)
      )
    ) {
      fieldErrors.cart = "Essay word count must be a positive whole number.";
    }
    if (cart.some((item) => Boolean(getEssayWordCountWarning(item)))) {
      fieldErrors.cart =
        "One or more essay word counts do not match the selected service requirement. Please fix the highlighted warning(s).";
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const session = await getStudentSession();
      if (!session) throw new Error("Please sign in again before submitting.");
      for (const item of cart) {
        if (item.key === "meeting") {
          await api.createAppointment(
            {
              service: "meeting",
              slotId: item.slotId,
              note: notes.trim(),
            },
            session.access_token
          );
        }

        const formData = new FormData();
        formData.append("name", profile?.full_name || "");
        formData.append("email", profile?.email || "");
        formData.append("notes", notes.trim());
        formData.append("service_key", item.key);
        formData.append("service_label", item.label);
        formData.append("submission_checklist", JSON.stringify(item.checklist || []));
        if (isEssayService(item.key)) {
          formData.append("essay_for_college", item.essayForCollege.trim());
          formData.append("word_count", String(Number(item.essayWordCount)));
          formData.append("essay_prompt", item.essayPrompt.trim());
        }
        if (item.file) formData.append("pdf", item.file);
        await api.submitApplication(formData, { token: session.access_token });
      }
      navigate("/apply/confirmation", { state: { name: profile?.full_name || "Student" } });
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
        <p className="mt-2 font-body text-sm text-slate-500">
          Each item below includes a required checklist so every submission is complete before we review it.
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

            {!profile && !loadingProfile && (
              <div className="rounded-sm border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="font-body text-sm text-amber-900">
                  Sign in to submit your checklist-based application.
                </p>
                <div className="mt-3 flex gap-3">
                  <Link
                    to="/login"
                    className="rounded-sm bg-ink-900 px-4 py-2 font-body text-xs font-medium text-white"
                  >
                    Go to Login
                  </Link>
                  <Link
                    to="/student/register"
                    className="rounded-sm border border-ink-900 px-4 py-2 font-body text-xs font-medium text-ink-900"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            )}

            {/* Select services */}
            <div>
              <span className="font-body text-sm font-medium text-ink-900">Select services</span>
              <div className="mt-3 divide-y divide-hairline overflow-hidden rounded-sm border border-hairline">
                {SERVICES.map((s) => {
                  const affordable = canAfford(s);
                  const available = s.key === "meeting" ? hasMeetingSlots : true;
                  const disabled = !affordable || !available;
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
                          disabled={disabled}
                          onClick={() => addItem(s)}
                          title={!affordable ? "Not enough credits remaining" : !available ? "No meeting slots available" : undefined}
                          className="rounded-sm border border-ink-900 px-3 py-1.5 font-body text-xs font-medium text-ink-900 transition hover:bg-ink-900 hover:text-white disabled:cursor-not-allowed disabled:border-hairline disabled:text-slate-400 disabled:hover:bg-transparent"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 font-body text-xs text-slate-500">
                If you do not see an available appointment please contact veritasprepinfo@gmail.com to schedule your 15 min 1:1 meeting.
              </p>
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
                      {(() => {
                        const essayWordWarning = getEssayWordCountWarning(item);
                        return (
                          <>
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
                            Attach PDF <span className="text-slate-400">(required by checklist)</span>
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

                      {item.key === "meeting" && (
                        <label className="mt-3 block">
                          <span className="font-body text-xs text-slate-500">
                            Meeting date and time <span className="text-red-700">(required)</span>
                          </span>
                          <select
                            value={item.slotId || ""}
                            onChange={(e) => setMeetingSlot(item.localId, e.target.value)}
                            className="mt-1.5 w-full rounded-sm border border-hairline bg-white px-3 py-2 font-body text-xs text-ink-900"
                          >
                            <option value="">Select an available slot</option>
                            {meetingSlots.map((slot) => (
                              <option key={slot.id} value={slot.id}>
                                {formatMeetingDateTime(slot.date, slot.time)}
                              </option>
                            ))}
                          </select>
                          {meetingSlots.length === 0 && (
                            <p className="mt-1 font-body text-xs text-slate-500">
                              No meeting slots are currently available.
                            </p>
                          )}
                        </label>
                      )}

                      {isEssayService(item.key) && (
                        <div className="mt-3 grid grid-cols-1 gap-3 rounded-sm border border-hairline bg-parchment p-3">
                          <label className="block">
                            <span className="font-body text-xs text-slate-500">
                              College this essay is for <span className="text-red-700">(required)</span>
                            </span>
                            <input
                              value={item.essayForCollege || ""}
                              onChange={(e) =>
                                setEssayField(item.localId, "essayForCollege", e.target.value)
                              }
                              className="mt-1.5 w-full rounded-sm border border-hairline bg-white px-3 py-2 font-body text-xs text-ink-900"
                              placeholder="e.g., Cornell University"
                            />
                          </label>

                          <label className="block">
                            <span className="font-body text-xs text-slate-500">
                              Exact word count <span className="text-red-700">(required)</span>
                              <span className="ml-1 text-slate-400">({getEssayRange(item.key)?.label})</span>
                            </span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.essayWordCount || ""}
                              onChange={(e) =>
                                setEssayField(item.localId, "essayWordCount", e.target.value)
                              }
                              className="mt-1.5 w-full rounded-sm border border-hairline bg-white px-3 py-2 font-body text-xs text-ink-900"
                              placeholder="650"
                            />
                            {essayWordWarning && (
                              <p className="mt-1 font-body text-xs text-amber-700">
                                {essayWordWarning}
                              </p>
                            )}
                          </label>

                          <label className="block">
                            <span className="font-body text-xs text-slate-500">
                              Essay prompt <span className="text-red-700">(required)</span>
                            </span>
                            <textarea
                              value={item.essayPrompt || ""}
                              onChange={(e) =>
                                setEssayField(item.localId, "essayPrompt", e.target.value)
                              }
                              className="mt-1.5 min-h-[84px] w-full rounded-sm border border-hairline bg-white px-3 py-2 font-body text-xs text-ink-900"
                              placeholder="Paste the exact prompt text here"
                            />
                          </label>
                        </div>
                      )}

                      <div className="mt-4 rounded-sm border border-hairline bg-parchment p-3">
                        <p className="font-mono text-[11px] uppercase tracking-wide text-slate-600">
                          Submission checklist
                        </p>
                        <div className="mt-2 space-y-2">
                          {(item.checklist || []).map((entry) => (
                            <label key={entry.key} className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={Boolean(entry.checked)}
                                onChange={(e) =>
                                  setChecklistItem(item.localId, entry.key, e.target.checked)
                                }
                                className="mt-0.5"
                              />
                              <span className="font-body text-xs text-ink-700">{entry.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                          </>
                        );
                      })()}
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
              disabled={submitting || overBudget || cart.length === 0 || !profile}
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
