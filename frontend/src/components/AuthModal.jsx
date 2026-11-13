import React, { useState } from "react";

export default function AuthModal({ initialMode = "login", onClose, onSuccess, showToast }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const payload = mode === "register" ? { name, email, password, phone } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed.");

      showToast(`Welcome ${data.user.name.split(" ")[0]}!`);
      onSuccess(data.token, data.user);
      onClose();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setMode("login");
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: "440px" }}>
        <div className="modal-header">
          <div>
            <h3>{mode === "register" ? "Create Account" : "Welcome Back"}</h3>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
              {mode === "register"
                ? "Join TripNest for fastest bookings and exclusive rewards"
                : "Sign in to access your digital tickets and manage bookings"}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Quick Demo Credentials */}
          <div style={{ background: "var(--bg-surface)", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "12px" }}>
            <span style={{ fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "4px" }}>
              ⚡ Quick Demo One-Click Login:
            </span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "11px", padding: "4px 8px" }}
                onClick={() => handleQuickLogin("user@example.com", "Password123")}
              >
                👤 Demo User
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "11px", padding: "4px 8px" }}
                onClick={() => handleQuickLogin("admin@tripnest.com", "Admin123!")}
              >
                🛡 Admin User
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {mode === "register" && (
              <div className="form-group">
                <label>Your Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chandan Ghanghav"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode === "register" && (
              <div className="form-group">
                <label>Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 8 : 1}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", padding: "12px", marginTop: "8px" }}
              disabled={submitting}
            >
              {submitting ? "Please wait..." : mode === "register" ? "Create Account →" : "Sign In →"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: "var(--muted)" }}>
            {mode === "register" ? "Already have an account?" : "New to TripNest?"}{" "}
            <button
              type="button"
              style={{ color: "var(--primary)", fontWeight: 800, textDecoration: "underline" }}
              onClick={() => setMode(mode === "register" ? "login" : "register")}
            >
              {mode === "register" ? "Sign In" : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
