import { db } from "../config/db.js";
import { PRICES } from "../config/pricing.js";

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

function withSlot(appointment, slots) {
  const slot = slots.find((item) => item.id === appointment.slotId);
  return {
    ...appointment,
    slot: slot
      ? {
          id: slot.id,
          date: slot.date,
          time: slot.time,
          isBooked: Boolean(slot.isBooked),
        }
      : null,
  };
}

function sortByDateTimeAsc(a, b) {
  const left = `${a.date}T${a.time}:00`;
  const right = `${b.date}T${b.time}:00`;
  return left.localeCompare(right);
}

function toSlotView(slot, appointments) {
  const bookedAppointment = appointments.find(
    (item) => item.slotId === slot.id && item.status !== "cancelled"
  );
  return {
    ...slot,
    isBooked: Boolean(bookedAppointment),
    bookedAppointment: bookedAppointment
      ? {
          id: bookedAppointment.id,
          studentName: bookedAppointment.studentName,
          studentEmail: bookedAppointment.studentEmail,
          status: bookedAppointment.status,
          note: bookedAppointment.note || "",
        }
      : null,
  };
}

export const Appointment = {
  async findById(id) {
    await db.read();
    const list = db.data.appointments || [];
    const slots = db.data.appointmentSlots || [];
    const appointment = list.find((item) => item.id === id);
    return appointment ? withSlot(appointment, slots) : null;
  },

  async list() {
    await db.read();
    const appointments = db.data.appointments || [];
    const slots = db.data.appointmentSlots || [];
    return appointments
      .map((appointment) => withSlot(appointment, slots))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async listSlots() {
    await db.read();
    const slots = db.data.appointmentSlots || [];
    const appointments = db.data.appointments || [];
    return [...slots].sort(sortByDateTimeAsc).map((slot) => toSlotView(slot, appointments));
  },

  async listForStudent(profileId, studentEmail) {
    await db.read();
    const all = db.data.appointments || [];
    const slots = db.data.appointmentSlots || [];
    return all
      .filter((item) => {
        if (profileId && item.profileId === profileId) return true;
        return studentEmail && item.studentEmail === studentEmail;
      })
      .map((appointment) => withSlot(appointment, slots))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async createSlot({ date, time }) {
    await db.read();
    if (!date || !time) {
      throw new Error("Date and time are required for a meeting slot.");
    }

    db.data.appointmentSlots ||= [];
    const duplicate = db.data.appointmentSlots.find((slot) => slot.date === date && slot.time === time);
    if (duplicate) {
      throw new Error("That date/time already exists in your schedule.");
    }

    const id = `slot-${date}-${time.replace(":", "")}-${Math.random().toString(16).slice(2, 6)}`;
    const slot = { id, date, time, isBooked: false, createdAt: new Date().toISOString() };
    db.data.appointmentSlots.push(slot);
    await db.write();
    return { ...slot };
  },

  async deleteSlot(slotId) {
    await db.read();
    const slots = db.data.appointmentSlots || [];
    const idx = slots.findIndex((slot) => slot.id === slotId);
    if (idx === -1) return null;

    const appointments = db.data.appointments || [];
    const hasActiveBooking = appointments.some(
      (item) => item.slotId === slotId && item.status !== "cancelled"
    );
    if (hasActiveBooking) {
      throw new Error("Cannot delete a slot that has an active booking.");
    }

    const [removed] = slots.splice(idx, 1);
    await db.write();
    return removed;
  },

  async create(payload) {
    await db.read();
    const slots = db.data.appointmentSlots || [];
    const slot = slots.find((item) => item.id === payload.slotId);
    if (!slot) throw new Error("Selected meeting slot does not exist.");
    if (slot.isBooked) throw new Error("That meeting slot was just booked. Please pick another one.");

    if (!payload.studentEmail) throw new Error("Student email is required for meeting booking.");

    const appointment = {
      id: payload.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      service: payload.service || "meeting",
      slotId: slot.id,
      date: slot.date,
      time: slot.time,
      note: payload.note || "",
      studentName: payload.studentName || "Student",
      studentEmail: payload.studentEmail || "",
      profileId: payload.profileId || null,
      vc_cost: payload.vcCost ?? PRICES.meeting_15min,
      vc_charged: false,
      vc_charged_at: null,
      manual_email_sent: false,
      manual_email_sent_at: null,
      status: "pending",
      createdAt: payload.createdAt || new Date().toISOString(),
    };

    db.data.appointments ||= [];
    db.data.appointments.push(appointment);
    slot.isBooked = true;
    await db.write();
    return withSlot(appointment, slots);
  },

  async updateStatus(id, status) {
    await db.read();
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid appointment status: ${status}`);
    }

    const list = db.data.appointments || [];
    const appointment = list.find((item) => item.id === id);
    if (!appointment) return null;

    const slots = db.data.appointmentSlots || [];
    const slot = slots.find((item) => item.id === appointment.slotId);

    appointment.status = status;
    appointment.updatedAt = new Date().toISOString();
    if (slot) {
      slot.isBooked = status !== "cancelled";
    }
    await db.write();
    return withSlot(appointment, slots);
  },

  async updateBilling(id, { vc_charged, vc_charged_at, manual_email_sent, manual_email_sent_at }) {
    await db.read();
    const list = db.data.appointments || [];
    const appointment = list.find((item) => item.id === id);
    if (!appointment) return null;

    if (vc_charged !== undefined) appointment.vc_charged = Boolean(vc_charged);
    if (vc_charged_at !== undefined) appointment.vc_charged_at = vc_charged_at || null;
    if (manual_email_sent !== undefined) appointment.manual_email_sent = Boolean(manual_email_sent);
    if (manual_email_sent_at !== undefined) appointment.manual_email_sent_at = manual_email_sent_at || null;
    appointment.updatedAt = new Date().toISOString();
    await db.write();
    return withSlot(appointment, db.data.appointmentSlots || []);
  },

  async rescheduleForStudent(id, { slotId, studentEmail, profileId, note }) {
    await db.read();
    const list = db.data.appointments || [];
    const slots = db.data.appointmentSlots || [];
    const appointment = list.find((item) => item.id === id);
    if (!appointment) return null;

    const ownsByProfile = profileId && appointment.profileId === profileId;
    const ownsByEmail = studentEmail && appointment.studentEmail === studentEmail;
    if (!ownsByProfile && !ownsByEmail) {
      throw new Error("You can only reschedule your own appointments.");
    }

    if (appointment.status === "completed") {
      throw new Error("Completed appointments cannot be rescheduled.");
    }

    const nextSlot = slots.find((item) => item.id === slotId);
    if (!nextSlot) {
      throw new Error("Selected meeting slot does not exist.");
    }
    if (nextSlot.isBooked && appointment.slotId !== slotId) {
      throw new Error("That meeting slot is already booked.");
    }

    const previousSlot = slots.find((item) => item.id === appointment.slotId);
    if (previousSlot && previousSlot.id !== nextSlot.id) {
      previousSlot.isBooked = false;
    }

    nextSlot.isBooked = true;
    appointment.slotId = nextSlot.id;
    appointment.date = nextSlot.date;
    appointment.time = nextSlot.time;
    appointment.status = "pending";
    if (note !== undefined) appointment.note = note || "";
    appointment.updatedAt = new Date().toISOString();

    await db.write();
    return withSlot(appointment, slots);
  },
};
