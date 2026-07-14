import { db } from "../config/db.js";
import { Account } from "./Account.js";
import { VC_TO_USD } from "../config/pricing.js";
import { ProfileModel } from "./supabase/profileModel.js";
import { Transaction } from "./Transaction.js";

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
      manual_email_sent: false,
      manual_email_sent_at: null,
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
    try {
      await ProfileModel.adjustCreditsByEmail(request.email, request.vc);
    } catch (err) {
      console.warn("Unable to sync approved credits to profile:", err.message);
    }
    await Transaction.create({
      email: request.email,
      type: "credit_purchase",
      amount: request.vc,
      note: `${request.vc} VC approved via ${request.method}`,
      status: "completed",
    });
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

  async updateManualEmail(id, manual_email_sent) {
    const request = CreditRequest.findById(id);
    if (!request) return null;
    request.manual_email_sent = Boolean(manual_email_sent);
    request.manual_email_sent_at = request.manual_email_sent ? new Date().toISOString() : null;
    await db.write();
    return request;
  },
};
