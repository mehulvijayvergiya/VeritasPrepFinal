import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

export function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const admin = db.data.admins.find((a) => a.email === email.toLowerCase().trim());

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({ token, email: admin.email });
}

export function me(req, res) {
  res.json({ admin: req.admin });
}
