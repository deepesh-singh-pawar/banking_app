import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "fullName, email and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password should be at least 6 characters" });
  }

  try {
    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existingUser.rowCount > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email",
      [fullName, email.toLowerCase(), passwordHash]
    );

    const user = inserted.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email }
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  try {
    const userResult = await pool.query("SELECT id, full_name, email, password_hash FROM users WHERE email = $1", [
      email.toLowerCase()
    ]);

    if (userResult.rowCount === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });

    return res.json({
      message: "Login successful",
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email }
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
});

export default router;
