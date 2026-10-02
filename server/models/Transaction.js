import { db } from "../config/db.js";
import { getSupabase } from "../config/supabaseClient.js";

function extractMissingColumn(error) {
  const message = String(error?.message || "");
  const explicit = message.match(/column\s+transactions\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (explicit) return explicit[1];
  const quoted = message.match(/Could not find '([^']+)' column/i);
  return quoted ? quoted[1] : null;
}

async function syncTransactionToSupabase(transaction) {
  try {
    const supabase = getSupabase();
    const payload = {
      id: transaction.id,
      email: transaction.email,
      type: transaction.type,
      amount: transaction.amount,
      note: transaction.note || "",
      status: transaction.status || "completed",
      created_at: transaction.created_at,
    };

    const mutablePayload = { ...payload };
    while (true) {
      const { error } = await supabase.from("transactions").upsert(mutablePayload, { onConflict: "id" });
      if (!error) return;

      const missingColumn = extractMissingColumn(error);
      if (!missingColumn || !(missingColumn in mutablePayload)) {
        throw error;
      }

      delete mutablePayload[missingColumn];
      if (Object.keys(mutablePayload).length === 0) {
        throw error;
      }
    }
  } catch (err) {
    console.warn("Unable to sync transaction to Supabase:", err.message);
  }
}

export const Transaction = {
  async list() {
    await db.read();
    return [...(db.data.transactions || [])].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  },

  async listByEmail(email) {
    await db.read();
    const normalized = (email || "").toLowerCase().trim();
    return [...(db.data.transactions || [])]
      .filter((item) => item.email?.toLowerCase().trim() === normalized)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
    await syncTransactionToSupabase(transaction);
    return transaction;
  },
};
