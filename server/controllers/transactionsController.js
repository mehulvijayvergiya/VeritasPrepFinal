import { Transaction } from "../models/Transaction.js";
import { CreditRequest } from "../models/CreditRequest.js";

export async function listTransactions(req, res) {
  await CreditRequest.backfillApprovedTransactions();
  const transactions = await Transaction.list();
  res.json({ transactions });
}

export async function createTransaction(req, res) {
  const transaction = await Transaction.create(req.body);
  res.status(201).json({ transaction });
}
