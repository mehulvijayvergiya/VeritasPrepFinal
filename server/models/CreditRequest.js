import { db } from "../config/db.js";
import { Account } from "./Account.js";
import { VC_TO_USD } from "../config/pricing.js";

export const CreditRequest = {
  findAll() {
    return [...db.data.creditRequests].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  },

  findById(id) {
    return db.data.creditRequests.find((r) => r.id === Number(id));
  },

  async create({ email, amount_usd, method, note }) {
    const request = {
      id: db.data.nextCreditRequestId++,
      email: email.toLowerCase().trim(),
      amount_usd,
      vc: Math.round((amount_usd / VC_TO_USD) * 100) / 100,
      method,
      note: (note || "").trim(),
      status: "pending",
      created_at: new Date().toISOString(),
    };
    db.data.creditRequests.push(request);
    await db.write();
    return request;
  },

  async approve(id) {
    const request = CreditRequest.findById(id);
    if (!request || request.status !== "pending") return null;
    request.status = "approved";
    request.resolved_at = new Date().toISOString();
    await db.write();
    await Account.addCredits(request.email, request.vc);
    return request;
  },

  async reject(id) {
    const request = CreditRequest.findById(id);
    if (!request || request.status !== "pending") return null;
    request.status = "rejected";
    request.resolved_at = new Date().toISOString();
    await db.write();
    return request;
  },
};
