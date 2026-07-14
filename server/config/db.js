import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "veritas.json");

const defaultData = {
  submissions: [],
  admins: [],
  accounts: [],
  creditRequests: [],
  transactions: [],
  appointments: [],
  appointmentSlots: [],
  nextSubmissionId: 1,
  nextCreditRequestId: 1,
};
const adapter = new JSONFile(dbPath);
export const db = new Low(adapter, defaultData);

export async function initDb() {
  await db.read();
  db.data ||= structuredClone(defaultData);
  db.data.submissions ||= [];
  db.data.admins ||= [];
  db.data.accounts ||= [];
  db.data.creditRequests ||= [];
  db.data.transactions ||= [];
  db.data.appointments ||= [];
  db.data.appointmentSlots ||= [];
  db.data.nextSubmissionId ||= 1;
  db.data.nextCreditRequestId ||= 1;

  // Seed a default admin from env vars on first boot, if none exists yet.
  if (db.data.admins.length === 0) {
    const email = (process.env.ADMIN_EMAIL || "admin@veritasprep.com").toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD || "changeme123";
    const password_hash = bcrypt.hashSync(password, 10);
    db.data.admins.push({ id: 1, email, password_hash });
    console.log(`Seeded default admin account: ${email}`);
    console.log("   (set ADMIN_EMAIL / ADMIN_PASSWORD in .env to change this)");
  }

  await db.write();
}
