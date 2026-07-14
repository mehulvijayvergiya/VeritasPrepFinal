import { Submission } from "../models/Submission.js";
import { Appointment } from "../models/Appointment.js";
import { Transaction } from "../models/Transaction.js";
import { ProfileModel } from "../models/supabase/profileModel.js";

export function me(req, res) {
  const { profile } = req.student;
  res.json({
    profile: {
      email: profile.email,
      full_name: profile.full_name,
      credits: profile.credits,
      created_at: profile.created_at,
      phone_number: profile.phone_number,
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
}

export function mySubmissions(req, res) {
  const { profile } = req.student;
  const submissions = Submission.listByProfile(profile.id);
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
    const [profiles, allSubmissions, allAppointments] = await Promise.all([
      ProfileModel.listAll(),
      Promise.resolve(Submission.findAll()),
      Appointment.list(),
    ]);

    const roster = profiles.map((profile) => {
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
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 8);

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
