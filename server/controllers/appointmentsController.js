import { Appointment } from "../models/Appointment.js";

export async function listAppointments(req, res) {
  const appointments = await Appointment.list();
  res.json({ appointments });
}

export async function createAppointment(req, res) {
  const appointment = await Appointment.create(req.body);
  res.status(201).json({ appointment });
}

export async function updateAppointmentStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const appointment = await Appointment.updateStatus(id, status);
  if (!appointment) return res.status(404).json({ error: "Appointment not found." });
  res.json({ appointment });
}
