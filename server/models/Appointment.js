import { db } from "../config/db.js";

export const Appointment = {
  async list() {
    await db.read();
    return db.data.appointments || [];
  },

  async create(payload) {
    await db.read();
    const appointment = {
      id: payload.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      service: payload.service,
      date: payload.date,
      time: payload.time,
      note: payload.note || "",
      studentName: payload.studentName || "Student",
      studentEmail: payload.studentEmail || "",
      status: payload.status || "pending",
      createdAt: payload.createdAt || new Date().toISOString(),
    };

    db.data.appointments ||= [];
    db.data.appointments.push(appointment);
    await db.write();
    return appointment;
  },

  async updateStatus(id, status) {
    await db.read();
    const list = db.data.appointments || [];
    const appointment = list.find((item) => item.id === id);
    if (!appointment) return null;

    appointment.status = status;
    await db.write();
    return appointment;
  },
};
