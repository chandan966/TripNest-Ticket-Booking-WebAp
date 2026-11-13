import React from "react";

const PROMO_CARDS = [
  { code: "REDBUS150", discount: "Flat ₹150 OFF", title: "Save on Bus Bookings above ₹600", tag: "BUS SPECIAL" },
  { code: "FIRSTTRIP", discount: "15% OFF", title: "Welcome bonus up to ₹250 on first trip", tag: "NEW USER" },
  { code: "SUPERBUS", discount: "Flat ₹120 OFF", title: "Valid on all AC Sleeper and Primo buses", tag: "AC SLEEPER" },
  { code: "FESTIVE20", discount: "20% OFF", title: "Special holiday discount up to ₹300", tag: "FESTIVE" }
];

export default function OffersCarousel({ onCopyCode, onExploreAll }) {
  return (
    <section style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px" }}>
        <div>
          <span className="badge badge-red" style={{ marginBottom: "6px" }}>
            SPECIAL SAVINGS
          </span>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
            Trending Offers & Coupons
          </h2>
        </div>

        <button
          type="button"
          style={{ color: "var(--primary)", fontWeight: 700, fontSize: "13px" }}
          onClick={onExploreAll}
        >
          View All Offers (5) →
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px"
        }}
      >
        {PROMO_CARDS.map((card) => (
          <div
            key={card.code}
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "18px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
          >
            <div>
              <span className="badge badge-primo" style={{ fontSize: "10px", marginBottom: "8px" }}>
                {card.tag}
              </span>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--primary)" }}>
                {card.discount}
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 12px", lineHeight: "1.4" }}>
                {card.title}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--bg-surface)",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px dashed var(--line-strong)"
              }}
            >
              <b style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--ink)" }}>{card.code}</b>
              <button
                type="button"
                style={{ fontSize: "11px", fontWeight: 800, color: "var(--primary)" }}
                onClick={() => onCopyCode(card.code)}
              >
                COPY
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
