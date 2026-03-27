import { useEffect, useMemo, useState } from "react";
import { createTransaction, getTransactions, loginUser, registerUser } from "./api";

const initialForm = { email: "", password: "", fullName: "" };
const initialTxForm = { amount: "", type: "credit", description: "" };

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(initialForm);
  const [txForm, setTxForm] = useState(initialTxForm);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [dashboard, setDashboard] = useState({ transactions: [], stats: { totalCredit: 0, totalDebit: 0, balance: 0 } });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAuthenticated = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions();
    }
  }, [isAuthenticated]);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const data = await getTransactions(token);
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function onChangeAuth(event) {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  }

  function onChangeTx(event) {
    const { name, value } = event.target;
    setTxForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmitAuth(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      setLoading(true);
      const api = authMode === "login" ? loginUser : registerUser;
      const payload = await api(authForm);
      localStorage.setItem("token", payload.token);
      localStorage.setItem("user", JSON.stringify(payload.user));
      setToken(payload.token);
      setUser(payload.user);
      setAuthForm(initialForm);
      setMessage(payload.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitTx(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      setLoading(true);
      await createTransaction(token, { ...txForm, amount: Number(txForm.amount) });
      setTxForm(initialTxForm);
      setMessage("Transaction saved successfully");
      await fetchTransactions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setDashboard({ transactions: [], stats: { totalCredit: 0, totalDebit: 0, balance: 0 } });
    setMessage("Logged out");
  }

  if (!isAuthenticated) {
    return (
      <main className="page auth-page">
        <section className="card auth-card">
          <h1>SecureBank</h1>
          <p className="subtitle">Simple and secure banking transactions dashboard</p>

          <div className="auth-switch">
            <button
              type="button"
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === "register" ? "active" : ""}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>

          <form onSubmit={onSubmitAuth} className="form">
            {authMode === "register" && (
              <label>
                Full Name
                <input
                  type="text"
                  name="fullName"
                  required
                  value={authForm.fullName}
                  onChange={onChangeAuth}
                  placeholder="John Doe"
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                name="email"
                required
                value={authForm.email}
                onChange={onChangeAuth}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={authForm.password}
                onChange={onChangeAuth}
                placeholder="Minimum 6 characters"
              />
            </label>

            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Please wait..." : authMode === "login" ? "Login" : "Create account"}
            </button>
          </form>

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="page dashboard-page">
      <header className="topbar">
        <div>
          <h1>Welcome, {user?.fullName}</h1>
          <p>Track all your banking transactions from one place.</p>
        </div>
        <button type="button" onClick={logout} className="ghost">
          Logout
        </button>
      </header>

      <section className="stats-grid">
        <article className="card stat">
          <h3>Current Balance</h3>
          <p>{money(dashboard.stats.balance)}</p>
        </article>
        <article className="card stat">
          <h3>Total Credits</h3>
          <p className="credit">{money(dashboard.stats.totalCredit)}</p>
        </article>
        <article className="card stat">
          <h3>Total Debits</h3>
          <p className="debit">{money(dashboard.stats.totalDebit)}</p>
        </article>
      </section>

      <section className="card">
        <h2>Add Transaction</h2>
        <form onSubmit={onSubmitTx} className="form tx-form">
          <label>
            Amount
            <input type="number" step="0.01" min="0.01" name="amount" value={txForm.amount} onChange={onChangeTx} required />
          </label>
          <label>
            Type
            <select name="type" value={txForm.type} onChange={onChangeTx}>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </label>
          <label>
            Description
            <input
              type="text"
              name="description"
              value={txForm.description}
              onChange={onChangeTx}
              required
              placeholder="Salary, groceries, rent..."
            />
          </label>
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Saving..." : "Add Transaction"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Transactions</h2>
        {dashboard.transactions.length === 0 ? (
          <p className="subtitle">No transactions yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.created_at).toLocaleString()}</td>
                    <td>{tx.description}</td>
                    <td>
                      <span className={tx.type === "credit" ? "badge credit" : "badge debit"}>{tx.type}</span>
                    </td>
                    <td>{money(tx.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </main>
  );
}
