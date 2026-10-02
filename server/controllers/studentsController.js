import { Submission } from "../models/Submission.js";
import { Appointment } from "../models/Appointment.js";
import { Transaction } from "../models/Transaction.js";
import { CreditRequest } from "../models/CreditRequest.js";
import { ProfileModel } from "../models/supabase/profileModel.js";
import { getSupabase } from "../config/supabaseClient.js";
import jwt from "jsonwebtoken";

const STUDENT_VIEW_TOKEN_TTL_SECONDS = 60 * 15;

function buildCreditHistoryEntries({ transactions, creditRequests, email }) {
  const normalizedEmail = (email || "").toLowerCase().trim();
  const txList = (transactions || [])
    .filter((item) => ((item.email || "").toLowerCase().trim() === normalizedEmail))
    .map((item) => ({
      id: `tx-${item.id}`,
      source: "transaction",
      email: item.email,
      type: item.type,
      amount: item.amount,
      note: item.note || "",
      status: item.status || "completed",
      created_at: item.created_at,
    }));

  const requestBackfill = (creditRequests || [])
    .filter((item) => ((item.email || "").toLowerCase().trim() === normalizedEmail))
    .filter((item) => item.status === "approved" || item.status === "rejected")
    .filter((item) => {
      const requestIdTag = `request #${item.id}`;
      return !txList.some((entry) => (entry.note || "").toLowerCase().includes(requestIdTag));
    })
    .map((item) => ({
      id: `request-${item.id}`,
      source: "credit_request",
      email: item.email,
      type: item.status === "approved" ? "credit_purchase" : "credit_request_rejected",
      amount: item.status === "approved" ? Number(item.vc || 0) : 0,
      note:
        item.status === "approved"
          ? `${item.vc} VC approved via ${item.method}`
          : `Credit request rejected (${item.method})`,
      status: item.status,
      created_at: item.resolved_at || item.created_at,
      amount_usd: item.amount_usd,
      method: item.method,
      request_id: item.id,
    }));

  return [...txList, ...requestBackfill].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
}

function buildCreditPurchaseRequestEntries({ creditRequests, email }) {
  const normalizedEmail = (email || "").toLowerCase().trim();
  return (creditRequests || [])
    .filter((item) => ((item.email || "").toLowerCase().trim() === normalizedEmail))
    .map((item) => ({
      id: `request-${item.id}`,
      request_id: item.id,
      email: item.email,
      amount_usd: Number(item.amount_usd || 0),
      vc: Number(item.vc || 0),
      method: item.method || "",
      note: item.note || "",
      status: item.status || "pending",
      created_at: item.created_at,
      resolved_at: item.resolved_at || null,
    }))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function shapeProfile(profile) {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    phone_number: profile.phone_number,
    credits: profile.credits,
    created_at: profile.created_at,
    gpa: profile.gpa,
    sat_score: profile.sat_score,
    act_score: profile.act_score,
    graduation_year: profile.graduation_year,
    high_school: profile.high_school,
    intended_major: profile.intended_major,
    ap_course_count: profile.ap_course_count,
    class_rank_percentile: profile.class_rank_percentile,
    extracurricular_summary: profile.extracurricular_summary,
    target_colleges: Array.isArray(profile.target_colleges) ? profile.target_colleges : [],
  };
}

async function buildStudentDashboardSnapshot(profileId) {
  const profile = await ProfileModel.getById(profileId);
  if (!profile) return null;

  await CreditRequest.backfillApprovedTransactions();

  const allCreditRequests = CreditRequest.findAll();

  const [submissions, appointments, transactions] = await Promise.all([
    Submission.listByProfile(profile.id, profile.email),
    Appointment.listForStudent(profile.id, profile.email),
    Transaction.listByEmail(profile.email),
  ]);

  return {
    profile: shapeProfile(profile),
    submissions,
    appointments,
    transactions: buildCreditHistoryEntries({
      transactions,
      creditRequests: allCreditRequests,
      email: profile.email,
    }),
    purchase_requests: buildCreditPurchaseRequestEntries({
      creditRequests: allCreditRequests,
      email: profile.email,
    }),
  };
}

function submissionBelongsToProfile(submission, profile) {
  if (!submission || !profile) return false;
  if (submission.profile_id && profile.id && submission.profile_id === profile.id) {
    return true;
  }
  return (
    Boolean(submission.email) &&
    Boolean(profile.email) &&
    submission.email.toLowerCase() === profile.email.toLowerCase()
  );
}

export function me(req, res) {
  const { profile } = req.student;
  res.json({
    profile: shapeProfile(profile),
  });
}

export async function createStudentViewToken(req, res) {
  try {
    const profileId = (req.params.profileId || "").trim();
    if (!profileId) {
      return res.status(400).json({ error: "Student profile ID is required." });
    }

    const profile = await ProfileModel.getById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Student profile not found." });
    }

    const token = jwt.sign(
      {
        type: "student_view",
        profile_id: profile.id,
        admin_id: req.admin?.id,
        admin_email: req.admin?.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: STUDENT_VIEW_TOKEN_TTL_SECONDS }
    );

    res.json({ view_token: token, expires_in: STUDENT_VIEW_TOKEN_TTL_SECONDS, profile_id: profile.id });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to create view-as token." });
  }
}

export async function viewAsStudentDashboard(req, res) {
  const viewToken = (req.query.view_token || "").toString().trim();
  if (!viewToken) {
    return res.status(401).json({ error: "Missing view token." });
  }

  try {
    const payload = jwt.verify(viewToken, process.env.JWT_SECRET);
    if (payload?.type !== "student_view" || !payload?.profile_id) {
      return res.status(401).json({ error: "Invalid view token." });
    }

    const snapshot = await buildStudentDashboardSnapshot(payload.profile_id);
    if (!snapshot) {
      return res.status(404).json({ error: "Student profile not found." });
    }

    return res.json({
      ...snapshot,
      read_only: true,
      viewed_by: payload.admin_email || null,
    });
  } catch (err) {
    return res.status(401).json({ error: "View session expired. Please reopen from the admin dashboard." });
  }
}

export async function viewAsStudentSubmissionDownloadUrl(req, res) {
  const viewToken = (req.query.view_token || "").toString().trim();
  if (!viewToken) {
    return res.status(401).json({ error: "Missing view token." });
  }

  try {
    const payload = jwt.verify(viewToken, process.env.JWT_SECRET);
    if (payload?.type !== "student_view" || !payload?.profile_id) {
      return res.status(401).json({ error: "Invalid view token." });
    }

    const profile = await ProfileModel.getById(payload.profile_id);
    if (!profile) {
      return res.status(404).json({ error: "Student profile not found." });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found." });
    if (!submissionBelongsToProfile(submission, profile)) {
      return res.status(403).json({ error: "You do not have access to this submission." });
    }

    const storagePath = submission.attachment_storage_path || submission.attachment_path;
    if (!storagePath) {
      return res.status(404).json({ error: "No uploaded PDF found for this submission." });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from("student-submissions")
      .createSignedUrl(storagePath, 60 * 15, {
        download: submission.attachment_original_name || submission.attachment_filename || "submission.pdf",
      });

    if (error || !data?.signedUrl) {
      return res.status(502).json({ error: error?.message || "Unable to generate download link." });
    }

    return res.json({ url: data.signedUrl, expires_in: 60 * 15 });
  } catch {
    return res.status(401).json({ error: "View session expired. Please reopen from the admin dashboard." });
  }
}

export async function viewAsStudentSubmissionFeedbackDownloadUrl(req, res) {
  const viewToken = (req.query.view_token || "").toString().trim();
  if (!viewToken) {
    return res.status(401).json({ error: "Missing view token." });
  }

  try {
    const payload = jwt.verify(viewToken, process.env.JWT_SECRET);
    if (payload?.type !== "student_view" || !payload?.profile_id) {
      return res.status(401).json({ error: "Invalid view token." });
    }

    const profile = await ProfileModel.getById(payload.profile_id);
    if (!profile) {
      return res.status(404).json({ error: "Student profile not found." });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found." });
    if (!submissionBelongsToProfile(submission, profile)) {
      return res.status(403).json({ error: "You do not have access to this submission." });
    }

    const storagePath = submission.feedback_attachment_storage_path || submission.feedback_attachment_path;
    if (!storagePath) {
      return res.status(404).json({ error: "No feedback PDF found for this submission." });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from("student-submissions")
      .createSignedUrl(storagePath, 60 * 15, {
        download: submission.feedback_attachment_original_name || submission.feedback_attachment_filename || "feedback.pdf",
      });

    if (error || !data?.signedUrl) {
      return res.status(502).json({ error: error?.message || "Unable to generate feedback link." });
    }

    return res.json({ url: data.signedUrl, expires_in: 60 * 15 });
  } catch {
    return res.status(401).json({ error: "View session expired. Please reopen from the admin dashboard." });
  }
}

export async function mySubmissions(req, res) {
  const { profile } = req.student;
  await Submission.recoverFromStorageForProfile({
    profileId: profile.id,
    email: profile.email,
    name: profile.full_name,
  });
  await Submission.enrichRecoveredMetadata({
    profileId: profile.id,
    profileEmail: profile.email,
  });
  const submissions = await Submission.listByProfile(profile.id, profile.email);
  res.json({ submissions });
}

export async function myTransactions(req, res) {
  const { profile } = req.student;
  await CreditRequest.backfillApprovedTransactions();
  const [transactions, allCreditRequests] = await Promise.all([
    Transaction.listByEmail(profile.email),
    Promise.resolve(CreditRequest.findAll()),
  ]);
  const history = buildCreditHistoryEntries({
    transactions,
    creditRequests: allCreditRequests,
    email: profile.email,
  });
  const purchaseRequests = buildCreditPurchaseRequestEntries({
    creditRequests: allCreditRequests,
    email: profile.email,
  });
  res.json({ transactions: history, purchase_requests: purchaseRequests });
}

export async function getStudentProfileAdmin(req, res) {
  try {
    const profile = await ProfileModel.getById(req.params.profileId);
    if (!profile) return res.status(404).json({ error: "Student profile not found." });

    res.json({
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        credits: profile.credits,
        gpa: profile.gpa,
        sat_score: profile.sat_score,
        act_score: profile.act_score,
        graduation_year: profile.graduation_year,
        high_school: profile.high_school,
        intended_major: profile.intended_major,
        ap_course_count: profile.ap_course_count,
        class_rank_percentile: profile.class_rank_percentile,
        extracurricular_summary: profile.extracurricular_summary,
        target_colleges: Array.isArray(profile.target_colleges) ? profile.target_colleges : [],
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to load student profile." });
  }
}

export async function getStudentRosterAdmin(req, res) {
  try {
    const profiles = await ProfileModel.listAll();
    await CreditRequest.backfillApprovedTransactions();
    await Promise.all(
      profiles.map((profile) =>
        Submission.recoverFromStorageForProfile({
          profileId: profile.id,
          email: profile.email,
          name: profile.full_name,
        })
      )
    );
    await Promise.all(
      profiles.map((profile) =>
        Submission.enrichRecoveredMetadata({
          profileId: profile.id,
          profileEmail: profile.email,
        })
      )
    );

    const [allSubmissions, allAppointments] = await Promise.all([
      Submission.findAll(),
      Appointment.list(),
    ]);
    const [allTransactions, allCreditRequests] = await Promise.all([
      Transaction.list(),
      Promise.resolve(CreditRequest.findAll()),
    ]);

    const roster = profiles.map((profile) => {
      const normalizedEmail = (profile.email || "").toLowerCase().trim();
      const submissions = allSubmissions.filter((item) => {
        if (profile.id && item.profile_id === profile.id) return true;
        return item.email && profile.email && item.email.toLowerCase() === profile.email.toLowerCase();
      });

      const appointments = allAppointments.filter((item) => {
        if (profile.id && item.profileId === profile.id) return true;
        return (
          item.studentEmail &&
          profile.email &&
          item.studentEmail.toLowerCase() === profile.email.toLowerCase()
        );
      });

      const creditRequests = allCreditRequests
        .filter((item) => {
          return (item.email || "").toLowerCase().trim() === normalizedEmail;
        })
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      const creditTransactions = buildCreditHistoryEntries({
        transactions: allTransactions,
        creditRequests: allCreditRequests,
        email: profile.email,
      });

      const submissionCounts = submissions.reduce(
        (acc, item) => {
          acc.total += 1;
          if (item.status === "pending") acc.pending += 1;
          if (item.status === "in_review") acc.in_review += 1;
          if (item.status === "completed") acc.completed += 1;
          return acc;
        },
        { total: 0, pending: 0, in_review: 0, completed: 0 }
      );

      const appointmentCounts = appointments.reduce(
        (acc, item) => {
          acc.total += 1;
          if (item.status === "pending") acc.pending += 1;
          if (item.status === "confirmed") acc.confirmed += 1;
          if (item.status === "completed") acc.completed += 1;
          if (item.status === "cancelled") acc.cancelled += 1;
          return acc;
        },
        { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
      );

      const recentSubmissions = [...submissions]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const appointmentHistory = [...appointments]
        .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));

      return {
        profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          credits: profile.credits,
          referral_code: profile.referral_code,
          created_at: profile.created_at,
          gpa: profile.gpa,
          sat_score: profile.sat_score,
          act_score: profile.act_score,
          graduation_year: profile.graduation_year,
          high_school: profile.high_school,
          intended_major: profile.intended_major,
          ap_course_count: profile.ap_course_count,
          class_rank_percentile: profile.class_rank_percentile,
          extracurricular_summary: profile.extracurricular_summary,
          target_colleges: Array.isArray(profile.target_colleges) ? profile.target_colleges : [],
        },
        metrics: {
          submissions: submissionCounts,
          appointments: appointmentCounts,
          last_submission_at: recentSubmissions[0]?.created_at || null,
          last_appointment_at: appointmentHistory[0]?.createdAt || appointmentHistory[0]?.updatedAt || null,
        },
        recent_submissions: recentSubmissions,
        appointment_history: appointmentHistory,
        credit_transactions: creditTransactions,
        credit_requests: creditRequests,
      };
    });

    res.json({ roster });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to load student roster." });
  }
}

export async function updateMyProfile(req, res) {
  try {
    const profileId = req.student.profile.id;
    const { profile, errors } = await ProfileModel.update(profileId, req.body || {});

    if (errors) {
      return res.status(422).json({ error: "Please fix the highlighted fields.", fields: errors });
    }

    res.json({ profile });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to update profile." });
  }
}
