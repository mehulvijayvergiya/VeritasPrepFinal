import { CreditRequest } from "../models/CreditRequest.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const request = await CreditRequest.create({ email, amount_usd: amount, method, note });
  res.status(201).json({ request });
}

export function listCreditRequests(req, res) {
  res.json({ requests: CreditRequest.findAll() });
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
