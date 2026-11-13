import React, { useState, useEffect } from "react";
import "./OffersPage.css";

export default function OffersPage({ showToast, onBookNow }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/offers")
      .then((res) => res.json())
      .then((data) => {
        setOffers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const copyCode = (code) => {
    navigator.clipboard
      .writeText(code)
      .then(() => showToast(`Coupon code ${code} copied to clipboard!`))
      .catch(() => showToast(`Coupon code: ${code}`));
  };

  return (
    <div className="offers-page-container">
      <div className="offers-header-hero">
        <span className="badge badge-primo" style={{ marginBottom: "8px" }}>
          EXCLUSIVE REDBUS SAVINGS
        </span>
        <h1>TripNest Offers & Promo Codes</h1>
        <p style={{ opacity: 0.9, fontSize: "15px", margin: 0, maxWidth: "600px" }}>
          Save big on your next journey! Apply verified promo codes on checkout to enjoy instant fare discounts on bus tickets.
        </p>
      </div>

      <div className="offers-grid-cards">
        {loading ? (
          <div style={{ textAlign: "center", gridColumn: "1 / -1", padding: "40px" }}>
            Loading offers...
          </div>
        ) : offers.length === 0 ? (
          <div style={{ textAlign: "center", gridColumn: "1 / -1", padding: "40px" }}>
            Check back soon for new festive offers!
          </div>
        ) : (
          offers.map((offer) => (
            <div key={offer.code} className="offer-card">
              <div className="offer-card-strip" />

              <div>
                <div className="offer-discount-badge">{offer.discount_label}</div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", marginBottom: "4px" }}>
                  {offer.description || `Special discount on bus tickets with code ${offer.code}`}
                </h3>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 12px" }}>
                  Minimum booking amount: <b>₹{offer.minimum_amount}</b>
                  {offer.maximum_discount ? ` · Max discount: ₹${offer.maximum_discount}` : ""}
                </p>
              </div>

              <div>
                <div className="offer-code-bar">
                  <span className="offer-code-text">{offer.code}</span>
                  <button
                    type="button"
                    className="copy-code-btn"
                    onClick={() => copyCode(offer.code)}
                  >
                    COPY CODE
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "100%", marginTop: "10px", fontSize: "12px" }}
                  onClick={onBookNow}
                >
                  Book with this offer →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
