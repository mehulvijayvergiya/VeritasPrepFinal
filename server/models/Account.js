import { db } from "../config/db.js";

function makeReferralCode(email) {
  const base = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "VP"}-${rand}`;
}

export const Account = {
  findByEmail(email) {
    return db.data.accounts.find((a) => a.email === email.toLowerCase().trim());
  },

  findByReferralCode(code) {
    if (!code) return null;
    return db.data.accounts.find((a) => a.referral_code === code.toUpperCase().trim());
  },

  // Creates the account on first contact (submission, balance check, or
  // purchase request) — students don't have a separate signup step.
  async getOrCreate(email, referredByCode) {
    const normalized = email.toLowerCase().trim();
    let account = Account.findByEmail(normalized);
    if (account) return account;

    account = {
      email: normalized,
      credits: 0,
      referral_code: makeReferralCode(normalized),
      referred_by: null,
      created_at: new Date().toISOString(),
    };

    if (referredByCode) {
      const referrer = Account.findByReferralCode(referredByCode);
      if (referrer && referrer.email !== normalized) {
        account.referred_by = referrer.email;
        referrer.credits += 1; // referral reward: 1 VC
      }
    }

    db.data.accounts.push(account);
    await db.write();
    return account;
  },

  async addCredits(email, amount) {
    const account = await Account.getOrCreate(email);
    account.credits += amount;
    await db.write();
    return account;
  },

  async deductCredits(email, amount) {
    const account = Account.findByEmail(email);
    if (!account || account.credits < amount) return null;
    account.credits -= amount;
    await db.write();
    return account;
  },
};
