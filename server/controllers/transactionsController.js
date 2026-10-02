import { Transaction } from "../models/Transaction.js";
import { CreditRequest } from "../models/CreditRequest.js";
import { getSupabase } from "../config/supabaseClient.js";

function normalizeEmail(value) {
  return (value || "").toLowerCase().trim();
}

function mergeTransactions(localTransactions, supabaseTransactions) {
  const merged = [...(localTransactions || [])];
  const seen = new Set(
    merged.map(
      (item) =>
        `${normalizeEmail(item.email)}|${item.type}|${Number(item.amount || 0)}|${item.status || "completed"}|${item.created_at}`
    )
  );

  for (const row of supabaseTransactions || []) {
    const normalized = {
      id: row.id,
      email: row.email,
      type: row.type,
      amount: row.amount,
      note: row.note || "",
      status: row.status || "completed",
      created_at: row.created_at || new Date().toISOString(),
    };

    const key = `${normalizeEmail(normalized.email)}|${normalized.type}|${Number(normalized.amount || 0)}|${normalized.status}|${normalized.created_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
  }

  return merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function fetchSupabaseTransactions() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("transactions")
      .select("id,email,type,amount,note,status,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Unable to read Supabase transactions:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn("Supabase transaction fetch failed:", err.message);
    return [];
  }
}

export async function listTransactions(req, res) {
  await CreditRequest.backfillApprovedTransactions();
  const [localTransactions, supabaseTransactions] = await Promise.all([
    Transaction.list(),
    fetchSupabaseTransactions(),
  ]);
  res.json({ transactions: mergeTransactions(localTransactions, supabaseTransactions) });
}

export async function createTransaction(req, res) {
  const transaction = await Transaction.create(req.body);
  res.status(201).json({ transaction });
}
