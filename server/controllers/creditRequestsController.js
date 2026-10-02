import { CreditRequest } from "../models/CreditRequest.js";
import { getSupabase } from "../config/supabaseClient.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return (value || "").toLowerCase().trim();
}

function toRequestLike(row) {
  return {
    id: row.id,
    email: normalizeEmail(row.email),
    amount_usd: Number(row.amount_usd || 0),
    vc: Number(row.vc || 0),
    method: row.method || "",
    note: row.note || "",
    status: row.status || "pending",
    created_at: row.created_at || new Date().toISOString(),
    resolved_at: row.resolved_at || null,
    manual_email_sent: Boolean(row.manual_email_sent),
    manual_email_sent_at: row.manual_email_sent_at || null,
  };
}

function mergeRequests(localRequests, supabaseRequests) {
  const merged = [...(localRequests || []).map(toRequestLike)];
  const seen = new Set(
    merged.map((item) => `${normalizeEmail(item.email)}|${item.amount_usd}|${item.vc}|${item.method}|${item.status}|${item.created_at}`)
  );

  for (const row of supabaseRequests || []) {
    const normalized = toRequestLike(row);
    const key = `${normalizeEmail(normalized.email)}|${normalized.amount_usd}|${normalized.vc}|${normalized.method}|${normalized.status}|${normalized.created_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
  }

  return merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function fetchSupabaseCreditRequests() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("credit_requests")
      .select("id,email,amount_usd,vc,method,note,status,created_at,resolved_at,manual_email_sent,manual_email_sent_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Unable to read Supabase credit requests:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn("Supabase credit request fetch failed:", err.message);
    return [];
  }
}

export async function createCreditRequest(req, res) {
  const { email, amount_usd, method, note } = req.body;

  if (!EMAIL_RE.test(email || "")) {
    return res.status(422).json({ error: "A valid email is required." });
  }
  const amount = Number(amount_usd);
  if (!amount || amount <= 0) {
    return res.status(422).json({ error: "Enter a valid purchase amount." });
  }
  if (!["venmo", "zelle"].includes(method)) {
    return res.status(422).json({ error: "Choose a payment method." });
  }

  const request = await CreditRequest.create({
    email,
    amount_usd: amount,
    method,
    note,
  });
  res.status(201).json({ request });
}

export async function listCreditRequests(req, res) {
  try {
    await CreditRequest.backfillApprovedTransactions();
    const [localRequests, supabaseRequests] = await Promise.all([
      Promise.resolve(CreditRequest.findAll()),
      fetchSupabaseCreditRequests(),
    ]);

    res.json({ requests: mergeRequests(localRequests, supabaseRequests) });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to load credit requests." });
  }
}

export async function approveCreditRequest(req, res) {
  const request = await CreditRequest.approve(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found or already resolved." });
  res.json({ request });
}

export async function rejectCreditRequest(req, res) {
  const request = await CreditRequest.reject(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found or already resolved." });
  res.json({ request });
}
