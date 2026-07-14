import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStudentSession, logoutStudent } from "../../lib/studentAuth.js";
import { api } from "../../lib/api.js";

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [rescheduleChoices, setRescheduleChoices] = useState({});
  const [rescheduleBusyId, setRescheduleBusyId] = useState("");
  const [activeSubmissionId, setActiveSubmissionId] = useState("");
  const [activeSubmissionTab, setActiveSubmissionTab] = useState("details");
  const [downloadingSubmissionId, setDownloadingSubmissionId] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone_number: "",
    gpa: "",
    sat_score: "",
    act_score: "",
    graduation_year: "",
    high_school: "",
    intended_major: "",
    ap_course_count: "",
    class_rank_percentile: "",
    extracurricular_summary: "",
    target_colleges_text: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getStudentSession();
        setSessionToken(session.access_token);
        const [{ profile }, { submissions }, { appointments }, { slots }, { transactions }] = await Promise.all([
          api.getStudentMe(session.access_token),
          api.getStudentSubmissions(session.access_token),
          api.getStudentAppointments(session.access_token),
          api.listMeetingSlots(),
          api.getStudentTransactions(session.access_token),
        ]);
        if (active) {
          setProfile(profile);
          setSubmissions(submissions || []);
          setAppointments(appointments || []);
          setTransactions(transactions || []);
          setAvailableSlots((slots || []).filter((slot) => !slot.isBooked));
          setProfileForm({
            full_name: profile.full_name || "",
            phone_number: profile.phone_number || "",
            gpa: profile.gpa ?? "",
            sat_score: profile.sat_score ?? "",
            act_score: profile.act_score ?? "",
            graduation_year: profile.graduation_year ?? "",
            high_school: profile.high_school || "",
            intended_major: profile.intended_major || "",
            ap_course_count: profile.ap_course_count ?? "",
            class_rank_percentile: profile.class_rank_percentile ?? "",
            extracurricular_summary: profile.extracurricular_summary || "",
            target_colleges_text: Array.isArray(profile.target_colleges)
              ? profile.target_colleges.join(", ")
              : "",
          });
        }
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

  function handleFormChange(key, value) {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setSaveMessage("");
    setFormErrors({});
    if (!sessionToken) return;

    setSaving(true);
    try {
      const payload = {
        full_name: profileForm.full_name.trim() || null,
        phone_number: profileForm.phone_number.trim() || null,
        gpa: toNumberOrNull(profileForm.gpa),
        sat_score: toNumberOrNull(profileForm.sat_score),
        act_score: toNumberOrNull(profileForm.act_score),
        graduation_year: toNumberOrNull(profileForm.graduation_year),
        high_school: profileForm.high_school.trim() || null,
        intended_major: profileForm.intended_major.trim() || null,
        ap_course_count: toNumberOrNull(profileForm.ap_course_count),
        class_rank_percentile: toNumberOrNull(profileForm.class_rank_percentile),
        extracurricular_summary: profileForm.extracurricular_summary.trim() || null,
        target_colleges: profileForm.target_colleges_text
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      const { profile: updatedProfile } = await api.updateStudentMe(payload, sessionToken);
      setProfile(updatedProfile);
      setSaveMessage("Profile updated.");
    } catch (err) {
      setFormErrors(err.fields || {});
      setSaveMessage(err.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logoutStudent();
    navigate("/login");
  }

  async function handleReschedule(appointmentId) {
    const slotId = rescheduleChoices[appointmentId];
    if (!slotId || !sessionToken) return;

    setRescheduleBusyId(appointmentId);
    setSaveMessage("");
    try {
      await api.rescheduleAppointment(appointmentId, { slotId }, sessionToken);
      const [{ appointments: refreshed }, { slots }] = await Promise.all([
        api.getStudentAppointments(sessionToken),
        api.listMeetingSlots(),
      ]);
      setAppointments(refreshed || []);
      setAvailableSlots((slots || []).filter((slot) => !slot.isBooked));
      setRescheduleChoices((prev) => ({ ...prev, [appointmentId]: "" }));
      setSaveMessage("Meeting rescheduled. It is now pending admin approval.");
    } catch (err) {
      setSaveMessage(err.message || "Unable to reschedule this meeting.");
    } finally {
      setRescheduleBusyId("");
    }
  }

  async function handleDownloadSubmission(submissionId) {
    if (!sessionToken) return;
    setDownloadingSubmissionId(submissionId);
    try {
      const { url } = await api.getStudentSubmissionDownloadUrl(submissionId, sessionToken);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setSaveMessage(err.message || "Unable to open your uploaded file.");
    } finally {
      setDownloadingSubmissionId("");
    }
  }

  return (
    <div className="min-h-screen bg-parchment px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-ink-900">Your dashboard</h1>
          <div className="flex items-center gap-4">
            <Link to="/" className="font-body text-sm font-medium text-ink-700 ink-underline">
              Home
            </Link>
            <button
              onClick={handleLogout}
              className="font-body text-sm font-medium text-ink-400 ink-underline"
            >
              Sign out
            </button>
          </div>
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
                <dt className="text-ink-400">Total submissions</dt>
                <dd className="mt-1 text-ink-900">{submissions.length}</dd>
              </div>
            </dl>
          )}
        </div>

        <form onSubmit={handleProfileSave} className="mt-5 rounded-sm bg-white p-7 paper-shadow">
          <h2 className="font-display text-xl text-ink-900">College profile</h2>
          <p className="mt-1 font-body text-sm text-slate-500">
            Add your GPA, SAT, and other admissions stats here. This is now the source for target colleges.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-body text-xs text-slate-500">GPA</span>
              <input
                value={profileForm.gpa}
                onChange={(e) => handleFormChange("gpa", e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
                placeholder="4.0"
              />
              {formErrors.gpa && <p className="mt-1 text-xs text-red-700">{formErrors.gpa}</p>}
            </label>

            <label className="block">
              <span className="font-body text-xs text-slate-500">SAT score</span>
              <input
                value={profileForm.sat_score}
                onChange={(e) => handleFormChange("sat_score", e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
                placeholder="1450"
              />
              {formErrors.sat_score && <p className="mt-1 text-xs text-red-700">{formErrors.sat_score}</p>}
            </label>

            <label className="block">
              <span className="font-body text-xs text-slate-500">ACT score</span>
              <input
                value={profileForm.act_score}
                onChange={(e) => handleFormChange("act_score", e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
                placeholder="33"
              />
              {formErrors.act_score && <p className="mt-1 text-xs text-red-700">{formErrors.act_score}</p>}
            </label>

            <label className="block">
              <span className="font-body text-xs text-slate-500">Graduation year</span>
              <input
                value={profileForm.graduation_year}
                onChange={(e) => handleFormChange("graduation_year", e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
                placeholder="2027"
              />
              {formErrors.graduation_year && (
                <p className="mt-1 text-xs text-red-700">{formErrors.graduation_year}</p>
              )}
            </label>

            <label className="block sm:col-span-2">
              <span className="font-body text-xs text-slate-500">Target colleges (comma separated)</span>
              <input
                value={profileForm.target_colleges_text}
                onChange={(e) => handleFormChange("target_colleges_text", e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
                placeholder="Cornell, Northwestern, USC"
              />
              {formErrors.target_colleges && (
                <p className="mt-1 text-xs text-red-700">{formErrors.target_colleges}</p>
              )}
            </label>

            <label className="block sm:col-span-2">
              <span className="font-body text-xs text-slate-500">High school</span>
              <input
                value={profileForm.high_school}
                onChange={(e) => handleFormChange("high_school", e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
                placeholder="Name of high school"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="font-body text-xs text-slate-500">Intended major</span>
              <input
                value={profileForm.intended_major}
                onChange={(e) => handleFormChange("intended_major", e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
                placeholder="Computer Science"
              />
            </label>

            <label className="block">
              <span className="font-body text-xs text-slate-500">AP/IB course count</span>
              <input
                value={profileForm.ap_course_count}
                onChange={(e) => handleFormChange("ap_course_count", e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
                placeholder="8"
              />
              {formErrors.ap_course_count && (
                <p className="mt-1 text-xs text-red-700">{formErrors.ap_course_count}</p>
              )}
            </label>

            <label className="block">
              <span className="font-body text-xs text-slate-500">Class rank percentile</span>
              <input
                value={profileForm.class_rank_percentile}
                onChange={(e) => handleFormChange("class_rank_percentile", e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
                placeholder="Top 10 -> 10"
              />
              {formErrors.class_rank_percentile && (
                <p className="mt-1 text-xs text-red-700">{formErrors.class_rank_percentile}</p>
              )}
            </label>

            <label className="block sm:col-span-2">
              <span className="font-body text-xs text-slate-500">Extracurricular summary</span>
              <textarea
                value={profileForm.extracurricular_summary}
                onChange={(e) => handleFormChange("extracurricular_summary", e.target.value)}
                className="mt-1.5 min-h-[90px] w-full rounded-sm border border-hairline px-3 py-2 font-body text-sm"
                placeholder="Leadership, clubs, sports, awards, impact..."
              />
            </label>
          </div>

          {saveMessage && (
            <p className="mt-3 font-body text-xs text-ink-600">{saveMessage}</p>
          )}

          <button
            type="submit"
            disabled={saving || !sessionToken}
            className="mt-4 rounded-sm bg-ink-900 px-4 py-2 font-body text-xs font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save college profile"}
          </button>
        </form>

        <div className="mt-5 rounded-sm bg-white p-7 paper-shadow">
          <h2 className="font-display text-xl text-ink-900">Your submissions</h2>
          {submissions.length === 0 && (
            <p className="mt-2 font-body text-sm text-ink-400">
              No submissions yet. Start one from the apply page.
            </p>
          )}
          {submissions.length > 0 && (
            <div className="mt-4 space-y-4">
              {(() => {
                const meetingAppointments = appointments.filter((item) => item.service === "meeting");
                let meetingIndex = 0;
                return submissions.map((submission) => {
                const meetingInfo =
                  submission.service_key === "meeting"
                    ? meetingAppointments[meetingIndex++] || null
                    : null;
                const allChecked = (submission.submission_checklist || []).every((entry) => entry.checked);
                return (
                  <div key={submission.id} className="rounded-sm border border-hairline bg-parchment p-4">
                    <p className="font-body text-sm font-medium text-ink-900">
                      {submission.submission_title || submission.service_label || "Submission"}
                    </p>
                    <p className="mt-1 font-body text-xs text-slate-500">
                      Status: {submission.status} · Submitted {new Date(submission.created_at).toLocaleDateString()}
                    </p>
                    <p className="mt-1 font-body text-xs text-slate-500">
                      Checklist: {allChecked ? "Complete" : "Incomplete"}
                    </p>
                    {meetingInfo && (
                      <p className="mt-1 font-body text-xs text-slate-500">
                        Meeting: {(meetingInfo.slot?.date || meetingInfo.date)} at {(meetingInfo.slot?.time || meetingInfo.time)} · {meetingInfo.status}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setActiveSubmissionId(submission.id);
                          setActiveSubmissionTab("details");
                        }}
                        className="rounded-sm border border-hairline px-3 py-1.5 font-body text-xs text-ink-700"
                      >
                        View submission
                      </button>
                      <button
                        onClick={() => {
                          setActiveSubmissionId(submission.id);
                          setActiveSubmissionTab("feedback");
                        }}
                        className="rounded-sm border border-hairline px-3 py-1.5 font-body text-xs text-ink-700"
                      >
                        View feedback
                      </button>
                    </div>

                    {activeSubmissionId === submission.id && (
                      <div className="mt-4 rounded-sm border border-hairline bg-white p-4">
                        <div className="flex gap-2">
                          {[
                            { key: "details", label: "Details" },
                            { key: "feedback", label: "Feedback" },
                          ].map((tab) => (
                            <button
                              key={tab.key}
                              onClick={() => setActiveSubmissionTab(tab.key)}
                              className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wide ${
                                activeSubmissionTab === tab.key
                                  ? "bg-ink-900 text-white"
                                  : "bg-parchment text-slate-500"
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {activeSubmissionTab === "details" && (
                          <div className="mt-4 space-y-3">
                            <p className="font-body text-xs text-slate-500">
                              Service: {submission.service_label || submission.service_key || "—"}
                            </p>
                            {submission.essay_for_college && (
                              <p className="font-body text-xs text-slate-500">College: {submission.essay_for_college}</p>
                            )}
                            {submission.word_count && (
                              <p className="font-body text-xs text-slate-500">Word count: {submission.word_count}</p>
                            )}
                            {submission.essay_prompt && (
                              <div>
                                <p className="font-body text-xs text-slate-500">Prompt</p>
                                <p className="mt-1 font-body text-sm text-ink-900 whitespace-pre-wrap">{submission.essay_prompt}</p>
                              </div>
                            )}
                            {submission.notes && (
                              <div>
                                <p className="font-body text-xs text-slate-500">Your notes</p>
                                <p className="mt-1 font-body text-sm text-ink-900 whitespace-pre-wrap">{submission.notes}</p>
                              </div>
                            )}
                            <div>
                              <p className="font-body text-xs text-slate-500">Checklist</p>
                              <ul className="mt-1 space-y-1">
                                {(submission.submission_checklist || []).map((entry, idx) => (
                                  <li key={`${entry.label}-${idx}`} className="font-body text-sm text-ink-900">
                                    {entry.checked ? "[x]" : "[ ]"} {entry.label}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {submission.attachment_storage_path && (
                              <div>
                                <p className="font-body text-xs text-slate-500">Uploaded file</p>
                                <button
                                  onClick={() => handleDownloadSubmission(submission.id)}
                                  disabled={downloadingSubmissionId === submission.id}
                                  className="mt-2 rounded-sm bg-ink-900 px-3 py-2 font-body text-xs text-white disabled:opacity-60"
                                >
                                  {downloadingSubmissionId === submission.id ? "Preparing file..." : "Open uploaded PDF"}
                                </button>
                                <p className="mt-1 font-body text-xs text-slate-500">
                                  {submission.attachment_original_name || submission.attachment_filename || "submission.pdf"}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {activeSubmissionTab === "feedback" && (
                          <div className="mt-4 space-y-3">
                            {submission.reviewer_notes ? (
                              <div>
                                <p className="font-body text-xs text-slate-500">Reviewer feedback</p>
                                <p className="mt-1 font-body text-sm text-ink-900 whitespace-pre-wrap">{submission.reviewer_notes}</p>
                              </div>
                            ) : null}
                            {(submission.comments || []).length > 0 && (
                              <div>
                                <p className="font-body text-xs text-slate-500">Additional comments</p>
                                <div className="mt-2 space-y-2">
                                  {submission.comments.map((comment) => (
                                    <div key={comment.id} className="rounded-sm border border-hairline bg-parchment px-3 py-2">
                                      <p className="font-body text-sm text-ink-900 whitespace-pre-wrap">{comment.text}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!submission.reviewer_notes && (submission.comments || []).length === 0 && (
                              <p className="font-body text-sm text-slate-500">No feedback has been posted yet.</p>
                            )}
                            {submission.feedback_sent_at && (
                              <p className="font-body text-xs text-slate-500">
                                Feedback updated {new Date(submission.feedback_sent_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
              })()}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-sm bg-white p-7 paper-shadow">
          <h2 className="font-display text-xl text-ink-900">Your meetings</h2>
          {appointments.length === 0 && (
            <p className="mt-2 font-body text-sm text-ink-400">No meetings booked yet.</p>
          )}

          {appointments.length > 0 && (
            <div className="mt-4 space-y-4">
              {appointments.map((appt) => (
                <div key={appt.id} className="rounded-sm border border-hairline bg-parchment p-4">
                  <p className="font-body text-sm font-medium text-ink-900">
                    {appt.slot?.date || appt.date} at {appt.slot?.time || appt.time}
                  </p>
                  <p className="mt-1 font-body text-xs text-slate-500">Status: {appt.status}</p>
                  {appt.note && <p className="mt-1 font-body text-xs text-slate-500">{appt.note}</p>}

                  {appt.status !== "completed" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={rescheduleChoices[appt.id] || ""}
                        onChange={(e) =>
                          setRescheduleChoices((prev) => ({ ...prev, [appt.id]: e.target.value }))
                        }
                        className="rounded-sm border border-hairline px-3 py-2 font-body text-xs"
                      >
                        <option value="">Choose a new slot</option>
                        {availableSlots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.date} at {slot.time}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleReschedule(appt.id)}
                        disabled={!rescheduleChoices[appt.id] || rescheduleBusyId === appt.id}
                        className="rounded-sm border border-ink-300 px-3 py-2 font-body text-xs text-ink-700 disabled:opacity-50"
                      >
                        {rescheduleBusyId === appt.id ? "Rescheduling..." : "Reschedule"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-sm bg-white p-7 paper-shadow">
          <h2 className="font-display text-xl text-ink-900">Credit history</h2>
          {transactions.length === 0 && (
            <p className="mt-2 font-body text-sm text-ink-400">No credit transactions yet.</p>
          )}
          {transactions.length > 0 && (
            <div className="mt-4 space-y-3">
              {transactions.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 rounded-sm border border-hairline bg-parchment p-4">
                  <div>
                    <p className="font-body text-sm font-medium text-ink-900">{entry.note || entry.type}</p>
                    <p className="mt-1 font-body text-xs text-slate-500">
                      {new Date(entry.created_at).toLocaleString()} · {entry.status}
                    </p>
                  </div>
                  <p className={`font-body text-sm font-medium ${Number(entry.amount) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {Number(entry.amount) >= 0 ? "+" : ""}{entry.amount} VC
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
