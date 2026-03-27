import { Router } from "express";
import { pool } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const txResult = await pool.query(
      "SELECT id, amount, type, description, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.userId]
    );

    const summary = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS total_credit,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) AS total_debit
      FROM transactions
      WHERE user_id = $1`,
      [req.user.userId]
    );

    const totalCredit = Number(summary.rows[0].total_credit || 0);
    const totalDebit = Number(summary.rows[0].total_debit || 0);

    return res.json({
      transactions: txResult.rows,
      stats: {
        totalCredit,
        totalDebit,
        balance: totalCredit - totalDebit
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

router.post("/", async (req, res) => {
  const { amount, type, description } = req.body;
  const numericAmount = Number(amount);

  if (!numericAmount || numericAmount <= 0 || !["credit", "debit"].includes(type) || !description) {
    return res.status(400).json({ message: "amount, type and description are required" });
  }

  try {
    const inserted = await pool.query(
      "INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4) RETURNING id, amount, type, description, created_at",
      [req.user.userId, numericAmount, type, description]
    );
    return res.status(201).json(inserted.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create transaction" });
  }
});

export default router;
