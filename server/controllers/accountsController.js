import { Account } from "../models/Account.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getAccount(req, res) {
  const { email } = req.params;
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  const account = await Account.getOrCreate(email);
  res.json({
    account: {
      email: account.email,
      credits: account.credits,
      referral_code: account.referral_code,
    },
  });
}
