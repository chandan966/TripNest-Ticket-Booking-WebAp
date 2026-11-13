import React from "react";

export default function PrimoSection({ onSearchPrimo }) {
  return (
    <section style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 20px" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)",
          border: "2px solid #F59E0B",
          borderRadius: "24px",
          padding: "36px 40px",
          display: "grid",
          gridTemplateColumns: "1.2fr 1.8fr",
          alignItems: "center",
          gap: "32px",
          boxShadow: "0 12px 30px rgba(245, 158, 11, 0.15)"
        }}
      >
        <div>
          <span className="badge badge-primo" style={{ background: "#F59E0B", color: "#fff", border: "none", marginBottom: "10px" }}>
            ⭐ REDBUS PRIMO CERTIFIED
          </span>
          <h2 style={{ fontSize: "30px", fontWeight: 900, color: "#78350F", letterSpacing: "-0.5px", marginBottom: "10px" }}>
            Travel Primo with Top-Rated Buses
          </h2>
          <p style={{ color: "#92400E", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
            Experience premier travel with the highest safety standards, punctual departures, polite staff, and clean sanitized AC coaches.
          </p>

          <button
            type="button"
            className="btn-primary"
            style={{ background: "#B45309", padding: "12px 24px" }}
            onClick={onSearchPrimo}
          >
            Explore Primo Buses →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#fff", padding: "18px", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "24px", marginBottom: "6px" }}>⏱️</div>
            <b style={{ color: "var(--ink)", fontSize: "14px", display: "block" }}>100% On-Time Guarantee</b>
            <small style={{ color: "var(--muted)" }}>Punctual pickup & drop with real-time GPS tracking</small>
          </div>

          <div style={{ background: "#fff", padding: "18px", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "24px", marginBottom: "6px" }}>👨‍✈️</div>
            <b style={{ color: "var(--ink)", fontSize: "14px", display: "block" }}>Friendly & Verified Staff</b>
            <small style={{ color: "var(--muted)" }}>Experienced drivers and professional attendants</small>
          </div>

          <div style={{ background: "#fff", padding: "18px", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "24px", marginBottom: "6px" }}>✨</div>
            <b style={{ color: "var(--ink)", fontSize: "14px", display: "block" }}>Clean & Sanitized Buses</b>
            <small style={{ color: "var(--muted)" }}>Clean bedsheets, fresh pillows & hygienic interiors</small>
          </div>

          <div style={{ background: "#fff", padding: "18px", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "24px", marginBottom: "6px" }}>⚡</div>
            <b style={{ color: "var(--ink)", fontSize: "14px", display: "block" }}>Instant Easy Refunds</b>
            <small style={{ color: "var(--muted)" }}>Transparent cancellation & instant wallet refunds</small>
          </div>
        </div>
      </div>
    </section>
  );
}
