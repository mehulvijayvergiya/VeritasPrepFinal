import { Appointment } from "../models/Appointment.js";
import { Account } from "../models/Account.js";
import { ProfileModel } from "../models/supabase/profileModel.js";
import { Transaction } from "../models/Transaction.js";

async function adjustStudentCredits({ profileId, email, delta }) {
  const amount = Number(delta);
  if (!Number.isFinite(amount) || amount === 0) return;

  let adjusted = false;
  if (profileId) {
    await ProfileModel.adjustCreditsById(profileId, amount);
    adjusted = true;
  } else if (email) {
    const updatedProfile = await ProfileModel.adjustCreditsByEmail(email, amount);
    adjusted = Boolean(updatedProfile);
  }

  if (!adjusted && email) {
    if (amount < 0) {
      const updated = await Account.deductCredits(email, Math.abs(amount));
      if (!updated) {
        throw new Error("Student does not have enough credits for this approval.");
      }
    } else {
      await Account.addCredits(email, amount);
    }
  }
}

export async function listAppointmentSlots(req, res) {
  const slots = await Appointment.listSlots();
  res.json({ slots });
}

export async function listAppointmentSlotsAdmin(req, res) {
  const slots = await Appointment.listSlots();
  res.json({ slots });
}

export async function createAppointmentSlot(req, res) {
  try {
    const slot = await Appointment.createSlot(req.body || {});
    res.status(201).json({ slot });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to create slot." });
  }
}

export async function deleteAppointmentSlot(req, res) {
  try {
    const removed = await Appointment.deleteSlot(req.params.id);
    if (!removed) return res.status(404).json({ error: "Slot not found." });
    res.json({ slot: removed });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to delete slot." });
  }
}

export async function listAppointments(req, res) {
  const appointments = await Appointment.list();
  res.json({ appointments });
}

export async function listMyAppointments(req, res) {
  const profile = req.student?.profile;
  const appointments = await Appointment.listForStudent(profile?.id, profile?.email);
  res.json({ appointments });
}

export async function createAppointment(req, res) {
  try {
    const appointment = await Appointment.create({
      ...req.body,
      studentName: req.student?.profile?.full_name || req.body.studentName,
      studentEmail: req.student?.profile?.email || req.body.studentEmail,
      profileId: req.student?.profile?.id || null,
    });
    res.status(201).json({ appointment });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to book this appointment." });
  }
}

export async function updateAppointmentStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const before = await Appointment.findById(id);
    if (!before) return res.status(404).json({ error: "Appointment not found." });

    const isApprovedStatus = status === "confirmed" || status === "completed";
    const shouldCharge = isApprovedStatus && !before.vc_charged && Number(before.vc_cost || 0) > 0;
    const shouldRefund =
      (status === "cancelled" || status === "pending") &&
      Boolean(before.vc_charged) &&
      Number(before.vc_cost || 0) > 0;

    if (shouldCharge) {
      try {
        await adjustStudentCredits({
          profileId: before.profileId,
          email: before.studentEmail,
          delta: -Math.abs(Number(before.vc_cost || 0)),
        });
      } catch (creditErr) {
        return res.status(422).json({ error: creditErr.message || "Unable to deduct credits." });
      }
      await Transaction.create({
        email: before.studentEmail,
        type: "credit_spend",
        amount: -Math.abs(Number(before.vc_cost || 0)),
        note: "Credits spent for 15-min 1:1 Meeting",
        status: "completed",
      });
    }

    if (shouldRefund) {
      await adjustStudentCredits({
        profileId: before.profileId,
        email: before.studentEmail,
        delta: Math.abs(Number(before.vc_cost || 0)),
      });
      await Transaction.create({
        email: before.studentEmail,
        type: "credit_refund",
        amount: Math.abs(Number(before.vc_cost || 0)),
        note: "Credits refunded for 15-min 1:1 Meeting",
        status: "completed",
      });
    }

    const appointment = await Appointment.updateStatus(id, status);
    await Appointment.updateBilling(id, {
      vc_charged: shouldCharge ? true : shouldRefund ? false : before.vc_charged,
      vc_charged_at: shouldCharge ? new Date().toISOString() : shouldRefund ? null : before.vc_charged_at,
    });
    const refreshed = await Appointment.findById(id);

    res.json({ appointment: refreshed || appointment });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to update appointment." });
  }
}

export async function rescheduleMyAppointment(req, res) {
  const { id } = req.params;
  const { slotId, note } = req.body || {};
  if (!slotId) {
    return res.status(422).json({ error: "Select a new meeting slot." });
  }

  try {
    const appointment = await Appointment.rescheduleForStudent(id, {
      slotId,
      note,
      profileId: req.student?.profile?.id,
      studentEmail: req.student?.profile?.email,
    });
    if (!appointment) return res.status(404).json({ error: "Appointment not found." });
    res.json({ appointment });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to reschedule appointment." });
  }
}
