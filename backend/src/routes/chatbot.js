import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { pool } from "../db.js";

const router = Router();

router.use(authMiddleware);

router.post("/ask", async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== "string") {
    return res.status(400).json({ message: "question is required" });
  }

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
    const balance = totalCredit - totalDebit;

    const chatbotUrl = process.env.CHATBOT_URL || "http://localhost:8000";
    const chatbotResponse = await fetch(`${chatbotUrl}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        user: { userId: req.user.userId, email: req.user.email },
        transactions: txResult.rows,
        stats: { totalCredit, totalDebit, balance }
      })
    });

    if (!chatbotResponse.ok) {
      return res.status(502).json({ message: "Chatbot service unavailable" });
    }

    const data = await chatbotResponse.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: "Failed to process chatbot request" });
  }
});

export default router;
