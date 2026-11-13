import React, { useState } from "react";

const FAQS = [
  {
    q: "How does TripNest live seat holding work?",
    a: "When you select seats on our interactive deck map, our backend server reserves them exclusively for you for 5 minutes. No other user can book those seats while you enter passenger details and proceed to checkout."
  },
  {
    q: "What is TripNest Primo and why should I choose it?",
    a: "Primo is our highest certification for bus operators who maintain an exceptional 4.5+ star rating, on-time departures, clean sanitized AC interiors, and professional staff."
  },
  {
    q: "Can I cancel my ticket and get a refund?",
    a: "Yes! If you cancel at least 24 hours prior to departure, you are eligible for up to a 90% refund. Cancellations between 12 to 24 hours receive 70%, and between 6 to 12 hours receive 50%."
  },
  {
    q: "Can I reschedule my travel date online?",
    a: "Absolutely. Under 'My Bookings', simply click 'Reschedule' on any confirmed future ticket and select your new preferred travel date."
  },
  {
    q: "How do I track my bus in real time?",
    a: "You can track your journey through 'Track My Bus' by entering your PNR code. It displays live GPS waypoints, speed, current landmark, driver contact, and updated arrival times."
  }
];

export default function HomeExtras({ onSelectRoute }) {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div style={{ maxWidth: "1200px", margin: "40px auto 0", padding: "0 20px" }}>
      {/* Why Choose TripNest Stats */}
      <section style={{ marginBottom: "50px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <span className="badge badge-red" style={{ marginBottom: "8px" }}>
            TRUSTED BY MILLIONS
          </span>
          <h2 style={{ fontSize: "28px", fontWeight: 800 }}>Why Book Bus Tickets on TripNest?</h2>
          <p style={{ color: "var(--muted)", maxWidth: "600px", margin: "6px auto 0" }}>
            Experience hassle-free bus reservations with the fastest booking speeds and reliable travel partners.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>👥</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--primary)" }}>36 Million+</div>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>Satisfied travellers across India</p>
          </div>

          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🚌</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--primary)" }}>3,500+</div>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>Certified bus travel operators</p>
          </div>

          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎧</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--primary)" }}>24/7 RedCare</div>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>Round-the-clock helpline & live support</p>
          </div>

          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>⚡</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--primary)" }}>Instant Refunds</div>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>Direct credits to your TripNest account</p>
          </div>
        </div>
      </section>

      {/* Top Bus Routes Showcase */}
      <section style={{ marginBottom: "50px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 800 }}>Popular Bus Routes</h2>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>Click to search instantly</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {[
            { from: "Pune", to: "Mumbai", fare: "₹520", time: "3h 45m" },
            { from: "Bangalore", to: "Goa", fare: "₹1,350", time: "11h 30m" },
            { from: "Delhi", to: "Jaipur", fare: "₹499", time: "4h 30m" },
            { from: "Bangalore", to: "Hyderabad", fare: "₹799", time: "8h 30m" },
            { from: "Chennai", to: "Bangalore", fare: "₹799", time: "6h 00m" },
            { from: "Mumbai", to: "Goa", fare: "₹1,199", time: "11h 30m" },
            { from: "Ahmedabad", to: "Mumbai", fare: "₹899", time: "8h 30m" },
            { from: "Pune", to: "Goa", fare: "₹1,050", time: "9h 30m" }
          ].map((r, idx) => (
            <div
              key={idx}
              onClick={() => onSelectRoute(r.from, r.to)}
              style={{
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--line)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div>
                <b style={{ fontSize: "15px", color: "var(--ink)", display: "block" }}>
                  {r.from} → {r.to}
                </b>
                <small style={{ color: "var(--muted)" }}>Duration: {r.time}</small>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Starts at</span>
                <b style={{ color: "var(--primary)", fontSize: "16px" }}>{r.fare}</b>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs Accordion */}
      <section style={{ marginBottom: "60px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "20px", textAlign: "center" }}>
          Frequently Asked Questions
        </h2>

        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                style={{
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  overflow: "hidden"
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "var(--ink)",
                    textAlign: "left"
                  }}
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: "18px", color: "var(--primary)" }}>{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 20px 18px", fontSize: "13px", color: "var(--muted)", lineHeight: "1.6" }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--line)",
          padding: "40px 0 30px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "30px",
          fontSize: "13px",
          color: "var(--muted)"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", fontWeight: 800, color: "var(--ink)", marginBottom: "12px" }}>
            <span>🚌</span> trip<span style={{ color: "var(--primary)" }}>nest</span>
          </div>
          <p style={{ lineHeight: "1.6", margin: 0 }}>
            India's favorite online bus ticketing platform. Book certified Primo buses, track live location, and travel safely across India.
          </p>
        </div>

        <div>
          <b style={{ color: "var(--ink)", display: "block", marginBottom: "10px" }}>Top Operators</b>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span>Shivneri Express (MSRTC)</span>
            <span>VRL Travels</span>
            <span>Orange Tours & Travels</span>
            <span>Zingbus Plus</span>
            <span>IntrCity SmartBus</span>
          </div>
        </div>

        <div>
          <b style={{ color: "var(--ink)", display: "block", marginBottom: "10px" }}>Top Bus Cities</b>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span>Pune Bus Tickets</span>
            <span>Mumbai Bus Tickets</span>
            <span>Bangalore Bus Tickets</span>
            <span>Goa Bus Tickets</span>
            <span>Delhi & Jaipur Bus Tickets</span>
          </div>
        </div>

        <div>
          <b style={{ color: "var(--ink)", display: "block", marginBottom: "10px" }}>Customer Care</b>
          <p style={{ margin: 0, lineHeight: "1.6" }}>
            Helpline: <b>+91 98765 43210</b><br />
            Email: support@tripnest.travel<br />
            Available 24x7 all 365 days.
          </p>
        </div>
      </footer>

      <div style={{ textAlign: "center", padding: "20px 0", borderTop: "1px solid var(--line)", fontSize: "12px", color: "var(--muted-light)" }}>
        © 2026 TripNest Tickets Pvt Ltd. All rights reserved. Built with love & Redbus excellence.
      </div>
    </div>
  );
}
