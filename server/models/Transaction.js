import { db } from "../config/db.js";

export const Transaction = {
  async list() {
    await db.read();
    return db.data.transactions || [];
  },

  async create(payload) {
    await db.read();
    const transaction = {
      id: payload.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      email: payload.email,
      type: payload.type,
      amount: payload.amount,
      note: payload.note || "",
      status: payload.status || "completed",
      created_at: payload.created_at || new Date().toISOString(),
    };
    db.data.transactions ||= [];
    db.data.transactions.push(transaction);
    await db.write();
    return transaction;
  },
};
