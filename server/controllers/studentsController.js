import { Submission } from "../models/Submission.js";
import { Appointment } from "../models/Appointment.js";
import { Transaction } from "../models/Transaction.js";
import { CreditRequest } from "../models/CreditRequest.js";
import { ProfileModel } from "../models/supabase/profileModel.js";
import jwt from "jsonwebtoken";

const STUDENT_VIEW_TOKEN_TTL_SECONDS = 60 * 15;

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

  const [submissions, appointments, transactions] = await Promise.all([
    Submission.listByProfile(profile.id, profile.email),
    Appointment.listForStudent(profile.id, profile.email),
    Transaction.listByEmail(profile.email),
  ]);

  return {
    profile: shapeProfile(profile),
    submissions,
    appointments,
    transactions,
  };
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

export async function mySubmissions(req, res) {
  const { profile } = req.student;
  await Submission.recoverFromStorageForProfile({
    profileId: profile.id,
    email: profile.email,
    name: profile.full_name,
  });
  const submissions = await Submission.listByProfile(profile.id, profile.email);
  res.json({ submissions });
}

export async function myTransactions(req, res) {
  const { profile } = req.student;
  const transactions = await Transaction.listByEmail(profile.email);
  res.json({ transactions });
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

      const creditTransactions = allTransactions
        .filter((item) => {
          return (item.email || "").toLowerCase().trim() === normalizedEmail;
        })
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      const creditRequests = allCreditRequests
        .filter((item) => {
          return (item.email || "").toLowerCase().trim() === normalizedEmail;
        })
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

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
