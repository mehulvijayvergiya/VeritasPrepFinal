import { Transaction } from "../models/Transaction.js";
import { CreditRequest } from "../models/CreditRequest.js";
import { getSupabase } from "../config/supabaseClient.js";
import { Submission } from "../models/Submission.js";
import { PRICES } from "../config/pricing.js";

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

function resolveSubmissionCost(submission) {
  const explicit = Number(submission?.vc_cost);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const key = submission?.service_key;
  if (key && Number.isFinite(Number(PRICES[key]))) {
    return Number(PRICES[key]);
  }
  if (key === "meeting" && Number.isFinite(Number(PRICES.meeting_15min))) {
    return Number(PRICES.meeting_15min);
  }

  const count = Number(submission?.word_count);
  if (Number.isInteger(count) && count > 0) {
    if (count <= 300) return Number(PRICES.essay_short || 0);
    if (count <= 500) return Number(PRICES.essay_medium || 0);
    return Number(PRICES.essay_long || 0);
  }

  const label = (submission?.service_label || "").toLowerCase();
  if (label.includes("301-500")) return Number(PRICES.essay_medium || 0);
  if (label.includes("<= 300") || label.includes("1-300")) return Number(PRICES.essay_short || 0);
  if (label.includes("> 500") || label.includes("common app") || label.includes("501+")) {
    return Number(PRICES.essay_long || 0);
  }
  if (label.includes("activity")) return Number(PRICES.activities || 0);
  if (label.includes("meeting") || label.includes("15-min")) return Number(PRICES.meeting_15min || 0);

  return 0;
}

function inferSubmissionSpendTransactions(submissions, existingTransactions) {
  const allTransactions = existingTransactions || [];
  const inferred = [];

  for (const submission of submissions || []) {
    if (!(submission.status === "completed" || submission.status === "in_review")) continue;

    const amount = resolveSubmissionCost(submission);
    if (!(amount > 0)) continue;

    const serviceToken = (submission.service_label || submission.service_key || "").toLowerCase();
    const hasMatching = allTransactions.some((tx) => {
      if (normalizeEmail(tx.email) !== normalizeEmail(submission.email)) return false;
      if (tx.type !== "credit_spend") return false;
      if (Math.abs(Number(tx.amount || 0)) !== Math.abs(amount)) return false;
      return String(tx.note || "").toLowerCase().includes(serviceToken);
    });

    if (hasMatching) continue;

    inferred.push({
      id: `submission-spend-${submission.id}`,
      email: submission.email,
      type: "credit_spend",
      amount: -Math.abs(amount),
      note: `Credits spent for ${submission.service_label || submission.service_key || "submission"}`,
      status: "completed",
      created_at:
        submission.vc_charged_at || submission.updated_at || submission.created_at || new Date().toISOString(),
    });
  }

  return inferred;
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
  const [localTransactions, supabaseTransactions, submissions] = await Promise.all([
    Transaction.list(),
    fetchSupabaseTransactions(),
    Submission.findAll(),
  ]);
  const merged = mergeTransactions(localTransactions, supabaseTransactions);
  const inferred = inferSubmissionSpendTransactions(submissions, merged);
  const transactions = [...merged, ...inferred].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
  res.json({ transactions });
}

export async function createTransaction(req, res) {
  const transaction = await Transaction.create(req.body);
  res.status(201).json({ transaction });
}
